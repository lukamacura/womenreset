import Link from "next/link";
import {
  ShieldCheck,
  CreditCard,
  Brain,
  BookOpen,
  UserRound,
  Bot,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";

// mapiramo label -> ikona (lucide koristi currentColor, boju dajemo kroz Tailwind text-*)
const FEATURES: { label: string; Icon: LucideIcon }[] = [
  { label: "Privacy first, no third-party sharing", Icon: ShieldCheck },
  { label: "Subscription-ready with Stripe", Icon: CreditCard },
  { label: "Connected to a powerful VectorShift AI pipeline", Icon: Brain },
  { label: "Backed by a carefully curated and trusted knowledge base", Icon: BookOpen },
];

export default function Home() {
  return (
    <section className="relative overflow-hidden">
      {/* Background accents (dekorativno) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-40 dark:opacity-30"
      >
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl bg-primary/30" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full blur-3xl bg-primary/20" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16 py-8 sm:py-12 lg:py-16">
          {/* Copy column */}
          <div className="space-y-6">
            <h1 className="font-display text-balance text-4xl/tight sm:text-5xl/tight lg:text-5xl/tight font-extrabold tracking-tight">
              30 Days to More Energy, Better Sleep & a Balanced Body, For Women 40+{" "}
              <span className="inline-block bg-linear-to-r from-primary/90 to-primary/60 bg-clip-text text-transparent">
                OR YOUR MONEY BACK
              </span>
              .
            </h1>

            <p className="text-pretty text-base sm:text-lg text-muted-foreground max-w-prose">
              Ask questions anytime. Get personalized advice, symptom tracking, and educational
              insights — private & secure.
            </p>

            {/* CTAs */}
            <div className="flex flex-col gap-3 text-base sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/register"
                aria-label="Get started"
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold shadow-sm ring-1 ring-inset ring-primary/20 bg-primary text-primary-foreground transition hover:brightness-95"
              >
                Get started
              </Link>
              <Link
                href="/login"
                aria-label="Login"
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold ring-1 ring-inset ring-foreground/15 transition hover:bg-foreground/5"
              >
                Already have an account?
              </Link>
            </div>

            {/* Feature bullets (Lucide) */}
            <ul className="grid max-w-2xl grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              {FEATURES.map(({ label, Icon }) => (
                <li key={label} className="flex items-start gap-3 text-sm text-foreground">
                  <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={2} />
                  <span className="text-pretty leading-6">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Demo card */}
          <div className="mx-auto w-full max-w-lg">
            <div className="rounded-2xl border border-foreground/10 bg-background/60 p-6 shadow-sm backdrop-blur">
              <div className="mb-3 text-sm font-medium text-muted-foreground">Demo conversation</div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserRound aria-hidden className="h-4 w-4 text-muted-foreground" />
                  <span>You</span>
                </div>
                <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 text-base">
                  How can I reduce hot flashes at night?
                </div>

                <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
                  <Bot aria-hidden className="h-4 w-4 text-primary" />
                  <span>WomenReset bot</span>
                </div>
                <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 text-base">
                  Try layering your clothes, keeping the room cool, and avoiding spicy food or alcohol
                  before sleep.
                </div>
              </div>

              {/* Disclaimer */}
              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle aria-hidden className="mt-0.5 h-3.5 w-3.5" />
                <span>
                  Not medical advice. Always consult a qualified professional for diagnosis and
                  treatment.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
