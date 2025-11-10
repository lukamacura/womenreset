/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Menu, Plus, Send, Trash, Trash2, X, Rocket, User } from "lucide-react";

/* ===== Theme ===== */
const THEME = {
  lavender: { 300: "#CBA7E2", 500: "#A56BCF", 600: "#8D55B7" },
  mint: { 200: "#D3FBF0", 300: "#C9F4E7", 400: "#9EE6D8" },
} as const;

/* ===== Types & Keys ===== */
type Msg = { role: "user" | "assistant"; content: string; ts?: number };
type Conversation = { id: string; title: string; createdAt: number; updatedAt: number; messages: Msg[] };

const SESSIONS_KEY = "Lisa-chat-sessions";
const ACTIVE_KEY = "Lisa-chat-active";
const DATE_LOCALE = "en-US";

const SUGGESTIONS = [
  "What are common symptoms across peri-, meno-, and post-menopause?",
  "Summarize top evidence on sleep interventions from the knowledge base",
  "Design a 2-week lifestyle plan for hot flashes and mood",
  "Compare HRT vs. non-hormonal options with pros/cons",
] as const;

/* ===== Utils ===== */
const uid = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
const safeLSGet = (k: string) => {
  try { return typeof window !== "undefined" ? localStorage.getItem(k) : null; } catch { return null; }
};
const safeLSSet = (k: string, v: string) => { try { if (typeof window !== "undefined") localStorage.setItem(k, v); } catch {} };
const lsRemove = (k: string) => { try { if (typeof window !== "undefined") localStorage.removeItem(k); } catch {} };

