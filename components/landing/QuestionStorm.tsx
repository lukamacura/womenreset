/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, useReducedMotion, AnimatePresence } from "framer-motion"
import { MessageCircle } from "lucide-react"
import { useReplayableInView } from "@/hooks/useReplayableInView"
import { HighlightedTextByRows } from "@/components/landing/HighlightedTextByRows"

// The overwhelming questions women face - limited to 6
const questions = [
  "Why am I gaining weight?",
  "Why can't I sleep?",
  "Night sweats again?",
  "Always exhausted...",
  "Brain fog is real",
  "What should I eat?",
]

// Mobile positions - arranged in a loose circle around center, leaving space for Lisa
// Positions use viewport-safe values (30-70% horizontal range)
const cardPositionsMobile = [
  { left: 22, top: 20, rotate: -4, floatDelay: 0 },    // top-left
  { left: 78, top: 18, rotate: 3, floatDelay: 0.5 },   // top-right
  { left: 15, top: 50, rotate: 2, floatDelay: 1 },     // mid-left
  { left: 85, top: 52, rotate: -3, floatDelay: 1.5 },  // mid-right
  { left: 25, top: 82, rotate: 3, floatDelay: 0.3 },   // bottom-left
  { left: 75, top: 85, rotate: -2, floatDelay: 0.8 },  // bottom-right
]

// Desktop positions - wider spread with 3 columns
const cardPositionsDesktop = [
  { left: 12, top: 28, rotate: -4, floatDelay: 0 },    // left-top
  { left: 50, top: 18, rotate: 2, floatDelay: 0.6 },   // center-top
  { left: 88, top: 26, rotate: -3, floatDelay: 0.3 },  // right-top
  { left: 15, top: 72, rotate: 3, floatDelay: 0.9 },   // left-bottom
  { left: 50, top: 82, rotate: -2, floatDelay: 1.2 },  // center-bottom
  { left: 85, top: 74, rotate: 4, floatDelay: 0.4 },   // right-bottom
]

type AnimationPhase = 'intro' | 'storm' | 'peak' | 'lisa-appears' | 'resolution' | 'calm'

const VIDEO_POSTER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='12' viewBox='0 0 16 12'%3E%3Crect fill='%23f9a8d4' width='16' height='12'/%3E%3C/svg%3E"

// Lisa Video Component – preload="none" on mobile to reduce initial load
function LisaVideo({ preload = "metadata" }: { preload?: "metadata" | "none" }) {
  return (
    <div className="relative">
      {/* Glow effect behind video */}
      <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-pink-400/30 to-purple-400/30 blur-2xl scale-125" />
      
      {/* Video container */}
      <div className="relative w-64 h-64 sm:w-96 sm:h-96 md:w-[450px] md:h-[450px] lg:w-[500px] lg:h-[500px] rounded-2xl overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload={preload}
          poster={VIDEO_POSTER}
          className="w-full h-full object-cover"
        >
          <source src="/test2.webm" type="video/webm" />
        </video>
      </div>
    </div>
  )
}

// Floating animation keyframes for subtle bobbing effect
const floatVariants = {
  float: (floatDelay: number) => ({
    y: [0, -6, 0],
    rotate: [0, 1, 0],
    transition: {
      duration: 3,
      ease: "easeInOut" as const,
      repeat: Infinity,
      delay: floatDelay,
    },
  }),
}

