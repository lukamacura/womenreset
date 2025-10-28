
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function MagicLinkPage() {
  const sp = useSearchParams();

  const [email, setEmail] = useState(sp.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const emailValid = useMemo(() => /.+@.+\..+/.test(email), [email]);
  const canSubmit = emailValid && !loading;

  async function sendLink(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSubmit) return;
    setErr(null);
    setInfo(null);
    setLoading(true);

    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        const friendly =
          /rate/i.test(error.message)
            ? "Previše pokušaja — sačekaj malo pa probaj ponovo."
            : /email/i.test(error.message)
            ? "Proveri adresu e-pošte."
            : error.message;
        setErr(friendly);
        return;
      }

      setInfo("We sent you magic link. Check your inbox.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nepoznata greška");
    } finally {
      setLoading(false);
    }
  }

  // Ako si došao sa /login i email je već validan, može auto-slanje (opciono):
  useEffect(() => {
    if (email && emailValid && sp.get("auto") === "1") {
      // npr. /magic-link?email=a@b.com&auto=1
      void sendLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto max-w-md p-6 sm:p-8">
      <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">
        Log in with Magic link
      </h1>

      <form onSubmit={sendLink} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            inputMode="email"
            autoComplete="email"
            className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={email.length > 0 && !emailValid}
            required
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full cursor-pointer rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground shadow-sm ring-1 ring-inset ring-primary/20 hover:brightness-95 disabled:opacity-60"
        >
          {loading ? "Sending link…" : "Send link"}
        </button>
      </form>

      {info && (
        <div role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {info}
        </div>
      )}
      {err && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {err}
        </div>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4 hover:opacity-80">
          Back
        </Link>
      </p>
    </main>
  );
}
