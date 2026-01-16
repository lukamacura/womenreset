"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { BookOpen, Target, Users } from "lucide-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import LisaChatVisual from "./LisaChatVisual"

// Hero content variations - high-converting, outcome-based copy
const heroContent = [
  {
    headline: {
      before: "Track symptoms. Get answers.",
      highlight: "Feel in control.",
      after: ""
    },
    subheadline: "Log how you feel in seconds, see your data organized, and get menopause answers from Lisa anytime."
  },
  {
    headline: {
      before: "Finally understand",
      highlight: "what's happening",
      after: "to your body"
    },
    subheadline: "Stop guessing. Start tracking. See your symptoms clearly and get answers whenever you need them."
  },
  {
    headline: {
      before: "From confused to",
      highlight: "confident",
      after: "in minutes a day"
    },
    subheadline: "Simple daily tracking, instant answers to your questions, and real data to share with your doctor."
  },
]

// Animated highlight component with sweep effect
function HighlightedWord({ 
  children, 
  isActive,
  prefersReducedMotion 
}: { 
  children: React.ReactNode
  isActive: boolean
  prefersReducedMotion: boolean
}) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span className="relative z-10">{children}</span>
      <motion.span
        className="absolute inset-0 bg-yellow-400/50 rounded-sm pointer-events-none -mx-1 px-1"
        initial={{ scaleX: 0, transformOrigin: "left" }}
        animate={isActive && !prefersReducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{
          duration: 0.8,
          delay: 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{ zIndex: 0 }}
      />
    </span>
  )
}

// Headline component with animation
function AnimatedHeadline({ 
  content, 
  isActive,
  prefersReducedMotion 
}: { 
  content: typeof heroContent[0]['headline']
  isActive: boolean
  prefersReducedMotion: boolean
}) {
  return (
    <motion.h1 
      className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-foreground"
      style={{ textShadow: '0 2px 10px rgba(255, 255, 255, 0.5)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: prefersReducedMotion ? 0.2 : 0.5, 
        ease: [0.16, 1, 0.3, 1] 
      }}
    >
      {content.before && <span>{content.before} </span>}
      <HighlightedWord isActive={isActive} prefersReducedMotion={prefersReducedMotion}>
        {content.highlight}
      </HighlightedWord>
      {content.after && <span> {content.after}</span>}
    </motion.h1>
  )
}

// Subheadline component with animation
function AnimatedSubheadline({ 
  text,
  prefersReducedMotion 
}: { 
  text: string
  prefersReducedMotion: boolean
}) {
  return (
    <motion.p 
      className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ 
        duration: prefersReducedMotion ? 0.2 : 0.5, 
        delay: 0.1,
        ease: [0.16, 1, 0.3, 1] 
      }}
    >
      {text}
    </motion.p>
  )
}

// Progress dots indicator
function ProgressDots({ 
  total, 
  current, 
  onSelect 
}: { 
  total: number
  current: number
  onSelect: (index: number) => void
}) {
  return (
    <div className="flex items-center gap-2 pt-4">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
            index === current
              ? "w-8 bg-primary"
              : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
          }`}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  )
}

export default function LandingHero() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Auto-rotate headlines every 4 seconds (pause on hover)
  useEffect(() => {
    if (isHovered || prefersReducedMotion) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroContent.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [isHovered, prefersReducedMotion])

  // Handle manual selection
  const handleSelect = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

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

  const currentContent = heroContent[currentIndex]

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
          <div 
            className="text-center lg:text-left space-y-5 sm:space-y-6 relative z-20"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Rotating Headlines */}
            <div className="min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]">
              <AnimatePresence mode="wait">
                <AnimatedHeadline 
                  key={`headline-${currentIndex}`}
                  content={currentContent.headline}
                  isActive={true}
                  prefersReducedMotion={!!prefersReducedMotion}
                />
              </AnimatePresence>
            </div>

            {/* Rotating Subheadlines */}
            <div className="min-h-[60px] sm:min-h-[70px] md:min-h-[80px]">
              <AnimatePresence mode="wait">
                <AnimatedSubheadline 
                  key={`subheadline-${currentIndex}`}
                  text={currentContent.subheadline}
                  prefersReducedMotion={!!prefersReducedMotion}
                />
              </AnimatePresence>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center lg:justify-start">
              <ProgressDots 
                total={heroContent.length} 
                current={currentIndex} 
                onSelect={handleSelect}
              />
            </div>

            {/* Trust Badges - Inline Strip */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-sm text-muted-foreground pt-2">
              <motion.div 
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span>Evidence-based knowledge</span>
              </motion.div>
              <div className="hidden sm:block w-px h-4 bg-border opacity-30" />
              <motion.div 
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span>Menopause specialist</span>
              </motion.div>
              <div className="hidden sm:block w-px h-4 bg-border opacity-30" />
              <motion.div 
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span>10,000+ women</span>
              </motion.div>
            </div>

            {/* Social Proof */}
            <motion.div 
              className="flex items-center justify-center lg:justify-start gap-3 pt-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
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
                Join 10,000+ women taking control of menopause
              </span>
            </motion.div>
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
                  className="absolute inset-0 rounded-[2.5rem] p-2"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '2px solid rgba(0, 0, 0, 0.08)',
                    boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.12), 0 15px 30px -10px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {/* Screen Content */}
                  <div className="relative w-full h-full rounded-4xl overflow-hidden bg-background">
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
