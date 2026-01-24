"use client";

import { useEffect, useState } from "react";
import Preloader from "@/components/Preloader";

const MIN_DISPLAY_MS = 600;
const MAX_WAIT_MS = 2500;

/**
 * Wraps Preloader and controls visibility based on page load.
 * - Hides after window.load (or immediately if already complete)
 * - Ensures preloader is visible at least MIN_DISPLAY_MS so the entry animation plays
 * - Fallback: always hide after MAX_WAIT_MS
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

    if (typeof document !== "undefined" && document.readyState === "complete") {
      hide();
    } else if (typeof window !== "undefined") {
      window.addEventListener("load", hide);
    }

    const fallback = setTimeout(hide, MAX_WAIT_MS);

    return () => {
      mounted = false;
      if (hideTimeout) clearTimeout(hideTimeout);
      clearTimeout(fallback);
      if (typeof window !== "undefined") {
        window.removeEventListener("load", hide);
      }
    };
  }, []);

  return <Preloader isLoading={isLoading} />;
}
