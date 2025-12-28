"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/**
 * Restores session from URL hash tokens (for cross-browser compatibility)
 * This handles cases where cookies aren't available (e.g., Samsung Internet)
 * Uses hash fragments which are more secure than query params (not sent to server)
 */
export default function SessionRestorer() {
  const router = useRouter();
  const isRestoringRef = useRef(false);

  useEffect(() => {
    const restoreSession = async () => {
      // Only run on client side
      if (typeof window === "undefined") return;

      const hash = window.location.hash;
      
      // Check if we have session tokens in URL hash
      if (!hash || !hash.includes("access_token")) {
        return;
      }

      // Prevent multiple restoration attempts
      if (isRestoringRef.current) return;
      isRestoringRef.current = true;

      try {
        // Parse hash parameters (format: #access_token=...&refresh_token=...&expires_at=...)
        const hashParams = hash.substring(1); // Remove the #
        const params = new URLSearchParams(hashParams);
        
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const expiresAt = params.get("expires_at");

        if (!accessToken || !refreshToken) {
          console.warn("SessionRestorer: Missing required tokens in hash");
          // Clear hash and exit
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          isRestoringRef.current = false;
          return;
        }

        console.log("SessionRestorer: Found tokens in URL hash, restoring session...");
        
        // Set session manually using Supabase
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error("SessionRestorer: Error setting session:", error);
          // Clear hash and redirect to login
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          router.push("/login?error=session_restore_failed&message=" + encodeURIComponent("Failed to restore session. Please try logging in again."));
          isRestoringRef.current = false;
          return;
        }

        if (data.session) {
          console.log("SessionRestorer: Session restored successfully");
          // Clear hash from URL for security (remove tokens from URL)
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          // Refresh the router to ensure all components see the new session
          router.refresh();
        } else {
          console.warn("SessionRestorer: No session returned after setSession");
        }
      } catch (error) {
        console.error("SessionRestorer: Unexpected error:", error);
        // Clear hash on error
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } finally {
        isRestoringRef.current = false;
      }
    };

    // Small delay to ensure component is mounted and router is ready
    const timer = setTimeout(() => {
      restoreSession();
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  // This component doesn't render anything
  return null;
}

