"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { BookOpen, Target, Users } from "lucide-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { useReplayableInView } from "@/hooks/useReplayableInView"

const VIDEO_POSTER_DATA =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='12' viewBox='0 0 16 12'%3E%3Crect fill='%23f9a8d4' width='16' height='12'/%3E%3C/svg%3E"

// Breakpoint detection for tablet-specific optimizations
function useDeviceType(): "mobile" | "tablet" | "desktop" {
  const [deviceType, setDeviceType] = useState<"mobile" | "tablet" | "desktop">("desktop")

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth
      const isCoarse = window.matchMedia("(pointer: coarse)").matches
      
      if (width < 768 || (isCoarse && width < 768)) {
        setDeviceType("mobile")
      } else if (width < 1024 || (isCoarse && width < 1280)) {
        setDeviceType("tablet")
      } else {
        setDeviceType("desktop")
      }
    }
    check()
    window.addEventListener("resize", check, { passive: true })
    return () => window.removeEventListener("resize", check)
  }, [])

  return deviceType
}

// Hero content variations - high-converting, outcome-based copy
// highlight: use \n to separate rows; each row gets its own highlight sweep
const heroContent = [
  {
    headline: {
      before: "Ask Lisa anything about menopause.",
      highlight: "Get answers\nin seconds.",
      after: ""
    },
    subheadline: "Lisa is your AI menopause companion. Ask her anything, track how you feel, and see your patterns clearly - all in one place."
  },
  {
    headline: {
      before: "Your menopause questions answered,",
      highlight: "24/7,\njudgement-free",
      after: ""
    },
    subheadline: "No more scary Google rabbit holes. Get clear, research-backed answers to your menopause questions anytime you need them."
  },
  {
    headline: {
      before: "Finally understand",
      highlight: "what's happening\nto your body",
      after: ""
    },
    subheadline: "Ask unlimited questions, log symptoms in 30 seconds, and walk into your doctor's office with real data."
  },
]

// Animated highlight per row with sweep effect - row by row
// Using will-change for GPU acceleration
function HighlightedRow({
  children,
  isActive,
  prefersReducedMotion,
  delay = 0.25,
}: {
  children: React.ReactNode
  isActive: boolean
  prefersReducedMotion: boolean
  delay?: number
}) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <motion.span
        className="absolute inset-0 bg-yellow-400/50 rounded-sm pointer-events-none px-0.5"
        initial={{ scaleX: 0, transformOrigin: "left" }}
        animate={isActive && !prefersReducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{
          duration: 0.5,
          delay: prefersReducedMotion ? 0 : delay,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{ 
          zIndex: 0,
          willChange: isActive ? "transform" : "auto",
        }}
      />
    </span>
  )
}

// Headline component with animation - optimized with will-change
function AnimatedHeadline({ 
  content, 
  isActive,
  isInView,
  prefersReducedMotion 
}: { 
  content: typeof heroContent[0]['headline']
  isActive: boolean
  isInView: boolean
  prefersReducedMotion: boolean
}) {
  return (
    <motion.h1 
      className="text-3xl sm:text-4xl md:text-[2.75rem] lg:text-6xl font-extrabold leading-tight text-foreground px-2 sm:px-0"
      style={{ 
        textShadow: '0 2px 10px rgba(255, 255, 255, 0.5)',
        willChange: "opacity, transform",
        width: '100%',
        maxWidth: '100%',
        minWidth: '0',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: prefersReducedMotion ? 0.2 : 0.5, 
        ease: [0.16, 1, 0.3, 1] 
      }}
    >
      {content.before && <span>{content.before} </span>}
      {content.highlight.split("\n").filter(Boolean).map((line, i) => (
        <span key={i} className="block">
          <HighlightedRow
            isActive={isActive}
            prefersReducedMotion={prefersReducedMotion}
            delay={0.25 + i * 0.2}
          >
            {line}
          </HighlightedRow>
        </span>
      ))}
      {content.after && <span> {" "}{content.after}</span>}
    </motion.h1>
  )
}

