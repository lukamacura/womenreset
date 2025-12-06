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
  eyebrow: "Everything you need to feel like yourself again",
  problemTitle: "Your Complete Menopause Support System",
  problemIntro:
    "Beyond Lisa, your personal AI coach, you get a full ecosystem designed to help you track, understand, and manage every aspect of your menopause journey.",
  problemBullets: [
    "Track symptoms, nutrition, and fitness in one place",
    "Get personalized insights from your data patterns",
    "Access evidence-based guidance anytime, anywhere",
  ],
  solutionTitle: "Your Complete Support Ecosystem",
  solutionIntro:
    "From daily tracking to expert guidance, everything you need to navigate menopause with confidence and clarity.",
  ctaPrimaryText: "Start Your Free 3-Day Trial",
  ctaSecondaryText: "Learn more",
};

const pills = [
  { Icon: Bot, label: "AI-Powered Coaching" },
  { Icon: BookOpenCheck, label: "Evidence-based" },
  { Icon: ShieldCheck, label: "Private & secure" },
  { Icon: CalendarRange, label: "Track & analyze patterns" },
];

export default function MenopauseResetHero(props: MenopauseResetProps) {
  const copy = { ...defaults, ...props };

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-b from-pink-400 via-pink-200 to-pink-100" />

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

        {/* Services Image */}
        <div className="mt-14 flex justify-center">
          <Image
            src="/services.svg"
            alt="Services"
            width={1200}
            height={800}
            className="w-full max-w-5xl h-auto object-contain"
          />
        </div>

        {/* CTA */}
        <div className="mt-2">
          <a
          href="/register"
            className="cursor-pointer inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 text-base font-bold text-white shadow-lg transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            <Sparkles className="h-4 w-4" /> {copy.ctaPrimaryText}
          </a>
        </div>
      </div>
    </section>
  );
}
