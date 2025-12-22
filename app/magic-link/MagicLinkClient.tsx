"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { SITE_URL, AUTH_CALLBACK_PATH } from "@/lib/constants";

export default function MagicLinkClient() {
  const sp = useSearchParams();

  const [email, setEmail] = useState(() => sp.get("email") ?? "");
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
      // Always use womenreset.com for email redirects
      const redirectTarget = sp.get("next") || "/dashboard";
      const redirectTo = `${SITE_URL}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(redirectTarget)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        let friendly = "An error occurred. Please try again.";
        
        if (error.message.includes("email") || error.message.includes("invalid")) {
          friendly = "Please check your email address.";
        } else if (
          /rate/i.test(error.message) || 
          /too many/i.test(error.message) ||
          error.message.includes("security purposes") ||
          error.message.includes("only request this after") ||
          /48 seconds/i.test(error.message)
        ) {
          // Use the original error message if it contains specific rate limit info
          friendly = error.message.includes("48 seconds") || error.message.includes("security purposes")
            ? error.message
            : "Too many attempts — please wait a moment and try again.";
        } else if (error.message) {
          friendly = error.message;
        }
        
        setErr(friendly);
        return;
      }

      setInfo("We sent you a magic link. Check your inbox.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unknown error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (email && emailValid && sp.get("auto") === "1") {
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
        <div role="alert" className="mt-4 rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error font-bold">
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
