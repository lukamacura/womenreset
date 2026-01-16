/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Heart, Brain, Moon, Thermometer, Zap, Droplet } from "lucide-react"

// Symptom data with icons and colors
const symptoms = [
  { id: "hotflash", label: "Hot Flashes", icon: Thermometer, color: "bg-orange-100 border-orange-300 text-orange-800" },
  { id: "mood", label: "Mood Swings", icon: Heart, color: "bg-pink-100 border-pink-300 text-pink-800" },
  { id: "brainfog", label: "Brain Fog", icon: Brain, color: "bg-purple-100 border-purple-300 text-purple-800" },
  { id: "sleep", label: "Poor Sleep", icon: Moon, color: "bg-indigo-100 border-indigo-300 text-indigo-800" },
  { id: "fatigue", label: "Fatigue", icon: Zap, color: "bg-yellow-100 border-yellow-300 text-yellow-800" },
  { id: "dryness", label: "Dryness", icon: Droplet, color: "bg-blue-100 border-blue-300 text-blue-800" },
]

// Chaotic positions - overlapping, rotated, messy
const chaoticPositions = [
  { x: 25, y: 30, rotate: -15, scale: 0.9 },
  { x: 70, y: 25, rotate: 12, scale: 1.1 },
  { x: 35, y: 55, rotate: -8, scale: 0.95 },
  { x: 60, y: 60, rotate: 18, scale: 1.05 },
  { x: 45, y: 40, rotate: -20, scale: 0.85 },
  { x: 80, y: 45, rotate: 10, scale: 1 },
]

// Organized positions - neat 2x3 grid
const organizedPositions = [
  { x: 25, y: 30 },
  { x: 50, y: 30 },
  { x: 75, y: 30 },
  { x: 25, y: 60 },
  { x: 50, y: 60 },
  { x: 75, y: 60 },
]

type AnimationPhase = 'chaos' | 'organizing' | 'organized' | 'clarity'

