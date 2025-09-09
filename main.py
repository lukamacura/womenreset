# main.py
import os
import json
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI

# ---- ENV ----
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# ---- CONFIG ----
USE_LOCAL_EMB = True  # True = SentenceTransformer; False = OpenAI embeddings
CHROMA_DB_PATH = "data"
CHROMA_COLLECTION = "knowledge"
KNOWLEDGE_FILE = "knowledge.jsonl"
OPENAI_MODEL = "gpt-4o-mini"

# ---- EMBEDDINGS ----
if USE_LOCAL_EMB:
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
else:
    from chromadb import EmbeddingFunction, Documents, Embeddings
    class OpenAIEmbeddingEF(EmbeddingFunction):
        def __init__(self, model="text-embedding-3-small"):
            self.client = OpenAI()
            self.model = model
        def __call__(self, texts: Documents) -> Embeddings:
            resp = self.client.embeddings.create(model=self.model, input=texts)
            return [d.embedding for d in resp.data]
    ef = OpenAIEmbeddingEF()

# ---- CHROMA ----
def get_collection():
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    return client.get_or_create_collection(
        name=CHROMA_COLLECTION,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"}
    )

def load_initial_data(collection, path=KNOWLEDGE_FILE):
    # dodaj podatke samo ako je prazno
    try:
        if collection.count() > 0:
            return
    except Exception:
        pass
    docs, ids, metas = [], [], []
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                txt = (rec.get("text") or "").strip()
                if not txt:
                    continue
                docs.append(txt)
                ids.append(rec.get("id") or f"doc_{len(ids)+1}")
                metas.append(rec.get("metadata") or {})
    except FileNotFoundError:
        print(f"[WARN] {path} not found.")
        return
    if docs:
        collection.add(documents=docs, ids=ids, metadatas=metas)
        print(f"[INIT] Loaded {len(docs)} docs into Chroma.")

def retrieve_context(collection, question: str, k: int = 5) -> str:
    res = collection.query(query_texts=[question], n_results=k)
    docs = (res or {}).get("documents") or []
    if not docs or not docs[0]:
        return ""
    picked, seen = [], set()
    for d in docs[0]:
        d = d.strip()
        if d and d not in seen:
            picked.append(d)
            seen.add(d)
    return "\n---\n".join(picked[:k])

STYLE_PROMPT = """You are a warm, clear, and supportive assistant for women 40+.
Answer in English only.

Tone:
- Empathetic and encouraging, but concise.
- Use simple everyday language.
- Avoid heavy formatting (no bold, no headings, no ###).

Style:
- Start with one friendly, empathetic sentence.
- Then give 3–6 short bullet points.
- Each bullet should start with a relevant emoji (🌙, 💧, 🍵, 🧘, etc).
- Keep bullets short (one sentence each).
- If health-related, include a gentle reminder that this is not medical advice.
- If appropriate, finish with a short "Mini 7-day plan" written as 3–5 simple lines (each line starting with 👉).
"""

def build_user_message(context: str, question: str) -> str:
    return f"""Context from knowledge base (use only if relevant):
{context}

User question:
{question}

Instructions for the answer:
1. Write in clear, supportive English, suitable for women 40+.
2. Do not use bold (**), markdown (#), or code formatting.
3. Begin with one warm, empathetic sentence.
4. Provide the main advice as 3–6 bullet points with emojis at the start.
5. If useful, end with a short 'Mini 7-day plan' (lines starting with 👉).
6. Keep it concise, practical, and encouraging.
"""


def generate_answer(question: str) -> str:
    collection = get_collection()
    context = retrieve_context(collection, question, k=5)
    client = OpenAI()
    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": STYLE_PROMPT},
            {"role": "user", "content": build_user_message(context, question)},
        ],
        temperature=0.5,
    )
    return resp.choices[0].message.content.strip()

# ---- FASTAPI APP ----
app = FastAPI(title="Women Reset RAG API")

# ⚠️ Podesi origines (privremeno * za test)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # za produkciju stavi tačan domen front-enda
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AskIn(BaseModel):
    question: str

class AskOut(BaseModel):
    answer: str

@app.on_event("startup")
def on_startup():
    # Preload Chroma i embedding da ne “visi” prvi request
    coll = get_collection()
    load_initial_data(coll, KNOWLEDGE_FILE)
    try:
        # primoraj embedding init (lokalni model se skida/učitava ovde)
        _ = ef(["warmup"])
        print("[STARTUP] Embedding ready.")
    except Exception as e:
        print("[STARTUP][WARN]", e)
    if not USE_LOCAL_EMB and not OPENAI_API_KEY:
        print("[WARN] OPENAI_API_KEY is missing for OpenAI embeddings/LLM.")

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/ask", response_model=AskOut)
def ask(item: AskIn):
    try:
        ans = generate_answer(item.question)
        return AskOut(answer=ans)
    except Exception as e:
        print("[ERROR]", repr(e))
        raise HTTPException(status_code=500, detail="Internal error")
