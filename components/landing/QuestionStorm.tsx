/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useRef, useState, useEffect, useMemo, useCallback } from "react"
import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion"
import { MessageCircle } from "lucide-react"

// Hook for heading animation trigger
function useHeadingAnimation(prefersReducedMotion: boolean | null) {
  const headingRef = useRef<HTMLDivElement>(null)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion) {
      setShouldAnimate(true)
      return
    }

    const headingElement = headingRef.current
    if (!headingElement) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setShouldAnimate(true)
            observer.disconnect()
          }
        })
      },
      {
        threshold: [0, 0.5, 1],
        rootMargin: '0px 0px -20% 0px',
      }
    )

    observer.observe(headingElement)
    return () => observer.disconnect()
  }, [prefersReducedMotion])

  return { headingRef, shouldAnimate }
}

// The overwhelming questions women face
const questions = [
  "Why am I suddenly gaining weight when I'm eating the same?",
  "Why can't I sleep through the night anymore?",
  "Why do I wake up drenched in sweat every night?",
  "Why does sex suddenly hurt so bad?",
  "Why do I suddenly have to pee all the time?",
  "Why do I look 6 months pregnant every day?",
  "Why am I crying over nothing?",
  "Why am I so exhausted all the time?",
  "Why do my hands and knees hurt so much?",
  "Why isn't my usual cardio working anymore?",
  "What am I supposed to eat now?",
  "Why can't I remember words anymore?",
]

// Predefined chaotic positions - properly centered with left/top percentages
// Cards will be centered at these positions using CSS transform
// Moved down to make room for phase text at top
const chaoticPositions = [
  // Top row - moved down from 12-18% to 25-30%
  { left: 20, top: 28, rotate: -4, scale: 0.92 },
  { left: 50, top: 25, rotate: 3, scale: 0.95 },
  { left: 80, top: 30, rotate: -2, scale: 0.93 },
  // Upper-middle row - moved down
  { left: 15, top: 48, rotate: 5, scale: 0.94 },
  { left: 50, top: 45, rotate: -3, scale: 1 },
  { left: 85, top: 50, rotate: 4, scale: 0.93 },
  // Lower-middle row - moved down
  { left: 18, top: 65, rotate: -5, scale: 0.95 },
  { left: 50, top: 62, rotate: 2, scale: 0.96 },
  { left: 82, top: 68, rotate: -4, scale: 0.94 },
  // Bottom row - moved down
  { left: 22, top: 85, rotate: 3, scale: 0.93 },
  { left: 50, top: 82, rotate: -2, scale: 0.95 },
  { left: 78, top: 88, rotate: 4, scale: 0.94 },
]

// Question card colors - high contrast, easier to read
const cardColors = [
  "from-rose-50 to-white border-rose-300",
  "from-amber-50 to-white border-amber-300",
  "from-purple-50 to-white border-purple-300",
  "from-red-50 to-white border-red-300",
  "from-fuchsia-50 to-white border-fuchsia-300",
  "from-orange-50 to-white border-orange-300",
]

type AnimationPhase = 'intro' | 'storm' | 'peak' | 'lisa-appears' | 'resolution' | 'calm'

// Lisa Video Component - replaces avatar with video
function LisaVideo() {
  return (
    <motion.div
      className="relative"
      initial={false}
    >
      {/* Glow effect behind video */}
      <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-pink-400/30 to-purple-400/30 blur-2xl scale-125" />
      
      {/* Video container */}
      <div className="relative w-40 h-40 sm:w-56 sm:h-56 md:w-72 md:h-72 rounded-2xl overflow-hidden ">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/test2.webm" type="video/webm" />
        </video>
      </div>
    </motion.div>
  )
}