// Individual Question Card Component with spring animations
function QuestionCard({
  question,
  index,
  phase,
  position,
  prefersReducedMotion,
}: {
  question: string
  index: number
  phase: AnimationPhase
  position: typeof cardPositionsMobile[0]
  prefersReducedMotion: boolean | null
}) {
  const isVisible = phase !== 'intro' && phase !== 'calm'
  const isFading = phase === 'lisa-appears' || phase === 'resolution'

  // Spring config for natural motion
  const springConfig = {
    type: "spring" as const,
    stiffness: 100,
    damping: 15,
    mass: 1,
  }

  return (
    <AnimatePresence mode="popLayout">
      {isVisible && (
        <motion.div
          key={`card-${index}`}
          className="absolute pointer-events-none"
          style={{
            left: `${position.left}%`,
            top: `${position.top}%`,
            x: "-50%",
            y: "-50%",
            zIndex: 10 - index,
          }}
          initial={{
            opacity: 0,
            scale: 0.3,
            rotate: position.rotate + 10,
          }}
          animate={{
            opacity: isFading ? 0 : 1,
            scale: isFading ? 0.9 : 1,
            rotate: position.rotate,
          }}
          exit={{
            opacity: 0,
            scale: 0.5,
            rotate: position.rotate - 5,
          }}
          transition={{
            ...springConfig,
            delay: phase === 'storm' ? index * 0.15 : 0,
            opacity: { duration: 0.4, ease: "easeOut" },
          }}
        >
          {/* Floating wrapper for subtle animation */}
          <motion.div
            variants={floatVariants}
            animate={!prefersReducedMotion && !isFading ? "float" : undefined}
            custom={position.floatDelay}
          >
            {/* Card styled like chat bubble */}
            <div className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 bg-card backdrop-blur-sm rounded-2xl shadow-lg shadow-pink-200/40 border border-pink-100 max-w-[120px] sm:max-w-[180px] md:max-w-[220px]">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-pink-400 shrink-0" />
                <p className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-700 leading-tight">
                  {question}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function QuestionStorm() {
  const prefersReducedMotion = useReducedMotion()
  const { ref, isInView, resetKey } = useReplayableInView<HTMLElement>({ amount: 0.3 })

  return (
    <section
      ref={ref}
      className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FDF2F8 0%, #FCE7F3 50%, #FDF2F8 100%)",
      }}
    >
      <QuestionStormInner
        key={resetKey}
        isInView={isInView}
        prefersReducedMotion={!!prefersReducedMotion}
      />
    </section>
  )
}

function QuestionStormInner({
  isInView,
  prefersReducedMotion,
}: {
  isInView: boolean
  prefersReducedMotion: boolean
}) {
  const [phase, setPhase] = useState<AnimationPhase>('intro')
  const [isMobile, setIsMobile] = useState(false)

  // When leaving the viewport, stop all floating/repeat animations by resetting to intro.
  useEffect(() => {
    if (isInView) return
    setPhase('intro')
  }, [isInView])

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Animation timeline - smooth transitions
  useEffect(() => {
    if (!isInView) return

    if (prefersReducedMotion) {
      setPhase('calm')
      return
    }

    let mounted = true
    const timeouts: NodeJS.Timeout[] = []

    const runCycle = () => {
      if (!mounted) return

      // Phase 1: Questions start appearing
      setPhase('storm')

      // Phase 2: Peak - all questions visible, let them float
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('peak')
      }, 2000))

      // Phase 3: Lisa appears - questions start fading
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('lisa-appears')
      }, 4000))

      // Phase 4: Resolution - questions fully gone
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('resolution')
      }, 5500))

      // Phase 5: Calm - final state with Lisa message
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('calm')
      }, 7000))

      // Restart cycle
      timeouts.push(setTimeout(() => {
        if (mounted) {
          setPhase('intro')
          setTimeout(runCycle, 600)
        }
      }, 11000))
    }

    // Start the cycle
    const initialDelay = setTimeout(runCycle, 500)
    timeouts.push(initialDelay)

    return () => {
      mounted = false
      timeouts.forEach(clearTimeout)
    }
  }, [isInView, prefersReducedMotion])

  // Phase-based text
  const phaseText = useMemo(() => {
    switch (phase) {
      case 'intro':
        return { text: "", color: "text-transparent" }
      case 'storm':
        return { text: "So many questions...", color: "text-rose-500" }
      case 'peak':
        return { text: "Google gives you 50 different answers...", color: "text-rose-600" }
      case 'lisa-appears':
        return { text: "But Lisa has time for all of them.", color: "text-purple-600" }
      case 'resolution':
        return { text: "Ask her anything. Get clear answers.", color: "text-pink-600" }
      case 'calm':
        return { text: "All your answers, in one place.", color: "text-emerald-600" }
    }
  }, [phase])

  return (
    <>
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full bg-pink-200/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 sm:w-80 sm:h-80 rounded-full bg-purple-200/20 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight px-2">
            Your head is{" "}
            <HighlightedTextByRows
              text="full of questions"
              isInView={isInView}
              prefersReducedMotion={prefersReducedMotion}
              delayMs={500}
            />
          </h2>
        </div>

        {/* Animation Container */}
        <div
          className="relative mx-auto"
          style={{
            height: "clamp(320px, 50vh, 450px)",
            maxWidth: "700px",
          }}
        >
          {/* Phase indicator text */}
          <div className="absolute top-0 left-0 right-0 text-center z-50 px-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={phase}
                initial={{ opacity: 0, y: -10 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ 
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`text-sm sm:text-base md:text-lg lg:text-2xl font-semibold ${phaseText.color}`}
              >
                {phaseText.text}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Question cards */}
          <div className="absolute inset-0 pt-10 sm:pt-12">
            {questions.map((question, index) => {
              const position = isMobile ? cardPositionsMobile[index] : cardPositionsDesktop[index]
              
              return (
                <QuestionCard
                  key={index}
                  question={question}
                  index={index}
                  phase={phase}
                  position={position}
                  prefersReducedMotion={prefersReducedMotion}
                />
              )
            })}
          </div>

          {/* Lisa video appears in center */}
          <AnimatePresence>
            {(phase === 'lisa-appears' || phase === 'resolution' || phase === 'calm') && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center z-20"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  type: "spring",
                  stiffness: 80,
                  damping: 20,
                }}
              >
                <LisaVideo preload={isMobile ? "none" : "metadata"} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Final calm state message */}
          <AnimatePresence>
            {phase === 'calm' && (
              <motion.div
                className="absolute inset-0 flex items-end justify-center z-25 pointer-events-none pb-2 sm:pb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 100,
                  damping: 20,
                  delay: 0.2,
                }}
              >
                <div className="w-[92%] sm:w-auto max-w-sm">
                  <motion.div
                    className="px-4 py-3 sm:px-6 sm:py-4 bg-card rounded-2xl shadow-lg shadow-pink-200/30 border border-pink-100"
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 120,
                      damping: 15,
                      delay: 0.3,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-pink-400 shrink-0" />
                      <div>
                        <p className="text-xs sm:text-sm text-gray-400 font-medium">Lisa</p>
                        <p className="text-sm sm:text-base font-semibold text-gray-800">
                          &ldquo;Ask me anything — I&apos;m here for you.&rdquo;
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom CTA hint */}
        <motion.div
          className="text-center mt-2 sm:mt-4"
          initial={{ opacity: 0 }}
          animate={isInView && phase === 'calm' ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <p className="text-gray-400 text-xs sm:text-sm">
            Your personal menopause expert, available 24/7
          </p>
        </motion.div>
      </div>
    </>
  )
}
