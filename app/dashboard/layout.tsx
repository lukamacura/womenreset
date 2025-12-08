"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Activity, UtensilsCrossed, Dumbbell, LogOut, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import LisaSwipeButton from "@/components/LisaSwipeButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDropdownOpenRef = useRef(false);

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
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

  // Find active item
  const activeItem = navItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname?.startsWith(item.href))
  ) || navItems[0];

  const ActiveIcon = activeItem.icon;

  function handleLogout() {
    // Navigate immediately - no waiting
    window.location.href = "/login";
    // Sign out in background (don't await, don't block)
    supabase.auth.signOut().catch(() => {
      // Silently fail - we're already navigating away
    });
  }

  // Keep ref in sync with state
  useEffect(() => {
    isDropdownOpenRef.current = isDropdownOpen;
  }, [isDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Close dropdown when route changes
  useEffect(() => {
    if (!isDropdownOpenRef.current) return;
    // Flush update in next tick to avoid setting state synchronously inside effect
    const id = setTimeout(() => setIsDropdownOpen(false), 0);
    return () => clearTimeout(id);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <nav className="top-0 z-10 border-b border-foreground/10 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Mobile Dropdown */}
            <div className="relative lg:hidden" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-primary/20 text-pink-800 transition-colors duration-200 w-full min-w-[200px]"
              >
                <ActiveIcon className="h-5 w-5" />
                <span className="flex-1 text-left">{activeItem.label}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] rounded-lg border border-foreground/10 bg-background shadow-lg backdrop-blur-sm overflow-hidden z-50">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname?.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsDropdownOpen(false)}
                        className={`
                          flex items-center gap-3 px-4 py-3 text-sm font-medium
                          transition-colors duration-200
                          ${isActive
                            ? "bg-primary/20 text-foreground"
                            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                          }
                        `}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                  <div className="border-t border-foreground/10">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors duration-200"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                      transition-colors duration-200
                      ${isActive
                        ? "bg-primary/20 text-pink-800"
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="h-6 w-6" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Desktop Logout Button */}
            <button
              onClick={handleLogout}
              className="hidden lg:flex items-center cursor-pointer gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Fixed Lisa Swipe Button */}
      <LisaSwipeButton />
    </div>
  );
}
