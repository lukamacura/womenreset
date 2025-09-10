"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";


type Row = { who: "bot" | "user"; text: string };

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("clara_chat");
    if (saved) setRows(JSON.parse(saved));
    else {
      setRows([
        {
          who: "bot",
          text:
            "Hi, I’m Clara. What’s bothering you most right now?",
        },
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("clara_chat", JSON.stringify(rows));
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [rows]);

  async function send() {
    const text = q.trim();
    if (!text || loading) return;
    setRows((r) => [...r, { who: "user", text }]);
    setQ("");
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      const answer = (data?.answer || "I’m here for you. Could you rephrase?").trim();
      setRows((r) => [...r, { who: "bot", text: answer }]);
    } catch {
      setRows((r) => [
        ...r,
        { who: "bot", text: "Hmm, I couldn’t reach the server. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const chips = ["Better sleep at night", "Hot flashes relief", "Mood swings", "Weight gain after 40"];

  return (
    <div className="mx-auto max-w-[860px] px-4 sm:px-6 py-6">
      {/* Header */}
      <header className="mb-5 flex items-center gap-3">
  <Image
    src="/Clara.png"   // stavi sliku u /public folder projekta
    alt="Clara avatar"
    width={46}
    height={46}
    className="rounded-full shrink-0 h-[45px] w-auto"
  />

        <div className="min-w-0">
          <div className="truncate text-[22px] sm:text-2xl font-black font-[family-name:var(--font-chubbo)] text-[#DFF8EB]">
            Chat with Clara
          </div>
          <div className="text-[13px] sm:text-sm text-[#A8DADC]">
            Empathetic, practical guidance for women 40+ (perimenopause & menopause).
          </div>
        </div>
      </header>

      {/* Panel */}
      <section className="rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,.25)] overflow-hidden bg-[#231F20]">
        {/* Chat area */}
        <div
          ref={chatRef}
          className="chatScroll h-[64vh] min-h-[420px] px-4 py-5 sm:px-5 sm:py-6 space-y-3"
        >
          {rows.map((r, i) => (
            <div
              key={i}
              className={`flex gap-3 ${r.who === "user" ? "justify-end" : "justify-start"}`}
            >
              {r.who === "bot" && (
  <Image
    src="/Clara.png"   // stavi sliku u /public folder projekta
    alt="Clara avatar"
    width={36}
    height={36}
    className="rounded-full shrink-0 h-9 w-auto"
  />
)}
              <div
                className={`max-w-[78%] sm:max-w-[72%] whitespace-pre-wrap rounded-2xl px-4 py-3 leading-relaxed
                ${r.who === "user" ? "bg-[#2B2527]" : "bg-[#1F1A1C]"} text-[#DFF8EB]`}
              >
                {r.text}
              </div>
              {r.who === "user" && (
                <div className="h-9 w-9 rounded-full bg-[#E8B9AB] shrink-0" />
              )}
            </div>
          ))}

          {loading && (
            <div className="text-[#E8B9AB] text-sm">Clara is typing…</div>
          )}
        </div>

       {/* Input row */}
<div
  className="flex flex-col sm:flex-row gap-2 sm:gap-3 border-t border-[#A8DADC33] bg-[#1E1A1B]
             px-3 py-3 sm:px-4 sm:py-3.5 sticky bottom-[env(safe-area-inset-bottom)]
             z-10 touch-manipulation"
>
 <textarea
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
  className="flex-1 min-h-[72px] max-h-[200px] overflow-y-auto resize-none rounded-xl border border-[#A8DADC33]
             bg-[#191516] px-4 py-3 text-[16px] leading-[1.3] outline-none
             placeholder:text-[#A8DADC] text-[#DFF8EB]
             focus:ring-2 focus:ring-[#A8DADC66] focus:border-transparent
             font-[family-name:var(--font-chubbo)]"
/>

  <button
    onClick={send}
    disabled={loading}
    className="w-full sm:w-auto min-w-[120px] sm:min-w-[124px] rounded-xl bg-[#E09891] text-[#231F20]
               px-4 py-6 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
               transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2
               focus:ring-[#A8DADC66] focus:ring-offset-[#1E1A1B] touch-manipulation select-none 
               font-[family-name:var(--font-chubbo)] font-bold"
    aria-label="Send message"
  >
    Send
  </button>
</div>


        {/* Chips */}
        <div className="flex flex-wrap font-[family-name:var(--font-chubbo)] gap-2 border-t border-[#A8DADC33] bg-[#1D191A] px-4 py-3">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => setQ(`Can you help with ${c.toLowerCase()}?`)}
              className="cursor-pointer rounded-full border border-[#A8DADC66] bg-[#DFF8EB] text-[#231F20]
                         px-3.5 py-2 text-[13px] hover:border-[#A8DADC] transition select-none touch-manipulation
                         focus:outline-none focus:ring-2 focus:ring-[#A8DADC66]"
              type="button"
              aria-label={c}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <p className="mt-3 rounded-lg border-l-4 border-[#E09891] bg-[#1D191A] px-4 py-3 text-[#DFF8EB]
                    text-[13px] sm:text-[14px] font-[family-name:var(--font-chubbo)]">
        Clara provides educational information, not medical advice. For personal medical concerns,
        consult a qualified healthcare provider.
      </p>
    </div>
  );
}
