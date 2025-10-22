import Link from "next/link";

export default function Home() {
  return (
    <section className="grid md:grid-cols-2 gap-10 items-center">
      <div className="space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
          30 Days to More Energy, Better Sleep & a Balanced Body, For Women 40+ <span className="text-primary/70">OR YOUR MONEY BACK</span>.
        </h1>
        <p className="text-foreground font-sans">
          Ask questions anytime. Get personalized advice, symptom tracking, and educational insights - private & secure.
        </p>
        <div className="flex gap-3">
          <Link href="/register" className="bg-primary text-black font-bold px-4 py-2 rounded-md hover:opacity-90">
            Get started
          </Link>
          <Link href="/login" className="px-4 py-2 font-bold rounded-md border border-white/20 hover:bg-white/5">
            Already have an account?
          </Link>
        </div>
        <ul className="text-sm text-foreground space-y-1 pt-4 list-disc pl-5">
          <li>Privacy first, no third-party sharing</li>
          <li>Subscription-ready with Stripe</li>
          <li>Connected to a powerful VectorShift AI pipeline</li>
          <li>Backed by a carefully curated and trusted knowledge base</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 p-6">
        <div className="text-sm text-foreground mb-2">Demo conversation</div>
        <div className="rounded-xl border border-white/10 p-4 space-y-3">
          <div className="text-foreground">You:</div>
          <div className="bg-white/5 rounded p-3">
            How can I reduce hot flashes at night?
          </div>
          <div className="text-foreground pt-2">WomenReset bot:</div>
          <div className="bg-white/5 rounded p-3">
            Try layering your clothes, keeping the room cool, and avoiding spicy food or alcohol before sleep.
          </div>
        </div>
      </div>
    </section>
  );
}
