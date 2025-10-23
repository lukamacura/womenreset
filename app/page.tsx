import Link from "next/link";

// Small, dependency-free check icon
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function Home() {
  return (
    <section className="relative overflow-hidden">
      {/* Background accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-40 dark:opacity-30"
      >
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl bg-primary/30" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full blur-3xl bg-primary/20" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-0">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center py-0 sm:py-0 lg:py-0">
          {/* Copy */}
          <div className="space-y-6">
            <h1 className="font-display text-balance text-4xl/tight sm:text-5xl/tight lg:text-5xl/tight font-normal tracking-tight">
              <b>30 Days</b> to More Energy, Better Sleep & a Balanced Body, For Women 40+
              {" "}
              <span className="inline-block font-extrabold bg-linear-to-r from-primary/90 to-primary/60 bg-clip-text text-transparent">
                OR YOUR MONEY BACK
              </span>
            </h1>

            <p className="text-pretty text-base sm:text-lg text-muted-foreground max-w-prose">
              Ask questions anytime. Get personalized advice, symptom tracking, and educational insights - private & secure.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-base">
              <Link
                href="/register"
                aria-label="Get started"
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold shadow-sm ring-1 ring-inset ring-primary/20 bg-primary text-primary-foreground hover:brightness-95 transition"
              >
                Get started
              </Link>
              <Link
                href="/login"
                aria-label="Login"
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold ring-1 ring-inset ring-foreground/15 hover:bg-foreground/5 transition"
              >
                Already have an account?
              </Link>
            </div>

            {/* Feature bullets */}
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-w-2xl">
              {[
                "Privacy first, no third‑party sharing",
                "Subscription‑ready with Stripe",
                "Connected to a powerful VectorShift AI pipeline",
                "Backed by a carefully curated and trusted knowledge base",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-pretty leading-6">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Demo card */}
          <div className="mx-auto w-full max-w-lg">
            <div className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-6 shadow-sm">
              <div className="mb-3 text-sm font-medium text-muted-foreground">Demo conversation</div>

              <div className="space-y-4">
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
