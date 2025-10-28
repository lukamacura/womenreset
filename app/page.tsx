/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ShieldCheckIcon,
  CreditCard,
  Cpu,
  BookOpen,
  Sparkles,
  Venus
} from "lucide-react";
import MenopauseResetHero from "@/components/MenopauseResetHero";

// Data (kept outside the component to avoid re-creation on renders)
const features: Array<{ label: string; Icon: React.ComponentType<any> }> = [
  { label: "Privacy first, no third‑party sharing", Icon: ShieldCheckIcon },
  { label: "Subscription‑ready with Stripe", Icon: CreditCard },
  { label: "Connected to a powerful VectorShift AI pipeline", Icon: Cpu },
  { label: "Backed by a carefully edited and trusted knowledge base", Icon: BookOpen },
];

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      {/* Background accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-40 dark:opacity-30"
      >
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl bg-primary/30" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full blur-3xl bg-primary/20" />
      </div>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-0">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center py-0 sm:py-0 lg:py-0">
          {/* Copy */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 mb-2 rounded-full border border-rose-200/70 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-rose-700 shadow-sm">
                        <Venus className="h-3.5 w-3.5" aria-hidden /> for Women 40+
                      </span>
            <h1 className="font text-balance text-4xl/tight sm:text-5xl/tight lg:text-5xl/tight font-semibold tracking-tight">
              Start Feeling Like Yourself Again In Just 3 Days  <span className="inline-block bg-clip-text text-transparent bg-linear-to-r from-rose-700 to-primary font-extrabold">FOR FREE</span>

            </h1>

            <p className="text-pretty text-base sm:text-lg text-muted-foreground max-w-prose">
              Join hundreds of women who’ve already started feeling like themselves again - strong, confident, and in control. Try it free for 3 days.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 text-base">
              <div className="">
                <Link
                  href="/register"
                  aria-label="Get started"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold shadow-sm ring-1 ring-inset ring-primary/20 bg-primary text-primary-foreground hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition"
                >
                  <Sparkles aria-hidden className="h-4 w-4" />
                  Start my 3-Day free trial
                </Link>
                 <span className="my-2 flex items-center gap-2 text-sm text-zinc-600">
                                <Sparkles className="h-4 w-4" aria-hidden /> No card needed.
                  </span>
              </div>

            </div>

            {/* Feature bullets */}
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-w-2xl">
              {features.map(({ label, Icon }) => (
                <li key={label} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center">
                    <Icon aria-hidden className="h-5 w-5 text-primary" />
                  </span>
                  <span className="text-pretty leading-6">{label}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Demo card */}
          <motion.div
            className="mx-auto w-full max-w-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
          >
            <div className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-6 shadow-sm">
              <div className="mb-3 text-sm font-medium text-muted-foreground">Demo conversation</div>

              <div className="space-y-4" aria-live="polite">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
                  You
                </div>
                <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 text-base">
                  How can I reduce hot flashes at night?
                </div>

                <div className="pt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                  WomenReset bot
                </div>
                <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 text-base">
                  Try layering your clothes, keeping the room cool, and avoiding spicy food or alcohol before sleep.
                </div>
              </div>

              {/* Small helper text below card */}
              <p className="mt-4 text-xs text-muted-foreground">
                Not medical advice. Always consult a qualified professional for diagnosis and treatment.
              </p>

              {/* Subtle quality badge */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-xs text-muted-foreground">
                <CheckCircle2 aria-hidden className="h-4 w-4" />
                <span>Evidence‑informed guidance</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>


      <MenopauseResetHero/>

    </main>
  );
}
