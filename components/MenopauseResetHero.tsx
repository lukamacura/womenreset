import * as React from "react";
import {
  Flame,
  HeartPulse,
  Sparkles,
  Moon,
  CheckCircle2,
  Activity,
  Timer,
  CalendarRange,
  ShieldCheck,
  BookOpenCheck,
  Bot,
} from "lucide-react";
import Image from 'next/image'

export type MenopauseResetProps = {
  eyebrow?: string;
  problemTitle?: string;
  problemIntro?: string;
  problemBullets?: string[];
  solutionTitle?: string;
  solutionIntro?: string;
  ctaPrimaryText?: string;
  ctaSecondaryText?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
};

const defaults: Required<Omit<MenopauseResetProps, "onPrimaryClick" | "onSecondaryClick">> = {
  eyebrow: "Feel like yourself again",
  problemTitle: "Still guessing what your body needs?",
  problemIntro:
    "Generic plans weren’t built for menopause. You need answers that fit your symptoms, your schedule, and your goals - without spending hours searching.",
  problemBullets: [
    "Advice feels random and conflicting",
    "You don’t have time to research every symptom",
    "What worked before… doesn’t work now",
  ],
  solutionTitle: "Meet Lisa",
  solutionIntro:
    "Chat 24/7 with an evidence-informed coach powered by Retrieval-Augmented Generation (RAG). It pulls trusted sources, understands your symptoms, and gives clear next steps - tailored to you - in minutes.",
  ctaPrimaryText: "Start my 3-Day free trial",
  ctaSecondaryText: "How the AI works",
};

const pills = [
  { Icon: Bot, label: "24/7 AI chat" },
  { Icon: BookOpenCheck, label: "Evidence-informed (RAG)" },
  { Icon: ShieldCheck, label: "Private & secure" },
  { Icon: CalendarRange, label: "Progress in 7 days" },
];

const checks = [
  "Personalized answers to your symptoms",
  "Clear daily steps in plain English",
  "Links to sources you can verify",
  "Tracks progress and adapts over time",
];

export default function MenopauseResetHero(props: MenopauseResetProps) {
  const copy = { ...defaults, ...props };

  return (
    <section className="relative overflow-hidden">
      {/* Soft light background */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-b from-background via-white to-rose-50" />

      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        {/* Eyebrow + Title */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-200/70 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-rose-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> {copy.eyebrow}
          </span>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl">
            {copy.problemTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-zinc-600">
            {copy.problemIntro}
          </p>
        </div>

        {/* Feature Pills */}
        <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-3">
          {pills.map(({ Icon, label }) => (
            <li key={label}>
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-200/80 bg-white px-3 py-1 text-sm text-zinc-700 shadow-sm">
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </span>
            </li>
          ))}
        </ul>

        {/* Content Grid */}
        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-2 lg:gap-8">
          {/* Problem Card */}
          <div className="h-full rounded-3xl border border-rose-200/80 bg-white p-6 shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-rose-600">
              <Flame className="h-5 w-5" aria-hidden />
              <h2 className="text-lg font-semibold">Why nothing works?</h2>
            </div>
            <p className="text-sm text-zinc-600">
              Menopause changes the rules. Random tips and one-size plans miss what your body is
              actually asking for.
            </p>
            <ul className="mt-5 space-y-3">
              {copy.problemBullets.map((item) => (
                <li key={item} className="flex items-start gap-3 text-zinc-800">
                  <span className="mt-0.5 rounded-full bg-rose-100 p-1">
                    <Moon className="h-4 w-4 text-rose-600" aria-hidden />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solution Card */}
          <div className="h-full rounded-3xl border border-emerald-200/70 bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-emerald-700">
              <HeartPulse className="h-5 w-5" aria-hidden />
              <h2 className="text-lg font-semibold">{copy.solutionTitle}</h2>
            </div>
            
            <p className="text-sm text-zinc-600">{copy.solutionIntro}</p>
            
            
            <ul className="mt-5 flex flex-col gap-3 sm:grid-cols-2">
              {checks.map((ci) => (
                <li key={ci} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-green-500" aria-hidden />
                  <span className="text-zinc-800">{ci}</span>
                </li>
              ))}
            </ul>
            <div className="w-60 block mx-auto">
                <Image
                src="/lisa.png"
                width={500}
                height={500}
                alt="Picture of the author"
              />
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={props.onPrimaryClick}
                className="cursor-pointer inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-base font-medium text-foreground shadow-lg transition hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <Sparkles className="h-4 w-4" />
                {copy.ctaPrimaryText}
                
              </button>
              <button
                onClick={props.onSecondaryClick}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-base font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              >
                {copy.ctaSecondaryText}
              </button>
              <span className="inline-flex items-center gap-2 text-sm text-zinc-600">
                <BookOpenCheck className="h-4 w-4" aria-hidden /> Evidence-informed. No guesswork.
              </span>
            </div>
          </div>
        </div>

        {/* Assurance Strip */}
        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-4 shadow-md">
          <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: Timer, text: "Answers in under a minute" },
              { Icon: BookOpenCheck, text: "Cites sources you can check" },
              { Icon: ShieldCheck, text: "Private chats. Your data stays yours." },
              { Icon: Activity, text: "Tracks symptoms. Adapts to you." },
            ].map(({ Icon, text }) => (
              <li key={text} className="flex flex-col text-center items-center gap-3">
                <Icon className="h-5 w-5 text-green-500" aria-hidden />
                <span className="text-zinc-700 text-sm">{text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-xs text-zinc-500">
            Not medical advice. For education and coaching support. Always consult a qualified
            professional for diagnosis or treatment.
          </p>
        </div>
      </div>

      {/* Mobile Docked CTA */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 mx-auto flex max-w-lg justify-center px-4 md:hidden">
        <div className="pointer-events-auto inline-flex items-center gap-3 rounded-2xl border border-rose-200 bg-white/95 p-2.5 shadow-xl">
          <button
            onClick={props.onPrimaryClick}
            className="rounded-xl bg-rose-600 px-4 py-2 text-white shadow hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            Start Free
          </button>
          <button
            onClick={props.onSecondaryClick}
            className="rounded-xl px-3 py-2 text-zinc-800 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}
