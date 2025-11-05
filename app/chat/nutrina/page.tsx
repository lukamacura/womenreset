/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Rocket,
  Bot,
  Send,
  Loader2,
  History,
  Settings,
  HelpCircle,
  User,
  Trash2,
  Menu,
  X,
  Plus,
  Trash,
} from "lucide-react";

/* ============== Types & Keys ============== */
type Msg = { role: "user" | "assistant"; content: string };
type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Msg[];
};

const LS_KEY = "nutrina-chat-v2"; // legacy single-chat key (will migrate)
const SESSIONS_KEY = "nutrina-chat-sessions";
const ACTIVE_KEY = "nutrina-chat-active";

const SUGGESTIONS = [
  "Create a 7-day high-protein vegetarian meal plan",
  "What are 3 healthy snacks under 150 kcal?",
  "Give me a quick 20-minute batch-cooking plan",
  "Turn my last meals into a macro breakdown",
];

/* ============== Utils ============== */
function uid() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
/** Jednostavan Markdown renderer za chat balone */
function MarkdownBubble({ children }: { children: string }) {
  const components: Components = {
    // Links
    a: ({node, ...props}: any) => (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline underline-offset-4 decoration-green-400 hover:decoration-2"
      />
    ),

    // Headings
    h1: (p: any) => <h1 {...p} className="mt-3 mb-2 text-2xl font-bold text-green-900" />,
    h2: (p: any) => <h2 {...p} className="mt-3 mb-2 text-xl font-semibold text-green-700" />,
    h3: (p: any) => <h3 {...p} className="mt-3 mb-2 text-lg font-semibold text-green-500" />,

    // Lists
    ul: (p: any) => <ul {...p} className="my-2 list-disc pl-5 space-y-1" />,
    ol: (p: any) => <ol {...p} className="my-2 list-decimal pl-5 space-y-1" />,
    li: (p: any) => <li {...p} className="leading-6" />,

    // Blockquote
    blockquote: (p: any) => (
      <blockquote
        {...p}
        className="my-3 border-l-4 border-green-300 bg-green-50/60 px-3 py-2 italic rounded-r-lg"
      />
    ),

    // Horizontal rule
    hr: () => <hr className="my-4 border-t border-foreground/10" />,

    // Inline & block code
    code: ({ inline, className, children, ...props }: any) =>
      inline ? (
        <code
          className="rounded bg-foreground/10 px-1 py-0.5 text-[0.92em]"
          {...props}
        >
          {children}
        </code>
      ) : (
        <pre className="relative my-3 rounded-lg bg-zinc-900/95 text-zinc-100 p-3 overflow-x-auto">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ),

    // Tables
    table: (p: any) => (
      <div className="my-3 overflow-x-auto rounded-lg border border-foreground/10">
        <table {...p} className="min-w-full text-left text-sm" />
      </div>
    ),
    thead: (p: any) => <thead {...p} className="bg-green-50/70" />,
    th: (p: any) => <th {...p} className="px-3 py-2 font-semibold" />,
    td: (p: any) => <td {...p} className="px-3 py-2 border-t border-foreground/10 align-top" />,

    // Images
    img: (p: any) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img {...p} alt={p.alt} className="my-2 rounded-lg shadow-sm max-h-[360px]" />
    ),
  };

  return (
    <div className="prose prose-sm max-w-none
      prose-headings:mb-2 prose-p:my-2 prose-pre:my-3
      prose-a:text-green-700 prose-strong:font-semibold
      prose-code:before:content-[''] prose-code:after:content-['']">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default function ChatPage() {
  /* ---------- Sessions / History state ---------- */
  const [sessions, setSessions] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = sessions.find((s) => s.id === activeId) ?? null;

  /* ---------- UI state ---------- */
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // mobile sidebar
  const [historyOpen, setHistoryOpen] = useState(false); // history panel
  const [input, setInput] = useState("");

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ---------- Load / migrate existing data ---------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      const rawActive = localStorage.getItem(ACTIVE_KEY);

      if (raw) {
        const parsed: Conversation[] = JSON.parse(raw);
        setSessions(parsed);
        setActiveId(rawActive || parsed[0]?.id || null);
        return;
      }

      // Migrate from old single-chat if present
      const oldRaw = localStorage.getItem(LS_KEY);
      if (oldRaw) {
        const oldMsgs: Msg[] = JSON.parse(oldRaw);
        const id = uid();
        const now = Date.now();
        const title =
          oldMsgs.find((m) => m.role === "user")?.content.slice(0, 40) || "Conversation";
        const conv: Conversation = {
          id,
          title,
          createdAt: now,
          updatedAt: now,
          messages: oldMsgs.length
            ? oldMsgs
            : [{ role: "assistant", content: "Hi, I’m Nutrina 🥦 How can I help?" }],
        };
        const arr = [conv];
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(arr));
        localStorage.setItem(ACTIVE_KEY, id);
        setSessions(arr);
        setActiveId(id);
      } else {
        // Create a fresh conversation
        const id = uid();
        const now = Date.now();
        const conv: Conversation = {
          id,
          title: "New chat",
          createdAt: now,
          updatedAt: now,
          messages: [{ role: "assistant", content: "Hi, I’m Nutrina 🥦 How can I help?" }],
        };
        localStorage.setItem(SESSIONS_KEY, JSON.stringify([conv]));
        localStorage.setItem(ACTIVE_KEY, id);
        setSessions([conv]);
        setActiveId(id);
      }
    } catch {}
  }, []);

  // Persist sessions & active id
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    } catch {}
  }, [sessions, activeId]);

  /* ---------- Scrolling & textarea autosize ---------- */
  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [sessions, activeId, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(160, el.scrollHeight) + "px";
  }, [input]);

  /* ---------- Sessions helpers ---------- */
  function updateActive(updater: (c: Conversation) => Conversation) {
    setSessions((all) => all.map((c) => (c.id === activeId && active ? updater(c) : c)));
  }

  function updateById(id: string, updater: (c: Conversation) => Conversation) {
    setSessions((all) => all.map((c) => (c.id === id ? updater(c) : c)));
  }

  function newChat(): string {
    const id = uid();
    const now = Date.now();
    const conv: Conversation = {
      id,
      title: "New chat",
      createdAt: now,
      updatedAt: now,
      messages: [{ role: "assistant", content: "What would you like to know about nutrition? ✨" }],
    };
    setSessions((s) => [conv, ...s]);
    setActiveId(id);
    setHistoryOpen(false);
    setMenuOpen(false);
    setInput("");
    requestAnimationFrame(scrollToBottom);
    return id;
  }

  function openChat(id: string) {
    setActiveId(id);
    setHistoryOpen(false);
    setMenuOpen(false);
    requestAnimationFrame(scrollToBottom);
  }

  function deleteChat(id: string) {
    setSessions((prev) => {
      const rest = prev.filter((x) => x.id !== id);
      if (activeId === id) {
        const next = rest[0]?.id ?? null;
        setActiveId(next);
      }
      return rest;
    });
  }

  /* ---------- API ---------- */
  const gradientStyle = useMemo(
    () => ({
      background: "linear-gradient(135deg, #e7ffe7 0%, #c8f5c8 45%, #b2ebb2 100%)",
    }),
    []
  );

  async function sendToAPI(text: string, targetId?: string) {
    const id = targetId ?? activeId;
    if (!id) return;

    // append user message into specific conversation
    updateById(id, (c) => ({
      ...c,
      messages: [...c.messages, { role: "user", content: text }],
      updatedAt: Date.now(),
      title: c.title === "New chat" && text ? text.slice(0, 40) : c.title,
    }));
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/nutrina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: text }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { reply } = (await res.json()) as { reply: string };

      updateById(id, (c) => ({
        ...c,
        messages: [...c.messages, { role: "assistant", content: String(reply) }],
        updatedAt: Date.now(),
      }));
    } catch (e: any) {
      updateById(id, (c) => ({
        ...c,
        messages: [
          ...c.messages,
          {
            role: "assistant",
            content:
              "Hmm, something went wrong reaching the brain 🧠 — " +
              (e?.message ?? "unknown error"),
          },
        ],
        updatedAt: Date.now(),
      }));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  const text = input.trim();
  if (!text || loading) return;

  // koristi aktivni, a kreiraj novi samo ako ne postoji
  const id = activeId ?? newChat();
  void sendToAPI(text, id);
}


  /* ---------- Sidebar content (unchanged visually, green theme) ---------- */
  const SidebarContent = (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="mx-auto">
  <Image
    src="/nutrina.png"
    alt="Nutrina"
    width={112}  // 28 * 4 = 112px
    height={112}
    className="rounded-full ring-1 ring-foreground/10 object-cover"
  />
</div>

        <div className="text-sm font-semibold">Nutrina</div>
      </div>

      <nav className="space-y-1 text-sm">
        <a
          onClick={() => {
            const id = newChat();
            // optionally focus composer
            requestAnimationFrame(() => textareaRef.current?.focus());
          }}
          className="cursor-pointer flex items-center gap-2 rounded-lg px-3 py-2 font-medium bg-foreground/5 transition hover:bg-foreground/10"
        >
          <Bot className="h-4 w-4" />
          Chat
        </a>
        <a
          onClick={() => setHistoryOpen(true)}
          className="cursor-pointer flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-foreground/5 transition"
        >
          <History className="h-4 w-4" />
          History
        </a>
        <a className="cursor-pointer flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-foreground/5 transition">
          <Settings className="h-4 w-4" />
          Settings
        </a>
        <a className="cursor-pointer flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-foreground/5 transition">
          <HelpCircle className="h-4 w-4" />
          Help
        </a>
      </nav>

      <div className="mt-auto rounded-xl bg-transparent p-3">
        <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-full ring-foreground/10">
          <Image src="/nutrina.png" alt="Nutrina" fill className="object-cover" />
        </div>
        <p className="mt-2 text-center text-sm italic text-foreground/60">Nutrina</p>
      </div>
    </div>
  );

  /* ---------- Render ---------- */
  return (
    <div className="flex min-h-dvh w-full bg-transparent text-foreground transition-all duration-500 ease-in-out">
      {/* Sidebar - Desktop */}
<aside className="hidden lg:block fixed inset-y-0 left-0 w-72 z-30">
  <div className="h-full bg-green-100/80 rounded-none border-r border-foreground/10 backdrop-blur p-4 shadow-sm">
    {SidebarContent}
  </div>
</aside>


      {/* Sidebar - Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-green-100/90 backdrop-blur-md border-r border-foreground/10 p-4 transform transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMenuOpen(false)}
          className="absolute right-3 top-3 text-foreground/70 hover:text-foreground transition"
        >
          <X className="h-6 w-6" />
        </button>
        {SidebarContent}
      </div>

      {/* History panel (slides from right) */}
      <div
        className={`fixed top-0 right-0 z-40 h-dvh w-[88vw] sm:w-[420px] bg-green-200 backdrop-blur border-l border-foreground/10 p-4 transition-transform duration-300 ease-in-out ${
          historyOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">History</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const id = newChat();
                requestAnimationFrame(() => textareaRef.current?.focus());
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-foreground/5"
              title="New chat"
            >
              <Plus className="h-3.5 w-3.5" /> New
            </button>
            <button
              onClick={() => setHistoryOpen(false)}
              className="cursor-pointer rounded-md p-1 hover:bg-foreground/5"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1 overflow-auto h-[calc(100%-2.5rem)] pr-1">
          {sessions.length === 0 && (
            <p className="text-xs text-foreground/60">No conversations yet.</p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group relative flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-foreground/5 cursor-pointer ${
                s.id === activeId ? "bg-foreground/5" : ""
              }`}
              onClick={() => openChat(s.id)}
              title="Open conversation"
            >
              <div className="truncate">
                <div className="truncate">{s.title || "Conversation"}</div>
                <div className="text-[11px] text-foreground/60">
                  {new Date(s.updatedAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(s.id);
                }}
                className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity text-foreground/60 hover:text-foreground"
                title="Delete conversation"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
<main className="flex min-w-0 flex-1 flex-col transition-all duration-500 ease-in-out lg:pl-72">
        {/* Mobile menu button */}
        <div className="lg:hidden flex items-center justify-between px-4 py-0 border-b border-foreground/10">
          <button
            onClick={() => setMenuOpen(true)}
            className="text-foreground/70 hover:text-foreground transition"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/nutrina.png" alt="Nutrina" width={28} height={28} className="rounded-full" />
            <span className="font-semibold text-sm">Nutrina</span>
          </div>
        </div>

        {/* Hero */}
        <div className="bg-transparent transition-all duration-500">
          <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:grid-cols-[1.2fr_1fr]">
            <div
              className="relative overflow-hidden rounded-2xl p-6 transition-all duration-700 hover:scale-[1.01]"
              style={gradientStyle}
            >
              <div className="relative z-10">
                <p className="text-sm font-medium text-green-700 flex items-center gap-2">
                  <Rocket className="h-4 w-4" />
                  Nutrition Assistant
                </p>
                <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
                  Hi, it’s <span className="text-green-700">Nutrina</span> 👋
                  <br />
                  How can I help?
                </h1>
                <p className="mt-3 max-w-prose text-sm text-foreground/70">
                  Ask for meal plans, nutrition tips, or turn your notes into a ready-to-share nutrition plan.
                </p>
              </div>
              <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-green-400/30 blur-3xl" />
              <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-green-500/20 blur-3xl" />
            </div>

            {/* Suggestions */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => {
                    const id = newChat();
                    void sendToAPI(s, id);
                  }}
                  className="rounded-lg border border-foreground/10 bg-white/50 px-3 py-2 text-left text-xs leading-5 text-foreground/70 hover:bg-white/70 transition-transform duration-300 hover:scale-[1.02]"
                  style={{ transitionDelay: `${i * 80}ms` }}
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
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 transition-all duration-700 ease-in-out"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {(active?.messages ?? []).map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={i}
                  className={`group relative flex items-start gap-2 transition-all duration-500 ${
                    isUser ? "justify-end translate-x-0" : "translate-x-0"
                  }`}
                >
                  {!isUser && (
                    <Image
                      src="/nutrina.png"
                      alt="Nutrina"
                      width={40}
                      height={40}
                      className="mt-1 shrink-0 rounded-full ring-1 ring-foreground/10 object-cover"
                    />
                  )}


                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[78%] transition-all duration-300 ${
                      isUser ? "ml-auto bg-foreground text-background" : "bg-white/70 shadow-sm"
                    }`}
                  >
                    <MarkdownBubble>{m.content}</MarkdownBubble>

                  </div>

                  {isUser && (
                    <div className="relative mt-1 h-10 w-10 shrink-0 overflow-hidden rounded-full ring-foreground/10">
                      <div className="flex h-full w-full items-center justify-center bg-foreground/10 text-foreground">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 pl-1 text-xs text-foreground/70 animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Nutrina is thinking…
              </div>
            )}
          </div>
        </section>

        {/* Composer */}
        <footer className="sticky bottom-0 z-20 px-3 py-3 sm:px-4  transition-all duration-500">
          <form
            onSubmit={onSubmit}
            className="mx-auto flex w-full max-w-3xl items-end gap-2"
          >
            <div className="relative w-full flex justify-center items-center">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const text = input.trim();
                    if (!text || loading) return;
                    const id = activeId ?? newChat(); // (kod tebe je negde bio newChat() direkt)
                    void sendToAPI(text, id);
                  }
                }}

                placeholder="Ask anything..."
                className="w-full bg-linear-to-t from-white/80 backdrop-blur text-foreground placeholder:text-foreground/50 overflow-hidden resize-none rounded-xl border border-foreground/20 px-4 py-3 text-md leading-6 outline-none focus:ring-2 focus:ring-green-300 transition-all duration-300"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="cursor-pointer inline-flex h-12 items-center justify-center rounded-xl bg-green-600 px-4 text-white transition-all duration-300 hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                if (!active) return;
                updateActive((c) => ({
                  ...c,
                  messages: [{ role: "assistant", content: "Chat cleared. What’s next? ✨" }],
                  updatedAt: Date.now(),
                }));
                setInput("");
                requestAnimationFrame(scrollToBottom);
              }}
              title="Clear chat"
              className="cursor-pointer hidden h-12 items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-foreground/5 md:inline-flex transition-all duration-300"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}