// Individual Question Card Component - Fixed positioning and faster animations
function QuestionCard({
  question,
  index,
  phase,
  position,
  color,
}: {
  question: string
  index: number
  phase: AnimationPhase
  position: typeof chaoticPositions[0]
  color: string
}) {
  const isVisible = phase !== 'intro' && phase !== 'calm'
  const isFading = phase === 'lisa-appears' || phase === 'resolution'
  const shouldPulse = phase === 'storm' || phase === 'peak'
  
  // Truncate long questions for cards
  const displayText = question.length > 45 ? question.slice(0, 45) + "..." : question

  return (
    <AnimatePresence mode="popLayout">
      {isVisible && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            // Use CSS left/top for positioning (not overwritten by Framer Motion)
            left: `${position.left}%`,
            top: `${position.top}%`,
            // Center the card at this position
            translateX: '-50%',
            translateY: '-50%',
            zIndex: 10 - (index % 5),
          }}
          initial={{
            opacity: 0,
            scale: 0,
            rotate: position.rotate * 2,
          }}
          animate={{
            opacity: isFading ? 0 : 1,
            scale: isFading ? 0.6 : position.scale,
            rotate: position.rotate,
          }}
          exit={{
            opacity: 0,
            scale: 0,
            rotate: position.rotate + 15,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
            mass: 0.8,
            delay: phase === 'storm' ? index * 0.08 : isFading ? index * 0.03 : 0,
          }}
        >
          <motion.div
            className={`
              relative px-3 py-2.5 sm:px-5 sm:py-4 rounded-xl
              bg-linear-to-br ${color}
              border-2 
              shadow-lg max-w-[180px] sm:max-w-[240px] md:max-w-[280px]
              text-center
            `}
            animate={shouldPulse ? {
              boxShadow: [
                "0 4px 20px rgba(0,0,0,0.12)",
                "0 6px 25px rgba(236,72,153,0.25)",
                "0 4px 20px rgba(0,0,0,0.12)",
              ],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: index * 0.1,
            }}
          >
            {/* Question mark icon */}
            <div className="absolute -top-2.5 -left-2.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-sm sm:text-base font-bold shadow-md">
              ?
            </div>
            
            <p className="text-xs sm:text-sm md:text-base text-gray-800 font-semibold leading-snug">
              {displayText}
            </p>
          </motion.div>
          
          {/* Floating question mark during storm */}
          {shouldPulse && (
            <motion.span
              className="absolute -top-2 right-0 text-red-400/50 text-xs sm:text-sm font-bold"
              animate={{
                y: [0, -4, 0],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: index * 0.08,
              }}
            >
              ?
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function QuestionStorm() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, amount: 0.3 })
  const prefersReducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<AnimationPhase>('intro')
  const { headingRef, shouldAnimate: shouldAnimateHeading } = useHeadingAnimation(prefersReducedMotion)

  // Animation timeline - faster and snappier
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

      // Phase 1: Questions start appearing (storm begins)
      setPhase('storm')

      // Phase 2: Peak chaos - all questions visible, pulsing (faster)
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('peak')
      }, 900))

      // Phase 3: Lisa appears
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('lisa-appears')
      }, 1700))

      // Phase 4: Resolution - questions fade out
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('resolution')
      }, 2300))

      // Phase 5: Calm - final state with Lisa
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('calm')
      }, 2900))

      // Restart cycle - shorter pause
      timeouts.push(setTimeout(() => {
        if (mounted) {
          setPhase('intro')
          setTimeout(runCycle, 300)
        }
      }, 5000))
    }

    // Start the cycle quickly
    const initialDelay = setTimeout(runCycle, 200)
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
        return { text: "So many questions...", color: "text-rose-600" }
      case 'peak':
        return { text: "It feels overwhelming...", color: "text-red-600" }
      case 'lisa-appears':
        return { text: "But you're not alone.", color: "text-purple-600" }
      case 'resolution':
        return { text: "Lisa understands.", color: "text-pink-600" }
      case 'calm':
        return { text: "All your answers, in one place.", color: "text-emerald-600" }
    }
  }, [phase])

  // Get color for question card
  const getCardColor = useCallback((index: number) => {
    return cardColors[index % cardColors.length]
  }, [])

  return (
    <section
      ref={containerRef}
      className="relative py-10 sm:py-14 md:py-20 px-4 sm:px-6 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FDF2F8 0%, #FCE7F3 50%, #FDF2F8 100%)",
      }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full bg-pink-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 sm:w-80 sm:h-80 rounded-full bg-purple-200/30 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Header - larger for accessibility */}
        <div
          ref={headingRef}
          className="text-center mb-6 sm:mb-8"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight px-2">
            Your head is{" "}
            <span className="relative inline-block">
              <span className="relative z-10">full of questions</span>
              <motion.span
                className="absolute inset-0 bg-yellow-400/40 rounded pointer-events-none"
                initial={{ scaleX: 0, transformOrigin: "left" }}
                animate={shouldAnimateHeading && !prefersReducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.6,
                  delay: 0.15,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                style={{ zIndex: 0 }}
              />
            </span>
          </h2>
        </div>

        {/* Animation Container */}
        <div
          className="relative mx-auto"
          style={{
            height: "clamp(350px, 50vh, 500px)",
            maxWidth: "850px",
          }}
        >
          {/* Phase indicator text - positioned at top with high z-index */}
          <div className="absolute top-0 left-0 right-0 text-center z-50 pb-8 pt-2">
            <AnimatePresence mode="wait">
              <motion.p
                key={phase}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold drop-shadow-sm ${phaseText.color}`}
              >
                {phaseText.text}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Question cards storm area - lower z-index than phase text */}
          <div className="absolute inset-0 pt-12 sm:pt-14 z-10">
            {questions.map((question, index) => (
              <QuestionCard
                key={index}
                question={question}
                index={index}
                phase={phase}
                position={chaoticPositions[index]}
                color={getCardColor(index)}
              />
            ))}
          </div>

          {/* Lisa video appears in center */}
          <AnimatePresence>
            {(phase === 'lisa-appears' || phase === 'resolution' || phase === 'calm') && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center z-20"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 25,
                  mass: 0.6,
                }}
              >
                <LisaVideo />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Final calm state message - larger for accessibility */}
          <AnimatePresence>
            {phase === 'calm' && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
              >
                <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 w-[95%] sm:w-auto max-w-md">
                  <motion.div
                    className="px-5 py-4 sm:px-8 sm:py-5 bg-linear-to-br from-white to-pink-50 rounded-2xl shadow-2xl border-2 border-pink-200"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 20,
                      delay: 0.15,
                    }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-pink-500 shrink-0" />
                      <div>
                        <p className="text-sm sm:text-base text-gray-500 font-medium">Lisa says:</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-gray-800">
                          &ldquo;Ask me anything. I&apos;m here for you.&rdquo;
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chaos visual effects during storm/peak */}
          <AnimatePresence>
            {(phase === 'storm' || phase === 'peak') && (
              <>
                {/* Floating question marks background - fewer on mobile */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`bg-q-${i}`}
                    className="absolute text-2xl sm:text-4xl md:text-5xl font-bold text-pink-200/30 pointer-events-none select-none"
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: [0.12, 0.25, 0.12],
                      y: [0, -12, 0],
                      x: [0, (i % 2 === 0 ? 6 : -6), 0],
                      rotate: [0, (i % 2 === 0 ? 5 : -5), 0],
                    }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{
                      duration: 1 + (i * 0.15),
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "easeInOut",
                    }}
                    style={{
                      left: `${15 + (i * 14)}%`,
                      top: `${25 + ((i * 12) % 50)}%`,
                    }}
                  >
                    ?
                  </motion.div>
                ))}
                
                {/* Stress lines/rays - hidden on mobile for cleaner look */}
                <motion.div
                  className="absolute inset-0 pointer-events-none hidden sm:block"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: phase === 'peak' ? 0.1 : 0.05 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={`ray-${i}`}
                        className="absolute top-1/2 left-1/2 w-0.5 bg-linear-to-t from-red-400/20 to-transparent"
                        style={{
                          height: '35%',
                          transformOrigin: 'bottom center',
                          transform: `rotate(${i * 45}deg) translateX(-50%)`,
                        }}
                        animate={{
                          opacity: [0.15, 0.3, 0.15],
                          height: ['28%', '36%', '28%'],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.05,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom CTA hint */}
        <motion.div
          className="text-center mt-4 sm:mt-6"
          initial={{ opacity: 0 }}
          animate={isInView && phase === 'calm' ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.4, duration: 0.3, ease: "easeOut" }}
        >
          <p className="text-gray-500 text-xs sm:text-sm">
            Your personal menopause companion, powered by AI
          </p>
        </motion.div>
      </div>
    </section>
  )
}
