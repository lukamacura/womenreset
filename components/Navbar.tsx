// app/components/Navbar.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

type NavbarProps = {
  isAuthenticated: boolean;
};

const Navbar: React.FC<NavbarProps> = ({ isAuthenticated }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="fixed top-0 left-0 right-0 z-50 pt-3 sm:pt-4 flex justify-center">
        <div className="w-full max-w-3xl px-6 sm:px-8">
          <nav className="flex w-full items-center justify-between rounded-full bg-gray-900 px-3 sm:px-5 py-2.5 sm:py-2 shadow-lg backdrop-blur-lg border border-white/25 overflow-hidden">
            {/* Left: Logo + Brand */}
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary-light shadow-md">
                <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full border-2 border-primary-dark" />
              </div>
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-white">
                MenoLisa
              </span>
            </Link>

            {/* Desktop: Center Nav links */}
            <div className="hidden items-center gap-6 lg:gap-8 text-sm lg:text-base font-medium lg:flex">
              <Link
                href="/"
                className="transition-colors duration-200 text-white!  hover:text-primary!"
              >
                Home
              </Link>
              <Link
                href="/about"
                className="transition-colors duration-200 text-white!  hover:text-primary!"
              >
                About
              </Link>
              <Link
                href="/pricing"
                className="transition-colors duration-200 text-white!  hover:text-primary!"
              >
                Pricing
              </Link>
              <Link
                href="/community"
                className="transition-colors duration-200 text-white!  hover:text-primary!"
              >
                Community
              </Link>
            </div>

            {/* Desktop: Right Auth buttons */}
            <div className="hidden lg:flex items-center gap-4">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="btn-primary px-5 py-1.5 text-sm shadow-md"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="font-medium text-white! transition-colors duration-200 hover:text-white text-sm"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="btn-primary px-5 py-1.5 text-sm shadow-md"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: Hamburger / Close button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors touch-manipulation"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed top-22 sm:top-20 left-3 right-3 z-40 rounded-2xl bg-linear-to-br from-navy/95 to-navy-dark/95 backdrop-blur-lg border border-white/25 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden max-w-[calc(100vw-1.5rem)] ${mobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"
          }`}
      >
        <nav className="flex w-full items-center rounded-full bg-gray-900 px-3 sm:px-5 py-2.5 sm:py-2 shadow-lg backdrop-blur-lg border border-white/25 overflow-hidden">

          {/* Left: Logo */}
          <div className="flex flex-1 items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary-light shadow-md">
                <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full border-2 border-primary-dark" />
              </div>
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-white">
                MenoLisa
              </span>
            </Link>
          </div>

          {/* Center: Nav links */}
          <div className="hidden lg:flex flex-1 justify-center items-center gap-6 lg:gap-8 text-sm lg:text-base font-medium">
            <Link href="/" className="text-white! hover:text-primary! transition-colors">Home</Link>
            <Link href="/about" className="text-white! hover:text-primary! transition-colors">About</Link>
            <Link href="/pricing" className="text-white! hover:text-primary! transition-colors">Pricing</Link>
            <Link href="/community" className="text-white! hover:text-primary! transition-colors">Community</Link>
          </div>

          {/* Right: Auth buttons */}
          <div className="hidden lg:flex flex-1 justify-end items-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard" className="btn-primary px-5 py-1.5 text-sm shadow-md">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="font-medium text-white! text-sm">
                  Log in
                </Link>
                <Link href="/register" className="btn-primary px-5 py-1.5 text-sm shadow-md">
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

        </nav>

      </div>
    </>
  );
};

export default Navbar;
