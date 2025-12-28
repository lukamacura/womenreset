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
  // Start with false by default - only set to true after verifying valid session
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication state on client side - verify session is actually valid
  useEffect(() => {
    let mounted = true;

    // Check initial session immediately - verify it's actually valid
    const checkSession = async () => {
      try {
        // Use getUser() to verify the session is actually valid and not expired
        const { data: { user }, error } = await supabase.auth.getUser();
        if (mounted) {
          // Only set to true if we have a valid user with no errors
          setIsAuthenticated(!error && !!user);
        }
      } catch (error) {
        if (mounted) {
          setIsAuthenticated(false);
        }
      }
    };

    // Check immediately - don't wait
    checkSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        // Verify session is valid by checking user
        if (session) {
          const { data: { user }, error } = await supabase.auth.getUser();
          setIsAuthenticated(!error && !!user);
        } else {
          setIsAuthenticated(false);
        }
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

