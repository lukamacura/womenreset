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
  const [textScale, setTextScale] = useState<"M" | "L" | "XL">("L"); // larger by default for 40+
  const chatRef = useRef<HTMLDivElement>(null);

  // Load saved chat + UI prefs
  useEffect(() => {
    try {
      const saved = localStorage.getItem("clara_chat");
      const savedScale = localStorage.getItem("clara_text_scale");
      if (saved) {
        const parsed = JSON.parse(saved) as Row[];
        if (Array.isArray(parsed)) setRows(parsed);
        else throw new Error("Bad shape");
      } else {
        setRows([{ who: "bot", text: "Hi, I’m Clara. What’s bothering you most right now?" }]);
      }
      if (savedScale === "M" || savedScale === "L" || savedScale === "XL") {
        setTextScale(savedScale);
      }
    } catch {
      setRows([{ who: "bot", text: "Hi, I’m Clara. What’s bothering you most right now?" }]);
    }
  }, []);

  // Persist chat + prefs and auto-scroll
  useEffect(() => {
    localStorage.setItem("clara_chat", JSON.stringify(rows));
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [rows]);

  useEffect(() => {
    localStorage.setItem("clara_text_scale", textScale);
  }, [textScale]);

  async function send() {
    const text = q.trim();
    if (!text || loading) return;

const history = buildHistory(rows);
const question = enhanceQuestion(text, rows);  // ⬅️ NOVO

setRows((r) => [...r, { who: "user", text }]);
setQ("");
setLoading(true);

try {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }), // ⬅️ promeni "text" u "question"
  });

      const raw: unknown = await res.json().catch(() => ({}));
      const data = parseJsonSafe(raw);

      if (!res.ok) {
        const errMsg = pickErrMsg(data);
        setRows((r) => [...r, { who: "bot", text: `Oops — ${errMsg}` }]);
        return;
      }

      const answer = typeof (data as ApiOk).answer === "string" ? (data as ApiOk).answer.trim() : "";
      setRows((r) => [...r, { who: "bot", text: answer || "Hmm, response had no answer." }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRows((r) => [...r, { who: "bot", text: `Hmm, I couldn’t reach the server. ${msg}` }]);
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

  // Text scale presets (rem values mapped to Tailwind classes via inline style)
  const scaleMap = {
    M: { base: "text-[17px]", bubble: "text-[18px]", input: "text-[18px]", line: "leading-[1.6]" },
    L: { base: "text-[18px]", bubble: "text-[19px]", input: "text-[19px]", line: "leading-[1.7]" },
    XL: { base: "text-[20px]", bubble: "text-[21px]", input: "text-[21px]", line: "leading-[1.75]" },
  } as const;

  const scale = scaleMap[textScale];

  return (
    <div className={`mx-auto max-w-[1280px] px-4 sm:px-6 py-6 sm:py-8 ${scale.base} ${scale.line}`}>      
      {/* Header */}
      <header className="mb-5 flex items-center gap-4 sm:gap-5">
        <Image
          src="/Clara.png"
          alt="Clara avatar"
          width={72}
          height={72}
          className="rounded-full shrink-0 h-[72px] w-[72px] sm:h-[84px] sm:w-[84px]"
          priority
        />
        <div className="min-w-0">
          <div className="truncate text-[24px] sm:text-[28px] font-black font-[family-name:var(--font-chubbo)] text-[#F2FFF7]">
            Chat with Clara
          </div>
          <div className="text-[15px] sm:text-[16px] text-[#CFECE7]">
            Empathetic, practical guidance for women 40+ (perimenopause & menopause).
          </div>
        </div>
        {/* Text size control */}
        <div className="ml-auto flex items-center gap-2" aria-label="Text size">
          <span className="text-[#CFECE7] hidden sm:inline">Text size</span>
          <div className="inline-flex rounded-full bg-[#2A2527] p-1 border border-[#6AD1C866]/50" role="group">
            {["M", "L", "XL"].map((s) => (
              <button
                key={s}
                onClick={() => setTextScale(s as typeof textScale)}
                className={`px-3 py-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-[#A8DADC66] transition
                ${textScale === s ? "bg-[#E3FBF2] text-[#1B1618]" : "text-[#DFF8EB]"}`}
                aria-pressed={textScale === (s as typeof textScale)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Panel */}
      <section className="rounded-3xl shadow-[0_12px_36px_rgba(0,0,0,.28)] overflow-hidden bg-[#171417] border border-[#3A3436]">
        {/* Chat area */}
        <div
          ref={chatRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="chatScroll h-[72vh] min-h-[520px] px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 overflow-y-auto scroll-smooth"
        >
          {rows.map((r, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${r.who === "user" ? "justify-end" : "justify-start"}`}
            >
              {r.who === "bot" && (
                <Image
                  src="/Clara.png"
                  alt="Clara avatar"
                  width={40}
                  height={40}
                  className="rounded-full shrink-0 h-12 w-12 mt-1"
                />
              )}

              {/* Wider bubbles for easier reading */}
              <div
                className={`whitespace-pre-wrap rounded-2xl px-5 md:px-6 py-4 md:py-5 shadow-[0_2px_10px_rgba(0,0,0,.25)]
                max-w-[95%] sm:max-w-[92%] md:max-w-[88%]
                ${r.who === "user" ? "bg-[#2B2628]" : "bg-[#1E1A1F]"} text-[#F4FAF7] ${scale.bubble}`}
              >
                {r.text}
              </div>

              {r.who === "user" && (
                <div
                  className="flex items-center justify-center h-10 w-10 rounded-full bg-[#F2C6BA] shrink-0 text-sm font-bold text-[#1B1618]"
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
  className="flex flex-col md:flex-row gap-2 md:gap-3 border-t border-[#2E2A2C] bg-[#1A1719] px-3 py-3 md:px-4 md:py-4 sticky bottom-[env(safe-area-inset-bottom)] z-10"
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
            className={`flex-1 min-h-[96px] max-h-[280px] overflow-y-auto resize-none rounded-2xl border border-[#4C4447]
              bg-[#171417] px-5 md:px-6 py-4 md:py-5 ${scale.input}
              outline-none placeholder:text-[#BFD8D4] text-[#F4FAF7]
              focus:ring-2 focus:ring-[#7BDAD0] focus:border-transparent`}
          />

          <button
            onClick={send}
            disabled={loading}
            className="w-full md:w-auto md:min-w-[148px] rounded-2xl bg-[#F2C6BA] text-[#201C1E]
              px-5 py-4 md:px-6 md:py-5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
              transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2
              focus:ring-[#7BDAD0] focus:ring-offset-[#1A1719] select-none font-[family-name:var(--font-chubbo)] font-bold text-[18px]"
            aria-label="Send message"
          >
            Send
          </button>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 md:gap-3 border-t border-[#2E2A2C] bg-[#191618] px-3 md:px-4 py-3 md:py-4">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => setQ(`Can you help with ${c.toLowerCase()}?`)}
              className="cursor-pointer rounded-full border border-[#4C4447] bg-[#ECFFF7] text-[#1B1618]
                px-4 py-2 text-[15px] md:text-[16px] hover:border-[#7BDAD0] transition select-none
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
        className="mt-4 rounded-xl border-l-4 border-[#F2C6BA] bg-[#191618] px-4 py-3 text-[#F4FAF7]
        text-[15px] sm:text-[16px] md:text-[16px] font-[family-name:var(--font-chubbo)]"
      >
        Clara provides educational information, not medical advice. For personal medical concerns, consult a qualified healthcare provider.
      </p>

    
    </div>
  );
}
