/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useRef, useState, useEffect, useMemo, useCallback } from "react"
import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion"
import { Sparkles, Heart, MessageCircle } from "lucide-react"

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

// Predefined chaotic positions - centered in the middle of container
const chaoticPositions = [
  // Top row - centered horizontally
  { x: 30, y: 20, rotate: -5, scale: 0.95 },
  { x: 50, y: 18, rotate: 4, scale: 0.98 },
  { x: 70, y: 22, rotate: -3, scale: 0.95 },
  // Upper-middle row - centered horizontally
  { x: 28, y: 40, rotate: 6, scale: 0.96 },
  { x: 50, y: 38, rotate: -4, scale: 1 },
  { x: 72, y: 42, rotate: 5, scale: 0.95 },
  // Lower-middle row - centered horizontally
  { x: 30, y: 60, rotate: -6, scale: 0.97 },
  { x: 50, y: 58, rotate: 3, scale: 0.98 },
  { x: 70, y: 62, rotate: -5, scale: 0.96 },
  // Bottom row - centered horizontally
  { x: 32, y: 80, rotate: 4, scale: 0.95 },
  { x: 50, y: 78, rotate: -3, scale: 0.97 },
  { x: 68, y: 82, rotate: 5, scale: 0.96 },
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

// Lisa Avatar Component
function LisaAvatar({ animate = false }: { animate?: boolean }) {
  return (
    <motion.div
      className="relative"
      initial={false}
      animate={animate ? {
        scale: [1, 1.05, 1],
      } : {}}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-linear-to-br from-pink-400/40 to-purple-400/40 blur-xl scale-150" />
      
      {/* Main avatar - larger for visibility */}
      <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-linear-to-br from-pink-400 to-purple-500 p-1.5 shadow-2xl">
        <div className="w-full h-full rounded-full bg-linear-to-br from-pink-50 to-white flex items-center justify-center">
          <div className="text-center">
            <Heart className="w-8 h-8 sm:w-12 sm:h-12 text-pink-500 mx-auto" fill="currentColor" />
            <span className="text-xs sm:text-sm font-bold text-pink-600 mt-1 block">Lisa</span>
          </div>
        </div>
      </div>
      
      {/* Sparkle decorations - larger */}
      <motion.div
        className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3"
        animate={{ rotate: [0, 180, 360], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-400" />
      </motion.div>
      <motion.div
        className="absolute -bottom-1 -left-3 sm:-bottom-2 sm:-left-4"
        animate={{ rotate: [360, 180, 0], scale: [1, 0.8, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      >
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
      </motion.div>
    </motion.div>
  )
}

// Individual Question Card Component
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
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute pointer-events-none"
          initial={{
            opacity: 0,
            x: `${position.x}%`,
            y: `${position.y}%`,
            scale: 0,
            rotate: position.rotate * 2,
          }}
          animate={{
            opacity: isFading ? 0 : 1,
            x: `${position.x}%`,
            y: `${position.y}%`,
            scale: isFading ? 0.5 : position.scale,
            rotate: position.rotate,
          }}
          exit={{
            opacity: 0,
            scale: 0,
            rotate: position.rotate + 20,
          }}
          transition={{
            duration: 0.8,
            delay: phase === 'storm' ? index * 0.25 : isFading ? index * 0.08 : 0,
            ease: "easeOut",
          }}
          style={{
            transform: `translate(-50%, -50%)`,
            zIndex: 10 - (index % 5),
          }}
        >
          <motion.div
            className={`
              relative px-3 py-2.5 sm:px-5 sm:py-4 rounded-xl
              bg-linear-to-br ${color}
              border-2 
              shadow-lg max-w-[200px] sm:max-w-[260px] md:max-w-[300px]
              text-center
            `}
            animate={shouldPulse ? {
              boxShadow: [
                "0 4px 20px rgba(0,0,0,0.15)",
                "0 8px 30px rgba(236,72,153,0.3)",
                "0 4px 20px rgba(0,0,0,0.15)",
              ],
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: index * 0.25,
            }}
          >
            {/* Question mark icon - larger and more visible */}
            <div className="absolute -top-3 -left-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-base sm:text-lg font-bold shadow-lg">
              ?
            </div>
            
            <p className="text-sm sm:text-base md:text-lg text-gray-800 font-semibold leading-relaxed">
              {displayText}
            </p>
          </motion.div>
          
          {/* Floating question marks during storm */}
          {shouldPulse && (
            <motion.span
              className="absolute -top-3 right-0 text-red-400/60 text-sm sm:text-base font-bold"
              animate={{
                y: [0, -6, 0],
                opacity: [0.4, 0.8, 0.4],
                rotate: [-5, 5, -5],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: index * 0.15,
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

  // Animation timeline
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

      // Phase 1: Questions start appearing (storm begins) - slower for readability
      setPhase('storm')

      // Phase 2: Peak chaos - all questions visible, pulsing
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('peak')
      }, 3500))

      // Phase 3: Lisa appears
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('lisa-appears')
      }, 5500))

      // Phase 4: Resolution - questions fade out
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('resolution')
      }, 7500))

      // Phase 5: Calm - final state with Lisa
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('calm')
      }, 9500))

      // Restart cycle - longer pause before restart
      timeouts.push(setTimeout(() => {
        if (mounted) {
          setPhase('intro')
          setTimeout(runCycle, 800)
        }
      }, 14000))
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
                className="absolute inset-0 bg-yellow-400/50 rounded pointer-events-none"
                initial={{ scaleX: 0, transformOrigin: "left" }}
                animate={shouldAnimateHeading && !prefersReducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 1.2,
                  delay: 0.3,
                  ease: [0.4, 0, 0.2, 1],
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
          {/* Phase indicator text - larger for accessibility */}
          <div className="absolute top-0 left-0 right-0 text-center z-30">
            <AnimatePresence mode="wait">
              <motion.p
                key={phase}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.5 }}
                className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold ${phaseText.color}`}
              >
                {phaseText.text}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Question cards storm area */}
          <div className="absolute inset-0 pt-6 sm:pt-8">
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

          {/* Lisa appears in center */}
          <AnimatePresence>
            {(phase === 'lisa-appears' || phase === 'resolution' || phase === 'calm') && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center z-20"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  type: "spring",
                  damping: 15,
                  stiffness: 200,
                }}
              >
                <LisaAvatar animate={phase === 'calm'} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Final calm state message - larger for accessibility */}
          <AnimatePresence>
            {phase === 'calm' && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 w-[95%] sm:w-auto max-w-md">
                  <motion.div
                    className="px-5 py-4 sm:px-8 sm:py-5 bg-linear-to-br from-white to-pink-50 rounded-2xl shadow-2xl border-2 border-pink-200"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      damping: 12,
                      stiffness: 150,
                      delay: 0.3,
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
                      opacity: [0.15, 0.3, 0.15],
                      y: [0, -20, 0],
                      x: [0, (i % 2 === 0 ? 10 : -10), 0],
                      rotate: [0, (i % 2 === 0 ? 8 : -8), 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 2 + (i * 0.3),
                      repeat: Infinity,
                      delay: i * 0.2,
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
                  animate={{ opacity: phase === 'peak' ? 0.12 : 0.06 }}
                  exit={{ opacity: 0 }}
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
                          opacity: [0.2, 0.4, 0.2],
                          height: ['30%', '40%', '30%'],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.1,
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
          transition={{ delay: 1, duration: 0.5 }}
        >
          <p className="text-gray-500 text-xs sm:text-sm">
            Your personal menopause companion, powered by AI
          </p>
        </motion.div>
      </div>
    </section>
  )
}
