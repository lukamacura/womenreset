/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { detectBrowser, hasBrowserMismatchIssue, getBrowserMismatchMessage } from "@/lib/browserUtils";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

function LoginForm() {
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorType, setErrorType] = useState<'user_not_found' | 'invalid_email' | 'rate_limit' | 'network' | 'email_service' | 'redirect' | 'browser_mismatch' | 'unknown' | null>(null);
  const [browserInfo, setBrowserInfo] = useState<ReturnType<typeof detectBrowser> | null>(null);

  // Get redirect target from URL params
  const redirectTarget = searchParams.get("redirectedFrom") || "/dashboard";
  
  // Detect browser on mount
  useEffect(() => {
    const browser = detectBrowser();
    setBrowserInfo(browser);
    
    // Check if there's a browser mismatch issue
    if (hasBrowserMismatchIssue(browser)) {
      console.warn("Browser mismatch detected:", browser);
    }
  }, []);

  // Handle error query parameter from auth callback
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const errorMessage = searchParams.get("message");
    const browserCheck = searchParams.get("browser_check");
    
    if (errorParam === "otp_expired") {
      // OTP expired - show helpful message with clear recovery
      const message = errorMessage ? decodeURIComponent(errorMessage) : "The email link has expired. Please request a new magic link.";
      setErrorType('unknown');
      setErr(message);
      setInfo("Your account already exists. Enter your email below and click 'Continue with email' to receive a new magic link.");
    } else if (errorParam === "auth_callback_error") {
      // Check if error message suggests browser mismatch
      const message = errorMessage ? decodeURIComponent(errorMessage) : "";
      if (message.toLowerCase().includes("session") || message.toLowerCase().includes("cookie") || browserCheck === "samsung") {
        setErrorType('browser_mismatch');
        setErr(getBrowserMismatchMessage(browserInfo || detectBrowser()));
      } else {
        setErr(message || "Email confirmation failed. Please try again or contact support.");
      }
    } else if (browserCheck === "samsung" && browserInfo && hasBrowserMismatchIssue(browserInfo)) {
      // Show browser mismatch warning even if auth succeeded
      // This helps users understand potential issues
      setInfo("You're using Samsung Internet. If you registered in Chrome, make sure to open email links in Chrome for the best experience.");
    }
  }, [searchParams, browserInfo]);

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
      // Use our server-side magic link endpoint
      // This bypasses PKCE and works across different browsers (Samsung Internet, Chrome, etc.)
      console.log("Login attempt:", { email, redirectTarget });

      const response = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: redirectTarget,
          isRegistration: false, // This is login, not registration
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Magic link error:", { status: response.status, data });

        let friendly = data.error || "An error occurred. Please try again.";
        let errorCategory: typeof errorType = 'unknown';

        // Handle specific error cases based on status code
        if (response.status === 404) {
          friendly = data.error || "You don't have an account with this email. Please register to create an account.";
          errorCategory = 'user_not_found';
        } else if (response.status === 429) {
          friendly = data.error || "Too many attempts. Please wait a moment and try again.";
          errorCategory = 'rate_limit';
        } else if (response.status === 400) {
          // Check for email validation errors
          if (data.error?.toLowerCase().includes("email")) {
            friendly = data.error || "That email address is invalid. Please check and try again.";
            errorCategory = 'invalid_email';
          }
        } else if (response.status >= 500) {
          friendly = "Email service is temporarily unavailable. Please try again later.";
          errorCategory = 'email_service';
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
      
      // Check if it's a network error
      if (e instanceof TypeError && e.message.includes("fetch")) {
        setErr("Network error. Please check your connection and try again.");
        setErrorType('network');
      } else {
        const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred. Please try again.";
        setErr(errorMessage);
        setErrorType('unknown');
      }
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

        <div className="flex-1 flex flex-col justify-center items-center max-w-md mx-auto w-full text-center space-y-6 pt-22">
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
            {browserInfo && hasBrowserMismatchIssue(browserInfo) && (
              <div className="mt-4 rounded-xl border border-orange-400/30 bg-orange-50/80 dark:bg-orange-900/20 p-4 text-sm text-orange-700 dark:text-orange-400 max-w-md">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold mb-1">Important: Open Link in Chrome</p>
                    <p className="text-xs mb-2">
                      When you receive the email, long-press the link and select &quot;Open in Chrome&quot; or copy the link and paste it into Chrome. This ensures your login works correctly.
                    </p>
                    <p className="text-xs font-semibold mt-2">Quick Steps:</p>
                    <ol className="text-xs list-decimal list-inside space-y-1 mt-1">
                      <li>Long-press the magic link in your email</li>
                      <li>Select &quot;Open in Chrome&quot; or &quot;Copy link&quot;</li>
                      <li>If copied, paste into Chrome&apos;s address bar</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
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
                : errorType === 'browser_mismatch'
                ? "border-orange-400/30 bg-orange-50/80 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400"
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
                    : errorType === 'browser_mismatch'
                    ? 'Browser Compatibility Issue'
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
                {errorType === 'browser_mismatch' && (
                  <div className="mt-3 pt-3 border-t border-orange-200/50 dark:border-orange-700/50">
                    <p className="text-xs font-semibold mb-2">How to fix this:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Open Chrome on your device</li>
                      <li>Copy the link from your email</li>
                      <li>Paste it into Chrome&apos;s address bar</li>
                      <li>Or try requesting a new magic link while using Chrome</li>
                    </ol>
                    <p className="text-xs mt-2">
                      This happens because email links on Samsung devices often open in Samsung Internet instead of Chrome, and browsers don&apos;t share cookies with each other.
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
