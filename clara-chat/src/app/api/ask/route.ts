// app/api/ask/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "default-no-store";
export const runtime = "nodejs";

type AskBody = { question: string };
type AskResponse = { answer: string } | Record<string, unknown>;

const DEDUPE_WINDOW_MS = 5000;
const recent = new Map<string, { ts: number; payload: AskResponse }>();

function makeKey(body: AskBody): string {
  return JSON.stringify(body);
}

function getBackendUrl(): string {
  const raw =
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:8000";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function isAskBody(x: unknown): x is AskBody {
  if (typeof x !== "object" || x === null) return false;
  const q = (x as Record<string, unknown>).question;
  return typeof q === "string" && q.trim().length > 0;
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
    const body: AskBody = { question: parsed.question.trim() };

    // dedupe window
    const key = makeKey(body);
    const now = Date.now();
    const cached = recent.get(key);
    if (cached && now - cached.ts < DEDUPE_WINDOW_MS) {
      return NextResponse.json<AskResponse>(cached.payload, { status: 200 });
    }

    const url = getBackendUrl();

    // 30s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const upstream = await fetch(`${url}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    let data: AskResponse;
    try {
      const parsedUp: unknown = await upstream.json();
      data =
        typeof parsedUp === "object" && parsedUp !== null
          ? (parsedUp as Record<string, unknown>)
          : { answer: "Upstream returned non-JSON." };
    } catch {
      data = { answer: "Upstream error (non-JSON)." };
    }

    // save to dedupe cache (sa bezbednim brisanjem najstarijeg ključa)
    recent.set(key, { ts: now, payload: data });
    if (recent.size > 200) {
      const it = recent.keys().next();
      if (!it.done) {
        recent.delete(it.value); // ovde je sigurno string
      }
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
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : { ok: false };
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
