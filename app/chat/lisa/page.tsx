/* eslint-disable @typescript-eslint/no-unused-vars */
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

/* ===== Theme (matching app pink/purple theme, optimized for 40+ vision) ===== */
const THEME = {
  pink: {
    50: "#FDF2F8",   // Very light pink
    100: "#FCE7F3",  // Light pink (matches app background)
    200: "#FBCFE8",  // Lighter pink
    300: "#F9A8D4",  // Medium light pink
    400: "#F472B6",  // Medium pink (matches app primary)
    500: "#EC4899",  // Standard pink
    600: "#DB2777",  // Darker pink
    700: "#BE185D",  // Dark pink
    800: "#9F1239",  // Very dark pink
  },
  purple: {
    100: "#F3E8FF",  // Very light purple
    200: "#E9D5FF",  // Light purple
    300: "#D8B4FE",  // Medium light purple
    400: "#C084FC",  // Medium purple
    500: "#A855F7",  // Standard purple
    600: "#9333EA",  // Darker purple
    700: "#7E22CE",  // Dark purple
  },
  fuchsia: {
    100: "#FDF4FF",
    200: "#FAE8FF",
    300: "#F5D0FE",
    400: "#F0ABFC",
    500: "#E879F9",
    600: "#D946EF",
  },
  text: {
    900: "#1F2937",  // High contrast dark text
    800: "#374151",  // Dark text
    700: "#4B5563",  // Medium dark text
    600: "#6B7280",  // Medium text
    500: "#9CA3AF",  // Light text for placeholders
  },
  background: {
    light: "#FDF2F8",  // Matches app background #ffe9ef
    white: "#FFFFFF",
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

const DEFAULT_SUGGESTIONS = [
  "What are common symptoms across peri-, meno-, and post-menopause?",
  "Summarize top evidence on sleep interventions from the knowledge base",
  "Design a 2-week lifestyle plan for hot flashes and mood",
  "Compare HRT vs. non-hormonal options with pros/cons",
] as const;

// Helper to get personalized suggestions
async function getPersonalizedSuggestions(userId: string | null): Promise<string[]> {
  if (!userId) return [...DEFAULT_SUGGESTIONS];
  
  try {
    const suggestions: string[] = [];
    
    // Try to get tracker insights
    try {
      const trackerRes = await fetch("/api/tracker-insights?days=7");
      if (trackerRes.ok) {
        const trackerData = await trackerRes.json();
        const summary = trackerData.data;
        
        if (summary?.symptoms?.total > 0) {
          const topSymptom = Object.entries(summary.symptoms.byName || {})
            .sort(([, a]: any, [, b]: any) => b.count - a.count)[0];
          if (topSymptom) {
            suggestions.push(`I've been experiencing ${topSymptom[0]} - what can help?`);
          }
        }
        
        if (summary?.patterns?.insights?.length > 0) {
          const insight = summary.patterns.insights[0];
          if (insight.includes("improved") || insight.includes("decreasing")) {
            suggestions.push("What's working well for my symptoms?");
          }
        }
      }
    } catch (e) {
      // Ignore errors, use defaults
    }

    // Add time-based suggestions
    const hour = new Date().getHours();
    if (hour >= 20 || hour < 6) {
      suggestions.push("How can I improve my sleep during menopause?");
    } else if (hour >= 6 && hour < 12) {
      suggestions.push("What's a good morning routine for managing symptoms?");
    }

    // Fill remaining slots with defaults
    const usedDefaults = new Set<string>();
    for (const defaultSuggestion of DEFAULT_SUGGESTIONS) {
      if (suggestions.length >= 4) break;
      if (!suggestions.includes(defaultSuggestion) && !usedDefaults.has(defaultSuggestion)) {
        suggestions.push(defaultSuggestion);
        usedDefaults.add(defaultSuggestion);
      }
    }

    return suggestions.slice(0, 4);
  } catch (error) {
    return [...DEFAULT_SUGGESTIONS];
  }
}

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
      line.replace(/\s*\|\s*\|\s*/g, " - ").replace(/\s\|\s/g, " - "),
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
      className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg border-2 bg-white px-3 py-2 text-sm font-semibold shadow-md transition-all hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-300"
      style={{ borderColor: THEME.pink[300], color: THEME.text[800] }}
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

const MarkdownBubble = React.memo(function MarkdownBubble({ children }: { children: string }) {
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
      className="prose prose-slate max-w-none prose-lg md:prose-xl prose-headings:font-bold prose-p:my-4 prose-p:text-lg prose-p:leading-relaxed prose-strong:font-bold prose-a:no-underline prose-a:font-semibold prose-li:my-2 prose-li:text-lg prose-blockquote:font-normal prose-img:my-4 prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl"
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
                className="mt-1 mb-4 flex items-center gap-3 text-4xl font-extrabold tracking-tight md:text-5xl"
                style={{ color: THEME.pink[600] }}
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
                className="mt-6 mb-3 flex items-center gap-3 text-3xl font-bold"
                style={{ color: THEME.text[900] }}
              >
                <span className="inline-block h-6 w-1.5 rounded-full" style={{ backgroundColor: THEME.pink[400] }} />
                {children}
              </h2>
            );
          },
          h3(p: any) {
            const { children, ...rest } = p;
            return (
              <h3
                {...strip(rest)}
                className="mt-5 mb-3 text-2xl font-bold"
                style={{ color: THEME.text[900] }}
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
              <li {...strip(rest)} className="relative pl-6">
                <span className="absolute left-0 top-2.5 h-1.5 w-1.5 rounded-full bg-[#927DC7]/60" />
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
                <blockquote className="my-5 rounded-xl border-l-4 p-4 text-lg" style={{ borderColor: THEME.pink[400], backgroundColor: THEME.pink[50], color: THEME.text[800] }}>
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
              <div className="my-6 overflow-hidden rounded-xl border-2 bg-white shadow-md" style={{ borderColor: THEME.pink[200] }}>
                <table {...strip(rest)} className="w-full text-lg">
                  {children}
                </table>
              </div>
            );
          },
          thead(p: any) {
            const { children, ...rest } = p;
            return (
              <thead {...strip(rest)} className="font-semibold" style={{ backgroundColor: THEME.pink[100], color: THEME.text[800] }}>
                {children}
              </thead>
            );
          },
          th(p: any) {
            const { children, ...rest } = p;
            return (
              <th
                {...strip(rest)}
                className="px-4 py-3 text-left text-base font-bold uppercase tracking-wide"
                style={{ color: THEME.text[700] }}
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
                className="border-t px-4 py-3 text-lg"
                style={{ borderColor: THEME.pink[200], color: THEME.text[900] }}
              >
                {children}
              </td>
            );
          },
          img(p: any) {
            const { alt, ...rest } = p;
            return (
              <div className="my-5 overflow-hidden rounded-xl border-2 bg-white" style={{ borderColor: THEME.pink[200] }}>
                <Image
                  {...strip(rest)}
                  alt={alt ?? ""}
                  className="mx-auto block h-auto max-h-80 w-full max-w-full object-contain"
                />
                {alt && (
                  <div className="px-4 pb-3 pt-2 text-center text-sm font-semibold" style={{ color: THEME.text[600] }}>
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
                  className="rounded-md px-2 py-1 text-base font-mono"
                  style={{ backgroundColor: THEME.pink[100], color: THEME.text[900] }}
                >
                  {txt}
                </code>
              );
            }

            return (
              <pre className="relative my-4 overflow-hidden rounded-xl border-2 bg-white" style={{ borderColor: THEME.pink[200] }}>
                <div className="flex items-center justify-between border-b-2 px-4 py-2 text-sm uppercase tracking-wide font-semibold" style={{ borderColor: THEME.pink[200], backgroundColor: THEME.pink[100], color: THEME.text[700] }}>
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
});

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

  // start with no sessions; we'll create one on first mount
  return [];
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([...DEFAULT_SUGGESTIONS]);

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

  // Load personalized suggestions when userId is available
  useEffect(() => {
    if (userId) {
      getPersonalizedSuggestions(userId).then((sugs) => {
        setSuggestions(sugs);
      });
    }
  }, [userId]);

  // Chat list refs (auto-scroll)
  const listRef = useRef<HTMLDivElement>(null);
const bottomRef = useRef<HTMLDivElement>(null);
const didInitRef = useRef(false);
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

  const newChat = useCallback(async (): Promise<string> => {
    const id = uid();
    const now = Date.now();
    
    // Fetch personalized greeting
    let greeting = "# Hello, I'm **Lisa** 🌸\n\nReady for your next question!";
    
    if (userId) {
      try {
        const res = await fetch("/api/langchain-rag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            userInput: "",
            stream: false,
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.reply) {
            greeting = normalizeMarkdown(data.reply);
          }
        }
      } catch (error) {
        // Use default greeting on error
        console.error("Error fetching personalized greeting:", error);
      }
    }
    
    const conv: Conversation = {
      id,
      title: "Menopause Support Chat",
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          role: "assistant",
          content: greeting,
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
  }, [userId]);

  const openChat = useCallback((id: string) => {
    setActiveId(id);
    setMenuOpen(false);
    setStickToBottom(true);
  }, []);
    // Always start with a fresh chat when the page is opened
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    // Create a new chat and make it active on first mount,
    // regardless of any existing history.
    void newChat();
  }, [newChat]);


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
                "# Hello, I'm **Lisa** 🌸\n\nHow can I help?",
              ),
              ts: Date.now(),
            },
          ],
        }),
      );

      setInput("");
      setLoading(true);
      setIsStreaming(true);
      setStreamingContent("");
      setStreamingMessageId(id);
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

        const res = await fetch("/api/langchain-rag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: finalUserId,
            userInput: text,
            history,
            stream: true, // Enable streaming
          }),
          cache: "no-store",
        });

        if (!res.ok) {
          const errorText = await res.text();
          let errorData: any = null;
          try {
            errorData = JSON.parse(errorText);
          } catch {}
          const msg =
            errorData?.error ||
            errorData?.message ||
            `${res.status} ${res.statusText}`;
          throw new Error(msg);
        }

        // Check if response is streaming (text/event-stream) or JSON
        const contentType = res.headers.get("content-type");
        
        if (contentType?.includes("text/event-stream")) {
          // Handle streaming response
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          
          if (!reader) {
            throw new Error("No response body");
          }

          // Create a placeholder message for streaming if it doesn't exist
          setStreamingMessageId(id);
          setStreamingContent("");
          
          // Ensure there's a placeholder assistant message
          const convo = sessions.find((s) => s.id === id);
          const lastMsg = convo?.messages[convo.messages.length - 1];
          if (!lastMsg || lastMsg.role !== "assistant" || lastMsg.content) {
            upsertAndAppendMessage(id, { 
              role: "assistant", 
              content: "",
              ts: Date.now(),
            });
          }

          let buffer = "";
          let fullResponse = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.trim() && line.startsWith("data: ")) {
                  try {
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr) continue;
                    
                    const data = JSON.parse(jsonStr);
                    
                    if (data.type === "chunk" && data.content !== undefined) {
                      // Backend sends accumulated content, so use it directly
                      fullResponse = data.content;
                      setStreamingContent(fullResponse);
                      
                      // Smooth auto-scroll during streaming (debounced)
                      if (stickToBottom) {
                        requestAnimationFrame(() => {
                          if (bottomRef.current) {
                            bottomRef.current.scrollIntoView({
                              behavior: "smooth",
                              block: "end",
                            });
                          }
                        });
                      }
                    } else if (data.type === "done") {
                      // Streaming complete
                      const reply = normalizeMarkdown(fullResponse);
                      setSessions((prev) => {
                        const updated = prev.map((s) => {
                          if (s.id === id) {
                            const msgs = [...s.messages];
                            const lastMsg = msgs[msgs.length - 1];
                            if (lastMsg && lastMsg.role === "assistant" && !lastMsg.content) {
                              msgs[msgs.length - 1] = { ...lastMsg, content: reply };
                            } else {
                              msgs.push({ role: "assistant", content: reply, ts: Date.now() });
                            }
                            return { ...s, messages: msgs, updatedAt: Date.now() };
                          }
                          return s;
                        });
                        return updated;
                      });
                      setStreamingContent("");
                      setStreamingMessageId(null);
                      setIsStreaming(false);
                      setLoading(false);
                      return;
                    } else if (data.type === "error") {
                      throw new Error(data.error || "Streaming error");
                    }
                  } catch (e) {
                    // Skip malformed JSON, but log for debugging
                    if (line.trim() !== "data: [DONE]" && !line.trim().startsWith(":")) {
                      console.warn("Error parsing SSE data:", e, "Line:", line);
                    }
                  }
                }
              }
            }

            // Fallback: if we didn't get a "done" message, save what we have
            if (fullResponse) {
              const reply = normalizeMarkdown(fullResponse);
              setSessions((prev) => {
                const updated = prev.map((s) => {
                  if (s.id === id) {
                    const msgs = [...s.messages];
                    const lastMsg = msgs[msgs.length - 1];
                    if (lastMsg && lastMsg.role === "assistant" && !lastMsg.content) {
                      msgs[msgs.length - 1] = { ...lastMsg, content: reply };
                    } else {
                      msgs.push({ role: "assistant", content: reply, ts: Date.now() });
                    }
                    return { ...s, messages: msgs, updatedAt: Date.now() };
                  }
                  return s;
                });
                return updated;
              });
            }
          } catch (streamError: any) {
            console.error("Streaming error:", streamError);
            throw streamError;
          } finally {
            setStreamingContent("");
            setStreamingMessageId(null);
            setIsStreaming(false);
            setLoading(false);
          }
        } else {
          // Non-streaming response (fallback)
          const raw = await res.text();
          let data: any = null;
          try {
            data = JSON.parse(raw);
          } catch {}

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
          setStreamingContent("");
          setStreamingMessageId(null);
          setIsStreaming(false);
          setLoading(false);
        }
      } catch (e: any) {
        const safeMsg = String(e?.message || "unknown error").replace(
          /<[^>]*>/g,
          "",
        );
        upsertAndAppendMessage(id, {
          role: "assistant",
          content: `Oops, something went wrong 🧠 - ${safeMsg}`,
        });
        setStreamingContent("");
        setStreamingMessageId(null);
        setIsStreaming(false);
        setLoading(false);
      }
    },
    [activeId, sessions, upsertAndAppendMessage, userId, stickToBottom],
  );

  /* ---- UI ---- */
  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="mb-4 sm:mb-6 flex items-center justify-center">
        <Image
          src="/lisa.png"
          alt="Lisa"
          width={80}
          height={80}
          className="rounded-full object-cover sm:w-28 sm:h-28"
        />
      </div>

      <button
        onClick={() => {
          void newChat();
          if (window.innerWidth < 1024) {
            setMenuOpen(false);
          }
        }}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-pink-400 text-white px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base font-semibold transition-all active:bg-pink-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-pink-300 touch-manipulation shadow-md"
        title="New chat"
        aria-label="Start a new chat"
      >
        <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
        <span>New Chat</span>
      </button>

      <h4 className="mt-4 sm:mt-6 mb-3 px-2 text-sm sm:text-base font-bold" style={{ color: THEME.text[800] }}>
        History
      </h4>
      <nav className="space-y-1.5 sm:space-y-2 overflow-y-auto overflow-x-hidden flex-1 pr-1 sm:pr-2 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {sessions.length === 0 && (
          <div className="px-3 sm:px-4 py-6 text-center text-sm sm:text-base" style={{ color: THEME.text[600] }}>
            No conversations yet.
            <div className="mt-2 text-xs sm:text-sm">Start a new chat to begin!</div>
          </div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`group relative flex cursor-pointer items-center justify-between rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base transition-all active:scale-[0.98] touch-manipulation ${
              s.id === activeId 
                ? "bg-pink-300 shadow-sm" 
                : "bg-white/60 active:bg-white/80"
            }`}
            onClick={() => {
              openChat(s.id);
              if (window.innerWidth < 1024) {
                setMenuOpen(false);
              }
            }}
            title="Open chat"
            role="button"
            aria-label={`Open chat: ${s.title || "Conversation"}`}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-sm sm:text-base" style={{ color: THEME.text[900] }}>
                {s.title || "Conversation"}
              </div>
              <div className="truncate text-xs sm:text-sm mt-0.5" style={{ color: THEME.text[600] }}>
                {new Date(s.updatedAt).toLocaleDateString(DATE_LOCALE, { month: 'short', day: 'numeric' })}
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
              className="cursor-pointer p-1.5 sm:p-2 rounded-lg transition-all active:bg-red-100 opacity-0 group-hover:opacity-100 group-active:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-300 touch-manipulation"
              title="Delete chat"
              aria-label="Delete chat"
              style={{ color: THEME.text[700] }}
            >
              <Trash className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${THEME.pink[100]};
          border-radius: 10px;
          margin: 8px 0;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, ${THEME.pink[400]}, ${THEME.pink[500]});
          border-radius: 10px;
          border: 2px solid ${THEME.pink[100]};
          transition: all 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, ${THEME.pink[500]}, ${THEME.pink[600]});
        }
        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${THEME.pink[400]} ${THEME.pink[100]};
        }
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.2; }
        }
        .streaming-cursor {
          animation: blink 1s ease-in-out infinite;
        }
      `}</style>
      <div
        className="flex min-h-dvh w-full text-foreground transition-all duration-500 ease-in-out"
        style={{
          background: `linear-gradient(
            180deg,
            ${THEME.background.light} 0%,
            ${THEME.pink[100]} 50%,
            ${THEME.purple[100]} 100%
          )`,
          color: THEME.text[900],
        }}
      >
        {/* Sidebar - Desktop */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block"
        aria-label="Sidebar"
      >
        <div
          className="h-full rounded-none border-r border-foreground/10 p-6 shadow-sm backdrop-blur"
          style={{ backgroundColor: `${THEME.pink[200]}CC` }}
        >
          {SidebarContent}
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Mobile Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
        className={`fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] transform border-r-2 p-4 sm:p-6 backdrop-blur-md transition-transform duration-300 ease-in-out lg:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ 
          backgroundColor: THEME.background.white,
          borderColor: THEME.pink[300],
          boxShadow: menuOpen ? "4px 0 24px rgba(0, 0, 0, 0.15)" : "none"
        }}
      >
        <div className="flex items-center justify-between mb-4 pb-4 border-b-2" style={{ borderColor: THEME.pink[200] }}>
          <h2 className="text-xl font-bold" style={{ color: THEME.text[900] }}>Chats</h2>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-2 rounded-lg transition-all hover:bg-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-300"
            aria-label="Close menu"
            style={{ color: THEME.text[800] }}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        {SidebarContent}
      </div>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col transition-all duration-500 ease-in-out lg:pl-72">
        {/* Top bar (mobile) */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 px-4 py-3 lg:hidden" style={{ 
          borderColor: THEME.pink[300], 
          backgroundColor: THEME.background.white,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)"
        }}>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2.5 rounded-lg transition-all active:bg-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-300 touch-manipulation"
            aria-label="Open menu"
            style={{ color: THEME.text[800] }}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2.5">
            <Image
              src="/lisa.png"
              alt="Lisa"
              width={36}
              height={36}
              className="rounded-full ring-2"
              style={{ borderColor: THEME.pink[400] }}
            />
            <span className="text-base font-bold" style={{ color: THEME.text[900] }}>Lisa</span>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Hero - Only show when no messages (ChatGPT-like) */}
        {(!active || active.messages.length <= 1) && (
          <div className="bg-transparent transition-all duration-500">
            <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center mb-4">
                  <Image
                    src="/lisa.png"
                    alt="Lisa"
                    width={80}
                    height={80}
                    className="rounded-full ring-4"
                    style={{ borderColor: THEME.pink[300] }}
                  />
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3" style={{ color: THEME.text[900] }}>
                  Hi, it&apos;s <span style={{ color: THEME.pink[600] }}>Lisa</span> 👋
                </h1>
                <p className="text-base sm:text-lg text-center max-w-2xl mx-auto" style={{ color: THEME.text[700] }}>
                  Your menopause support expert. How can I help you today?
                </p>
              </div>

              {/* Suggestions - Simplified for mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
                {suggestions.slice(0, 4).map((s, i) => (
                  <button
                    key={s}
                    onClick={async () => {
                      const id = activeId ?? await newChat();
                      void sendToAPI(s, id);
                    }}
                    className="rounded-xl border-2 bg-white px-4 py-3.5 text-left text-sm sm:text-base leading-relaxed shadow-sm transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-pink-300 touch-manipulation"
                    style={{ 
                      borderColor: THEME.pink[300],
                      color: THEME.text[800],
                    }}
                    aria-label={`Use suggestion: ${s}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat */}
        <section
          ref={listRef}
          className="flex-1 overflow-y-auto"
          style={{ 
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 py-4 sm:py-6 space-y-4">
            {(active?.messages ?? []).filter(m => m.content || (isStreaming && m.role === "assistant")).map((m, i) => {
              const isUser = m.role === "user";
              // Check if this is the streaming message: it's the last assistant message and we're currently streaming
              const isLastMessage = i === (active?.messages ?? []).length - 1;
              const isStreamingMsg = isStreaming && !isUser && streamingMessageId === activeId && isLastMessage && (streamingContent || m.content === "");
              return (
                <div
                  key={`${m.ts ?? i}-${i}`}
                  className={`flex items-start gap-2 sm:gap-3 ${
                    isUser ? "justify-end" : ""
                  }`}
                >
                  {!isUser && (
                    <Image
                      src="/profile.png"
                      alt="Lisa avatar"
                      width={32}
                      height={32}
                      className="mt-1 shrink-0 rounded-full object-cover ring-2 sm:w-10 sm:h-10"
                      style={{ borderColor: THEME.pink[300] }}
                    />
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3.5 text-base leading-relaxed sm:px-5 sm:py-4 sm:text-lg transition-all ${
                      isUser
                        ? "ml-auto max-w-[85%] sm:max-w-[75%] shadow-md"
                        : "max-w-[85%] sm:max-w-[75%] bg-white ring-1 shadow-md"
                    }`}
                    style={
                      isUser
                        ? { 
                            backgroundColor: THEME.pink[200],
                            color: THEME.text[900],
                            boxShadow: "0 2px 8px rgba(236, 72, 153, 0.15)",
                          }
                        : {
                            backgroundColor: THEME.background.white,
                            color: THEME.text[900],
                            borderColor: THEME.pink[200],
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                          }
                    }
                  >
                    {isStreamingMsg ? (
                      <div className="relative w-full min-h-[20px]">
                        {streamingContent ? (
                          <>
                            <MarkdownBubble>{streamingContent}</MarkdownBubble>
                            <span 
                              className="inline-block w-0.5 h-6 ml-2 mb-1 align-middle rounded-sm streaming-cursor" 
                              style={{ 
                                backgroundColor: THEME.pink[500],
                              }} 
                            />
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-base" style={{ color: THEME.text[600] }}>
                            <div className="flex gap-1">
                              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: THEME.pink[400], animationDelay: "0ms" }} />
                              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: THEME.pink[400], animationDelay: "150ms" }} />
                              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: THEME.pink[400], animationDelay: "300ms" }} />
                            </div>
                            <span className="italic">Lisa is typing...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <MarkdownBubble>{m.content}</MarkdownBubble>
                        {m.ts && (
                          <div className="mt-3 text-sm" style={{ color: THEME.text[600] }}>
                            {new Date(m.ts).toLocaleTimeString(DATE_LOCALE, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {isUser && (
                    <div
                      className="relative mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 sm:h-10 sm:w-10"
                      style={{ borderColor: THEME.pink[300] }}
                      aria-hidden
                    >
                      <div 
                        className="flex h-full w-full items-center justify-center"
                        style={{ 
                          background: `linear-gradient(135deg, ${THEME.pink[200]}, ${THEME.purple[200]})`,
                          color: THEME.text[900]
                        }}
                      >
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {loading && !isStreaming && (
              <div className="flex items-center gap-3 pl-12 sm:pl-14 text-base sm:text-lg" style={{ color: THEME.text[700] }}>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: THEME.pink[500], animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: THEME.pink[500], animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: THEME.pink[500], animationDelay: "300ms" }} />
                </div>
                <span className="italic font-medium">Lisa is thinking...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </section>

        {/* Composer */}
        <footer className="sticky bottom-0 z-20 border-t-2 backdrop-blur-md safe-area-inset-bottom" style={{ 
          background: `linear-gradient(to top, ${THEME.pink[50]} 0%, ${THEME.purple[100]} 100%)`,
          borderColor: THEME.pink[300],
          boxShadow: "0 -4px 24px rgba(236, 72, 153, 0.15)",
          paddingBottom: 'env(safe-area-inset-bottom, 0)'
        }}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const text = input.trim();
              if (!text || loading) return;
              const id = activeId ?? await newChat();
              void sendToAPI(text, id);
            }}
            className="mx-auto flex w-full max-w-3xl items-end gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4"
          >
            <div className="relative flex w-full items-center">
              <label htmlFor="composer" className="sr-only">
                Message Lisa
              </label>
              <div className="relative w-full">
                <textarea
                  id="composer"
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const text = input.trim();
                      if (!text || loading) return;
                      const id = activeId ?? await newChat();
                      void sendToAPI(text, id);
                    }
                  }}
                  aria-label="Type your message"
                  placeholder="Message Lisa..."
                  className="w-full resize-none overflow-hidden rounded-2xl border-2 px-4 py-3.5 pr-12 sm:px-5 sm:py-4 sm:pr-14 text-base sm:text-lg leading-relaxed outline-none transition-all placeholder:text-base sm:placeholder:text-lg shadow-md focus:shadow-lg focus:ring-2 focus:ring-pink-300 touch-manipulation"
                  style={{ 
                    borderColor: input.trim() ? THEME.pink[400] : THEME.pink[300],
                    background: THEME.background.white,
                    color: THEME.text[900],
                    minHeight: '48px',
                    maxHeight: '200px',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="inline-flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-300 touch-manipulation"
              style={{ 
                backgroundColor: input.trim() ? THEME.pink[500] : THEME.pink[300],
                boxShadow: loading || !input.trim() ? "0 2px 8px rgba(236, 72, 153, 0.2)" : "0 4px 16px rgba(236, 72, 153, 0.5)",
              }}
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
              ) : (
                <Send className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </button>

          </form>
        </footer>
      </main>
      </div>
    </>
  );
}

export default dynamic(() => Promise.resolve(ChatPageInner), { ssr: false });
