"use client"

import { useEffect } from "react"
import Image from "next/image"
import { BookOpen, Target, Users, Sparkles } from "lucide-react"

export default function LandingHero() {

  // Inject floating elements styles
  useEffect(() => {
    const styleId = 'hero-floating-styles'
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .float-slow {
        animation: float-slow 8s ease-in-out infinite;
      }
      .float-rotate {
        animation: float-rotate 10s ease-in-out infinite;
      }
      .pulse-soft {
        animation: pulse-soft 4s ease-in-out infinite;
      }
      .drift {
        animation: drift 18s ease-in-out infinite;
      }
      .subtle-float {
        animation: subtle-float 8s ease-in-out infinite;
      }
      .bubble-float-1 {
        animation: float-slow 12s ease-in-out infinite;
      }
      .bubble-float-2 {
        animation: float-rotate 15s ease-in-out infinite;
      }
      .bubble-float-3 {
        animation: drift 20s ease-in-out infinite;
      }
      .bubble-float-4 {
        animation: float-slow 10s ease-in-out infinite;
        animation-delay: -2s;
      }
      .bubble-float-5 {
        animation: float-rotate 18s ease-in-out infinite;
        animation-delay: -5s;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Background Gradient - Yellow and Blue */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: `linear-gradient(
            135deg,
            var(--accent) 0%,
            var(--chart-2) 50%,
            var(--accent) 100%
          )`,
          opacity: 0.15
        }}
      />
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(
            ellipse at top left,
            var(--accent) 0%,
            transparent 50%
          )`,
          filter: 'blur(120px)',
          opacity: 0.2
        }}
      />
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(
            ellipse at bottom right,
            var(--chart-2) 0%,
            transparent 50%
          )`,
          filter: 'blur(120px)',
          opacity: 0.2
        }}
      />

      {/* Floating Elements - Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Blob 1 - Top Right */}
        <div
          className="absolute top-20 right-10 w-64 h-64 rounded-full float-slow"
          style={{
            background: `radial-gradient(circle, var(--primary) 0%, transparent 70%)`,
            filter: 'blur(40px)',
            opacity: 0.15,
            willChange: 'transform'
          }}
        />

        {/* Blob 2 - Bottom Left */}
        <div
          className="absolute bottom-20 left-10 w-80 h-80 rounded-full float-rotate"
          style={{
            background: `radial-gradient(circle, var(--chart-1) 0%, transparent 70%)`,
            filter: 'blur(50px)',
            opacity: 0.12,
            willChange: 'transform'
          }}
        />

        {/* Circle 1 - Behind mockup */}
        <div
          className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full drift"
          style={{
            background: `radial-gradient(circle, var(--accent) 0%, transparent 70%)`,
            filter: 'blur(30px)',
            opacity: 0.1,
            willChange: 'transform'
          }}
        />

        {/* Dot Pattern - Very subtle */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, var(--primary) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 20px 20px'
          }}
        />
      </div>

      {/* Glassmorphism Bubbles - Above Content with Gradients */}
      <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
        {/* Bubble 1 - Large, top left - Yellow to Pink gradient */}
        <div
          className="absolute top-20 left-10 w-32 h-32 rounded-full bubble-float-1"
          style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--primary) 50%, var(--chart-1) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 8px 32px 0 rgba(255, 116, 177, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.2)',
            opacity: 0.6,
            willChange: 'transform'
          }}
        />

        {/* Bubble 2 - Medium, top right - Blue to Pink gradient */}
        <div
          className="absolute top-40 right-20 w-24 h-24 rounded-full bubble-float-2"
          style={{
            background: 'linear-gradient(135deg, var(--chart-2) 0%, var(--primary) 50%, var(--chart-1) 100%)',
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            boxShadow: '0 8px 32px 0 rgba(101, 219, 255, 0.3), inset 0 0 15px rgba(255, 255, 255, 0.2)',
            opacity: 0.55,
            willChange: 'transform'
          }}
        />

        {/* Bubble 3 - Small, middle left - Pink to Yellow gradient */}
        <div
          className="absolute top-1/2 left-20 w-16 h-16 rounded-full bubble-float-3"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 8px 32px 0 rgba(255, 116, 177, 0.35), inset 0 0 12px rgba(255, 255, 255, 0.2)',
            opacity: 0.65,
            willChange: 'transform'
          }}
        />

        {/* Bubble 4 - Medium, bottom left - Yellow to Blue gradient */}
        <div
          className="absolute bottom-32 left-16 w-20 h-20 rounded-full bubble-float-4"
          style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--chart-2) 100%)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(255, 255, 255, 0.48)',
            boxShadow: '0 8px 32px 0 rgba(255, 235, 118, 0.3), inset 0 0 18px rgba(255, 255, 255, 0.2)',
            opacity: 0.6,
            willChange: 'transform'
          }}
        />

        {/* Bubble 5 - Large, bottom right - Blue to Yellow gradient */}
        <div
          className="absolute bottom-20 right-16 w-28 h-28 rounded-full bubble-float-5"
          style={{
            background: 'linear-gradient(135deg, var(--chart-2) 0%, var(--accent) 50%, var(--primary) 100%)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            border: '1px solid rgba(255, 255, 255, 0.46)',
            boxShadow: '0 8px 32px 0 rgba(101, 219, 255, 0.3), inset 0 0 22px rgba(255, 255, 255, 0.2)',
            opacity: 0.58,
            willChange: 'transform'
          }}
        />

        {/* Bubble 6 - Small, middle right - Pink to Blue gradient */}
        <div
          className="absolute top-1/3 right-32 w-14 h-14 rounded-full bubble-float-1"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--chart-2) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 8px 32px 0 rgba(255, 116, 177, 0.35), inset 0 0 10px rgba(255, 255, 255, 0.2)',
            opacity: 0.65,
            willChange: 'transform',
            animationDelay: '-3s'
          }}
        />

        {/* Bubble 7 - Medium, center - All three colors gradient */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bubble-float-2"
          style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--primary) 33%, var(--chart-2) 66%, var(--accent) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            boxShadow: '0 8px 32px 0 rgba(255, 116, 177, 0.3), inset 0 0 16px rgba(255, 255, 255, 0.2)',
            opacity: 0.6,
            willChange: 'transform',
            animationDelay: '-7s'
          }}
        />

        {/* Bubble 8 - Extra bubble for more visual interest */}
        <div
          className="absolute top-1/4 left-1/3 w-20 h-20 rounded-full bubble-float-3"
          style={{
            background: 'linear-gradient(135deg, var(--chart-2) 0%, var(--primary) 100%)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255, 255, 255, 0.47)',
            boxShadow: '0 8px 32px 0 rgba(101, 219, 255, 0.32), inset 0 0 14px rgba(255, 255, 255, 0.2)',
            opacity: 0.62,
            willChange: 'transform',
            animationDelay: '-4s'
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="text-center lg:text-left space-y-6 sm:space-y-8">
            {/* Sparkle 1 - Near heading */}
            <div className="absolute top-0 left-1/4 pulse-soft" style={{ zIndex: 30 }}>
              <Sparkles className="w-4 h-4 text-primary opacity-60" />
            </div>

            {/* Heading with gradient on "menopause" */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-foreground">
              Finally understand your{' '}
              <span className="gradient-heading">menopause</span>{' '}
              symptoms.
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Lisa is your personal menopause companion — powered by evidence-based knowledge, not internet guesswork. Track symptoms, discover triggers, and get real answers.
            </p>

            {/* Trust Badges - Inline Strip */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-sm text-muted-foreground pt-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span>Evidence-based knowledge</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-border opacity-30" />
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span>Menopause specialist</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-border opacity-30" />
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span>10,000+ women</span>
              </div>
            </div>


            {/* Social Proof */}
            <div className="flex items-center justify-center lg:justify-start gap-3 pt-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-background"
                    style={{
                      background: `linear-gradient(135deg, var(--primary) 0%, var(--chart-1) 100%)`,
                      opacity: 0.8 - (i * 0.1)
                    }}
                  />
                ))}
              </div>
              <span className="text-sm sm:text-base text-muted-foreground">
                Join 10,000+ women getting real answers
              </span>
            </div>
          </div>

          {/* Right: App Preview Image with Glow */}
          <div className="hidden lg:block relative">
            {/* Sparkle 2 - Near CTA */}
            <div className="absolute top-1/2 right-0 pulse-soft" style={{ 
              zIndex: 30,
              animationDelay: '2s'
            }}>
              <Sparkles className="w-5 h-5 text-accent opacity-50" />
            </div>

            {/* Glow behind laptop */}
            <div
              className="absolute inset-0 z-0"
              style={{
                background: `radial-gradient(
                  circle,
                  var(--primary) 0%,
                  transparent 70%
                )`,
                filter: 'blur(60px)',
                transform: 'scale(1.2)',
                top: '10%',
                left: '10%',
                opacity: 0.2
              }}
            />

            {/* Laptop Container */}
            <div className="relative w-full aspect-square max-w-lg mx-auto subtle-float">
              <div className="relative w-full h-full rounded-2xl overflow-hidden">
                <Image
                  src="/home.png"
                  alt="MenoLisa app preview"
                  fill
                  className="object-contain"
                  priority
                  style={{ willChange: 'transform' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
