/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import {
  Loader2, Menu, Plus, Send, Trash, Trash2, X, Rocket, User,
  Copy, Check, Link as LinkIcon, Quote, Heading1,
} from "lucide-react";

/* ===== Theme (warmer + accessible) ===== */
const THEME = {
  lavender: { 100: "#F4ECFB", 300: "#CBA7E2", 500: "#A56BCF", 600: "#8D55B7", 800: "#5D3C80" },
  mint:     { 100: "#EFFFF9", 200: "#D3FBF0", 300: "#C9F4E7", 400: "#9EE6D8", 700: "#2EBE8D" },
  ink:      { 900: "#1E293B", 700: "#334155", 500: "#64748B" },
  paper:    { 50:  "#FAFAFB", 100:"#FFFFFF" },
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
/** Robustly convert “markdown-looking” text into real Markdown. */
function normalizeMarkdown(src: string): string {
  if (!src) return "";
  let s = src.replace(/\r\n?/g, "\n");

  // Unwrap single full-message fences like ```md ... ```
  s = s.replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i, "$1");

  // Remove zero-width & NBSP
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  s = s.replace(/\u00A0/g, " ");

  // Normalize ATX headings & ensure blank line before
  s = s.replace(/^[\t ]*(#{1,6})([ \t]+)([^\n]+)$/gm, (_m, hashes, _sp, text) => `${hashes} ${text.trim()}`);
  s = s.replace(/([^\n])\n(#{1,6}\s+)/g, "$1\n\n$2");

  // Convert setext to ATX
  s = s.replace(/^([^\n]+)\n[=]{3,}\s*$/gm, (_m, t) => `# ${t.trim()}`);
  s = s.replace(/^([^\n]+)\n[-]{3,}\s*$/gm, (_m, t) => `## ${t.trim()}`);

  // Prevent accidental 4-space code blocks
  s = s.replace(/^\s{4}([^\n]+)/gm, (_m, line) => line);

  // Collapse excessive blank lines
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}

const uid = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
const safeLSGet = (k: string) => { try { return typeof window !== "undefined" ? localStorage.getItem(k) : null; } catch { return null; } };
const safeLSSet = (k: string, v: string) => { try { if (typeof window !== "undefined") localStorage.setItem(k, v); } catch {} };

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

/* ===================== */
/*   Markdown Styling    */
/* ===================== */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {}
      }}
      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border bg-white/80 px-2 py-1 text-[11px] shadow-sm backdrop-blur hover:bg-white"
      aria-label="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
    </button>
  );
}

