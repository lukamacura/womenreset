"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// ===== Types =====
type ApiOk = { answer: string };
type ApiErr = { detail?: string; error?: string; answer?: string };
type ChatMessage = { role: "user" | "assistant"; content: string };
type Row = { who: "bot" | "user"; text: string };


// === NEW: heuristika za kratke follow-up poruke ===
function enhanceQuestion(text: string, rows: Row[]): string {
  const t = text.trim();
  const wordCount = t.split(/\s+/).filter(Boolean).length;

  // kratko ili fragment (<=3 reči ili <24 znaka bez tačke/upitnika/uzvika)
  const isShort =
    wordCount <= 3 || (t.length < 24 && !/[.!?…]$/.test(t));

  if (!isShort) return t;

  // nađi poslednju bot poruku (tipično pitanje/smernice)
  const lastBot = [...rows].reverse().find(r => r.who === "bot")?.text || "";
  const lastUser = [...rows].reverse().find(r => r.who === "user")?.text || "";

  // preformuliši da bude jasno da je nastavak
  return `Follow-up to the previous assistant message. 
Previous assistant said:
"""${lastBot.slice(0, 700)}"""

Previous user message (for context):
"""${lastUser.slice(0, 300)}"""

User adds (short fragment): "${t}"

Please interpret the fragment in-context and continue the same topic.`;
}

// ===== Helpers =====
function buildHistory(rows: Row[]): ChatMessage[] {
  return rows
    .filter((r) => {
      if (r.who === "user") return true;
      const t = r.text.toLowerCase();
      if (t.startsWith("hi, i’m clara")) return false;
      if (t.startsWith("oops —")) return false;
      if (t.startsWith("hmm, i couldn’t reach")) return false;
      if (t.includes("provides educational information")) return false; // disclaimer bubble
      return true;
    })
    .slice(-12)
    .map((r) => ({
      role: r.who === "user" ? "user" : "assistant",
      content: r.text,
    }));
}


function parseJsonSafe(x: unknown): ApiOk | ApiErr {
  if (typeof x === "object" && x !== null) return x as ApiOk | ApiErr;
  return { error: "Upstream returned non-JSON." };
}

function pickErrMsg(d: unknown): string {
  if (typeof d === "object" && d !== null) {
    const o = d as Record<string, unknown>;
    if (typeof o.detail === "string") return o.detail;
    if (typeof o.error === "string") return o.error;
    if (typeof o.answer === "string") return o.answer;
  }
  return "Server error";
}

