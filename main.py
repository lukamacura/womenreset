# main.py
import os
import json
import shutil
import traceback
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI

# ---- ENV ----
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
USE_LOCAL_EMB = os.getenv("USE_LOCAL_EMB", "false").lower() == "true"   # DEFAULT false na Renderu (štedi RAM)
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "/var/tmp/chroma")
KNOWLEDGE_FILE = os.getenv("KNOWLEDGE_FILE", "data/knowledge.jsonl")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
FRONTEND_ORIGINS = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "*").split(",") if o.strip()]
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")
BYPASS_LLM = os.getenv("BYPASS_LLM", "0") == "1"

# ---- Token/Chunk utils (anti-300k & low-mem) ----
def approx_tokens(s: str) -> int:
    return max(1, len(s) // 4)

MAX_CHARS_PER_CHUNK = 1200
CHUNK_OVERLAP = 120
EMB_MAX_TOKENS_PER_REQ = 280_000
EMB_MAX_BATCH_SIZE = 128
ADD_BATCH_SIZE = 200  # koliko CHUNKS dodajemo u Chroma u jednom add pozivu

def split_into_chunks(text: str, max_chars: int = MAX_CHARS_PER_CHUNK, overlap: int = CHUNK_OVERLAP):
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]
    chunks = []
    i = 0
    n = len(text)
    step = max(1, max_chars - overlap)
    while i < n:
        chunks.append(text[i:i+max_chars])
        i += step
    return chunks

# ---- EMBEDDINGS ----
if USE_LOCAL_EMB:
    # Lokalni model (RAM teži!) – izbegavaj na 512Mi
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
else:
    from chromadb import EmbeddingFunction, Documents, Embeddings
    class OpenAIEmbeddingEF(EmbeddingFunction):
        def __init__(self, model="text-embedding-3-small"):
            if not OPENAI_API_KEY:
                raise RuntimeError("OPENAI_API_KEY is missing for embeddings")
            self.client = OpenAI(api_key=OPENAI_API_KEY)
            self.model = model

        def __call__(self, texts: "Documents") -> "Embeddings":
            if not texts:
                return []
            vectors: list[list[float]] = []
            batch: list[str] = []
            tok_sum = 0
            for t in texts:
                t = t or ""
                t_tok = approx_tokens(t)
                if batch and (len(batch) >= EMB_MAX_BATCH_SIZE or tok_sum + t_tok > EMB_MAX_TOKENS_PER_REQ):
                    resp = self.client.embeddings.create(model=self.model, input=batch)
                    vectors.extend([d.embedding for d in resp.data])
                    batch = []
                    tok_sum = 0
                batch.append(t)
                tok_sum += t_tok
            if batch:
                resp = self.client.embeddings.create(model=self.model, input=batch)
                vectors.extend([d.embedding for d in resp.data])
            return vectors
    ef = OpenAIEmbeddingEF()

# ---- CHROMA ----
def get_collection():
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    return client.get_or_create_collection(
        name="knowledge",
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )

def _yield_records_jsonl(path: str):
    with open(path, "r", encoding="utf-8") as f:
        idx = 0
        for line in f:
            line = line.strip()
            if not line:
                idx += 1
                continue
            rec = json.loads(line)
            base_id = rec.get("id") or f"doc_{idx+1}"
            txt = (rec.get("text") or "").strip()
            meta = rec.get("metadata") or {}
            idx += 1
            if not txt:
                continue
            chunks = split_into_chunks(txt)
            for ci, chunk in enumerate(chunks):
                out_meta = dict(meta)
                out_meta["source_id"] = base_id
                out_meta["chunk_index"] = ci + 1
                yield chunk, f"{base_id}__c{ci+1}", out_meta

