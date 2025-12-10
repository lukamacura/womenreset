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

      <div className="fixed left-0 right-0 top-0 z-50 flex justify-center pt-3 sm:pt-4 px-3 sm:px-4">
        <nav className="flex w-full max-w-[780px] items-center justify-between rounded-full bg-linear-to-r from-navy/80 to-navy-dark/80 px-4 sm:px-5 py-2.5 sm:py-2 shadow-lg backdrop-blur-lg border border-white/25">
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
              className="transition-colors duration-200 text-white!  hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="transition-colors duration-200 text-white!  hover:text-white"
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="transition-colors duration-200 text-white!  hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/community"
              className="transition-colors duration-200 text-white!  hover:text-white"
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

      {/* Mobile Menu */}
      <div
        className={`fixed top-22 sm:top-20 left-3 right-3 z-40 rounded-2xl bg-linear-to-br from-navy/95 to-navy-dark/95 backdrop-blur-lg border border-white/25 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"
        }`}
      >
        <nav className="flex flex-col p-4 space-y-1">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="px-4 py-3 rounded-lg text-white! font-medium transition-colors hover:bg-white/10 active:bg-white/20 touch-manipulation"
          >
            Home
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="px-4 py-3 rounded-lg text-white! font-medium transition-colors hover:bg-white/10 active:bg-white/20 touch-manipulation"
          >
            About
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="px-4 py-3 rounded-lg text-white! font-medium transition-colors hover:bg-white/10 active:bg-white/20 touch-manipulation"
          >
            Pricing
          </Link>
          <Link
            href="/community"
            onClick={() => setMobileMenuOpen(false)}
            className="px-4 py-3 rounded-lg text-white! font-medium transition-colors hover:bg-white/10 active:bg-white/20 touch-manipulation"
          >
            Community
          </Link>
          <div className="border-t border-white/20 my-2" />
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-primary px-4 py-3 text-center touch-manipulation"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-lg text-white! font-medium transition-colors hover:bg-white/10 active:bg-white/20 touch-manipulation text-center"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary px-4 py-3 text-center touch-manipulation"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </>
  );
};

export default Navbar;
