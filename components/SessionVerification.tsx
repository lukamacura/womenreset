"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { detectBrowser, hasBrowserMismatchIssue, getBrowserMismatchMessage } from "@/lib/browserUtils";
import { AlertCircle, X } from "lucide-react";

/**
 * Component to verify session after authentication callback
 * Helps detect and handle browser mismatch issues on Samsung devices
 */
export default function SessionVerification() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showWarning, setShowWarning] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<ReturnType<typeof detectBrowser> | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      // Small delay to ensure cookies are available after redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if we just came from auth callback
      const browserCheck = searchParams.get("browser_check");
      const browser = detectBrowser();
      setBrowserInfo(browser);

      // Check session - try multiple times if needed
      let session = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts && !session) {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error(`Session check error (attempt ${attempts + 1}):`, error);
        }
        
        session = data.session;
        
        if (!session && attempts < maxAttempts - 1) {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        attempts++;
      }

      // If no session but we have browser_check param, show warning
      if (!session && browserCheck === "samsung" && hasBrowserMismatchIssue(browser)) {
        console.warn("Session verification: No session found after auth callback on Samsung Internet");
        setShowWarning(true);
      } else if (!session && browserCheck === "samsung") {
        // Even if not Samsung browser now, if we came from Samsung, there might be an issue
        console.warn("Session verification: No session found after auth callback");
        // Don't show warning if user switched browsers - session should work
      }

      // If session exists, remove browser_check param from URL
      if (session && browserCheck) {
        const url = new URL(window.location.href);
        url.searchParams.delete("browser_check");
        router.replace(url.pathname + url.search, { scroll: false });
      }

      setSessionChecked(true);
    };

    checkSession();
  }, [searchParams, router]);

  // Don't show anything if session is verified or no warning needed
  if (!showWarning || !browserInfo) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-2xl mx-auto">
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-400/30 rounded-xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 dark:text-orange-400 mb-1">
              Browser Compatibility Notice
            </h3>
            <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
              {getBrowserMismatchMessage(browserInfo)}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={async () => {
                  // Try to refresh the session
                  const { data, error } = await supabase.auth.refreshSession();
                  if (data.session) {
                    setShowWarning(false);
                    router.refresh();
                  } else {
                    // If refresh fails, redirect to login with helpful message
                    router.push("/login?error=browser_mismatch&message=" + encodeURIComponent("Please try logging in again. If you registered in Chrome, make sure to use Chrome to complete your registration."));
                  }
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Retry Authentication
              </button>
              <button
                onClick={() => setShowWarning(false)}
                className="px-4 py-2 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/40 dark:hover:bg-orange-900/60 text-orange-900 dark:text-orange-300 rounded-lg text-sm font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowWarning(false)}
            className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 transition-colors shrink-0"
            aria-label="Close warning"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

