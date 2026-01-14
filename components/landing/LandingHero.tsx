"use client"

import { useEffect } from "react"
import Image from "next/image"
import { BookOpen, Target, Users } from "lucide-react"
import LisaChatVisual from "./LisaChatVisual"

export default function LandingHero() {

  // Inject floating elements styles for phone mockup
  useEffect(() => {
    const styleId = 'hero-floating-styles'
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .subtle-float {
        animation: subtle-float 8s ease-in-out infinite;
      }
      @keyframes subtle-float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-10px) rotate(1deg); }
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
      {/* Corner Blobs - Only 2, very subtle */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Blob 1 - Top Right Corner (behind mockups) */}
        <div
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(233, 213, 255, 0.4) 0%, transparent 70%)`,
            filter: 'blur(100px)',
            opacity: 0.12,
            pointerEvents: 'none'
          }}
        />

        {/* Blob 2 - Bottom Left Corner */}
        <div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(252, 231, 243, 0.4) 0%, transparent 70%)`,
            filter: 'blur(80px)',
            opacity: 0.1,
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-[55%_45%] gap-12 items-center">
          {/* Left: Text Content - 55% width, fully readable */}
          <div className="text-center lg:text-left space-y-5 sm:space-y-6 relative z-20">
            {/* Heading with gradient on "menopause" - fully visible */}
            <h1 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-extrabold leading-tight text-foreground"
              style={{
                textShadow: '0 2px 10px rgba(255, 255, 255, 0.5)'
              }}
            >
              Clear answers for  {' '}
              <span className="gradient-heading">menopause</span>{' '}
              tailored to you
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
            <b>Understand</b> your symptoms, uncover patterns, and <b>feel like yourself</b> again with guidance that actually makes sense.           
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
            <div className="flex items-center justify-center lg:justify-start gap-3 pt-1">
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

          {/* Right: App Preview Images - Stripe-style layered mockups */}
          <div className="hidden lg:block relative w-full h-full min-h-[600px]">
            {/* Subtle glow behind mockups */}
            <div
              className="absolute inset-0 z-0"
              style={{
                background: `radial-gradient(
                  ellipse at center,
                  rgba(252, 231, 243, 0.3) 0%,
                  transparent 60%
                )`,
                filter: 'blur(80px)',
                top: '20%',
                left: '20%',
                width: '80%',
                height: '60%'
              }}
            />

            {/* Layered Mockups Container - All on right side only */}
            <div className="relative h-full flex items-start justify-start" style={{ 
              minHeight: '700px',
              paddingLeft: '0',
              paddingTop: '40px'
            }}>
              {/* Main Phone Mockup - Front layer (z-index 20) */}
              <div 
                className="relative shrink-0 subtle-float" 
                style={{ 
                  width: '280px',
                  height: '600px',
                  zIndex: 20,
                  marginLeft: '0',
                  marginTop: '0'
                }}
              >
                <div 
                  className="absolute inset-0 rounded-[0.6rem] p-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.05) 100%)',
                    border: '8px solid rgba(0, 0, 0, 0.15)',
                    boxShadow: `
                      0 25px 50px -12px rgba(0, 0, 0, 0.25),
                      inset 0 0 0 1px rgba(255, 255, 255, 0.1),
                      inset 0 1px 0 rgba(255, 255, 255, 0.2)
                    `,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }}
                >
                  {/* Notch */}
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 rounded-b-[0.2rem]"
                    style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderTop: 'none'
                    }}
                  />
                  
                  {/* Screen Content */}
                  <div className="relative w-full h-full rounded-[0.5rem] overflow-hidden bg-background">
                    <Image
                      src="/phone.png"
                      alt="MenoLisa mobile app preview"
                      fill
                      className="object-cover"
                      priority
                      style={{ willChange: 'transform' }}
                    />
                  </div>
                </div>
              </div>

              {/* Lisa Chat Visual - Static chat conversation demo (z-index 10) */}
              <div 
                className="absolute shrink-0" 
                style={{ 
                  top: '50%',
                  left: '92%',
                  zIndex: 10,
                  transform: 'translate(-50%, -50%) scale(1.5) rotate(2deg)'
                }}
              >
                <LisaChatVisual />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
