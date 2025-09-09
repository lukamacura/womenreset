# main.py
import os
import json
import shutil
from typing import Optional, List

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

# ---- CONFIG (kroz ENV, sa podrazumevanim vrednostima) ----
USE_LOCAL_EMB = os.getenv("USE_LOCAL_EMB", "true").lower() == "true"   # true=SentenceTransformer, false=OpenAI
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "data")                   # na Render/Railway: /data
KNOWLEDGE_FILE = os.getenv("KNOWLEDGE_FILE", "data/knowledge.jsonl")   # može i data/knowledge.json
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# dozvoljeni frontend origin-i, npr: "https://womenreset.vercel.app,https://womenreset-git-main.vercel.app"
FRONTEND_ORIGINS = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "*").split(",") if o.strip()]

# ---- EMBEDDINGS ----
if USE_LOCAL_EMB:
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
else:
    from chromadb import EmbeddingFunction, Documents, Embeddings
    class OpenAIEmbeddingEF(EmbeddingFunction):
        def __init__(self, model="text-embedding-3-small"):
            self.client = OpenAI(api_key=OPENAI_API_KEY)
            self.model = model
        def __call__(self, texts: Documents) -> Embeddings:
            resp = self.client.embeddings.create(model=self.model, input=texts)
            return [d.embedding for d in resp.data]
    ef = OpenAIEmbeddingEF()

# ---- CHROMA ----
def get_collection():
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    return client.get_or_create_collection(
        name="knowledge",
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"}
    )

def _load_jsonl(path: str):
    docs, ids, metas = [], [], []
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
    return docs, ids, metas

def _load_json_array(path: str):
    docs, ids, metas = [], [], []
    arr = json.load(open(path, "r", encoding="utf-8"))
    for rec in arr:
        txt = (rec.get("text") or "").strip()
        if not txt:
            continue
        docs.append(txt)
        ids.append(rec.get("id") or f"doc_{len(ids)+1}")
        metas.append(rec.get("metadata") or {})
    return docs, ids, metas

def load_initial_data(collection, path=KNOWLEDGE_FILE):
    # dodaj podatke samo ako je prazno
    try:
        if collection.count() > 0:
            return
    except Exception:
        pass

    try:
        if path.endswith(".jsonl"):
            docs, ids, metas = _load_jsonl(path)
        else:
            docs, ids, metas = _load_json_array(path)
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
- Use numerics for everything.
- If health-related, include a gentle reminder that this is not medical advice.
- If appropriate, finish with a short question related to context (starting with 👉).
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
    client = OpenAI(api_key=OPENAI_API_KEY)
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS if FRONTEND_ORIGINS != ["*"] else ["*"],
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
    # ako KNOWLEDGE_FILE pokazuje na /data, a nema ga – pokušaj kopiranje iz repo-a
    try:
        if KNOWLEDGE_FILE.startswith("/"):
            # npr. /data/knowledge.json → probaj da kopiraš iz data/knowledge.json
            src_guess = KNOWLEDGE_FILE.replace("/data/", "data/")
            if not os.path.exists(KNOWLEDGE_FILE) and os.path.exists(src_guess):
                os.makedirs(os.path.dirname(KNOWLEDGE_FILE), exist_ok=True)
                shutil.copyfile(src_guess, KNOWLEDGE_FILE)
                print(f"[STARTUP] Copied {src_guess} -> {KNOWLEDGE_FILE}")
    except Exception as e:
        print("[STARTUP][copy warn]", e)

    coll = get_collection()
    load_initial_data(coll, KNOWLEDGE_FILE)
    try:
        _ = ef(["warmup"])  # init embedder
        print("[STARTUP] Embedding ready.")
    except Exception as e:
        print("[STARTUP][WARN]", e)
    if not OPENAI_API_KEY:
        print("[WARN] OPENAI_API_KEY is missing; LLM calls will fail.")

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