/** Build a compact history of previous turns (NOT including the current user message). */
function buildHistory(messages: Msg[], maxChars = 4000): string {
  const lines = messages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.trim()}`);
  const acc: string[] = [];
  let total = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (total + line.length + 1 > maxChars) break;
    acc.push(line);
    total += line.length + 1;
  }
  return acc.reverse().join("\n");
}

/** A tiny heuristic to keep a short memory_context. Swap with your richer logic if you have it. */
function deriveMemoryContext(allMessages: Msg[], charCap = 400): string {
  const lastUserTexts = allMessages.filter(m => m.role === "user").slice(-12).map(m => m.content).join("\n");
  const name = (lastUserTexts.match(/\bmy\s+name\s+is\s+([^\d,.;!?]{2,40})/i)?.[1] ?? "").trim();
  const age = (lastUserTexts.match(/\b(?:i['’]?\s*am|i['’]m)\s+(\d{2})\b/i)?.[1] ?? "").trim();
  const pronouns = (lastUserTexts.match(/\bmy\s+pronouns\s+are\s+(she\/her|they\/them|he\/him)\b/i)?.[1] ?? "").trim().toLowerCase();

  const prefs: string[] = [];
  if (/\bnon[-\s]?hormonal\b/i.test(lastUserTexts)) prefs.push("prefers non-hormonal");
  if (/\bhormone\s+replacement|(?:\b|\s)HRT\b/i.test(lastUserTexts)) prefs.push("open to HRT");
  if (/\bsleep\b|\binsomnia\b/i.test(lastUserTexts)) prefs.push("sleep-focused");
  if (/\bno (?:pills|meds|medications)\b/i.test(lastUserTexts)) prefs.push("avoids medications");

  const parts = [
    name && `Name: ${name.replace(/\s+/g, " ").split(" ").slice(0, 2).map(s => s[0]?.toUpperCase() + s.slice(1)).join(" ")}`,
    age && `Age: ${age}`,
    pronouns && `Pronouns: ${pronouns}`,
    prefs.length ? `Preferences: ${prefs.join(", ")}` : "",
  ].filter(Boolean);

  const s = parts.join(" · ") || "No prior user profile saved.";
  return s.length > charCap ? s.slice(0, charCap - 1) + "…" : s;
}

function MarkdownBubble({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-a:text-[#2EBE8D] prose-strong:font-semibold prose-p:my-2 prose-pre:my-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

function ChatPageInner() {
  /* ---- State ---- */
  const [sessions, setSessions] = useState<Conversation[]>(() => {
    const raw = safeLSGet(SESSIONS_KEY);
    if (raw) { try { return JSON.parse(raw) as Conversation[]; } catch {} }
    const id = uid();
    const now = Date.now();
    const conv: Conversation = {
      id,
      title: "Menopause Support Chat",
      createdAt: now,
      updatedAt: now,
      messages: [{
        role: "assistant",
        content: "Hi, I’m Lisa 🌸 - your menopause assistant trained on **200+ expert-reviewed documents**. How can I help today?",
        ts: now,
      }],
    };
    safeLSSet(SESSIONS_KEY, JSON.stringify([conv]));
    safeLSSet(ACTIVE_KEY, id);
    return [conv];
  });

  const [activeId, setActiveId] = useState<string | null>(() => {
    const raw = safeLSGet(ACTIVE_KEY);
    if (raw) return raw;
    const rawS = safeLSGet(SESSIONS_KEY);
    if (rawS) { try { const parsed: Conversation[] = JSON.parse(rawS); return parsed[0]?.id ?? null; } catch {} }
    return null;
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const active = useMemo(
    () => sessions.find(s => s.id === activeId) ?? null,
    [sessions, activeId]
  );

  /* ---- Persist / UX ---- */
  useEffect(() => { safeLSSet(SESSIONS_KEY, JSON.stringify(sessions)); if (activeId) safeLSSet(ACTIVE_KEY, activeId); }, [sessions, activeId]);
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [sessions, activeId, loading]);
  useEffect(() => { const el = textareaRef.current; if (!el) return; el.style.height = "0px"; el.style.height = Math.min(160, el.scrollHeight) + "px"; }, [input]);

  const upsertAndAppendMessage = useCallback((convId: string, msg: Msg, makeIfMissing?: () => Conversation) => {
    setSessions(prev => {
      const i = prev.findIndex(c => c.id === convId);
      if (i === -1) {
        const base = makeIfMissing?.() ?? { id: convId, title: "Menopause Support Chat", createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
        const created: Conversation = { ...base, messages: [...base.messages, { ...msg, ts: msg.ts ?? Date.now() }], updatedAt: Date.now() };
        return [created, ...prev];
      }
      const next = [...prev];
      const c = next[i];
      next[i] = {
        ...c,
        messages: [...c.messages, { ...msg, ts: msg.ts ?? Date.now() }],
        updatedAt: Date.now(),
        title: c.title === "Menopause Support Chat" && msg.role === "user" && msg.content ? msg.content.slice(0, 40) : c.title,
      };
      return next;
    });
  }, []);

  const newChat = useCallback((): string => {
    const id = uid();
    const now = Date.now();
    const conv: Conversation = {
      id, title: "Menopause Support Chat", createdAt: now, updatedAt: now,
      messages: [{ role: "assistant", content: "Hi, I’m Lisa 🌸 - your menopause assistant trained on 200+ documents. How can I help today?", ts: now }],
    };
    setSessions(prev => [conv, ...prev]);
    setActiveId(id);
    setMenuOpen(false);
    setInput("");
    return id;
  }, []);

  const openChat = useCallback((id: string) => { setActiveId(id); setMenuOpen(false); }, []);
  const deleteChat = useCallback((id: string) => {
    setSessions(prev => {
      const rest = prev.filter(x => x.id !== id);
      setActiveId(curr => (curr === id ? rest[0]?.id ?? null : curr));
      return rest;
    });
  }, []);

  /* ---- API ---- */
  const sendToAPI = useCallback(async (text: string, targetId?: string) => {
    const id = targetId ?? activeId; if (!id) return;

    // 1) Push the user's message to UI immediately
    upsertAndAppendMessage(
      id,
      { role: "user", content: text },
      () => ({
        id, title: "Menopause Support Chat", createdAt: Date.now(), updatedAt: Date.now(),
        messages: [{ role: "assistant", content: "Hi, I’m Lisa 🌸 - your menopause assistant trained on 200+ documents. How can I help today?", ts: Date.now() }],
      })
    );

    setInput("");
    setLoading(true);

    try {
      const convo = sessions.find(s => s.id === id);
      const priorMessages = (convo?.messages ?? []); // before we added the current user message
      const history = buildHistory(priorMessages);
      const memoryContext = deriveMemoryContext(priorMessages);

      const res = await fetch("/api/vectorshift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput: text,
          memoryContext,
          history,
        }),
        cache: "no-store",
      });

      const raw = await res.text();
      let data: any = null;
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok) {
        const msg = data?.error || data?.message || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }

      const reply: string =
        data?.reply ??
        data?.outputs?.output_0 ??
        data?.outputs?.output ??
        data?.outputs?.answer ??
        (data?.outputs ? (Object.values(data.outputs).find((v: any) => typeof v === "string") as string) : "") ??
        "⚠️ Empty reply";

      upsertAndAppendMessage(id, { role: "assistant", content: reply });
    } catch (e: any) {
      const safeMsg = String(e?.message || "unknown error").replace(/<[^>]*>/g, "");
      upsertAndAppendMessage(id, { role: "assistant", content: `Oops, something went wrong 🧠 - ${safeMsg}` });
    } finally {
      setLoading(false);
    }
  }, [activeId, sessions, upsertAndAppendMessage]);

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const id = activeId ?? newChat();
    void sendToAPI(text, id);
  }, [input, loading, activeId, newChat, sendToAPI]);

  /* ---- UI ---- */
  const SidebarContent = (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="mx-auto">
          <Image src="/lisa.png" alt="Lisa" width={112} height={112} className="rounded-full object-cover" />
        </div>
        <div className="text-sm font-semibold">Lisa</div>
      </div>

      <button
        onClick={newChat}
        className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-medium bg-foreground/5 transition hover:bg-foreground/10"
        title="New chat"
        aria-label="Start a new chat"
      >
        <Plus className="h-4 w-4" />
        New chat
      </button>

      <h4 className="text-xs font-semibold px-2 mt-4 mb-1 opacity-70">History</h4>
      <nav className="space-y-1 text-sm overflow-auto pr-1">
        {sessions.length === 0 && <div className="px-3 py-2 text-xs opacity-60">No conversations yet.</div>}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`group relative flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer hover:bg-foreground/5 ${s.id === activeId ? "bg-foreground/5" : ""}`}
            onClick={() => openChat(s.id)}
            title="Open chat"
            role="button"
            aria-label={`Open chat: ${s.title || "Conversation"}`}
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{s.title || "Conversation"}</div>
              <div className="text-[11px] opacity-60 truncate">
                {new Date(s.updatedAt).toLocaleString(DATE_LOCALE)}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation();
                setSessions((prev) => {
                  const rest = prev.filter((x) => x.id !== s.id);
                  setActiveId((curr) => (curr === s.id ? rest[0]?.id ?? null : curr));
                  return rest;
                });
              }}
              className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity text-foreground/60 hover:text-foreground"
              title="Delete chat"
              aria-label="Delete chat"
            >
              <Trash className="h-4 w-4" />
            </button>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-dvh w-full bg-[#FFEFF6]/40 text-foreground transition-all duration-500 ease-in-out">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-72 z-30" aria-label="Sidebar">
        <div className="h-full rounded-none border-r border-foreground/10 backdrop-blur p-4 shadow-sm" style={{ backgroundColor: `${THEME.lavender[300]}40` }}>
          {SidebarContent}
        </div>
      </aside>

      {/* Sidebar - Mobile Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
        className={`fixed inset-y-0 left-0 z-40 w-64 backdrop-blur-md border-r border-foreground/10 p-4 transform transition-transform duration-300 ease-in-out ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: `${THEME.mint[300]}E6` }}
      >
        <button onClick={() => setMenuOpen(false)} className="absolute right-3 top-3 text-foreground/70 hover:text-foreground transition" aria-label="Close menu">
          <X className="h-6 w-6" />
        </button>
        {SidebarContent}
      </div>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col transition-all duration-500 ease-in-out lg:pl-72">
        {/* Top bar (mobile) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-0 border-b border-foreground/10">
          <button onClick={() => setMenuOpen(true)} className="text-foreground/70 hover:text-foreground transition" aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/lisa.png" alt="Lisa" width={28} height={28} className="rounded-full" />
            <span className="font-semibold text-sm">Lisa</span>
          </div>
        </div>

        {/* Hero */}
        <div className="bg-transparent transition-all duration-500">
          <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:grid-cols-[1.2fr_1fr]">
            <div
              className="relative overflow-hidden rounded-2xl p-6 transition-all duration-700 hover:scale-[1.01]"
              style={{
                background: `linear-gradient(135deg, ${THEME.mint[200]} 0%, ${THEME.mint[400]} 40%, ${THEME.lavender[300]} 100%)`,
              }}
            >
              <div className="relative z-10">
                <p className="text-sm font-medium flex items-center gap-2" style={{ color: THEME.lavender[600] }}>
                  <Rocket className="h-4 w-4" />
                  Menopause Support
                </p>
                <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
                  Hi, it’s <span style={{ color: THEME.lavender[600] }}>Lisa</span> 👋
                  <br />
                  How can I support you today?
                </h1>
                <p className="mt-3 max-w-prose text-sm" style={{ color: "#475569" }}>
                  I can summarize trusted menopause resources, provide personalized guidance, and explain your body’s
                  changes - powered by a knowledge base of <strong>200+ clinical and wellness documents</strong>.
                </p>
              </div>
              <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full" style={{ backgroundColor: `${THEME.lavender[300]}4D` }} />
              <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full" style={{ backgroundColor: `${THEME.mint[400]}33` }} />
            </div>

            {/* Suggestions */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => { const id = activeId ?? newChat(); void sendToAPI(s, id); }}
                  className="rounded-lg border border-foreground/10 bg-white/50 px-3 py-2 text-left text-xs leading-5 text-foreground/70 hover:bg-white/70 transition-transform duration-300 hover:scale-[1.02]"
                  style={{ transitionDelay: `${i * 80}ms` }}
                  aria-label={`Use suggestion: ${s}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat */}
        <section ref={listRef} className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {(active?.messages ?? []).map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={`${m.ts ?? i}-${i}`} className={`group relative flex items-start gap-2 ${isUser ? "justify-end" : ""}`}>
                  {!isUser && (
                    <Image src="/profile.png" alt="Lisa avatar" width={40} height={40} className="mt-1 shrink-0 rounded-full  ring-foreground/10 object-cover" />
                  )}
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[78%] ${isUser ? "ml-auto bg-foreground text-background" : "bg-white/70 shadow-sm"}`}
                  >
                    <MarkdownBubble>{m.content}</MarkdownBubble>
                    {m.ts && <div className="mt-1 text-[10px] opacity-60">{new Date(m.ts).toLocaleTimeString(DATE_LOCALE, { hour: "2-digit", minute: "2-digit" })}</div>}
                  </div>
                  {isUser && (
                    <div className="relative mt-1 h-10 w-10 shrink-0 overflow-hidden rounded-full ring-foreground/10" aria-hidden>
                      <div className="flex h-full w-full items-center justify-center bg-foreground/10 text-foreground">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="flex items-center gap-2 pl-1 text-xs text-foreground/70">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Lisa is reviewing the knowledge base…
              </div>
            )}
          </div>
        </section>

        {/* Composer */}
        <footer className="sticky bottom-0 z-20 px-3 py-3 sm:px-4">
          <form onSubmit={(e) => { e.preventDefault(); const text = input.trim(); if (!text || loading) return; const id = activeId ?? newChat(); void sendToAPI(text, id); }} className="mx-auto flex w-full max-w-3xl items-end gap-2">
            <div className="relative w-full flex justify-center items-center">
              <label htmlFor="composer" className="sr-only">Message Lisa</label>
              <textarea
                id="composer"
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const text = input.trim(); if (!text || loading) return;
                    const id = activeId ?? newChat(); void sendToAPI(text, id);
                  }
                }}
                aria-label="Type your message"
                placeholder="Ask anything"
                className="w-full bg-white/90 backdrop-blur text-foreground placeholder:text-foreground/50 overflow-hidden resize-none rounded-xl border border-foreground/20 px-4 py-3 text-md leading-6 outline-none focus:ring-2 focus:ring-[#9EE6D8]"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="inline-flex h-12 items-center justify-center rounded-xl px-4 text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: THEME.lavender[600] }}
              aria-label="Send message"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                if (!active) return;
                setSessions((all) =>
                  all.map((c) =>
                    c.id === activeId
                      ? { ...c, messages: [{ role: "assistant", content: "Chat cleared. What’s next? ✨", ts: Date.now() }], updatedAt: Date.now() }
                      : c
                  )
                );
                setInput("");
              }}
              title="Clear chat"
              className="hidden md:inline-flex h-12 items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-foreground/5"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(ChatPageInner), { ssr: false });
