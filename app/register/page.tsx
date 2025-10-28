"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Minimal client-side validation for better UX
  const emailValid = useMemo(() => /.+@.+\..+/.test(email), [email]);
  const passValid = useMemo(() => pass.length >= 8, [pass]);
  const canSubmit = emailValid && passValid && !loading;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setErr(null);
    setInfo(null);
    setLoading(true);

    try {
      const nowIso = new Date().toISOString();

      const { error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: { trial_start: nowIso } },

      });

      if (error) {
        // Improve common error messaging
        const friendly =
          error.message.includes("email")
            ? "That email looks unavailable or invalid."
            : error.message.includes("rate limit")
            ? "Too many attempts — please wait a moment and try again."
            : error.message;
        setErr(friendly);
        return;
      }

      // If email confirmation is disabled, a session may exist immediately
     const { data } = await supabase.auth.getSession();
if (data.session) {
  router.replace("/dashboard");
  router.refresh();
  return;
}
// Ako je potvrda uključena, i dalje možeš prikazati info:
setInfo("Check your inbox to confirm your email, then log in.");


      // Otherwise, guide the user
      setInfo("Check your inbox to confirm your email, then log in.");
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

      <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight mb-6 text-balance">
        Create your account
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
            aria-describedby="email-help"
            required
          />
          <p id="email-help" className="mt-1 text-xs text-muted-foreground">
            We’ll send a confirmation link to this address.
          </p>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              autoComplete="new-password"
              className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 pr-11 ring-offset-background placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
              type={showPass ? "text" : "password"}
              placeholder="At least 8 characters"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              aria-invalid={pass.length > 0 && !passValid}
              aria-describedby="password-help"
              required
              minLength={8}
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
          <div className="mt-1 flex items-center justify-between text-xs">
            <p id="password-help" className="text-muted-foreground">
              Use 8+ characters. Consider a phrase for better security.
            </p>
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
              Creating account…
            </>
          ) : (
            <>Create account</>
          )}
        </button>

        {/* Secondary actions */}
        <p className="text-sm text-muted-foreground">
          By signing up, you agree to our {" "}
          <Link href="/terms" className="underline underline-offset-4 hover:opacity-80">Terms</Link>{" "}
          and {" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:opacity-80">Privacy Policy</Link>.
        </p>
      </form>

      {/* Alerts */}
      {err && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {err}
        </div>
      )}
      {info && (
        <div role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {info}
        </div>
      )}

      {/* Login link */}
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account? {" "}
        <Link className="underline underline-offset-4 hover:opacity-80" href="/login">Log in</Link>
      </p>
    </main>
  );
}
