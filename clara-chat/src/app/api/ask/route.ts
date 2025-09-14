// app/api/ask/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "default-no-store";
export const runtime = "nodejs";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type AskBody = { question: string; history?: ChatMessage[] };
type AskResponse = { answer: string } | Record<string, unknown>;

const DEDUPE_WINDOW_MS = 5000;
const recent = new Map<string, { ts: number; payload: AskResponse }>();

function getBackendUrl(): string {
  const raw =
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:8000";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

// type guards
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function isChatRole(x: unknown): x is ChatRole {
  return x === "user" || x === "assistant";
}
function isChatMessage(x: unknown): x is ChatMessage {
  if (!isRecord(x)) return false;
  const role = x.role;
  const content = x.content;
  return isChatRole(role) && typeof content === "string";
}
function isAskBody(x: unknown): x is AskBody {
  if (!isRecord(x)) return false;
  const q = x.question;
  const h = x.history;
  const qOk = typeof q === "string" && q.trim().length > 0;
  const hOk = h === undefined || (Array.isArray(h) && h.every((m) => isChatMessage(m)));
  return qOk && hOk;
}

export async function POST(req: Request) {
  try {
    const parsed: unknown = await req.json().catch(() => null);
    if (!isAskBody(parsed)) {
      return NextResponse.json<AskResponse>(
        { answer: "Please provide a non-empty 'question' string." },
        { status: 400 }
      );
    }

    const body: AskBody = {
      question: parsed.question.trim(),
      history: parsed.history ?? [],
    };

    // dedupe
    const key = JSON.stringify(body);
    const now = Date.now();
    const cached = recent.get(key);
    if (cached && now - cached.ts < DEDUPE_WINDOW_MS) {
      return NextResponse.json<AskResponse>(cached.payload, { status: 200 });
    }

    const url = getBackendUrl();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    // call backend
    const upstream = await fetch(`${url}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    // be defensive: JSON or not
    let data: AskResponse;
    try {
      const ct = upstream.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await upstream.text();
        data = { answer: `Upstream error (non-JSON). ${text.slice(0, 300)}` };
      } else {
        const parsedUp: unknown = await upstream.json();
        data =
          typeof parsedUp === "object" && parsedUp !== null
            ? (parsedUp as Record<string, unknown>)
            : { answer: "Upstream returned non-JSON." };
      }
    } catch {
      data = { answer: "Upstream error (non-JSON)." };
    }

    recent.set(key, { ts: now, payload: data });
    if (recent.size > 200) {
      const it = recent.keys().next();
      if (!it.done) recent.delete(it.value);
    }

    return NextResponse.json<AskResponse>(data, { status: upstream.status });
  } catch (e) {
    const msg =
      (e as { name?: string })?.name === "AbortError"
        ? "Request timed out. Please try again."
        : "Server error. Please try again.";
    return NextResponse.json<AskResponse>({ answer: msg }, { status: 500 });
  }
}

export async function GET() {
  const url = getBackendUrl();
  try {
    const r = await fetch(`${url}/health`, { cache: "no-store" });
    const parsed: unknown = await r.json();
    const data: Record<string, unknown> =
      typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : { ok: false };
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
