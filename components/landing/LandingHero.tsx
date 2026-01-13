"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Microscope } from "lucide-react"

export default function LandingHero() {
  const scrollToHowItWorks = () => {
    const element = document.getElementById("how-it-works")
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-20 bg-background">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="text-center lg:text-left space-y-8">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-extrabold leading-tight text-foreground">
              Finally understand your menopause symptoms.
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Lisa is your personal menopause companion — powered by evidence-based knowledge, not internet guesswork. Track symptoms, discover triggers, and get real answers.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="btn-primary text-lg px-8 py-6 h-auto font-semibold"
              >
                <Link href="/register">Start Free Trial</Link>
              </Button>
              <Button
                size="lg"
                onClick={scrollToHowItWorks}
                className="btn-navy text-lg px-8 py-6 h-auto font-semibold"
              >
                See How It Works
              </Button>
            </div>

            {/* Trust Badge */}
            <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-muted-foreground pt-4">
              <Microscope className="h-4 w-4" />
              <span>Built on medical research, not generic AI</span>
            </div>
          </div>

          {/* Right: App Preview Image */}
          <div className="hidden lg:block">
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              <div className="relative w-full h-full rounded-2xl overflow-hidden">
                <Image
                  src="/home.png"
                  alt="MenoLisa app preview"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
