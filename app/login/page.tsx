/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getRedirectBaseUrl, AUTH_CALLBACK_PATH } from "@/lib/constants";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

function LoginForm() {
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorType, setErrorType] = useState<'user_not_found' | 'invalid_email' | 'rate_limit' | 'network' | 'email_service' | 'redirect' | 'unknown' | null>(null);

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
    setErrorType(null);
    setLoading(true);

    try {
      // First, check if user exists to prevent auto-creation during login
      let userExists: boolean | null = null;
      try {
        const checkResponse = await fetch("/api/auth/check-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          userExists = checkData.exists;
        }
      } catch (checkError) {
        console.warn("Could not check user existence, proceeding with login attempt:", checkError);
        // Continue with login attempt if check fails (fail open)
      }

      // If user doesn't exist, show error before attempting login
      if (userExists === false) {
        setErr("You don't have an account with this email. Please register to create an account.");
        setErrorType('user_not_found');
        setLoading(false);
        return;
      }

      // Use the current origin for redirects (localhost in dev, production URL in prod)
      const redirectTo = `${getRedirectBaseUrl()}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(redirectTarget)}`;
      
      // Debug logging
      console.log("Login attempt:", { email, redirectTo, userExists });

      const { error, data } = await supabase.auth.signInWithOtp({
        email,
        options: { 
          emailRedirectTo: redirectTo,
          // Note: Even if user exists check passes, Supabase might still auto-create
          // if "Enable email sign ups" is enabled. We handle this in error checking below.
        },
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
        let errorCategory: typeof errorType = 'unknown';
        
        // Check for specific error types
        const errorMsg = error.message.toLowerCase();
        const errorStatus = error.status;
        
        // CRITICAL: Check if user doesn't exist (prevent auto-creation)
        // Supabase may return different error messages depending on configuration
        if (
          errorMsg.includes("user not found") ||
          errorMsg.includes("email not found") ||
          errorMsg.includes("user does not exist") ||
          errorMsg.includes("no user found") ||
          errorMsg.includes("user_not_found") ||
          (errorStatus === 400 && (
            errorMsg.includes("invalid login credentials") ||
            errorMsg.includes("invalid credentials") ||
            (errorMsg.includes("email") && errorMsg.includes("not") && errorMsg.includes("registered"))
          ))
        ) {
          friendly = "You don't have an account with this email. Please register to create an account.";
          errorCategory = 'user_not_found';
        }
        // Email validation errors
        else if (
          errorMsg.includes("invalid email") ||
          errorMsg.includes("email format") ||
          errorMsg === "invalid email address" ||
          errorMsg.includes("email is not valid") ||
          (errorStatus === 400 && errorMsg.includes("email"))
        ) {
          friendly = "That email address is invalid. Please check and try again.";
          errorCategory = 'invalid_email';
        }
        // Redirect URL errors
        else if (
          errorMsg.includes("redirect") ||
          errorMsg.includes("redirect_to") ||
          errorMsg.includes("redirect url") ||
          errorMsg.includes("url configuration")
        ) {
          friendly = "Redirect URL not configured. Please contact support.";
          errorCategory = 'redirect';
        }
        // Rate limiting errors
        else if (
          /rate/i.test(error.message) || 
          /too many/i.test(error.message) ||
          error.message.includes("security purposes") ||
          error.message.includes("only request this after") ||
          /48 seconds/i.test(error.message) ||
          /60 seconds/i.test(error.message) ||
          errorStatus === 429
        ) {
          friendly = error.message.includes("48 seconds") || 
                     error.message.includes("60 seconds") || 
                     error.message.includes("security purposes")
            ? error.message
            : "Too many attempts — please wait a moment and try again.";
          errorCategory = 'rate_limit';
        }
        // Email provider/SMTP errors
        else if (
          errorMsg.includes("email provider") ||
          errorMsg.includes("email not enabled") ||
          errorMsg.includes("smtp") ||
          (errorMsg.includes("mail") && errorMsg.includes("service")) ||
          errorMsg.includes("sending email") ||
          errorMsg.includes("email service") ||
          errorMsg.includes("email delivery")
        ) {
          friendly = "Email service is temporarily unavailable. Please try again later or contact support.";
          errorCategory = 'email_service';
        }
        // Network/connection errors
        else if (
          errorMsg.includes("network") ||
          errorMsg.includes("fetch") ||
          errorMsg.includes("connection") ||
          errorMsg.includes("failed to fetch")
        ) {
          friendly = "Network error. Please check your connection and try again.";
          errorCategory = 'network';
        }
        // Show the actual error message for other cases
        else if (error.message) {
          friendly = error.message;
          errorCategory = 'unknown';
        }
        
        setErr(friendly);
        setErrorType(errorCategory);
        setLoading(false);
        return;
      }

      // Magic link sent successfully
      console.log("Magic link sent successfully:", data);
      setEmailSent(true);
      setErrorType(null);
      setLoading(false);
    } catch (e) {
      console.error("Unexpected error during login:", e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred. Please try again.";
      setErr(errorMessage);
      setErrorType('unknown');
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
            <div 
              role="alert" 
              className={`rounded-xl border p-4 text-sm max-w-md ${
                errorType === 'user_not_found' 
                  ? "border-blue-400/30 bg-blue-50/80 text-blue-700"
                  : "border-error/30 bg-error/10 text-error"
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold mb-1">
                    {errorType === 'user_not_found' ? 'Account Not Found' : 'Error'}
                  </p>
                  <p className="mb-2">{err}</p>
                  {errorType === 'user_not_found' && (
                    <div className="mt-3 pt-3 border-t border-blue-200/50">
                      <p className="text-xs mb-2">Don&apos;t have an account yet?</p>
                      <Link 
                        href="/register" 
                        className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Register here →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
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
          <div role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-100/50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-700 dark:text-emerald-400">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Information</p>
                <p>{info}</p>
              </div>
            </div>
          </div>
        )}
        {err && (
          <div 
            role="alert" 
            className={`mt-4 rounded-xl border p-4 text-sm ${
              errorType === 'user_not_found' 
                ? "border-blue-400/30 bg-blue-50/80 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                : errorType === 'rate_limit'
                ? "border-orange-400/30 bg-orange-50/80 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400"
                : errorType === 'invalid_email'
                ? "border-yellow-400/30 bg-yellow-50/80 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                : "border-error/30 bg-error/10 text-error"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                errorType === 'user_not_found' ? 'text-blue-600 dark:text-blue-400' : ''
              }`} />
              <div className="flex-1">
                <p className="font-semibold mb-1">
                  {errorType === 'user_not_found' 
                    ? 'Account Not Found'
                    : errorType === 'rate_limit'
                    ? 'Too Many Requests'
                    : errorType === 'invalid_email'
                    ? 'Invalid Email'
                    : errorType === 'network'
                    ? 'Network Error'
                    : errorType === 'email_service'
                    ? 'Email Service Error'
                    : 'Error'
                  }
                </p>
                <p className="mb-2">{err}</p>
                {errorType === 'user_not_found' && (
                  <div className="mt-3 pt-3 border-t border-blue-200/50 dark:border-blue-700/50">
                    <p className="text-xs mb-2">Don&apos;t have an account yet?</p>
                    <Link 
                      href="/register" 
                      className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Register here →
                    </Link>
                  </div>
                )}
                {errorType === 'rate_limit' && (
                  <div className="mt-3 pt-3 border-t border-orange-200/50 dark:border-orange-700/50">
                    <p className="text-xs">
                      Please wait a minute before requesting another magic link. This helps us prevent spam and protect your account.
                    </p>
                  </div>
                )}
                {errorType === 'invalid_email' && (
                  <div className="mt-3 pt-3 border-t border-yellow-200/50 dark:border-yellow-700/50">
                    <p className="text-xs">
                      Make sure your email address includes an @ symbol and a valid domain (e.g., example.com).
                    </p>
                  </div>
                )}
                {errorType === 'network' && (
                  <div className="mt-3 pt-3 border-t border-error/20">
                    <p className="text-xs">
                      Check your internet connection and try again. If the problem persists, please contact support.
                    </p>
                  </div>
                )}
                {errorType === 'email_service' && (
                  <div className="mt-3 pt-3 border-t border-error/20">
                    <p className="text-xs">
                      Our email service is experiencing issues. Please try again in a few minutes or contact support if the problem continues.
                    </p>
                  </div>
                )}
              </div>
            </div>
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
