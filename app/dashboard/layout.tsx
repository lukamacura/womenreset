"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, LayoutDashboard, Activity, UtensilsCrossed, Dumbbell, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/chat/lisa",
      label: "Chat",
      icon: MessageSquare,
    },
    {
      href: "/dashboard/symptoms",
      label: "Symptom Tracker",
      icon: Activity,
    },
    {
      href: "/dashboard/nutrition",
      label: "Nutrition Tracker",
      icon: UtensilsCrossed,
    },
    {
      href: "/dashboard/fitness",
      label: "Fitness Tracker",
      icon: Dumbbell,
    },
  ];

  function handleLogout() {
    // Navigate immediately - no waiting
    window.location.href = "/login";
    // Sign out in background (don't await, don't block)
    supabase.auth.signOut().catch(() => {
      // Silently fail - we're already navigating away
    });
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-5 border-b border-foreground/10 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || 
                  (item.href !== "/dashboard" && pathname?.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                      transition-colors duration-200
                      ${
                        isActive
                          ? "bg-primary/20 text-foreground"
                          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center cursor-pointer gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

