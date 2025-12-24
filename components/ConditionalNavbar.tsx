"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "./Navbar";

type ConditionalNavbarProps = {
  isAuthenticated: boolean;
};

export default function ConditionalNavbar({ isAuthenticated: initialIsAuthenticated }: ConditionalNavbarProps) {
  const pathname = usePathname();
  const isChatPage = pathname?.includes("/chat/lisa");
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated);

  // Check authentication state on client side
  useEffect(() => {
    let mounted = true;

    // Check initial session to sync with client state
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setIsAuthenticated(!!session);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setIsAuthenticated(!!session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const main = document.querySelector("main");
    if (main) {
      if (isChatPage) {
        main.classList.remove("pt-20");
      }
      // Removed automatic pt-20 addition - control padding via className in layout.tsx instead
    }
  }, [isChatPage]);

  if (isChatPage) {
    return null;
  }

  return (
    <header className="border-b border-white/10">
      <Navbar isAuthenticated={isAuthenticated} />
    </header>
  );
}