// ===== Component =====
export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Fixed large/accessible type scale for 40+
  const scale = {
    base: "text-[20px] sm:text-[21px] md:text-[22px]",
    bubble: "text-[21px] sm:text-[22px] md:text-[23px]",
    input: "text-[21px] sm:text-[22px] md:text-[23px]",
    line: "leading-[1.75]",
  } as const;

  // Load saved chat
  useEffect(() => {
    try {
      const saved = localStorage.getItem("clara_chat");
      if (saved) {
        const parsed = JSON.parse(saved) as Row[];
        if (Array.isArray(parsed)) setRows(parsed);
        else throw new Error("Bad shape");
      } else {
        setRows([{ who: "bot", text: "Hi, i'm Clara, your menopause support companion ❤️. How are you feeling today?" }]);
      }
    } catch {
      setRows([{ who: "bot", text: "Hi, i'm Clara, your menopause support companion ❤️. How are you feeling today?" }]);
    }
  }, []);

  // Persist chat and auto-scroll
  useEffect(() => {
    localStorage.setItem("clara_chat", JSON.stringify(rows));
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [rows]);

  async function send() {
    const userText = q.trim();
    if (!userText || loading) return;

    const history = buildHistory(rows);
    const question = enhanceQuestion(userText, rows);

    setRows((r) => [...r, { who: "user", text: userText }]);
    setQ("");
    setLoading(true);

    try {
      const res = await fetch("/api/ask", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ question, history }) })

      const raw: unknown = await res.json().catch(() => ({}));
      const data = parseJsonSafe(raw);

      if (!res.ok) {
        const errMsg = pickErrMsg(data);
        setRows((r) => [...r, { who: "bot", text: `Oops — ${errMsg}` }]);
        return;
      }

      const answer =
        typeof (data as ApiOk).answer === "string"
          ? (data as ApiOk).answer.trim()
          : "";

      setRows((r) => [
        ...r,
        { who: "bot", text: answer || "Hmm, response had no answer." },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRows((r) => [
        ...r,
        { who: "bot", text: `Hmm, I couldn’t reach the server. ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Quick prompts
  const chips = [
    "Better sleep at night",
    "Hot flashes relief",
    "Mood swings",
    "Weight gain after 40",
  ];

  return (
    <div className={`mx-auto max-w-screen-2xl px-4 sm:px-8 py-6 sm:py-10 ${scale.base} ${scale.line}`}>      
      {/* Header */}
      <header className="mb-6 sm:mb-8 flex items-center gap-5 sm:gap-6">
        <Image
          src="/Clara.png"
          alt="Clara avatar"
          width={92}
          height={92}
          className="rounded-full shrink-0 h-[92px] w-[92px] sm:h-[108px] sm:w-[108px]"
          priority
        />
        <div className="min-w-0">
          <div className="truncate text-[30px] sm:text-[34px] md:text-[38px] font-black font-[family-name:var(--font-chubbo)] text-[#F2FFF7]">
            Chat with Clara
          </div>
          <div className="text-[18px] sm:text-[19px] md:text-[20px] text-[#CFECE7]">
            Empathetic, practical guidance for women 40+ (perimenopause & menopause).
          </div>
        </div>
      </header>

      {/* Panel */}
      <section className="rounded-[28px] md:rounded-[32px] shadow-[0_14px_40px_rgba(0,0,0,.28)] overflow-hidden bg-[#171417] border border-[#3A3436]">
        {/* Chat area */}
        <div
          ref={chatRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="chatScroll h-[74vh] min-h-[560px] px-5 sm:px-8 md:px-10 py-5 sm:py-7 space-y-5 overflow-y-auto scroll-smooth"
        >
          {rows.map((r, i) => (
            <div
              key={i}
              className={`flex items-start gap-4 ${r.who === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* Wider bubbles for easier reading */}
              <div
                className={`whitespace-pre-wrap rounded-3xl px-6 md:px-7 py-5 md:py-6 shadow-[0_2px_12px_rgba(0,0,0,.25)]
                max-w-[96%] sm:max-w-[94%] md:max-w-[92%]
                ${r.who === "user" ? "bg-[#2B2628]" : "bg-[#1E1A1F]"} text-[#F4FAF7] ${scale.bubble}`}
              >
                {r.text}
              </div>

              {r.who === "user" && (
                <div
                  className="flex items-center justify-center h-12 w-12 rounded-full bg-[#F2C6BA] shrink-0 text-base md:text-lg font-bold text-[#1B1618]"
                  aria-hidden
                >
                  You
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="text-[#F2C6BA] italic">Clara is typing…</div>
          )}
        </div>

        {/* Input row */}
        <div
          className="flex flex-col md:flex-row gap-3 md:gap-4 border-t border-[#2E2A2C] bg-[#1A1719] px-4 sm:px-6 md:px-8 py-4 md:py-5 sticky bottom-[env(safe-area-inset-bottom)] z-10"
        >
          <label htmlFor="clara-input" className="sr-only">Message Clara</label>

          <textarea
            id="clara-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask Clara anything… (e.g., How can I sleep better through the night?)"
            aria-label="Message Clara"
            className={`flex-1 min-h-[120px] max-h-[320px] overflow-y-auto resize-none rounded-3xl border border-[#4C4447]
              bg-[#171417] px-6 md:px-7 py-5 md:py-6 ${scale.input}
              outline-none placeholder:text-[#BFD8D4] text-[#F4FAF7]
              focus:ring-2 focus:ring-[#7BDAD0] focus:border-transparent`}
          />

          <button
            onClick={send}
            disabled={loading}
            className="w-full md:w-auto md:min-w-[176px] rounded-3xl bg-[#F2C6BA] text-[#201C1E]
              px-6 py-5 md:px-7 md:py-6 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
              transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2
              focus:ring-[#7BDAD0] focus:ring-offset-[#1A1719] select-none font-[family-name:var(--font-chubbo)] font-bold text-[20px]"
            aria-label="Send message"
          >
            Send
          </button>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-3 md:gap-4 border-t border-[#2E2A2C] bg-[#191618] px-4 sm:px-6 md:px-8 py-4 md:py-5">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => setQ(`Can you help with ${c.toLowerCase()}?`)}
              className="cursor-pointer rounded-full border border-[#4C4447] bg-[#ECFFF7] text-[#1B1618]
                px-5 py-3 text-[18px] md:text-[19px] hover:border-[#7BDAD0] transition select-none
                focus:outline-none focus:ring-2 focus:ring-[#7BDAD0]"
              type="button"
              aria-label={c}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <p
        className="mt-5 rounded-xl border-l-4 border-[#F2C6BA] bg-[#191618] px-5 py-4 text-[#F4FAF7]
        text-[18px] sm:text-[19px] md:text-[20px] font-[family-name:var(--font-chubbo)]"
      >
        Clara provides educational information, not medical advice. For personal medical concerns, consult a qualified healthcare provider.
      </p>

    </div>
  );
}
