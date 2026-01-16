"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LandingFinalCTA() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
          Ready to take control of menopause?
        </h2>
        <p className="text-xl sm:text-2xl text-muted-foreground">
          Start tracking symptoms and getting answers today. Free trial, no credit card needed.
        </p>
        <Button
          asChild
          size="lg"
          className="btn-primary text-lg px-12 py-6 h-auto font-semibold"
        >
          <Link href="/register">Start Free Trial</Link>
        </Button>
      </div>
    </section>
  )
}
