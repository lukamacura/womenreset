/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { motion } from "framer-motion";
import {
  Loader2,
  Menu,
  Plus,
  Send,
  Trash,
  Trash2,
  X,
  Rocket,
  User,
  Copy,
  Check,
  Link as LinkIcon,
  Quote,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* ===== Theme (warmer + softer) ===== */
const THEME = {
  lavender: {
    100: "#F7F3FB",
    300: "#DCD1F0",
    500: "#B7A3DE",
    600: "#927DC7",
    800: "#57407F",
  },
  mint: {
    100: "#F1FAF8",
    200: "#DCEFED",
    300: "#C5E4E1",
    400: "#A8D4CC",
    700: "#4E9A92",
  },
  ink: {
    900: "#111827",
    700: "#374151",
    500: "#6B7280",
  },
  paper: {
    50: "#F9FAFB",
    100: "#FFFFFF",
  },
} as const;

/* ===== Types & Keys ===== */
type Msg = { role: "user" | "assistant"; content: string; ts?: number };
type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Msg[];
};

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
function splitByFences(src: string) {
  const parts: { code: boolean; text: string }[] = [];
  let i = 0;
  const fence = /```[\s\S]*?```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(src))) {
    if (m.index > i) parts.push({ code: false, text: src.slice(i, m.index) });
    parts.push({ code: true, text: m[0] });
    i = m.index + m[0].length;
  }
  if (i < src.length) parts.push({ code: false, text: src.slice(i) });
  return parts;
}

