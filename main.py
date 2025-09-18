# main.py — MULTI-DATA (Nutrition + Mindset)

import os
import json
from typing import List, Dict, Any
from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# LangChain & Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document

# -----------------------------
# 0) Config
# -----------------------------
NUTRITION_PATH = "./data/nutrition.jsonl"
MINDSET_PATH   = "./data/mindset.jsonl"
CHROMA_DIR     = "./chroma_store"

NUTRITION_COLLECTION = "menopause_nutrition"
MINDSET_COLLECTION   = "mindset_global"

EMBED_MODEL = "text-embedding-3-large"   # ili "text-embedding-3-small"
CHAT_MODEL  = "gpt-4o-mini"
K = 3                         # top-k iz nutritivnog store-a
K_MINDSET = 1                 # koliko mindset pasusa uvek dodajemo
DO_CHUNK = True

# ENV / API key
load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError("OPENAI_API_KEY is missing. Add it to .env")

# -----------------------------
# 1) Load JSONL
# -----------------------------
def load_jsonl(path: str) -> List[Dict[str, Any]]:
    if not os.path.isfile(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]

# -----------------------------
# 2) Build texts + metadata
# -----------------------------
def build_corpus(
    records: List[Dict[str, Any]],
    do_chunk: bool = True,
    default_doc_type: str = "nutrition",
    source_name: str | None = None,
):
    """
    Vraća texts, metas. Ako je doc_type= "mindset", u tekst dodajemo prefiks [MINDSET]
    da bi prompt znao da ubaci 'Mindset tip'.
    """
    texts, metas = [], []

    def body_from(r):
        return r.get("answer") or r.get("explanation") or ""

    def prefix_from(r):
        intents = r.get("intent", [])
        return " | ".join(intents)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800, chunk_overlap=120, separators=["\n\n", "\n", ".", " ", ""]
    )

    for r in records:
        body = body_from(r)
        prefix = prefix_from(r)
        base_text = (prefix + " || " + body).strip(" |")

        # doc_type & source
        doc_type = r.get("doc_type") or default_doc_type
        source = r.get("source") or (source_name or f"{default_doc_type}.jsonl")

        # Prefiks za mindset da LLM zna da doda Mindset tip
        preface = "[MINDSET] " if doc_type == "mindset" else ""
        base_text = (preface + base_text).strip()

        metadata = {
            "id": r.get("id"),
            "topic": r.get("topic"),
            "subtopic": r.get("subtopic"),
            "doc_type": doc_type,
            "audience": r.get("audience", "women_40_plus"),
            "source": source,
            "lang": r.get("lang", "en"),
        }

        if do_chunk and base_text:
            for chunk in splitter.split_text(base_text):
                texts.append(chunk)
                metas.append(metadata)
        else:
            texts.append(base_text)
            metas.append(metadata)

    return texts, metas

# -----------------------------
# 3) Vector store (Chroma)
# -----------------------------
def get_vectorstore(texts: List[str], metas: List[Dict[str, Any]], collection_name: str) -> Chroma:
    import chromadb
    embeddings = OpenAIEmbeddings(model=EMBED_MODEL)
    client = chromadb.PersistentClient(path=CHROMA_DIR)

    vs = Chroma(
        client=client,
        collection_name=collection_name,
        embedding_function=embeddings,
    )
    # inicijalno popuni ako je prazno
    try:
        count = vs._collection.count()
    except Exception:
        count = 0

    if count == 0 and texts:
        vs.add_texts(texts=texts, metadatas=metas)

    return vs

# -----------------------------
# 4) Prompt
# -----------------------------
SYSTEM_PROMPT = """You are CLARA, a warm, practical menopause coach for women 40+.
Be concise and specific. Use everyday foods and 2–4 bullet steps when helpful.
If the user asks for medical-specific guidance, add a short disclaimer.
Ground your reply ONLY in the provided context; if unsure, say so briefly.
If any retrieved text contains the tag [MINDSET], add one short line at the end starting with "Mindset tip:" summarizing that insight."""