export default function ChaosToClarity() {
  const ref = useRef(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  const prefersReducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<AnimationPhase>('chaos')
  const [shouldAnimateHeading, setShouldAnimateHeading] = useState(false)

  // Heading intersection observer
  useEffect(() => {
    if (prefersReducedMotion) {
      setShouldAnimateHeading(true)
      return
    }

    const headingElement = headingRef.current
    if (!headingElement) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setShouldAnimateHeading(true)
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

  // Animation timeline
  useEffect(() => {
    if (!isInView) return
    
    if (prefersReducedMotion) {
      setPhase('clarity')
      return
    }

    let mounted = true
    const timeouts: NodeJS.Timeout[] = []

    const runCycle = () => {
      if (!mounted) return
      
      // Start with chaos
      setPhase('chaos')
      
      // After 2s: start organizing
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('organizing')
      }, 2000))
      
      // After 3s: fully organized
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('organized')
      }, 3000))
      
      // After 4s: show clarity
      timeouts.push(setTimeout(() => {
        if (mounted) setPhase('clarity')
      }, 4000))
      
      // After 7s: restart cycle
      timeouts.push(setTimeout(() => {
        if (mounted) runCycle()
      }, 7000))
    }

    runCycle()

    return () => {
      mounted = false
      timeouts.forEach(clearTimeout)
    }
  }, [isInView, prefersReducedMotion])

  // Memoize phase labels
  const phaseLabel = useMemo(() => {
    switch (phase) {
      case 'chaos': return { text: "This feels overwhelming...", color: "text-red-600" }
      case 'organizing': return { text: "Let's organize this...", color: "text-amber-600" }
      case 'organized': return { text: "Now you can see it clearly", color: "text-emerald-600" }
      case 'clarity': return { text: "Clarity comes from organized tracking", color: "text-emerald-600" }
    }
  }, [phase])

  return (
    <section 
      ref={ref}
      className="relative py-12 sm:py-16 md:py-20 lg:py-24 px-4 overflow-hidden"
      style={{ 
        background: "linear-gradient(135deg, #F5E6FF 0%, #E6D5FF 100%)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div
          ref={headingRef}
          className="text-center mb-8 sm:mb-12 md:mb-16 relative"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight px-2 sm:px-4">
            Menopause isn&apos;t random.
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">
                It&apos;s just been poorly explained.
              </span>
              <motion.span
                className="absolute inset-0 bg-yellow-400/40 rounded pointer-events-none"
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
        <div className="relative w-full mx-auto" style={{ 
          height: "clamp(350px, 45vh, 500px)",
          maxWidth: "800px" 
        }}>
          {/* Phase label indicator */}
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className={`absolute top-0 left-1/2 -translate-x-1/2 text-sm sm:text-base font-medium ${phaseLabel.color}`}
            >
              {phaseLabel.text}
            </motion.div>
          </AnimatePresence>

          {/* Main animation area */}
          <div className="relative w-full h-full pt-8">
            {/* Symptom cards */}
            {symptoms.map((symptom, index) => {
              const Icon = symptom.icon
              const chaotic = chaoticPositions[index]
              const organized = organizedPositions[index]
              
              // Determine current position based on phase
              const isOrganized = phase === 'organizing' || phase === 'organized' || phase === 'clarity'
              const currentX = isOrganized ? organized.x : chaotic.x
              const currentY = isOrganized ? organized.y : chaotic.y
              const currentRotate = isOrganized ? 0 : chaotic.rotate
              const currentScale = isOrganized ? 1 : chaotic.scale
              
              // Visual effects based on phase
              const isBlurred = phase === 'chaos'
              const showCheckmark = phase === 'clarity'
              
              return (
                <motion.div
                  key={symptom.id}
                  className="absolute"
                  initial={false}
                  animate={{
                    left: `${currentX}%`,
                    top: `${currentY}%`,
                    rotate: currentRotate,
                    scale: currentScale,
                    x: "-50%",
                    y: "-50%",
                  }}
                  transition={{
                    type: "spring",
                    damping: 25,
                    stiffness: 120,
                    mass: 0.8,
                    delay: phase === 'organizing' ? index * 0.08 : 0,
                  }}
                  style={{ zIndex: phase === 'clarity' ? 5 : 10 - index }}
                >
                  <motion.div 
                    className={`
                      relative px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 
                      rounded-xl shadow-lg border-2 
                      flex items-center gap-2 sm:gap-2.5 whitespace-nowrap
                      ${symptom.color}
                    `}
                    animate={{
                      filter: isBlurred ? "blur(1px)" : "blur(0px)",
                      boxShadow: isOrganized 
                        ? "0 4px 15px rgba(0,0,0,0.1)" 
                        : "0 8px 25px rgba(0,0,0,0.15)",
                    }}
                    transition={{ duration: 0.4 }}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span className="text-sm sm:text-base font-semibold">
                      {symptom.label}
                    </span>
                    
                    {/* Checkmark that appears in clarity phase */}
                    <AnimatePresence>
                      {showCheckmark && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ 
                            type: "spring", 
                            damping: 15, 
                            stiffness: 300,
                            delay: index * 0.1 
                          }}
                          className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-0.5 shadow-md"
                        >
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Chaos effect: question marks floating around */}
                  {phase === 'chaos' && (
                    <motion.span
                      className="absolute -top-3 -right-1 text-red-400 text-lg font-bold"
                      animate={{
                        y: [0, -5, 0],
                        opacity: [0.6, 1, 0.6],
                        rotate: [-10, 10, -10],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: index * 0.2,
                      }}
                    >
                      ?
                    </motion.span>
                  )}
                </motion.div>
              )
            })}

            {/* Clarity celebration overlay */}
            <AnimatePresence>
              {phase === 'clarity' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    type: "spring", 
                    damping: 20, 
                    stiffness: 150,
                    delay: 0.5 
                  }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ zIndex: 20 }}
                >
                  <div 
                    className="px-8 py-4 sm:px-12 sm:py-6 bg-linear-to-br from-emerald-100 to-green-100 rounded-2xl shadow-2xl border-2 border-emerald-300"
                    style={{
                      boxShadow: "0 15px 40px rgba(16, 185, 129, 0.3), 0 0 80px rgba(16, 185, 129, 0.15)",
                    }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <motion.div
                        animate={{ 
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.1, 1.1, 1],
                        }}
                        transition={{ 
                          duration: 0.6, 
                          delay: 0.8,
                        }}
                      >
                        <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-600" />
                      </motion.div>
                      <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-800">
                        Clarity
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Visual grid lines that appear during organizing */}
            <AnimatePresence>
              {(phase === 'organizing' || phase === 'organized') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 pointer-events-none"
                  style={{ zIndex: 1 }}
                >
                  {/* Horizontal guide lines */}
                  <motion.div
                    className="absolute left-[10%] right-[10%] top-[30%] h-px bg-linear-to-r from-transparent via-purple-300 to-transparent"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  />
                  <motion.div
                    className="absolute left-[10%] right-[10%] top-[60%] h-px bg-linear-to-r from-transparent via-purple-300 to-transparent"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  />
                  {/* Vertical guide lines */}
                  <motion.div
                    className="absolute top-[15%] bottom-[25%] left-[25%] w-px bg-linear-to-b from-transparent via-purple-300 to-transparent"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  />
                  <motion.div
                    className="absolute top-[15%] bottom-[25%] left-[50%] w-px bg-linear-to-b from-transparent via-purple-300 to-transparent"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  />
                  <motion.div
                    className="absolute top-[15%] bottom-[25%] left-[75%] w-px bg-linear-to-b from-transparent via-purple-300 to-transparent"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
