# main.py
import os
import json
import shutil
import traceback
import hashlib
from typing import List, Optional
from typing import Literal

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
USE_LOCAL_EMB = os.getenv("USE_LOCAL_EMB", "false").lower() == "true"
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "/var/tmp/chroma")
KNOWLEDGE_FILE = os.getenv("KNOWLEDGE_FILE", "data/knowledge.jsonl")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
FRONTEND_ORIGINS = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "*").split(",") if o.strip()]
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")
BYPASS_LLM = os.getenv("BYPASS_LLM", "0") == "1"

# ---- Token/Chunk utils ----
def approx_tokens(s: str) -> int:
  return max(1, len(s) // 4)

MAX_CHARS_PER_CHUNK = 1200
CHUNK_OVERLAP = 120
EMB_MAX_TOKENS_PER_REQ = 280_000
EMB_MAX_BATCH_SIZE = 128
ADD_BATCH_SIZE = 200

def split_into_chunks(text: str, max_chars: int = MAX_CHARS_PER_CHUNK, overlap: int = CHUNK_OVERLAP):
  text = (text or "").strip()
  if not text: return []
  if len(text) <= max_chars: return [text]
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
      if not texts: return []
      vectors, batch, tok_sum = [], [], 0
      for t in texts:
        t = t or ""
        t_tok = approx_tokens(t)
        if batch and (len(batch) >= EMB_MAX_BATCH_SIZE or tok_sum + t_tok > EMB_MAX_TOKENS_PER_REQ):
          resp = self.client.embeddings.create(model=self.model, input=batch)
          vectors.extend([d.embedding for d in resp.data])
          batch, tok_sum = [], 0
        batch.append(t); tok_sum += t_tok
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

def _safe_id(rec, fallback):
  raw = f"{rec.get('topic','')}_{rec.get('subtopic','')}_{rec.get('id',fallback)}"
  h = hashlib.md5(raw.encode("utf-8")).hexdigest()[:8]
  return f"{rec.get('id', fallback)}__{h}"

def _yield_records_jsonl(path: str):
  with open(path, "r", encoding="utf-8") as f:
    idx = 0
    for line in f:
      line = line.strip()
      if not line:
        idx += 1
        continue
      rec = json.loads(line)
      base_id = _safe_id(rec, f"doc_{idx+1}")
      txt = (rec.get("text") or "").strip()
      meta = rec.get("metadata") or {}
      idx += 1
      if not txt: continue
      chunks = split_into_chunks(txt)
      for ci, chunk in enumerate(chunks):
        out_meta = dict(meta)
        out_meta["source_id"] = base_id
        out_meta["chunk_index"] = ci + 1
        yield chunk, f"{base_id}__c{ci+1}", out_meta

def _yield_records_json(path: str):
  arr = json.load(open(path, "r", encoding="utf-8"))
  for i, rec in enumerate(arr):
    base_id = _safe_id(rec, f"doc_{i+1}")
    txt = (rec.get("text") or "").strip()
    meta = rec.get("metadata") or {}
    if not txt: continue
    chunks = split_into_chunks(txt)
    for ci, chunk in enumerate(chunks):
      out_meta = dict(meta)
      out_meta["source_id"] = base_id
      out_meta["chunk_index"] = ci + 1
      yield chunk, f"{base_id}__c{ci+1}", out_meta

def load_initial_data(collection, path=KNOWLEDGE_FILE):
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

  docs, ids, metas, added = [], [], [], 0
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

def retrieve_context(collection, question: str, k: int = 5, threshold: float = 0.45) -> str:
  try:
    res = collection.query(query_texts=[question], n_results=k, include=["documents", "distances", "ids"]) or {}
  except Exception as e:
    print("[CTX][WARN] retrieval failed:", repr(e))
    return ""
  docs = (res.get("documents") or [[]])[0]
  dists = (res.get("distances") or [[]])[0]
  picked, seen = [], set()
  for d, dist in zip(docs, dists):
    if not d: continue
    if dist is None or dist > threshold: continue
    t = d.strip()
    if t and t not in seen:
      picked.append(t); seen.add(t)
  return "\n---\n".join(picked[:k])

STYLE_PROMPT = """
You are a warm, clear, and supportive assistant for women 40+.

Always respond in the SAME language as the user’s query.

Tone:
- Gentle, empathetic, encouraging.
- Practical and precise; avoid vague or generic advice.
- Use everyday, natural language.
- Do not use markdown (** or #) or code styling in the output.

Expert Persona:
- Adopt the most relevant expert persona for the user’s question, based on the EXPERT_ROUTER notes.
- Reflect the expert’s priorities (precision, evidence, practicality) without imitating any specific person or claiming credentials you don’t have.
- If the question touches health, prioritize safety and evidence; state limits and include a brief non-medical-advice reminder.

Style:
- Start with 1 short, warm, empathetic sentence.
- Provide 3–6 concise bullet points.
- If the question is very short or casual, reply in 1–2 warm sentences without forcing bullet points.
- Each paragraph and each bullet begins with ONE relevant emoji chosen from the list below.
- Always use specific numbers (minutes, hours, amounts, frequency, percentages) when available in the Context.
- If something is critically important, start a separate short paragraph with: ⚠️ Caution: ... (keep it under 2 lines).
- Keep language personal and situation-aware; avoid templates.
- Close with a brief contextual follow-up question (👉) when useful.
- Always mirror the language of the user’s query.

Emoji bank (pick 1 per bullet or paragraph):
Calm & Wellness: 🌸 🌿 ☕ 🕊️
Support & Warmth: 💛 🤗 🙌 ✨
Motivation & Energy: ⚡ 💪 🌞
Practical & Learning: 📝 📱 💡
Trust & Proof: ✅ 🛡️ 🎉

Grounding:
- For nutrition, supplements, doses and ANY numeric guidance: use ONLY facts present in the Context block.
- Do NOT invent numbers. If missing, say what data is needed and avoid guesses.
- Prefer ranges and frequencies exactly as stated in Context.
"""

EXPERT_ROUTER = {
    "menopause": {
        "label": "Menopause & Perimenopause Clinician",
        "inspired_by": "NAMS-informed, evidence-first, safety-focused approach",
        "principles": [
            "Clarify symptom pattern, duration, and impact using numbers.",
            "Offer first-line options with dose ranges and frequencies when present in Context.",
            "Note red flags and medication interactions succinctly.",
            "State that this is not medical advice; suggest clinician follow-up when indicated."
        ],
        "keywords": [
            "menopause","perimenopause","hot flash","night sweats","vaginal dryness",
            "hrt","mht","hormone therapy","irregular periods","sleep in midlife"
        ],
    },
    "weight_loss": {
        "label": "Menopausal Weight Loss Coach (Evidence-based)",
        "inspired_by": "Energy balance, high-satiety nutrition, sustainable behavior change",
        "principles": [
            "Aim for modest weekly loss using a sustainable energy deficit when Context provides numbers.",
            "Emphasize protein and fiber targets from Context; avoid inventing values.",
            "Use step targets and strength training 2–3×/week when appropriate.",
            "Track 1–2 simple metrics weekly (e.g., weight trend, waist)."
        ],
        "keywords": [
            "lose weight","weight loss","fat loss","belly fat","deficit","calorie deficit","cutting","shredding"
        ],
    },
    "nutrition": {
        "label": "Menopausal Expert on Nutrition",
        "inspired_by": "Protein- and fiber-centered meals; simple planning and hydration",
        "principles": [
            "Center meals on protein and fiber amounts ONLY if provided in Context.",
            "Plan simple defaults; batch prep 1–2 times/week.",
            "Hydration guidance only when numeric details exist in Context."
        ],
        "keywords": [
            "nutrition","diet","protein","fiber","macros","calories","meal plan","meal prep",
            "snack","vitamin","supplement","satiety","hunger","cravings","sugar"
        ],
    },
    "fitness": {
        "label": "Menopausal Strength & Cardio Coach",
        "inspired_by": "Strength + cardio with recovery and progression",
        "principles": [
            "Strength 2–4×/week; reps/sets/RPE only if numbers exist in Context.",
            "Cardio 90–150 min/week mix when Context supports; otherwise describe types without numbers.",
            "Daily steps guidance only if Context provides targets; focus on +1k from baseline heuristic."
        ],
        "keywords": [
            "fitness","exercise","workout","strength","resistance","weights","gym","cardio",
            "hiit","walking","running","squat","deadlift","pushup","pullup","mobility"
        ],
    },
    "sleep": {
        "label": "Menopausal Sleep Coach",
        "inspired_by": "CBT-I principles, circadian alignment",
        "principles": [
            "Consistent wake time; exact windows only when in Context.",
            "Wind-down and light hygiene specifics only if provided in Context.",
            "State safe limits for caffeine/alcohol if present in Context."
        ],
        "keywords": [
            "sleep","insomnia","wake at night","sleep hygiene","melatonin","circadian","nap","restless","groggy"
        ],
    },
    "stress": {
        "label": "Menopausal Stress & Resilience Coach",
        "inspired_by": "CBT / Mindfulness",
        "principles": [
            "Short breathing protocols and decompression walks; use numeric timing only if in Context.",
            "Time-boxing and micro-breaks; keep instructions simple and actionable."
        ],
        "keywords": [
            "stress","anxiety","overwhelm","burnout","cortisol","breathing","breathwork","relax","tension"
        ],
    },
    "willpower": {
        "label": "Willpower & Self-Regulation Coach",
        "inspired_by": "Implementation intentions, friction design",
        "principles": [
            "If-then plans for known traps.",
            "Reduce friction to good choices; add friction to unhelpful ones.",
            "Commitment devices and visual cues; review weekly."
        ],
        "keywords": [
            "willpower","motivation","discipline","self control","cravings","urge","temptation","procrastination"
        ],
    },
    "habits": {
        "label": "Behavior Change & Habits",
        "inspired_by": "Tiny steps; obvious, easy, satisfying",
        "principles": [
            "Use 1–3 tiny steps (≤2 minutes each).",
            "Measure weekly with 1–2 simple metrics."
        ],
        "keywords": [
            "habit","habits","routine","ritual","consistency","streak","trigger","lazy","motivation","motivated"
        ],
    },
    "default": {
        "label": "Topic-Relevant Expert",
        "inspired_by": "Evidence-based, practical guidance",
        "principles": ["Be specific, numeric, kind; avoid generic phrasing."],
        "keywords": [],
    },
}
def _is_short_fragment(s: str) -> bool:
    s = (s or "").strip()
    if not s: return False
    words = len([w for w in s.split() if w])
    return words <= 3 or (len(s) < 24 and not s.endswith((".", "?", "!", "…")))

def _repair_followup(question: str, history: Optional[list]) -> str:
    if not _is_short_fragment(question) or not history:
        return question
    last_assistant = next((m.get("content","") for m in reversed(history) if m.get("role") == "assistant"), "")
    last_user = next((m.get("content","") for m in reversed(history) if m.get("role") == "user"), "")
    if not last_assistant and not last_user:
        return question
    return (
        "Follow-up to the previous assistant message.\n"
        f"Previous assistant said:\n\"\"\"{(last_assistant or '')[:700]}\"\"\"\n\n"
        f"Previous user message (for context):\n\"\"\"{(last_user or '')[:300]}\"\"\"\n\n"
        f"User adds (short fragment): \"{question}\"\n\n"
        "Please interpret the fragment in-context and continue the same topic."
    )

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
  return f"""Context (use ONLY if relevant; never invent numbers):
{context}

User question (mirror this language exactly in your response):
{question}

{persona_block}

Instructions for the answer:
1) Write in warm, supportive, compassionate, precise language suitable for women 40+.
2) Do NOT use markdown or code formatting in the output.
3) Begin with 1 empathetic sentence (max 2 lines).
4) Provide 3–6 short bullet points with ONE emoji at the start of each bullet.
5) Use numeric details ONLY if present in Context (no guessing).
6) End with a short follow-up question (👉).
"""

def generate_answer(question: str, history: Optional[list] = None) -> str:
  orig_question = question
  question = _repair_followup(question, history)

  if BYPASS_LLM:
    return "Backend OK (bypass). Check your OPENAI_API_KEY/MODEL next."
  if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is missing")

  collection = get_collection()
  context = retrieve_context(collection, orig_question, k=5)   # <-- izmena

  client = OpenAI(api_key=OPENAI_API_KEY)

  # Natural turn order: SYSTEM -> history (user/assistant) -> USER
  messages = [{"role": "system", "content": STYLE_PROMPT}]
  if history:
    for m in history:
      if isinstance(m, dict) and m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str):
        messages.append({"role": m["role"], "content": m["content"]})
  messages.append({"role": "user", "content": build_user_message(context, question)})

  try:
    resp = client.chat.completions.create(
      model=OPENAI_MODEL,
      messages=messages,
      temperature=0.1,
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

class ChatMessage(BaseModel):
  role: Literal["user", "assistant"]
  content: str

class AskIn(BaseModel):
  question: str
  history: Optional[List[ChatMessage]] = None

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
    ans = generate_answer(item.question, history=[m.dict() for m in (item.history or [])])
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
