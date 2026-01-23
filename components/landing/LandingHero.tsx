"use client"

import { useEffect, useState, useCallback } from "react"
import { BookOpen, Target, Users } from "lucide-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"

// Hero content variations - high-converting, outcome-based copy
const heroContent = [
  {
    headline: {
      before: "Ask Lisa anything about menopause.",
      highlight: "Get answers in seconds.",
      after: ""
    },
    subheadline: "Lisa is your AI menopause companion. Ask her anything, track how you feel, and see your patterns clearly - all in one place."
  },
  {
    headline: {
      before: "Your menopause questions answered,",
      highlight: "24/7, judgement-free",
      after: ""
    },
    subheadline: "No more scary Google rabbit holes. Get clear, research-backed answers to your menopause questions anytime you need them."
  },
  {
    headline: {
      before: "Finally understand",
      highlight: "what's happening",
      after: "to your body"
    },
    subheadline: "Ask unlimited questions, log symptoms in 30 seconds, and walk into your doctor's office with real data."
  },
]

// Animated highlight component with sweep effect - Mobile optimized
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
    <span className="relative inline-block whitespace-nowrap sm:whitespace-normal">
      <span className="relative z-10">{children}</span>
      <motion.span
        className="absolute inset-0 bg-yellow-400/50 rounded-sm pointer-events-none -mx-0.5 sm:-mx-1 px-0.5 sm:px-1"
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
      className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-foreground px-2 sm:px-0"
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
      className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0 px-2 sm:px-0"
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

// Progress dots indicator - Optimized for mobile
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
    <div className="flex items-center gap-1.5 sm:gap-2 pt-3 sm:pt-4">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          className={`h-1 sm:h-1.5 rounded-full transition-all duration-500 ease-out touch-manipulation ${
            index === current
              ? "w-6 sm:w-8 bg-primary"
              : "w-1 sm:w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50 active:bg-muted-foreground/60"
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
    }, 2400)

    return () => clearInterval(interval)
  }, [isHovered, prefersReducedMotion])

  // Handle manual selection
  const handleSelect = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  const currentContent = heroContent[currentIndex]

  return (
    <section className="relative min-h-[85vh] sm:min-h-screen flex items-center justify-center px-4 sm:px-6 pt-20 sm:pt-24 md:pt-28 pb-12 sm:pb-16 md:pb-20 overflow-hidden">
      {/* Corner Blobs - Only 2, very subtle - Reduced on mobile */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Blob 1 - Top Right Corner (behind mockups) */}
        <div
          className="absolute -top-10 sm:-top-20 -right-10 sm:-right-20 w-48 h-48 sm:w-96 sm:h-96 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(233, 213, 255, 0.4) 0%, transparent 70%)`,
            filter: 'blur(60px)',
            opacity: 0.08,
            pointerEvents: 'none'
          }}
        />

        {/* Blob 2 - Bottom Left Corner */}
        <div
          className="absolute -bottom-10 sm:-bottom-20 -left-10 sm:-left-20 w-40 h-40 sm:w-80 sm:h-80 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(252, 231, 243, 0.4) 0%, transparent 70%)`,
            filter: 'blur(50px)',
            opacity: 0.08,
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-1 gap-6 sm:gap-8 md:gap-10 items-center">
          {/* Left: Text Content - 55% width, fully readable */}
          <div 
            className="text-center lg:text-left space-y-4 sm:space-y-5 md:space-y-6 relative z-20 w-full"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Rotating Headlines */}
            <div className="min-h-[100px] sm:min-h-[120px] md:min-h-[140px] lg:min-h-[180px]">
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
            <div className="min-h-[50px] sm:min-h-[60px] md:min-h-[70px] lg:min-h-[80px]">
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

            {/* Trust Badges - Inline Strip - Optimized for mobile */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm text-muted-foreground pt-2 px-2 sm:px-0">
              <motion.div 
                className="flex items-center gap-1.5 sm:gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary shrink-0" />
                <span className="whitespace-nowrap">Research-backed</span>
              </motion.div>
              <div className="hidden sm:block w-px h-3 sm:h-4 bg-border opacity-30" />
              <motion.div 
                className="flex items-center gap-1.5 sm:gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary shrink-0" />
                <span className="whitespace-nowrap">Available 24/7</span>
              </motion.div>
              <div className="hidden sm:block w-px h-3 sm:h-4 bg-border opacity-30" />
              <motion.div 
                className="flex items-center gap-1.5 sm:gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary shrink-0" />
                <span className="whitespace-nowrap">10,000+ trust Lisa</span>
              </motion.div>
            </div>

            {/* Social Proof - Optimized for mobile */}
            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2 sm:gap-3 pt-1 px-2 sm:px-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="flex -space-x-2 shrink-0">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full border-2 border-background"
                    style={{
                      background: `linear-gradient(135deg, var(--primary) 0%, var(--chart-1) 100%)`,
                      opacity: 0.8 - (i * 0.1)
                    }}
                  />
                ))}
              </div>
              <span className="text-xs sm:text-sm md:text-base text-muted-foreground text-center sm:text-left">
                Join 10,000+ women who stopped guessing
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
