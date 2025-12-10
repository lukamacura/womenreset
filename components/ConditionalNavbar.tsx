"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Navbar from "./Navbar";

type ConditionalNavbarProps = {
  isAuthenticated: boolean;
};

export default function ConditionalNavbar({ isAuthenticated }: ConditionalNavbarProps) {
  const pathname = usePathname();
  const isChatPage = pathname?.includes("/chat/lisa");

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