QA_TEMPLATE = PromptTemplate.from_template(
    """{system}

Context (retrieved passages):
{context}

User question:
{question}

Rules:
- Keep answers practical and empathetic.
- Do not bold or try to style text
- If you talk about food always calculate basic macros (Calories, Protein, Fiber) when possible.
- Use appropriate emojis in front of every bullet
- If advice may be medical, end with: "This is educational, not medical advice."
- Cite 1–3 short source tags like: [topic → subtopic].""".strip()
)

# -----------------------------
# 5) Dual retriever (nutrition + mindset)
# -----------------------------
# -----------------------------
# 5) Dual retriever (nutrition + mindset)
# -----------------------------
from typing import Any, List
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document

class DualRetriever(BaseRetriever):
    # Pydantic polja (moraju biti deklarisana)
    primary: Any
    secondary: Any
    kp: int = 3
    ks: int = 1

    class Config:
        arbitrary_types_allowed = True  # dozvoli LangChain objekte kao tipove

    def _get_relevant_documents(self, query: str) -> List[Document]:
        d1 = self.primary.get_relevant_documents(query)[: self.kp]
        d2 = self.secondary.get_relevant_documents(query)[: self.ks]
        return d1 + d2

    async def _aget_relevant_documents(self, query: str) -> List[Document]:
        d1, d2 = await asyncio.gather(
            self.primary.aget_relevant_documents(query),
            self.secondary.aget_relevant_documents(query),
        )
        return d1[: self.kp] + d2[: self.ks]


# -----------------------------
# 6) Build chain from a retriever
# -----------------------------
def build_chain_from_retriever(retriever):
    llm = ChatOpenAI(model=CHAT_MODEL, temperature=0)
    chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type="stuff",
        return_source_documents=True,
        chain_type_kwargs={"prompt": QA_TEMPLATE.partial(system=SYSTEM_PROMPT)},
    )
    return chain

# -----------------------------
# 7) Lifespan (startup/shutdown)
# -----------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Nutrition
    rec_n = load_jsonl(NUTRITION_PATH)
    txt_n, meta_n = build_corpus(rec_n, do_chunk=DO_CHUNK, default_doc_type="nutrition", source_name="nutrition.jsonl")
    vs_n = get_vectorstore(txt_n, meta_n, NUTRITION_COLLECTION)

    # Mindset
    rec_m = load_jsonl(MINDSET_PATH)
    txt_m, meta_m = build_corpus(rec_m, do_chunk=DO_CHUNK, default_doc_type="mindset", source_name="mindset.jsonl")
    vs_m = get_vectorstore(txt_m, meta_m, MINDSET_COLLECTION)

    # Retrievers
    r_n = vs_n.as_retriever(search_kwargs={"k": K})
    r_m = vs_m.as_retriever(search_kwargs={"k": max(1, K_MINDSET)})

    # Combined retriever
    combo = DualRetriever(primary=r_n, secondary=r_m, kp=K, ks=K_MINDSET)


    # Chain
    app.state.qa = build_chain_from_retriever(combo)

    # Save for status/debug/reindex
    app.state.vs_n, app.state.vs_m = vs_n, vs_m

    yield

# --------- App (create ONCE) ----------
app = FastAPI(title="CLARA RAG", lifespan=lifespan)

# CORS (if you call directly from :3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# 8) Routes
# -----------------------------
class AskPayload(BaseModel):
    question: str
    history: list[dict] | None = None  # [{role:"user"|"assistant", content:"..."}]

@app.get("/health")
def health():
    return {"ok": True, "status": "up"}

@app.get("/status")
def status():
    def count(vs):
        try:
            return vs._collection.count()
        except Exception:
            return None
    return {
        "ok": True,
        "docs": {
            "nutrition": count(getattr(app.state, "vs_n", None)),
            "mindset": count(getattr(app.state, "vs_m", None)),
        },
        "paths": {"nutrition": NUTRITION_PATH, "mindset": MINDSET_PATH},
        "models": {"embed": EMBED_MODEL, "chat": CHAT_MODEL},
        "k": {"nutrition": K, "mindset": K_MINDSET},
    }

@app.post("/debug/retrieve")
def debug_retrieve(body: AskPayload):
    # koristi isti retriever iz chain-a
    retriever = app.state.qa.retriever
    docs = retriever.get_relevant_documents(body.question)
    out = []
    for d in docs:
        out.append({
            "preview": (d.page_content[:300] + "…") if d.page_content else "",
            "topic": d.metadata.get("topic"),
            "subtopic": d.metadata.get("subtopic"),
            "doc_type": d.metadata.get("doc_type"),
            "source": d.metadata.get("source"),
        })
    return {"hits": out}

