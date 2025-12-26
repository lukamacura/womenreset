"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getRedirectBaseUrl, AUTH_CALLBACK_PATH } from "@/lib/constants";
import { Mail, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

function LoginForm() {
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
      // Use the current origin for redirects (localhost in dev, production URL in prod)
      const redirectTo = `${getRedirectBaseUrl()}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(redirectTarget)}`;
      
      // Debug logging
      console.log("Login attempt:", { email, redirectTo });

      const { error, data } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        // Log the full error for debugging
        console.error("Supabase auth error:", {
          message: error.message,
          status: error.status,
          name: error.name,
          fullError: error,
        });

        let friendly = "An error occurred. Please try again.";
        
        // Check for specific error types
        const errorMsg = error.message.toLowerCase();
        
        // Email validation errors (be more specific)
        if (
          errorMsg.includes("invalid email") ||
          errorMsg.includes("email format") ||
          errorMsg === "invalid email address" ||
          errorMsg.includes("email is not valid")
        ) {
          friendly = "That email address is invalid. Please check and try again.";
        }
        // Redirect URL errors
        else if (
          errorMsg.includes("redirect") ||
          errorMsg.includes("redirect_to") ||
          errorMsg.includes("redirect url") ||
          errorMsg.includes("url configuration")
        ) {
          friendly = "Redirect URL not configured. Please contact support or check Supabase settings.";
        }
        // Rate limiting errors
        else if (
          /rate/i.test(error.message) || 
          /too many/i.test(error.message) ||
          error.message.includes("security purposes") ||
          error.message.includes("only request this after") ||
          /48 seconds/i.test(error.message) ||
          /60 seconds/i.test(error.message)
        ) {
          friendly = error.message.includes("48 seconds") || 
                     error.message.includes("60 seconds") || 
                     error.message.includes("security purposes")
            ? error.message
            : "Too many attempts — please wait a moment and try again.";
        }
        // Email provider/SMTP errors
        else if (
          errorMsg.includes("email provider") ||
          errorMsg.includes("email not enabled") ||
          errorMsg.includes("smtp") ||
          errorMsg.includes("mail") ||
          errorMsg.includes("sending email") ||
          errorMsg.includes("email service") ||
          errorMsg.includes("email delivery")
        ) {
          friendly = "Email service is not configured. Please check Supabase email settings or contact support.";
        }
        // Network/connection errors
        else if (
          errorMsg.includes("network") ||
          errorMsg.includes("fetch") ||
          errorMsg.includes("connection")
        ) {
          friendly = "Network error. Please check your connection and try again.";
        }
        // Show the actual error message for other cases
        else if (error.message) {
          friendly = error.message;
        }
        
        setErr(friendly);
        setLoading(false);
        return;
      }

      // Magic link sent successfully
      console.log("Magic link sent successfully:", data);
      setEmailSent(true);
      setLoading(false);
    } catch (e) {
      console.error("Unexpected error during login:", e);
      setErr(e instanceof Error ? e.message : "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  // Email sent view
  if (emailSent) {
    return (
      <main className="relative overflow-hidden mx-auto max-w-md p-6 sm:p-8 min-h-screen flex flex-col justify-center">
        {/* Subtle background accents */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-40">
          <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="flex-1 flex flex-col justify-center items-center max-w-md mx-auto w-full text-center space-y-6">
          <div className="rounded-full bg-primary/10 p-6">
            <Mail className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Check your email
            </h1>
            <p className="text-lg text-muted-foreground">
              We sent you a magic link at <strong>{email}</strong>
            </p>
            <p className="text-muted-foreground mt-2">
              Click the link in your email to log in to your account.
            </p>
          </div>
          {err && (
            <div className="rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error max-w-md">
              {err}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="relative overflow-hidden mx-auto max-w-md p-6 sm:p-8 min-h-screen flex flex-col justify-center">
      {/* Subtle background accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-40">
        <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-3 text-balance">
            Welcome back
          </h1>
          <p className="text-lg text-muted-foreground">
            We&apos;re so glad you&apos;re here. Let&apos;s get you back to your journey.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              className="w-full rounded-xl border border-foreground/15 bg-background px-4 py-3 ring-offset-background placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
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
            className="group w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-sm ring-1 ring-inset ring-primary/20 transition hover:brightness-95 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
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

        <p className="mt-6 text-md text-muted-foreground text-center">
          Don&apos;t have an account? {" "}
          <Link href="/register" className="text-primary font-semibold underline-offset-4 hover:opacity-80">
            Sign up
          </Link>
        </p>
      </div>
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