def _yield_records_json(path: str):
    arr = json.load(open(path, "r", encoding="utf-8"))
    for i, rec in enumerate(arr):
        base_id = rec.get("id") or f"doc_{i+1}"
        txt = (rec.get("text") or "").strip()
        meta = rec.get("metadata") or {}
        if not txt:
            continue
        chunks = split_into_chunks(txt)
        for ci, chunk in enumerate(chunks):
            out_meta = dict(meta)
            out_meta["source_id"] = base_id
            out_meta["chunk_index"] = ci + 1
            yield chunk, f"{base_id}__c{ci+1}", out_meta

def load_initial_data(collection, path=KNOWLEDGE_FILE):
    # Ako već ima zapisa, preskoči
    try:
        if collection.count() > 0:
            return
    except Exception:
        pass

    try:
        generator = _yield_records_jsonl(path) if path.endswith(".jsonl") else _yield_records_json(path)
    except FileNotFoundError:
        print(f"[WARN] {path} not found.")
        return

    docs, ids, metas = [], [], []
    added = 0
    for doc, _id, meta in generator:
        docs.append(doc); ids.append(_id); metas.append(meta)
        if len(docs) >= ADD_BATCH_SIZE:
            collection.add(documents=docs, ids=ids, metadatas=metas)
            added += len(docs)
            docs, ids, metas = [], [], []
            print(f"[INIT] Added {added} chunks...")
    if docs:
        collection.add(documents=docs, ids=ids, metadatas=metas)
        added += len(docs)
    if added:
        print(f"[INIT] Loaded {added} chunks into Chroma.")

def retrieve_context(collection, question: str, k: int = 5, threshold: float = 0.35) -> str:
    try:
        res = collection.query(
            query_texts=[question],
            n_results=k,
            include=["documents", "distances", "ids"],
        ) or {}
    except Exception as e:
        print("[CTX][WARN] retrieval failed:", repr(e))
        return ""
    docs = (res.get("documents") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]
    picked, seen = [], set()
    for d, dist in zip(docs, dists):
        if not d:
            continue
        if dist is None or dist > threshold:
            continue
        t = d.strip()
        if t and t not in seen:
            picked.append(t); seen.add(t)
    return "\n---\n".join(picked[:k])

STYLE_PROMPT = """You are a warm, clear, and supportive assistant for women 40+.
Answer in English only.

Tone:
- Gentle, empathetic, encouraging.
- Practical and precise; avoid vague or generic advice.
- Use everyday, natural language.
- Do not use markdown (** or #).

Expert Persona:
- Adopt the most relevant expert persona for the user’s question, based on the EXPERT_ROUTER notes passed in the message.
- Reflect the expert’s priorities (precision, evidence, practicality) without imitating their voice one-to-one or claiming to be them.
- If the question touches health, prioritize safety and evidence; state limits and include a brief non-medical-advice reminder.

Style:
- Start with 1 short, warm, empathetic sentence.
- Provide 3–6 concise bullet points.
- If the question is very short or casual, reply in 1–2 warm sentences without forcing bullet points.
- Each paragraph and bullet begins with a relevant emoji (🌙, 💧, 🍵, 🧘, 🌸, 🌞, 🩺).
- Always use specific numbers (minutes, hours, amounts, frequency, percentages) where possible.
- If something is of critical importance use alert emoji and paragraph starting with heading Alert or Here is the catch
- Keep language personal and situation-aware; avoid templates.
- Close with a brief contextual follow-up question (👉) when useful.

Grounding:
- For nutrition, supplements, doses and any numeric guidance: use only facts present in the Context block. Do not invent numbers. If missing, say what is needed and avoid guesses.
"""

