/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorType, setErrorType] = useState<'user_not_found' | 'invalid_credentials' | 'invalid_email' | 'rate_limit' | 'network' | 'unknown' | null>(null);

  // Get redirect target from URL params
  const redirectTarget = searchParams.get("redirectedFrom") || "/dashboard";

  // Handle error query parameter from previous navigation
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const errorMessage = searchParams.get("message");
    
    if (errorParam && errorMessage) {
      setErr(decodeURIComponent(errorMessage));
      setErrorType('unknown');
    }
  }, [searchParams]);

  // Login flow must not touch quiz data: clear any stale pending quiz so dashboard won't save it after redirect
  useEffect(() => {
    sessionStorage.removeItem("pending_quiz_answers");
  }, []);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);
  const passwordValid = useMemo(() => password.length >= 8, [password]);
  const canSubmit = emailValid && passwordValid && !loading;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setErr(null);
    setErrorType(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (authError) {
        console.error("Login error:", authError);
        
        let friendly = "An error occurred. Please try again.";
        let errorCategory: typeof errorType = 'unknown';

        // Handle specific Supabase error messages
        if (authError.message.includes("Invalid login credentials")) {
          friendly = "Invalid email or password. Please check your credentials and try again.";
          errorCategory = 'invalid_credentials';
        } else if (authError.message.includes("Email not confirmed")) {
          friendly = "Please verify your email address before logging in.";
          errorCategory = 'invalid_email';
        } else if (authError.message.includes("Too many requests")) {
          friendly = "Too many login attempts. Please wait a moment and try again.";
          errorCategory = 'rate_limit';
        } else if (authError.message.includes("User not found")) {
          friendly = "No account found with this email. Please register to create an account.";
          errorCategory = 'user_not_found';
        } else {
          friendly = authError.message;
        }

        setErr(friendly);
        setErrorType(errorCategory);
        setLoading(false);
        return;
      }

      if (data.session) {
        // Login successful! Redirect to dashboard
        console.log("Login successful");
        router.push(redirectTarget);
      }
      
      setLoading(false);
    } catch (e) {
      console.error("Unexpected error during login:", e);
      
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

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-foreground/15 bg-background px-4 py-3 pr-12 ring-offset-background placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={password.length > 0 && !passwordValid}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {password.length > 0 && password.length < 8 && (
              <p className="text-xs text-muted-foreground mt-1">Password must be at least 8 characters</p>
            )}
          </div>

          {/* Submit */}
          <button
            className="group w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-sm ring-1 ring-inset ring-primary/20 transition hover:brightness-95 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            type="submit"
            disabled={!canSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in…
              </>
            ) : (
              <>Sign in</>
            )}
          </button>
        </form>

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
                    ? 'Email Not Verified'
                    : errorType === 'invalid_credentials'
                    ? 'Invalid Credentials'
                    : errorType === 'network'
                    ? 'Network Error'
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
                      Please wait a minute before trying again. This helps us protect your account.
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