@app.post("/reindex")
def reindex():
    import chromadb
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    # delete old collections if exist
    for name in (NUTRITION_COLLECTION, MINDSET_COLLECTION):
        try:
            client.delete_collection(name)
        except Exception:
            pass

    # rebuild
    rec_n = load_jsonl(NUTRITION_PATH)
    txt_n, meta_n = build_corpus(rec_n, do_chunk=DO_CHUNK, default_doc_type="nutrition", source_name="nutrition.jsonl")
    vs_n = get_vectorstore(txt_n, meta_n, NUTRITION_COLLECTION)

    rec_m = load_jsonl(MINDSET_PATH)
    txt_m, meta_m = build_corpus(rec_m, do_chunk=DO_CHUNK, default_doc_type="mindset", source_name="mindset.jsonl")
    vs_m = get_vectorstore(txt_m, meta_m, MINDSET_COLLECTION)

    r_n = vs_n.as_retriever(search_kwargs={"k": K})
    r_m = vs_m.as_retriever(search_kwargs={"k": max(1, K_MINDSET)})
    combo = DualRetriever(r_n, r_m, k_primary=K, k_secondary=K_MINDSET)
    app.state.qa = build_chain_from_retriever(combo)
    app.state.vs_n, app.state.vs_m = vs_n, vs_m

    def count(vs):
        try:
            return vs._collection.count()
        except Exception:
            return None

    return {"ok": True, "docs": {"nutrition": count(vs_n), "mindset": count(vs_m)}}

@app.post("/ask")
def ask(payload: AskPayload):
    q = payload.question
    if payload.history:
        last_msgs = payload.history[-8:]
        hist_str = "\n".join([f'{m.get("role")}: {m.get("content")}' for m in last_msgs])
        q = f"Previous conversation:\n{hist_str}\n\nUser asks now:\n{q}"

    out = app.state.qa.invoke(q)
    sources = [
        {
            "id": d.metadata.get("id"),
            "topic": d.metadata.get("topic"),
            "subtopic": d.metadata.get("subtopic"),
            "doc_type": d.metadata.get("doc_type"),
            "source": d.metadata.get("source"),
        }
        for d in out.get("source_documents", [])
    ]
    return {"answer": out["result"], "sources": sources}

# -----------------------------
# 9) Entrypoint
# -----------------------------
def interactive_cli(chain):
    print("CLARA RAG (type 'exit' to quit')")
    while True:
        q = input("\nYou: ").strip()
        if q.lower() in {"exit", "quit"}:
            break
        out = chain.invoke(q)
        print("\nAssistant:", out["result"])
        srcs = []
        for d in out.get("source_documents", []):
            t, s = d.metadata.get("topic"), d.metadata.get("subtopic")
            if t or s:
                srcs.append(f"[{t} → {s}]")
        if srcs:
            print("Sources:", " ".join(sorted(set(srcs))[:3]))

if __name__ == "__main__":
    mode = os.getenv("CLARA_MODE", "cli")
    if mode == "api":
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)
    else:
        # local CLI
        rec_n = load_jsonl(NUTRITION_PATH)
        txt_n, meta_n = build_corpus(rec_n, do_chunk=DO_CHUNK, default_doc_type="nutrition", source_name="nutrition.jsonl")
        vs_n = get_vectorstore(txt_n, meta_n, NUTRITION_COLLECTION)

        rec_m = load_jsonl(MINDSET_PATH)
        txt_m, meta_m = build_corpus(rec_m, do_chunk=DO_CHUNK, default_doc_type="mindset", source_name="mindset.jsonl")
        vs_m = get_vectorstore(txt_m, meta_m, MINDSET_COLLECTION)

        r_n = vs_n.as_retriever(search_kwargs={"k": K})
        r_m = vs_m.as_retriever(search_kwargs={"k": max(1, K_MINDSET)})
        combo = DualRetriever(r_n, r_m, k_primary=K, k_secondary=K_MINDSET)
        qa = build_chain_from_retriever(combo)
        interactive_cli(qa)