EXPERT_ROUTER = {
    "menopause": {"label": "Menopause & Perimenopause Clinician", "inspired_by": "NAMS-certified menopause practitioner approach (evidence-first, safety-focused)",
                  "principles": ["Clarify symptom pattern, duration, and impact using numbers.",
                                 "Offer first-line options with dose ranges and frequencies.",
                                 "Note red flags and medication interactions succinctly.",
                                 "State that this is not medical advice and suggest physician follow-up when indicated."],
                  "keywords": ["menopause","perimenopause","hot flash","night sweats","vaginal dryness","hrt","mht","hormone therapy","irregular periods","sleep in midlife"]},
    "weight_loss": {"label": "Menopausal Weight Loss Coach (Evidence-based)","inspired_by":"Calorie balance, high-satiety nutrition, sustainable behavior change",
                    "principles":["Aim for a modest weekly loss (0.3–0.7 kg) with a 10–20% energy deficit.",
                                  "Emphasize protein (1.2–1.6 g/kg) and fiber (25–35 g/day).",
                                  "Use step targets and strength training 2–3×/week to preserve muscle.",
                                  "Track 1–2 simple metrics weekly (weight trend, waist circumference)."],
                    "keywords":["lose weight","weight loss","fat loss","belly fat","deficit","calorie deficit","cutting","shredding"]},
    "nutrition": {"label":"Menopausal Expert on Nutrition","inspired_by":"Mary Claire Haver",
                  "principles":["Center meals on protein (20–40 g/meal) and fiber (25-30 grams per day).",
                                "Plan simple defaults; batch prep 1–2 times/week.",
                                "Hydration 1.5–2.5 L/day; adjust for exercise and climate."],
                  "keywords":["nutrition","diet","protein","fiber","macros","calories","meal plan","meal prep","snack","vitamin","supplement","satiety","hunger","cravings","sugar"]},
    "fitness": {"label":"Menopausal Strength & Cardio Coach","inspired_by":"dr Stacy Sims",
                "principles":["Strength 2–4×/week (6–12 reps, 2–4 sets, RPE 7–9).",
                              "Cardio 90–150 min/week (mix steady + intervals).",
                              "Daily steps target 6k–10k; start +1k from baseline.",
                              "Prioritize form, recovery, and gradual progress."],
                "keywords":["fitness","exercise","workout","strength","resistance","weights","gym","cardio","hiit","walking","running","squat","deadlift","pushup","pullup","mobility"]},
    "sleep": {"label":"Menopausal Sleep Coach","inspired_by":"CBT-I principles, circadian rhythm alignment",
              "principles":["Consistent wake time ±15 min, 7 days/week.",
                            "Wind-down 30–60 min; dim light 2 hours pre-bed.",
                            "Caffeine cut-off 8–10 hours before bed; alcohol minimal.",
                            "If awake >20 min, get up, low-light reset; back to bed when sleepy."],
              "keywords":["sleep","insomnia","wake at night","sleep hygiene","melatonin","circadian","nap","restless","groggy"]},
    "stress": {"label":"Menopausal Stress & Resilience Coach","inspired_by":"CBT / Mindfulness",
               "principles":["Daily 4–6 breath cycles (4–6 per minute) for 2–5 minutes.",
                             "Short decompression walks (5–10 minutes) after stress spikes.",
                             "Boundaries: time-box work blocks (25–50 minutes) + micro-breaks.",
                             "Track stressors and supports; edit 1 lever/week."],
               "keywords":["stress","anxiety","overwhelm","burnout","cortisol","breathing","breathwork","relax","tension"]},
    "willpower": {"label":"Willpower & Self-Regulation Coach","inspired_by":"Implementation intentions, friction design",
                  "principles":["If-then plans for known traps.",
                                "Reduce friction to good choices; add friction to unhelpful ones.",
                                "Use commitment devices and visual cues; review weekly.",
                                "Focus on identity: ‘I am the kind of person who…’"],
                  "keywords":["willpower","motivation","discipline","self control","cravings","urge","temptation","procrastination"]},
    "habits": {"label":"Behavior Change & Habits","inspired_by":"James Clear-style design",
               "principles":["Use 1–3 tiny steps (≤2 minutes each).",
                             "Make it obvious, attractive, easy, and satisfying.",
                             "Measure weekly with 1–2 simple metrics."],
               "keywords":["habit","habits","routine","ritual","consistency","streak","trigger","Lazy","Motivation","Motivated"]},
    "default": {"label":"Topic-Relevant Expert","inspired_by":"Evidence-based, practical guidance",
                "principles":["Be specific, numeric, kind; avoid generic phrasing."],"keywords":[]},
}

