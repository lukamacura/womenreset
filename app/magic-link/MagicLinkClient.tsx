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
      
      console.log("MagicLink: SITE_URL:", SITE_URL);
      console.log("MagicLink: AUTH_CALLBACK_PATH:", AUTH_CALLBACK_PATH);
      console.log("MagicLink: redirectTarget:", redirectTarget);
      console.log("MagicLink: Attempting signInWithOtp with redirectTo:", redirectTo);
      console.log("MagicLink: Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      // Validate redirect URL format
      try {
        new URL(redirectTo);
        console.log("MagicLink: Redirect URL is valid");
      } catch (urlError) {
        console.error("MagicLink: Invalid redirect URL format:", urlError);
        setErr("Configuration error: Invalid redirect URL format. Please contact support.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        console.error("MagicLink: Supabase error:", error);
        console.error("MagicLink: Error message:", error.message);
        console.error("MagicLink: Error status:", error.status);
        console.error("MagicLink: Full error object:", JSON.stringify(error, null, 2));
        
        // Default to showing the actual error message
        let friendly = error.message || "An error occurred. Please try again.";
        
        // Check for redirect URL errors FIRST (most common issue)
        const lowerMessage = error.message.toLowerCase();
        if (
          lowerMessage.includes("redirect") || 
          lowerMessage.includes("redirect_to") ||
          lowerMessage.includes("redirect url") ||
          lowerMessage.includes("allowed values") ||
          lowerMessage.includes("not allowed") ||
          lowerMessage.includes("invalid redirect") ||
          lowerMessage.includes("redirect_to must") ||
          error.status === 400 ||
          error.status === 422
        ) {
          friendly = `Redirect URL configuration error: ${error.message}. Please verify Supabase redirect URLs include: ${redirectTo}`;
        } else if (
          /rate/i.test(error.message) || 
          /too many/i.test(error.message) ||
          error.message.includes("security purposes") ||
          error.message.includes("only request this after") ||
          /48 seconds/i.test(error.message)
        ) {
          friendly = error.message.includes("48 seconds") || error.message.includes("security purposes")
            ? error.message
            : "Too many attempts — please wait a moment and try again.";
        } else if (
          // Only show invalid email if it's explicitly about email format validation
          (lowerMessage.includes("email") && 
           (lowerMessage.includes("format") || 
            lowerMessage.includes("malformed") || 
            lowerMessage.includes("invalid email") ||
            lowerMessage.includes("email address"))) &&
          !lowerMessage.includes("redirect")
        ) {
          friendly = "Please check your email address.";
        }
        // Otherwise, show the actual error message
        
        setErr(friendly);
        return;
      }

      console.log("MagicLink: Magic link sent successfully");
      setInfo("We sent you a magic link. Check your inbox.");
    } catch (e) {
      console.error("MagicLink: Exception:", e);
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
