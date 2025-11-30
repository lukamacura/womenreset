// app/components/Navbar.tsx
import React from "react";
import Link from "next/link";

type NavbarProps = {
  isAuthenticated: boolean;
};

const Navbar: React.FC<NavbarProps> = ({ isAuthenticated }) => {
  return (
    <div
      className="
        fixed left-0 right-0 top-0 z-50
        flex justify-center
        pt-4
      "
    >
      <nav
        className="
          flex w-[780px] items-center justify-between
          rounded-full
          bg-linear-to-r from-slate-500/80 to-slate-600/80
          px-5 py-2
          shadow-lg
          backdrop-blur-lg
          border border-white/25
        "
      >
        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-300 shadow-md">
            <div className="h-4 w-4 rounded-full border-2 border-pink-600" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white">
            MenoLisa
          </span>
        </div>

        {/* Center: Nav links */}
        <div className="hidden items-center gap-8 text-md font-medium text-white/80 sm:flex">
          <Link
            href="/"
            className="transition-colors duration-200 hover:text-white"
          >
            Home
          </Link>
          <Link
            href="/about"
            className="transition-colors duration-200 hover:text-white"
          >
            About
          </Link>
          <Link
            href="/pricing"
            className="transition-colors duration-200 hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="/community"
            className="transition-colors duration-200 hover:text-white"
          >
            Community
          </Link>
        </div>

        {/* Right: Auth-aware pill */}
        {isAuthenticated ? (
          <Link
            href="/dashboard"
            className="
              rounded-full bg-pink-400
              px-5 py-1.5
              text-md font-semibold text-slate-900
              shadow-md
              border border-pink-200
              transition-all duration-200
              hover:bg-pink-300 hover:translate-y-px
            "
          >
            Dashboard
          </Link>
        ) : (
          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/login"
              className="font-medium text-white/80 transition-colors duration-200 hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="
                rounded-full bg-pink-400
                px-5 py-1.5
                text-xs font-semibold text-slate-900
                shadow-md
                border border-pink-200
                transition-all duration-200
                hover:bg-pink-300 hover:translate-y-px
              "
            >
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;