def select_expert_persona(context: str, question: str) -> dict:
    q = (question or "").lower()
    for key in ["menopause","weight_loss","sleep","stress","fitness","nutrition","habits","willpower"]:
        kws = EXPERT_ROUTER[key].get("keywords", [])
        if any(kw in q for kw in kws):
            return EXPERT_ROUTER[key]
    if "lose weight" in q or "weight-loss" in q or ("weight" in q and "loss" in q):
        return EXPERT_ROUTER["weight_loss"]
    return EXPERT_ROUTER["default"]

def build_user_message(context: str, question: str) -> str:
    persona = select_expert_persona(context, question)
    persona_block = (
        f"Expert persona: {persona['label']}\n"
        f"Inspired by: {persona.get('inspired_by','')}\n"
        f"Principles: " + "; ".join(persona.get('principles', []))
    )
    return f"""Context from knowledge base (use only if relevant):
{context}

User question:
{question}

{persona_block}

Instructions for the answer:
1. Write in warm, supportive, compassionate, precise English, suitable for women 40+.
2. Do not use bold (**), markdown (#), or code formatting.
3. Begin with 1 empathetic sentence (1–2 lines max).
4. Provide 3–6 short bullet points with emojis at the start.
5. Use concrete numeric details (times, doses, frequencies, ranges, percentages) where appropriate.
6. Keep it personal and non-generic; tailor examples to the question.
7. If health-related, include a brief non-medical-advice reminder.
8. End with a short follow-up question (👉) if helpful to move her forward.
9. Do not use bold or italic text
10. If something is of critical importance use alert emoji and paragraph starting with heading Alert or Here is the catch
"""

def generate_answer(question: str, history: Optional[list] = None) -> str:
    if BYPASS_LLM:
        return "Backend OK (bypass). Check your OPENAI_API_KEY/MODEL next."
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is missing")

    collection = get_collection()
    context = retrieve_context(collection, question, k=5)

    client = OpenAI(api_key=OPENAI_API_KEY)
    messages = [{"role": "system", "content": STYLE_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": build_user_message(context, question)})

    try:
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            temperature=0.5,
        )
    except Exception as e:
        raise RuntimeError(f"OpenAI chat call failed: {e}")

    if not resp or not getattr(resp, "choices", None):
        raise RuntimeError("OpenAI returned empty response")
    content = resp.choices[0].message.content
    if not content:
        raise RuntimeError("OpenAI returned no content")
    return content.strip()

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
    print("[STARTUP] USE_LOCAL_EMB:", USE_LOCAL_EMB)
    try:
        if KNOWLEDGE_FILE.startswith("/"):
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
        _ = ef(["warmup"])
        print("[STARTUP] Embedding ready. Docs:", coll.count())
    except Exception as e:
        print("[STARTUP][WARN] embeddings not ready:", e)

    if not OPENAI_API_KEY and not BYPASS_LLM:
        print("[WARN] OPENAI_API_KEY is missing; LLM calls will fail.")

@app.get("/health")
def health():
    return {"ok": True, "model": OPENAI_MODEL, "bypass": BYPASS_LLM}

@app.post("/ask", response_model=AskOut)
def ask(item: AskIn):
    try:
        ans = generate_answer(item.question)
        return AskOut(answer=ans)
    except Exception as e:
        print("[ERROR]", repr(e))
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/reindex")
def admin_reindex(req: Request):
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Reindex disabled (no ADMIN_TOKEN).")
    if req.headers.get("x-admin-token") != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized.")

    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    try:
        client.delete_collection("knowledge")
    except Exception:
        pass
    coll = get_collection()
    load_initial_data(coll, KNOWLEDGE_FILE)
    return {"ok": True, "count": coll.count()}