/** Robustly convert “markdown-looking” / HTML-ish text into real Markdown. */
function normalizeMarkdown(src: string): string {
  if (!src) return "";
  let s = src.replace(/\r\n?/g, "\n");

  // Unwrap single full-message fences like ```md ... ```
  s = s.replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i, "$1");

  // Remove zero-width & NBSP
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  s = s.replace(/\u00A0/g, " ");

  // Process non-code chunks for HTML-y artifacts
  const parts = splitByFences(s).map(({ code, text }) => {
    if (code) return { code, text };

    let t = text;

    // Basic HTML list to Markdown
    t = t
      .replace(/<\/li>\s*/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/?(ul|ol)[^>]*>/gi, "\n");

    // Paragraph-like tags → blank lines
    t = t.replace(/<\/?(p|div)[^>]*>/gi, "\n\n");

    // Strip other small tags but keep <br>
    t = t.replace(/<(?!br\s*\/?>)[^>\n]{1,60}>/gi, "");

    // Clean “ | ” separators inside bullet content
    t = t.replace(/^(\s*[-*]\s+.*)$/gm, (line) =>
      line.replace(/\s*\|\s*\|\s*/g, " — ").replace(/\s\|\s/g, " — "),
    );

    // Normalize ATX headings & ensure blank line before
    t = t.replace(
      /^[\t ]*(#{1,6})([ \t]+)([^\n]+)$/gm,
      (_m, hashes, _sp, txt) => `${hashes} ${txt.trim()}`,
    );
    t = t.replace(/([^\n])\n(#{1,6}\s+)/g, "$1\n\n$2");

    // Convert setext to ATX
    t = t.replace(/^([^\n]+)\n[=]{3,}\s*$/gm, (_m, tt) => `# ${tt.trim()}`);
    t = t.replace(/^([^\n]+)\n[-]{3,}\s*$/gm, (_m, tt) => `## ${tt.trim()}`);

    // Prevent accidental 4-space code blocks
    t = t.replace(/^\s{4}([^\n]+)/gm, (_m, line) => line);

    // Collapse excessive blank lines
    t = t.replace(/\n{3,}/g, "\n\n");

    return { code, text: t };
  });

  s = parts.map((p) => p.text).join("");
  return s.trim();
}

// IDs / LS helpers
const uid = () =>
  Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
const safeLSGet = (k: string) => {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(k) : null;
  } catch {
    return null;
  }
};
const safeLSSet = (k: string, v: string) => {
  try {
    if (typeof window !== "undefined") localStorage.setItem(k, v);
  } catch {}
};

/** Build a compact history of previous turns (NOT including the current user message). */
function buildHistory(messages: Msg[], maxChars = 4000): string {
  const lines = messages.map(
    (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.trim()}`,
  );
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

/* ===================== */
/*   Markdown Styling    */
/* ===================== */

// Allow only <br> HTML via rehype-raw + sanitize
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "br"],
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {}
      }}
      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border bg-white/80 px-2 py-1 text-[11px] shadow-sm backdrop-blur hover:bg-white"
      aria-label="Copy code"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}{" "}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function MarkdownBubble({ children }: { children: string }) {
  const text = useMemo(() => normalizeMarkdown(children), [children]);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const strip = (props: any) => {
    const { ...rest } = props || {};
    return rest;
  };

  const bubbleMotionProps = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 10, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0.7 },
      };

  return (
    <motion.div
      {...bubbleMotionProps}
      className="prose prose-slate max-w-none md:prose-lg prose-headings:font-semibold prose-p:my-3 prose-strong:font-semibold prose-a:no-underline prose-a:font-medium prose-li:my-1 prose-blockquote:font-normal prose-img:my-4"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        skipHtml={false}
        components={{
          h1(p: any) {
            const { children, ...rest } = p;
            return (
              <h1
                {...strip(rest)}
                className="mt-1 mb-3 flex items-center gap-2 bg-linear-to-r from-[#927DC7] to-[#4E9A92] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl"
              >
                {children}
              </h1>
            );
          },
          h2(p: any) {
            const { children, ...rest } = p;
            return (
              <h2
                {...strip(rest)}
                className="mt-6 mb-2 flex items-center gap-2 text-2xl font-bold text-slate-800"
              >
                <span className="inline-block h-5 w-1 rounded-full bg-linear-to-b from-[#DCD1F0] to-[#A8D4CC]" />
                {children}
              </h2>
            );
          },
          h3(p: any) {
            const { children, ...rest } = p;
            return (
              <h3
                {...strip(rest)}
                className="mt-5 mb-2 text-xl font-semibold text-slate-800"
              >
                {children}
              </h3>
            );
          },
          p(p: any) {
            const { children, ...rest } = p;
            return (
              <p
                {...strip(rest)}
                className="my-3 text-lg leading-7 text-slate-800/95"
              >
                {children}
              </p>
            );
          },
          hr() {
            return (
              <hr className="my-6 h-0.5 border-0 bg-linear-to-r from-transparent via-[#B7A3DE]/60 to-transparent" />
            );
          },
          a(p: any) {
            const { children, ...rest } = p;
            return (
              <a
                {...strip(rest)}
                className="group inline-flex items-center gap-1 underline decoration-2 decoration-dotted underline-offset-[5px] text-[#57407F] hover:underline-offset-[7px]"
                target="_blank"
                rel="noreferrer noopener"
              >
                <LinkIcon className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-px group-hover:scale-110" />
                {children}
              </a>
            );
          },
          ul(p: any) {
            const { children, ...rest } = p;
            return (
              <ul {...strip(rest)} className="my-3 space-y-1.5 pl-4">
                {children}
              </ul>
            );
          },
          ol(p: any) {
            const { children, ...rest } = p;
            return (
              <ol
                {...strip(rest)}
                className="my-3 list-decimal space-y-1.5 pl-5"
              >
                {children}
              </ol>
            );
          },
          li(p: any) {
            const { children, ...rest } = p;
            return (
              <li {...strip(rest)} className="relative pl-5 ">
                <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-transparent text-md" />
                {children}
              </li>
            );
          },
          blockquote(p: any) {
            const first =
              typeof p?.children?.[0] === "string"
                ? (p.children[0] as string)
                : "";
            const m = first.match(/^\s*\[\!(tip|note|caution)\]\s*/i);

            if (!m) {
              return (
                <blockquote className="my-4 rounded-xl border-l-4 border-[#4E9A92]/50 bg-[#F1FAF8] p-3 text-slate-800/90">
                  {p.children}
                </blockquote>
              );
            }

            const kind = m[1].toLowerCase() as "tip" | "note" | "caution";

            const colorMap: Record<
              "tip" | "note" | "caution",
              { ring: string; bg: string; text: string; title: string }
            > = {
              tip: {
                ring: "#4E9A92",
                bg: "#F1FAF8",
                text: "#155E54",
                title: "Tip",
              },
              note: {
                ring: "#927DC7",
                bg: "#F7F3FB",
                text: "#57407F",
                title: "Note",
              },
              caution: {
                ring: "#F59E0B",
                bg: "#FFF7ED",
                text: "#7C2D12",
                title: "Caution",
              },
            };

            const colors = colorMap[kind] ?? colorMap.note;

            const cleaned = Array.isArray(p.children)
              ? p.children.map((ch: any, i: number) =>
                  typeof ch === "string" && i === 0
                    ? ch.replace(/^\s*\[\!(tip|note|caution)\]\s*/i, "")
                    : ch,
                )
              : p.children;

            return (
              <blockquote
                className="my-4 rounded-xl border-l-4 p-3"
                style={{
                  borderColor: colors.ring,
                  backgroundColor: colors.bg,
                  color: colors.text,
                }}
              >
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <Quote className="h-4 w-4" /> {colors.title}
                </div>
                <div className="text-slate-800/90">{cleaned}</div>
              </blockquote>
            );
          },
          table(p: any) {
            const { children, ...rest } = p;
            return (
              <div className="my-5 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-sm">
                <table {...strip(rest)} className="w-full text-[15px]">
                  {children}
                </table>
              </div>
            );
          },
          thead(p: any) {
            const { children, ...rest } = p;
            return (
              <thead {...strip(rest)} className="bg-slate-50 text-slate-700">
                {children}
              </thead>
            );
          },
          th(p: any) {
            const { children, ...rest } = p;
            return (
              <th
                {...strip(rest)}
                className="px-3 py-2 text-left text-[13px] font-semibold uppercase tracking-wide text-slate-600"
              >
                {children}
              </th>
            );
          },
          td(p: any) {
            const { children, ...rest } = p;
            return (
              <td
                {...strip(rest)}
                className="border-t border-slate-100 px-3 py-2 text-slate-800/90"
              >
                {children}
              </td>
            );
          },
          img(p: any) {
            const { alt, ...rest } = p;
            return (
              <div className="my-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">
                <Image
                  {...strip(rest)}
                  alt={alt ?? ""}
                  className="mx-auto block h-auto max-h-80 w-full max-w-full object-contain"
                />
                {alt && (
                  <div className="px-3 pb-2 pt-1 text-center text-xs text-slate-500">
                    {alt}
                  </div>
                )}
              </div>
            );
          },
          code(p: any) {
            const { inline, className, children, ...rest } = p;
            const txt = String(children ?? "");
            const match = /language-([\w-]+)/.exec(className || "");
            const language = match?.[1];

            if (inline) {
              return (
                <code
                  {...strip(rest)}
                  className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[13px] font-mono"
                >
                  {txt}
                </code>
              );
            }

            return (
              <pre className="relative my-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/90">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/70 px-3 py-1.5 text-[11px] uppercase tracking-wide text-slate-500">
                  <span>{language || "code"}</span>
                </div>
                <div className="relative">
                  <CopyButton text={txt} />
                  <code
                    {...strip(rest)}
                    className="block min-w-full whitespace-pre px-3 pb-3 pt-2 font-mono text-[13px] leading-6"
                  >
                    {txt}
                  </code>
                </div>
              </pre>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </motion.div>
  );
}

/* ===== LocalStorage hydration with normalization ===== */
function hydrate(raw: string | null): Conversation[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Conversation[];
    return parsed.map((c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.role === "assistant"
          ? { ...m, content: normalizeMarkdown(m.content) }
          : m,
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
      messages: [
        {
          role: "assistant",
          content: normalizeMarkdown(
            "# Welcome ✨\n---\n Hi, I’m **MenoLisa** 🌸 - ask me anything",
          ),
          ts: now,
        },
      ],
    };
    safeLSSet(SESSIONS_KEY, JSON.stringify([conv]));
    safeLSSet(ACTIVE_KEY, id);
    return [conv];
  });

  const [activeId, setActiveId] = useState<string | null>(() => {
    const raw = safeLSGet(ACTIVE_KEY);
    if (raw) return raw;
    const rawS = safeLSGet(SESSIONS_KEY);
    if (rawS) {
      try {
        const parsed: Conversation[] = JSON.parse(rawS);
        return parsed[0]?.id ?? null;
      } catch {}
    }
    return null;
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ auth user id (no localStorage)
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
      },
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Chat list refs (auto-scroll)
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );

  /* ---- Persist ---- */
  useEffect(() => {
    safeLSSet(SESSIONS_KEY, JSON.stringify(sessions));
    if (activeId) safeLSSet(ACTIVE_KEY, activeId);
  }, [sessions, activeId]);

  /* ---- Auto-scroll behavior ---- */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const threshold = 120;
      const nearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      setStickToBottom(nearBottom);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (stickToBottom) {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [stickToBottom]);

  useEffect(() => {
    if (stickToBottom) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [sessions, activeId, loading, stickToBottom]);

  /* ---- Textarea autosize ---- */
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(160, el.scrollHeight) + "px";
  }, [input]);

  /* ---- Helpers ---- */
  const upsertAndAppendMessage = useCallback(
    (convId: string, msg: Msg, makeIfMissing?: () => Conversation) => {
      setSessions((prev) => {
        const i = prev.findIndex((c) => c.id === convId);
        if (i === -1) {
          const base =
            makeIfMissing?.() ?? {
              id: convId,
              title: "Menopause Support Chat",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              messages: [],
            };
          const created: Conversation = {
            ...base,
            messages: [
              ...base.messages,
              { ...msg, ts: msg.ts ?? Date.now() },
            ],
            updatedAt: Date.now(),
          };
          return [created, ...prev];
        }
        const next = [...prev];
        const c = next[i];
        next[i] = {
          ...c,
          messages: [...c.messages, { ...msg, ts: msg.ts ?? Date.now() }],
          updatedAt: Date.now(),
          title:
            c.title === "Menopause Support Chat" &&
            msg.role === "user" &&
            msg.content
              ? msg.content.slice(0, 40)
              : c.title,
        };
        return next;
      });
    },
    [],
  );

  const newChat = useCallback((): string => {
    const id = uid();
    const now = Date.now();
    const conv: Conversation = {
      id,
      title: "Menopause Support Chat",
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          role: "assistant",
          content: normalizeMarkdown(
            "# Hello, I’m **Lisa** 🌸\n\nReady for your next question!",
          ),
          ts: now,
        },
      ],
    };
    setSessions((prev) => [conv, ...prev]);
    setActiveId(id);
    setMenuOpen(false);
    setInput("");
    setStickToBottom(true);
    return id;
  }, []);

  const openChat = useCallback((id: string) => {
    setActiveId(id);
    setMenuOpen(false);
    setStickToBottom(true);
  }, []);

  /* ---- API ---- */
  const sendToAPI = useCallback(
    async (text: string, targetId?: string) => {
      const id = targetId ?? activeId;
      if (!id) return;

      upsertAndAppendMessage(
        id,
        { role: "user", content: text },
        () => ({
          id,
          title: "Menopause Support Chat",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [
            {
              role: "assistant",
              content: normalizeMarkdown(
                "# Hello, I’m **Lisa** 🌸\n\nHow can I help?",
              ),
              ts: Date.now(),
            },
          ],
        }),
      );

      setInput("");
      setLoading(true);
      setStickToBottom(true);

      try {
        const convo = sessions.find((s) => s.id === id);
        const priorMessages = convo?.messages ?? [];
        const history = buildHistory(priorMessages);

        // ✅ always use Supabase auth id
        let finalUserId = userId;
        if (!finalUserId) {
          const { data } = await supabase.auth.getUser();
          finalUserId = data.user?.id ?? null;
        }
        if (!finalUserId) throw new Error("User not authenticated.");

        const res = await fetch("/api/vectorshift", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: finalUserId,
            userInput: text,
            history,
          }),
          cache: "no-store",
        });

        const raw = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(raw);
        } catch {}

        if (!res.ok) {
          const msg =
            data?.error ||
            data?.message ||
            `${res.status} ${res.statusText}`;
          throw new Error(msg);
        }

        const rawReply: string =
          data?.reply ??
          data?.outputs?.output_0 ??
          data?.outputs?.output ??
          data?.outputs?.answer ??
          (data?.outputs
            ? (Object.values(data.outputs).find(
                (v: any) => typeof v === "string",
              ) as string)
            : "") ??
          "⚠️ Empty reply";

        const reply = normalizeMarkdown(rawReply);
        upsertAndAppendMessage(id, { role: "assistant", content: reply });
      } catch (e: any) {
        const safeMsg = String(e?.message || "unknown error").replace(
          /<[^>]*>/g,
          "",
        );
        upsertAndAppendMessage(id, {
          role: "assistant",
          content: `Oops, something went wrong 🧠 - ${safeMsg}`,
        });
      } finally {
        setLoading(false);
      }
    },
    [activeId, sessions, upsertAndAppendMessage, userId],
  );

  /* ---- UI ---- */
  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="mx-auto">
          <Image
            src="/lisa.png"
            alt="Lisa"
            width={112}
            height={112}
            className="rounded-full object-cover"
          />
        </div>
      </div>

      <button
        onClick={newChat}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground/5 px-3 py-2 font-medium transition hover:bg-foreground/10"
        title="New chat"
        aria-label="Start a new chat"
      >
        <Plus className="h-4 w-4" />
        New chat
      </button>

      <h4 className="mt-4 mb-1 px-2 text-xs font-semibold opacity-70">
        History
      </h4>
      <nav className="space-y-1 overflow-auto pr-1 text-sm">
        {sessions.length === 0 && (
          <div className="px-3 py-2 text-xs opacity-60">
            No conversations yet.
          </div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`group relative flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 hover:bg-foreground/5 ${
              s.id === activeId ? "bg-foreground/5" : ""
            }`}
            onClick={() => openChat(s.id)}
            title="Open chat"
            role="button"
            aria-label={`Open chat: ${s.title || "Conversation"}`}
          >
            <div className="min-w-0">
              <div className="truncate font-medium">
                {s.title || "Conversation"}
              </div>
              <div className="truncate text-[11px] opacity-60">
                {new Date(s.updatedAt).toLocaleString(DATE_LOCALE)}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSessions((prev) => {
                  const rest = prev.filter((x) => x.id !== s.id);
                  setActiveId((curr) =>
                    curr === s.id ? rest[0]?.id ?? null : curr,
                  );
                  return rest;
                });
              }}
              className="cursor-pointer text-foreground/60 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
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
      style={{
        background: `linear-gradient(
          180deg,
          ${THEME.paper[50]} 0%,
          ${THEME.mint[100]} 28%,
          ${THEME.paper[50]} 100%
        )`,
        color: THEME.ink[900],
      }}
    >
      {/* Sidebar - Desktop */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block"
        aria-label="Sidebar"
      >
        <div
          className="h-full rounded-none border-r border-foreground/10 p-4 shadow-sm backdrop-blur"
          style={{ backgroundColor: `${THEME.lavender[300]}40` }}
        >
          {SidebarContent}
        </div>
      </aside>

      {/* Sidebar - Mobile Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-foreground/10 p-4 backdrop-blur-md transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: `${THEME.mint[300]}E6` }}
      >
        <button
          onClick={() => setMenuOpen(false)}
          className="absolute right-3 top-3 text-foreground/70 transition hover:text-foreground"
          aria-label="Close menu"
        >
          <X className="h-6 w-6" />
        </button>
        {SidebarContent}
      </div>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col transition-all duration-500 ease-in-out lg:pl-72">
        {/* Top bar (mobile) */}
        <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-0 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            className="text-foreground/70 transition hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <Image
              src="/lisa.png"
              alt="Lisa"
              width={28}
              height={28}
              className="rounded-full"
            />
            <span className="text-sm font-semibold">Lisa</span>
          </div>
        </div>

        {/* Hero */}
        <div className="bg-transparent transition-all duration-500">
          <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:grid-cols-[1.2fr_1fr]">
            <div
              className="relative overflow-hidden rounded-2xl p-6 transition-all duration-700 hover:scale-[1.01]"
              style={{
                background: `linear-gradient(
                  135deg,
                  ${THEME.paper[100]} 0%,
                  ${THEME.mint[100]} 40%,
                  ${THEME.lavender[100]} 100%
                )`,
              }}
            >
              <div className="relative z-10">
                <p
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: THEME.lavender[600] }}
                >
                  <Rocket className="h-4 w-4" />
                  Menopause Support
                </p>
                <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
                  Hi, it’s{" "}
                  <span style={{ color: THEME.lavender[600] }}>Lisa</span> 👋
                  <br />
                  How can I support you today?
                </h1>
                <p
                  className="mt-3 max-w-prose text-[15.5px]"
                  style={{ color: THEME.ink[700] }}
                >
                  Personalized, kind guidance through menopause — grounded in a
                  curated library of{" "}
                  <strong>200+ expert-reviewed resources</strong>.
                </p>
              </div>
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full"
                style={{ backgroundColor: `${THEME.lavender[300]}40` }}
              />
              <div
                className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full"
                style={{ backgroundColor: `${THEME.mint[300]}40` }}
              />
            </div>

            {/* Suggestions */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => {
                    const id = activeId ?? newChat();
                    void sendToAPI(s, id);
                  }}
                  className="rounded-xl border border-foreground/10 bg-white/80 px-4 py-3 text-left text-[13.5px] leading-5 text-slate-700 shadow-sm transition-transform duration-300 hover:scale-[1.015] hover:bg-white"
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
        <section
          ref={listRef}
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-6"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {(active?.messages ?? []).map((m, i) => {
              const isUser = m.role === "user";
              return (
                <motion.div
                  key={`${m.ts ?? i}-${i}`}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 100, damping: 12 }}
                  className={`group relative flex items-start gap-2 ${
                    isUser ? "justify-end" : ""
                  }`}
                >
                  {!isUser && (
                    <Image
                      src="/profile.png"
                      alt="Lisa avatar"
                      width={40}
                      height={40}
                      className="mt-1 shrink-0 rounded-full object-cover ring-foreground/10"
                    />
                  )}
                  <div
                    className={`max-w-[88%] rounded-2xl px-5 py-4 text-[15.5px] leading-7 sm:max-w-[78%] ${
                      isUser
                        ? "ml-auto"
                        : "bg-white/90 ring-1 ring-black/5 backdrop-blur shadow-sm"
                    }`}
                    style={
                      isUser
                        ? { backgroundColor: THEME.lavender[100] }
                        : undefined
                    }
                  >
                    <MarkdownBubble>{m.content}</MarkdownBubble>
                    {m.ts && (
                      <div className="mt-2 text-[10px] opacity-60">
                        {new Date(m.ts).toLocaleTimeString(DATE_LOCALE, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                  {isUser && (
                    <div
                      className="relative mt-1 h-10 w-10 shrink-0 overflow-hidden rounded-full ring-foreground/10"
                      aria-hidden
                    >
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
                Crafting a personalized answer for you…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </section>

        {/* Composer */}
        <footer className="sticky bottom-0 z-20 px-3 py-3 sm:px-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = input.trim();
              if (!text || loading) return;
              const id = activeId ?? newChat();
              void sendToAPI(text, id);
            }}
            className="mx-auto flex w-full max-w-3xl items-end gap-2"
          >
            <div className="relative flex w-full items-center justify-center">
              <label htmlFor="composer" className="sr-only">
                Message Lisa
              </label>
              <textarea
                id="composer"
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const text = input.trim();
                    if (!text || loading) return;
                    const id = activeId ?? newChat();
                    void sendToAPI(text, id);
                  }
                }}
                aria-label="Type your message"
                placeholder="Ask anything"
                className="w-full resize-none overflow-hidden rounded-xl border border-foreground/20 bg-white/90 px-4 py-3 text-[15px] leading-6 text-foreground outline-none backdrop-blur placeholder:text-foreground/50 focus:ring-2 focus:ring-[#C5E4E1]"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="inline-flex h-12 items-center justify-center rounded-xl px-4 text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: THEME.lavender[600] }}
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
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
                          messages: [
                            {
                              role: "assistant",
                              content: normalizeMarkdown(
                                "---\n\n## Chat cleared ✨\n\n> Ready for your next question.\n\n---",
                              ),
                              ts: Date.now(),
                            },
                          ],
                          updatedAt: Date.now(),
                        }
                      : c,
                  ),
                );
                setInput("");
                setStickToBottom(true);
              }}
              title="Clear chat"
              className="hidden h-12 items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-foreground/5 md:inline-flex"
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