// Subheadline component with animation
function AnimatedSubheadline({ 
  text,
  isInView,
  prefersReducedMotion 
}: { 
  text: string
  isInView: boolean
  prefersReducedMotion: boolean
}) {
  return (
    <motion.p 
      className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto md:mx-0 px-2 sm:px-0"
      style={{ 
        willChange: "opacity, transform",
        width: '100%',
        maxWidth: '100%',
        minWidth: '0',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
      }}
      initial={{ opacity: 0, y: 15 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
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

// Progress dots indicator - Tablet/Touch optimized with proper touch targets (min 44px)
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
    <div className="flex items-center gap-0 pt-3 sm:pt-4" role="tablist" aria-label="Hero content navigation">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          role="tab"
          aria-selected={index === current}
          aria-label={`Go to slide ${index + 1}`}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
        >
          <span
            className={`block rounded-full transition-all duration-500 ease-out ${
              index === current
                ? "w-7 sm:w-8 h-2 bg-primary"
                : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50 active:bg-muted-foreground/60"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

// Video overlay text component - triggered after video ends
function VideoOverlayText({
  show,
  prefersReducedMotion,
}: {
  show: boolean
  prefersReducedMotion: boolean
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-20 flex items-center justify-center bg-linear-to-t from-black/60 via-black/30 to-transparent overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.4 }}
        >
          <motion.span
            className="relative text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white px-4 text-center"
            style={{
              willChange: "opacity, transform",
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              duration: prefersReducedMotion ? 0.15 : 0.6,
              delay: prefersReducedMotion ? 0 : 0.15,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 z-[-1] block aspect-9/1 -translate-x-1/2 -translate-y-1/2 select-none"
              style={{
                width: "280%",
                minWidth: "0",
                maxWidth: "100vw",
                filter: `
                  drop-shadow(0 6px 28px rgba(0,0,0,0.82))
                  drop-shadow(0 2px 38px #fee44088)
                  drop-shadow(0px 15px 48px #3a86ff80)
                  drop-shadow(0px -6px 34px #ff5ebf99)
                `,
              }}
            >
              24/7 here for you
            </span>
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function LandingHero() {
  const prefersReducedMotion = useReducedMotion()
  const { ref: sectionRef, isInView, resetKey } = useReplayableInView<HTMLElement>({ amount: 0.35 })
  const deviceType = useDeviceType()

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center pt-20 sm:pt-24 md:pt-28 pb-12 sm:pb-16 md:pb-20 overflow-x-hidden"
      style={{
        width: '100%',
        maxWidth: '100vw',
        minWidth: '0',
        boxSizing: 'border-box',
        // Safe area padding for iPads and notched devices - responsive padding that scales down on very small screens
        paddingLeft: "max(env(safe-area-inset-left, 0px), clamp(0.75rem, 2vw, 1.5rem))",
        paddingRight: "max(env(safe-area-inset-right, 0px), clamp(0.75rem, 2vw, 1.5rem))",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 3rem)",
      }}
    >
      <LandingHeroInner
        key={resetKey}
        isInView={isInView}
        prefersReducedMotion={!!prefersReducedMotion}
        deviceType={deviceType}
      />
    </section>
  )
}

function LandingHeroInner({
  isInView,
  prefersReducedMotion,
  deviceType,
}: {
  isInView: boolean
  prefersReducedMotion: boolean
  deviceType: "mobile" | "tablet" | "desktop"
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showVideoText, setShowVideoText] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Optimize video preload based on device type
  const videoPreload = deviceType === "mobile" ? "none" : "metadata"
  const isTouch = deviceType === "mobile" || deviceType === "tablet"

  // Handle video ended event - show overlay text on every loop
  const handleVideoEnded = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setShowVideoText(true)

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setShowVideoText(false)
      if (videoRef.current) {
        videoRef.current.currentTime = 0
        videoRef.current.play().catch(() => {})
      }
    }, 3000)
  }, [])

  // Clean up timer on unmount to avoid setState on unmounted component
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Setup video event listener with proper cleanup
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.addEventListener("ended", handleVideoEnded)
    
    return () => {
      video.removeEventListener("ended", handleVideoEnded)
    }
  }, [handleVideoEnded])

  // Auto-rotate headlines - optimized interval management
  // Pause on interaction for touch devices, hover for desktop
  useEffect(() => {
    if (!isInView || isPaused || prefersReducedMotion) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroContent.length)
    }, 2400)

    return () => clearInterval(interval)
  }, [isPaused, prefersReducedMotion, isInView])

  // Handle manual selection with touch-optimized pause
  const handleSelect = useCallback((index: number) => {
    setCurrentIndex(index)
    // Pause rotation briefly on selection for touch devices
    setIsPaused(true)
    const timer = setTimeout(() => setIsPaused(false), 4000)
    return () => clearTimeout(timer)
  }, [])

  // Hover handlers - only active on non-touch devices
  const handleMouseEnter = useCallback(() => {
    if (!isTouch) setIsPaused(true)
  }, [isTouch])

  const handleMouseLeave = useCallback(() => {
    if (!isTouch) setIsPaused(false)
  }, [isTouch])

  const currentContent = heroContent[currentIndex]

  return (
    <>
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

      {/* Main Content - Tablet-optimized grid */}
      <div className="relative z-10 w-full" style={{ width: '100%', maxWidth: 'min(100vw, 80rem)', minWidth: '0', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '0', paddingRight: '0' }}>
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-12 items-center w-full" style={{ width: '100%', maxWidth: '100%', minWidth: '0', boxSizing: 'border-box' }}>
          {/* Left: Text Content */}
          <div 
            className="text-center md:text-left space-y-4 sm:space-y-5 md:space-y-6 relative z-20 w-full"
            style={{ width: '100%', minWidth: '0', maxWidth: '100%' }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Rotating Headlines - Tablet-optimized min-heights to prevent CLS */}
            <div className="text-left min-h-[110px] sm:min-h-[130px] md:min-h-[160px] lg:min-h-[180px]">
              <AnimatePresence mode="wait">
                <AnimatedHeadline 
                  key={`headline-${currentIndex}`}
                  content={currentContent.headline}
                  isActive={isInView}
                  isInView={isInView}
                  prefersReducedMotion={prefersReducedMotion}
                />
              </AnimatePresence>
            </div>

            {/* Rotating Subheadlines - Tablet-optimized */}
            <div className="text-left min-h-[60px] sm:min-h-[70px] md:min-h-[85px] lg:min-h-[90px]">
              <AnimatePresence mode="wait">
                <AnimatedSubheadline 
                  key={`subheadline-${currentIndex}`}
                  text={currentContent.subheadline}
                  isInView={isInView}
                  prefersReducedMotion={prefersReducedMotion}
                />
              </AnimatePresence>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center md:justify-start">
              <ProgressDots 
                total={heroContent.length} 
                current={currentIndex} 
                onSelect={handleSelect}
              />
            </div>

            {/* Trust Badges - Inline Strip - Optimized for mobile */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm text-muted-foreground pt-2 px-2 sm:px-0">
              <motion.div 
                className="flex items-center gap-1.5 sm:gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ delay: isInView ? 0.2 : 0, duration: 0.5 }}
              >
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary shrink-0" />
                <span className="whitespace-nowrap">Research-backed</span>
              </motion.div>
              <div className="hidden sm:block w-px h-3 sm:h-4 bg-border opacity-30" />
              <motion.div 
                className="flex items-center gap-1.5 sm:gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ delay: isInView ? 0.3 : 0, duration: 0.5 }}
              >
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary shrink-0" />
                <span className="whitespace-nowrap">Available 24/7</span>
              </motion.div>
              <div className="hidden sm:block w-px h-3 sm:h-4 bg-border opacity-30" />
              <motion.div 
                className="flex items-center gap-1.5 sm:gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ delay: isInView ? 0.4 : 0, duration: 0.5 }}
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary shrink-0" />
                <span className="whitespace-nowrap">10,000+ trust Lisa</span>
              </motion.div>
            </div>

            {/* Social Proof - Optimized for mobile */}
            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2 sm:gap-3 pt-1 px-2 sm:px-0"
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ delay: isInView ? 0.5 : 0, duration: 0.5 }}
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

          {/* Right: Hero Video – Tablet mockup with entrance animation */}
          <div className="relative z-10 w-full flex justify-center md:justify-end" style={{ width: '100%', maxWidth: '100%', minWidth: '0' }}>
            <div className="w-full" style={{ width: '100%', maxWidth: '100%', minWidth: '0' }}>
              <motion.div
                className="relative w-full overflow-hidden"
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: '0',
                  borderRadius: deviceType === "tablet" ? "2rem" : "2.5rem",
                  border: `${deviceType === "tablet" ? 6 : 8}px solid #111827`,
                  backgroundColor: "#111827",
                  boxShadow:
                    "0 28px 70px -22px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08)",
                  willChange: "opacity, transform",
                  boxSizing: 'border-box',
                }}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={
                  isInView
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: 24, scale: 0.97 }
                }
                transition={{
                  duration: prefersReducedMotion ? 0.2 : 0.6,
                  delay: prefersReducedMotion ? 0 : 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {/* Bezel highlight (inner edge) */}
                <div
                  className="pointer-events-none absolute inset-0 z-10"
                  style={{
                    borderRadius: deviceType === "tablet" ? "2rem" : "2.5rem",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(255,255,255,0.08)",
                  }}
                  aria-hidden
                />

                {/* Camera (top center) */}
                <div
                  className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
                  style={{ top: "0.75rem" }}
                  aria-hidden
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: "rgba(0,0,0,0.7)",
                    }}
                  />
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      width: 4,
                      height: 4,
                      backgroundColor: "rgba(255,255,255,0.2)",
                    }}
                  />
                </div>

                {/* Screen */}
                <div
                  className="relative overflow-hidden"
                  style={{
                    aspectRatio: "4 / 3",
                    minHeight: deviceType === "tablet" ? 300 : 260,
                    borderRadius: deviceType === "tablet" ? "1.75rem" : "2.25rem",
                    background: "linear-gradient(135deg, #f9a8d4 0%, #fde047 50%, #93c5fd 100%)",
                  }}
                >
                  <video
                    ref={videoRef}
                    className="relative z-0 h-full w-full object-contain"
                    autoPlay
                    muted
                    playsInline
                    preload={videoPreload}
                    poster={VIDEO_POSTER_DATA}
                    aria-label="Lisa demo video"
                  >
                    <source src="/test2.webm" type="video/webm" />
                  </video>

                  {/* Video-triggered overlay text */}
                  <VideoOverlayText 
                    show={showVideoText} 
                    prefersReducedMotion={prefersReducedMotion} 
                  />

                  {/* Home indicator (bottom center) */}
                  <div
                    className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 rounded-full"
                    style={{
                      bottom: "0.75rem",
                      width: 160,
                      height: 6,
                      backgroundColor: "#000",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    }}
                    aria-hidden
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
