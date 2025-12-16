/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// (opciono, ali bezbedno): spreči statički prerender
export const dynamic = "force-dynamic";

function LoginForm() {
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Get redirect target from URL params
  const redirectTarget = searchParams.get("redirectedFrom") || "/dashboard";
  
  // Handle error query parameter from auth callback
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const errorMessage = searchParams.get("message");
    
    if (errorParam === "auth_callback_error") {
      setErr(errorMessage 
        ? decodeURIComponent(errorMessage) 
        : "Email confirmation failed. Please try again or contact support.");
    }
  }, [searchParams]);

  const emailValid = useMemo(() => /.+@.+\..+/.test(email), [email]);
  const canSubmit = emailValid && !loading;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setErr(null);
    setInfo(null);
    setLoading(true);

    try {
      const redirectTo = typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTarget)}`
        : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        let friendly = "An error occurred. Please try again.";
        
        if (error.message.includes("email") || error.message.includes("invalid")) {
          friendly = "That email address is invalid. Please check and try again.";
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
        setLoading(false);
        return;
      }

      // Magic link sent successfully
      setInfo("Check your email! We sent you a magic link. Click it to log in.");
      setLoading(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="relative overflow-hidden mx-auto max-w-md p-6 sm:p-8">
      {/* Subtle background accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-40">
        <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <h1 className="text-3xl sm:text-5xl font-script font-extrabold tracking-tight mb-6 text-balance pt-16">
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
              Sending magic link…
            </>
          ) : (
            <>Continue with email</>
          )}
        </button>
      </form>

      {info && (
        <div role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-100 p-3 text-sm text-emerald-500 font-bold">
          {info}
        </div>
      )}
      {err && (
        <div role="alert" className="mt-4 rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error font-bold">
          {err}
        </div>
      )}

      <p className="mt-6 text-md text-muted-foreground">
        Don’t have an account? {" "}
        <Link href="/register" className="bg-primary-light text-primary-dark rounded-md px-2 py-1 font-bold underline-offset-4 hover:opacity-80">
          Sign up
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage({
  params: _params,
  searchParams: _searchParams,
}: {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  return (
    <Suspense fallback={
      <main className="relative mx-auto max-w-md p-6 sm:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