function MarkdownBubble({ children }: { children: string }) {
  // Normalize at render (bulletproof against old/badly stored messages)
  const text = useMemo(() => normalizeMarkdown(children), [children]);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const enter = prefersReduced ? {} : { initial: { y: 8, opacity: 0 }, animate: { y: 0, opacity: 1 } };

  const strip = (props: any) => {
    const { node, inline, ordered, ...rest } = props || {};
    return rest;
  };

  return (
    <div className="prose prose-slate max-w-none md:prose-lg prose-headings:font-semibold prose-p:my-3 prose-strong:font-semibold prose-a:no-underline prose-a:font-medium prose-li:my-1 prose-blockquote:font-normal">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1(p: any) {
            const { children, ...rest } = p;
            return (
              <motion.div layout {...enter}>
                <h1
                  {...strip(rest)}
                  className="mt-1 mb-3 text-2xl md:text-[26px] font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-[#8D55B7] to-[#2EBE8D] flex items-center gap-2"
                >
                  <Heading1 className="h-5 w-5" />
                  {children}
                </h1>
                <div className="h-0.5 w-16 rounded-full bg-linear-to-r from-[#CBA7E2] to-[#9EE6D8]" />
              </motion.div>
            );
          },
          h2(p: any) {
            const { children, ...rest } = p;
            return (
              <motion.div layout {...enter}>
                <h2
                  {...strip(rest)}
                  className="mt-6 mb-2 text-xl md:text-[20px] font-bold text-slate-800 flex items-center gap-2"
                >
                  <span className="inline-block h-5 w-1 rounded-full bg-linear-to-b from-[#CBA7E2] to-[#2EBE8D]" />
                  {children}
                </h2>
              </motion.div>
            );
          },
          h3(p: any) {
            const { children, ...rest } = p;
            return (
              <motion.div layout {...enter}>
                <h3 {...strip(rest)} className="mt-5 mb-2 text-[17px] font-semibold text-slate-800">
                  {children}
                </h3>
              </motion.div>
            );
          },
          p(p: any) {
            const { children, ...rest } = p;
            return (
              <motion.div layout {...enter}>
                <p {...strip(rest)} className="leading-7 text-slate-800/95">
                  {children}
                </p>
              </motion.div>
            );
          },
          hr() {
            return (
              <motion.hr
                layout
                {...(prefersReduced ? {} : { initial: { scaleX: 0, opacity: 0 }, animate: { scaleX: 1, opacity: 1 } })}
                transition={{ type: "spring", stiffness: 80, damping: 18 }}
                className="my-6 h-0.5 border-0 bg-linear-to-r from-transparent via-[#A56BCF]/60 to-transparent"
              />
            );
          },
          a(p: any) {
            const { children, ...rest } = p;
            return (
              <motion.div layout {...enter}>
                <a
                  {...strip(rest)}
                  className="group inline-flex items-center gap-1 underline decoration-2 decoration-dotted underline-offset-[5px] hover:underline-offset-[7px] text-[#5D3C80]"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <LinkIcon className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-px" />
                  {children}
                </a>
              </motion.div>
            );
          },
          ul(p: any) {
            const { children, ...rest } = p;
            return (
              <motion.div layout {...enter}>
                <ul {...strip(rest)} className="my-3 space-y-2 pl-4">
                  {children}
                </ul>
              </motion.div>
            );
          },
          ol(p: any) {
            const { children, ...rest } = p;
            return (
              <motion.div layout {...enter}>
                <ol {...strip(rest)} className="my-3 space-y-2 pl-5 list-decimal">
                  {children}
                </ol>
              </motion.div>
            );
          },
          li(p: any) {
            const { children, ...rest } = p;
            return (
              <motion.div layout {...enter}>
                <li {...strip(rest)} className="relative pl-5">
                  <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-linear-to-br from-[#CBA7E2] to-[#2EBE8D]" />
                  {children}
                </li>
              </motion.div>
            );
          },
          blockquote(p: any) {
            const first = typeof p?.children?.[0] === "string" ? (p.children[0] as string).toLowerCase() : "";
            const kind = first.includes("[!tip]") ? "Tip"
              : first.includes("[!note]") ? "Note"
              : first.includes("[!caution]") ? "Caution"
              : "Insight";
            const colors = {
              Tip:     { ring: "#2EBE8D", bg: "#F0FFF9", text: "#155E54" },
              Note:    { ring: "#8D55B7", bg: "#F7F2FB", text: "#5D3C80" },
              Caution: { ring: "#F59E0B", bg: "#FFF7ED", text: "#7C2D12" },
              Insight: { ring: "#A56BCF", bg: "#F7F2FB", text: "#5D3C80" },
            }[kind];

            return (
              <motion.div layout {...enter}>
                <blockquote
                  className="my-4 rounded-xl border-l-4 p-3"
                  style={{ borderColor: colors.ring, backgroundColor: colors.bg, color: colors.text }}
                >
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <Quote className="h-4 w-4" /> {kind}
                  </div>
                  <div className="text-slate-800/90">
                    {Array.isArray(p.children)
                      ? p.children.map((ch: any) =>
                          typeof ch === "string" ? ch.replace(/\[\!(tip|note|caution)\]\s*/i, "") : ch
                        )
                      : p.children}
                  </div>
                </blockquote>
              </motion.div>
            );
          },
          table(p: any) {
            const { children, ...rest } = p;
            return (
              <motion.div layout {...enter} className="my-5 overflow-hidden rounded-xl ring-1 ring-black/5 bg-white/80">
                <table {...strip(rest)} className="w-full text-[15px]">
                  {children}
                </table>
              </motion.div>
            );
          },
          thead(p: any) {
            const { children, ...rest } = p;
            return <thead {...strip(rest)} className="bg-slate-50 text-slate-700">{children}</thead>;
          },
          th(p: any) {
            const { children, ...rest } = p;
            return <th {...strip(rest)} className="px-3 py-2 text-left font-semibold">{children}</th>;
          },
          td(p: any) {
            const { children, ...rest } = p;
            return <td {...strip(rest)} className="px-3 py-2 border-t text-slate-800/90">{children}</td>;
          },
          code(p: any) {
            const { inline, children, ...rest } = p;
            const txt = String(children ?? "");
            if (inline) {
              return (
                <code {...strip(rest)} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[13px] font-mono">
                  {txt}
                </code>
              );
            }
            return (
              <motion.pre layout {...enter} className="relative my-3 overflow-auto rounded-xl border bg-slate-50 p-3">
                <CopyButton text={txt} />
                <code {...strip(rest)} className="block min-w-full whitespace-pre font-mono text-[13px] leading-6">
                  {txt}
                </code>
              </motion.pre>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/* ===== LocalStorage hydration with normalization ===== */
function hydrate(raw: string | null): Conversation[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Conversation[];
    return parsed.map(c => ({
      ...c,
      messages: c.messages.map(m =>
        m.role === "assistant" ? { ...m, content: normalizeMarkdown(m.content) } : m
      ),
    }));
  } catch {
    return null;
  }
}

function ChatPageInner() {
  /* ---- State ---- */
  const [sessions, setSessions] = useState<Conversation[]>(() => {
    const normalized = hydrate(safeLSGet(SESSIONS_KEY));
    if (normalized) return normalized;

    const id = uid();
    const now = Date.now();
    const conv: Conversation = {
      id,
      title: "Menopause Support Chat",
      createdAt: now,
      updatedAt: now,
      messages: [{
        role: "assistant",
        content: normalizeMarkdown(
          "# Welcome ✨\n\n— Hi, I’m **Lisa** 🌸 — your companion through menopause. Ask anything and you’ll get a beautiful, structured *Markdown* reply with sections, lists and gentle dividers."
        ),
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
      messages: [{
        role: "assistant",
        content: normalizeMarkdown("# Hello, I’m **Lisa** 🌸\n\nReady for your next question!"),
        ts: now
      }],
    };
    setSessions(prev => [conv, ...prev]);
    setActiveId(id);
    setMenuOpen(false);
    setInput("");
    return id;
  }, []);

  const openChat = useCallback((id: string) => { setActiveId(id); setMenuOpen(false); }, []);

  /* ---- API ---- */
  const sendToAPI = useCallback(async (text: string, targetId?: string) => {
    const id = targetId ?? activeId; if (!id) return;

    // 1) Push the user's message to UI immediately
    upsertAndAppendMessage(
      id,
      { role: "user", content: text },
      () => ({
        id, title: "Menopause Support Chat", createdAt: Date.now(), updatedAt: Date.now(),
        messages: [{ role: "assistant", content: normalizeMarkdown("# Hello, I’m **Lisa** 🌸\n\nHow can I help?"), ts: Date.now() }],
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
        body: JSON.stringify({ userInput: text, memoryContext, history }),
        cache: "no-store",
      });

      const raw = await res.text();
      let data: any = null;
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok) {
        const msg = data?.error || data?.message || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }

      const rawReply: string =
        data?.reply ??
        data?.outputs?.output_0 ??
        data?.outputs?.output ??
        data?.outputs?.answer ??
        (data?.outputs ? (Object.values(data.outputs).find((v: any) => typeof v === "string") as string) : "") ??
        "⚠️ Empty reply";

      const reply = normalizeMarkdown(rawReply);
      upsertAndAppendMessage(id, { role: "assistant", content: reply });
    } catch (e: any) {
      const safeMsg = String(e?.message || "unknown error").replace(/<[^>]*>/g, "");
      upsertAndAppendMessage(id, { role: "assistant", content: `Oops, something went wrong 🧠 - ${safeMsg}` });
    } finally {
      setLoading(false);
    }
  }, [activeId, sessions, upsertAndAppendMessage]);

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
    <div
      className="flex min-h-dvh w-full text-foreground transition-all duration-500 ease-in-out"
      style={{ background: `linear-gradient(180deg, ${THEME.mint[100]} 0%, ${THEME.paper[50]} 60%)`, color: THEME.ink[900] }}
    >
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
                <p className="mt-3 max-w-prose text-[15.5px]" style={{ color: THEME.ink[700] }}>
                  Personalized, kind guidance through menopause — grounded in a curated library of <strong>200+ expert-reviewed resources</strong>.
                </p>
              </div>
              <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full" style={{ backgroundColor: `${THEME.lavender[300]}4D` }} />
              <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full" style={{ backgroundColor: `${THEME.mint[400]}33` }} />
            </div>

            {/* Suggestions → calm cards */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => { const id = activeId ?? newChat(); void sendToAPI(s, id); }}
                  className="rounded-xl border border-foreground/10 bg-white/80 px-4 py-3 text-left text-[13.5px] leading-5 text-slate-700 hover:bg-white transition-transform duration-300 hover:scale-[1.015] shadow-sm"
                  style={{ transitionDelay: `${i * 70}ms` }}
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
                <motion.div
                  key={`${m.ts ?? i}-${i}`}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 100, damping: 12 }}
                  className={`group relative flex items-start gap-2 ${isUser ? "justify-end" : ""}`}
                >
                  {!isUser && (
                    <Image src="/profile.png" alt="Lisa avatar" width={40} height={40} className="mt-1 shrink-0 rounded-full ring-foreground/10 object-cover" />
                  )}
                  <div
                    className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-5 py-4 text-[15.5px] leading-7 ${isUser ? "ml-auto bg-[#F4ECFB]" : "bg-white/85 backdrop-blur shadow-sm ring-1 ring-black/5"}`}
                  >
                    <MarkdownBubble>{m.content}</MarkdownBubble>
                    {m.ts && <div className="mt-2 text-[10px]  opacity-60">{new Date(m.ts).toLocaleTimeString(DATE_LOCALE, { hour: "2-digit", minute: "2-digit" })}</div>}
                  </div>
                  {isUser && (
                    <div className="relative mt-1 h-10 w-10 shrink-0 overflow-hidden rounded-full ring-foreground/10" aria-hidden>
                      <div className="flex h-full w-full items-center justify-center bg-foreground/10 text-foreground">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
            {loading && (
              <div className="flex items-center gap-2 pl-1 text-xs text-foreground/70">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Lisa is thinking…
              </div>
            )}
          </div>
        </section>

        {/* Composer */}
        <footer className="sticky bottom-0 z-20 px-3 py-3 sm:px-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = input.trim(); if (!text || loading) return;
              const id = activeId ?? newChat(); void sendToAPI(text, id);
            }}
            className="mx-auto flex w-full max-w-3xl items-end gap-2"
          >
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
                className="w-full bg-white/90 backdrop-blur text-foreground placeholder:text-foreground/50 overflow-hidden resize-none rounded-xl border border-foreground/20 px-4 py-3 text-[15px] leading-6 outline-none focus:ring-2 focus:ring-[#9EE6D8]"
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
                const id = activeId;
                if (!id) return;
                setSessions((all) =>
                  all.map((c) =>
                    c.id === id
                      ? {
                          ...c,
                          messages: [{
                            role: "assistant",
                            content: normalizeMarkdown("---\n\n## Chat cleared ✨\n\n> [!note] Ready for your next question.\n\n---"),
                            ts: Date.now()
                          }],
                          updatedAt: Date.now()
                        }
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
