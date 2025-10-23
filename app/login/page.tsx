"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// (opciono, ali bezbedno): spreči statički prerender
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();

  // default destinacija dok se ne pročita query iz URL-a na klijentu
  const redirectTarget = useRef("/dashboard");

  // PROČITAJ QUERY POSLE MOUNT-A (bez useSearchParams)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const r = sp.get("redirectedFrom");
      if (r && r.startsWith("/")) {
        // jednostavna sanitizacija protiv open-redirecta
        redirectTarget.current = r;
      }
    } catch {
      /* ignore */
    }
  }, []);

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailValid = useMemo(() => /.+@.+\..+/.test(email), [email]);
  const passValid = useMemo(() => pass.length >= 1, [pass]);
  const canSubmit = emailValid && passValid && !loading;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setErr(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        const friendly =
          /invalid login/i.test(error.message)
            ? "Invalid email or password. Please try again."
            : /email/i.test(error.message)
            ? "We couldn't find an account with that email."
            : /rate/i.test(error.message)
            ? "Too many attempts — please wait a moment and try again."
            : error.message;
        setErr(friendly);
        return;
      }

      router.replace(redirectTarget.current);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative mx-auto max-w-md p-6 sm:p-8">
      {/* Subtle background accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-40">
        <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight mb-6 text-balance">
        Log in
      </h1>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
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

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs underline underline-offset-4 hover:opacity-80">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 pr-11 ring-offset-background placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
              type={showPass ? "text" : "password"}
              placeholder="Your password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              aria-invalid={pass.length > 0 && !passValid}
              required
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute inset-y-0 right-2 my-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {/* simple eye icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                {showPass ? (
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                ) : (
                  <>
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58a3 3 0 0 0 4.24 4.24" />
                    <path d="M9.88 4.26A9.91 9.91 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.37 4.62" />
                    <path d="M6.61 6.61A17.77 17.77 0 0 0 2 12s3.5 7 10 7a9.73 9.73 0 0 0 4.39-1" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          className="group w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground shadow-sm ring-1 ring-inset ring-primary/20 transition hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
          type="submit"
          disabled={!canSubmit}
        >
          {loading ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="4" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" />
              </svg>
              Signing in…
            </>
          ) : (
            <>Sign in</>
          )}
        </button>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-foreground/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-2 text-xs text-muted-foreground bg-background">or</span>
          </div>
        </div>

        {/* Optional: Magic link */}
        <Link
          href={{ pathname: "/magic-link", query: email ? { email } : {} }}
          className="block w-full text-center rounded-xl border border-foreground/15 px-4 py-2.5 text-sm font-medium hover:bg-foreground/5"
        >
          Continue with magic link
        </Link>
      </form>

      {err && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {err}
        </div>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        Don’t have an account? {" "}
        <Link href="/register" className="underline underline-offset-4 hover:opacity-80">
          Sign up
        </Link>
      </p>
    </main>
  );
}
