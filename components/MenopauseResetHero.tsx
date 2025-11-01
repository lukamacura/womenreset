import * as React from "react";
import {
  Sparkles,
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
  eyebrow: "What if you had a whole team - just for you?",
  problemTitle: "Your Menopause Support Team, powered by AI.",
  problemIntro:
    "Each expert specializes in one area women struggle with during menopause - and together, they work like your personal reset system.",
  problemBullets: [
    "Personalized answers to your symptoms",
    "Daily steps in plain English",
    "Evidence-based guidance you can trust",
  ],
  solutionTitle: "Meet Your AI Team",
  solutionIntro:
    "Four intelligent helpers designed for women in menopause - working together to rebalance your body and mind.",
  ctaPrimaryText: "Meet Your Menoteam Free for 3 Days",
  ctaSecondaryText: "How it works",
};

const experts = [
  {
    name: "Mina",
    role: "Menopause Expert",
    desc: "Understands your phase, symptoms, and hormones. Helps you finally make sense of what’s happening and how to manage it.",
    emoji: "🧠",
    image: "/mina.png",
  },
  {
    name: "Nutrina",
    role: "Nutrition Coach",
    desc: "Creates simple food ideas that actually balance energy and hormones - no diets, no deprivation.",
    emoji: "🍎",
    image: "/nutrina.png",
  },
  {
    name: "Fitina",
    role: "Movement Coach",
    desc: "Designs light, hormone-friendly exercise tips to boost metabolism without burnout.",
    emoji: "💪",
    image: "/fitina.png",
  },
  {
    name: "Ema",
    role: "Psychology & Mindset Coach",
    desc: "Guides you through stress, sleep, and emotional balance so you feel calm, centered, and confident again.",
    emoji: "💗",
    image: "/ema.png",
  },
];

const pills = [
  { Icon: Bot, label: "4 AI Experts" },
  { Icon: BookOpenCheck, label: "Evidence-informed" },
  { Icon: ShieldCheck, label: "Private & secure" },
  { Icon: CalendarRange, label: "Track progress daily" },
];

export default function MenopauseResetHero(props: MenopauseResetProps) {
  const copy = { ...defaults, ...props };

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-b from-background via-white to-pink-50" />

      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24 text-center">
        {/* Eyebrow + Title */}
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-200/70 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-rose-700 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> {copy.eyebrow}
        </span>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl">
          {copy.problemTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-zinc-600">
          {copy.problemIntro}
        </p>

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

        {/* 4 Experts */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {experts.map((ex) => (
            <div
              key={ex.name}
              className="rounded-3xl border border-pink-100 bg-white p-6 text-left shadow-md transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                  <Image
                    src={ex.image}
                    alt={ex.name}
                    width={300}
                    height={300}
                    className="h-26 w-auto object-cover"
                  />
                <div>
                  <h3 className="font-semibold text-zinc-900">{ex.name}</h3>
                  <p className="text-sm text-primary">{ex.role}</p>
                </div>
              </div>
              <p className="text-sm text-zinc-700 leading-relaxed">{ex.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12">
          <a
          href="/register"
            className="cursor-pointer inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 text-base font-medium text-white shadow-lg transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            <Sparkles className="h-4 w-4" /> {copy.ctaPrimaryText}
          </a>
        </div>
      </div>
    </section>
  );
}
