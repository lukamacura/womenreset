"use client";

import { useEffect, useState } from "react";
import Preloader from "@/components/Preloader";

const MIN_DISPLAY_MS = 300; // Reduced from 600ms for faster LCP
const MAX_WAIT_MS = 1200; // Reduced from 2500ms - faster fallback

/**
 * Wraps Preloader and controls visibility based on page load.
 * - Hides after DOMContentLoaded (not full load) for faster LCP
 * - Ensures preloader is visible at least MIN_DISPLAY_MS so the entry animation plays
 * - Fallback: always hide after MAX_WAIT_MS
 * 
 * LCP Optimization: Using DOMContentLoaded instead of load event
 * because load waits for ALL resources (images, fonts, etc.) which
 * delays LCP significantly. DOMContentLoaded fires when HTML is parsed.
 */
export default function PreloaderGate() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let hideTimeout: ReturnType<typeof setTimeout> | undefined;
    const start = Date.now();

    const hide = () => {
      if (!mounted) return;
      const elapsed = Date.now() - start;
      const delay = Math.max(0, MIN_DISPLAY_MS - elapsed);
      if (delay > 0) {
        hideTimeout = setTimeout(() => {
          if (mounted) setIsLoading(false);
        }, delay);
      } else {
        setIsLoading(false);
      }
    };

    // Check if DOM is already ready (interactive or complete)
    if (typeof document !== "undefined" && 
        (document.readyState === "interactive" || document.readyState === "complete")) {
      hide();
    } else if (typeof document !== "undefined") {
      // Use DOMContentLoaded instead of load for faster LCP
      document.addEventListener("DOMContentLoaded", hide);
    }

    // Shorter fallback for faster LCP
    const fallback = setTimeout(hide, MAX_WAIT_MS);

    return () => {
      mounted = false;
      if (hideTimeout) clearTimeout(hideTimeout);
      clearTimeout(fallback);
      if (typeof document !== "undefined") {
        document.removeEventListener("DOMContentLoaded", hide);
      }
    };
  }, []);

  return <Preloader isLoading={isLoading} />;
}
