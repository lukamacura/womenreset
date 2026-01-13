"use client"

import Link from "next/link"

export default function LandingFooter() {
  return (
    <footer className="py-12 px-4 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <div className="h-4 w-4 rounded-full border-2 border-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">MenoLisa</span>
            </Link>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-center text-muted-foreground">
          <p>© 2025 MenoLisa. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
