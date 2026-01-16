"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView, useReducedMotion } from "framer-motion"
import { BookOpen, Heart, Brain, Moon, Thermometer, Zap, Activity, Droplet } from "lucide-react"

// Animated Text Component - Letter by letter (smoother with delay, words stay together)
function AnimatedText({ text, shouldAnimate, prefersReducedMotion }: { text: string; shouldAnimate: boolean; prefersReducedMotion: boolean | null }) {
  if (prefersReducedMotion || !shouldAnimate) {
    return <span>{text}</span>
  }
  
  // Split text into words to keep words together
  const words = text.split(" ")
  let letterIndex = 0
  
  return (
    <>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap">
          {word.split("").map((letter) => {
            const currentIndex = letterIndex++
            return (
              <motion.span
                key={currentIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.2 + currentIndex * 0.04, // Initial delay + per-letter delay
                  ease: [0.16, 1, 0.3, 1], // Smoother easing
                }}
                className="inline-block"
              >
                {letter}
              </motion.span>
            )
          })}
          {wordIndex < words.length - 1 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.2 + letterIndex++ * 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="inline-block"
              style={{ width: '0.3em', minWidth: '4px' }}
            >
              {' '}
            </motion.span>
          )}
        </span>
      ))}
    </>
  )
}

// Animated Highlighted Text Component - Letter by letter with default CSS highlight (words stay together)
function AnimatedHighlightedText({ text, shouldAnimate, prefersReducedMotion }: { text: string; shouldAnimate: boolean; prefersReducedMotion: boolean | null }) {
  const firstLineLength = "Menopause isn't random.".length
  
  if (prefersReducedMotion || !shouldAnimate) {
    return <mark className="bg-yellow-400/30 rounded px-1 py-0.5">{text}</mark>
  }
  
  // Split text into words to keep words together
  const words = text.split(" ")
  let letterIndex = 0
  
  return (
    <mark className="bg-yellow-400/30 rounded px-1 py-0.5">
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap">
          {word.split("").map((letter) => {
            const currentIndex = letterIndex++
            const globalIndex = firstLineLength + 1 + currentIndex
            return (
              <motion.span
                key={currentIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.2 + globalIndex * 0.04, // Continue from first line + per-letter delay
                  ease: [0.16, 1, 0.3, 1], // Smoother easing
                }}
                className="inline-block"
              >
                {letter}
              </motion.span>
            )
          })}
          {wordIndex < words.length - 1 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.2 + (firstLineLength + 1 + letterIndex++) * 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="inline-block"
              style={{ width: '0.3em', minWidth: '4px' }}
            >
              {' '}
            </motion.span>
          )}
        </span>
      ))}
    </mark>
  )
}

interface KnowledgePill {
  id: string
  label: string
  icon: typeof BookOpen
  initialX: number
  initialY: number
}

// Optimized positioning for better space utilization and mobile compatibility
const knowledgeItems: KnowledgePill[] = [
  { id: "hormone-fluctuations", label: "Hormone Fluctuations", icon: Activity, initialX: 8, initialY: 12 },
  { id: "cardiovascular-health", label: "Cardiovascular Health", icon: Heart, initialX: 78, initialY: 8 },
  { id: "cognitive-changes", label: "Cognitive Changes", icon: Brain, initialX: 50, initialY: 88 },
  { id: "sleep-patterns", label: "Sleep Patterns", icon: Moon, initialX: 12, initialY: 72 },
  { id: "temperature-regulation", label: "Temperature Regulation", icon: Thermometer, initialX: 82, initialY: 78 },
  { id: "metabolic-shifts", label: "Metabolic Shifts", icon: Zap, initialX: 68, initialY: 22 },
  { id: "bone-density", label: "Bone Density", icon: Activity, initialX: 22, initialY: 48 },
  { id: "hydration-needs", label: "Hydration", icon: Droplet, initialX: 88, initialY: 52 },
]

export default function ChaosToClarity() {
  const ref = useRef(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  const prefersReducedMotion = useReducedMotion()
  const [animationPhase, setAnimationPhase] = useState<'scattered' | 'fading' | 'complete'>('scattered')
  const [shouldAnimateHeading, setShouldAnimateHeading] = useState(false)

  // Simple and reliable Intersection Observer for heading animation
  useEffect(() => {
    if (prefersReducedMotion) {
      setTimeout(() => setShouldAnimateHeading(true), 0)
      return
    }

    const headingElement = headingRef.current
    if (!headingElement) return

    // Use Intersection Observer API - more reliable than custom scroll handlers
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Only trigger when heading is significantly in viewport
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setShouldAnimateHeading(true)
            observer.disconnect() // Only trigger once
          }
        })
      },
      {
        threshold: [0, 0.5, 1], // Trigger at 50% visibility
        rootMargin: '0px 0px -20% 0px', // Require heading to be 20% into viewport from bottom
      }
    )

    observer.observe(headingElement)

    return () => {
      observer.disconnect()
    }
  }, [prefersReducedMotion])

  // Infinite loop for main animation
  useEffect(() => {
    if (isInView && !prefersReducedMotion) {
      const timeoutIds: NodeJS.Timeout[] = []
      
      const runAnimation = () => {
        // Phase 1: Pills appear and stay scattered for 2 seconds
        timeoutIds.push(setTimeout(() => setAnimationPhase('fading'), 2000))
        
        // Phase 2: Fade out from their positions (1.5 seconds)
        timeoutIds.push(setTimeout(() => setAnimationPhase('complete'), 3500))
        
        // Phase 3: Hold complete for 2 seconds, then loop back to scattered
        timeoutIds.push(setTimeout(() => {
          setAnimationPhase('scattered')
          // Restart animation after a brief pause
          setTimeout(runAnimation, 500)
        }, 5500))
      }
      
      runAnimation()
      
      return () => {
        timeoutIds.forEach(id => clearTimeout(id))
      }
    } else if (isInView && prefersReducedMotion) {
      // For reduced motion, show complete state
      setTimeout(() => setAnimationPhase('complete'), 0)
    }
  }, [isInView, prefersReducedMotion])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.15,
      },
    },
  }

  // Create variants with index support for staggered bubble effect
  const createPillVariants = (index: number) => {
    // Generate random rotation once per pill for consistent bubble effect
    const randomRotate = (index * 7.3) % 10 - 5 // Deterministic but varied rotation
    
    return {
      scattered: (pill: KnowledgePill) => ({
        left: `${pill.initialX}%`,
        top: `${pill.initialY}%`,
        scale: 1,
        opacity: 1,
        rotate: 0,
        x: "-50%",
        y: "-50%",
        transition: {
          type: "spring" as const,
          damping: 25,
          stiffness: 100,
          mass: 0.8,
          duration: prefersReducedMotion ? 0 : 1.0,
        },
      }),
      fading: (pill: KnowledgePill) => ({
        left: `${pill.initialX}%`,
        top: `${pill.initialY}%`,
        scale: 0.8, // Slight scale down like bubble popping
        opacity: 0,
        rotate: randomRotate, // Slight rotation for bubble effect
        x: "-50%",
        y: "-50%",
        transition: {
          duration: prefersReducedMotion ? 0 : 0.6,
          delay: index * 0.08 + (index * 0.03) % 0.12, // Staggered delay with variation
          ease: [0.4, 0, 0.2, 1] as const,
        },
      }),
      complete: {
        opacity: 0,
        scale: 0.8,
        transition: {
          duration: prefersReducedMotion ? 0 : 0.3,
          ease: [0.4, 0, 1, 1] as const,
        },
      },
    }
  }

  const understandingVariants = {
    hidden: { 
      scale: 0,
      opacity: 0,
    },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring" as const,
        damping: 22,
        stiffness: 120,
        mass: 0.5,
        duration: prefersReducedMotion ? 0 : 0.7,
      },
    },
  }


  return (
    <section 
      ref={ref}
      className="relative py-8 sm:py-12 md:py-16 lg:py-20 px-4 overflow-hidden"
      style={{ 
        background: "linear-gradient(135deg, #F5E6FF 0%, #E6D5FF 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Heading with letter-by-letter animation */}
        <div
          ref={headingRef}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight px-2 sm:px-4">
            <AnimatedText 
              text="Menopause isn't random." 
              shouldAnimate={shouldAnimateHeading} 
              prefersReducedMotion={prefersReducedMotion} 
            />
            <br />
            <AnimatedHighlightedText 
              text="It's just been poorly explained." 
              shouldAnimate={shouldAnimateHeading} 
              prefersReducedMotion={prefersReducedMotion}
            />
          </h2>
        </div>

        {/* Animation Container - Responsive height */}
        <div className="relative w-full mx-auto" style={{ 
          height: "clamp(400px, 50vh, 600px)",
          minHeight: "400px",
          maxWidth: "1000px" 
        }}>
          <motion.div
            className="relative w-full h-full"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >

            {/* Knowledge Pills */}
            {knowledgeItems.map((pill, index) => {
              const Icon = pill.icon
              const pillVariants = createPillVariants(index)
              
              return (
                <motion.div
                  key={pill.id}
                  custom={pill}
                  variants={pillVariants}
                  initial="scattered"
                  animate={animationPhase}
                  className="absolute"
                  style={{
                    zIndex: 2,
                  }}
                  transition={{
                    delay: index * 0.06,
                  }}
                >
                  <motion.div 
                    className="px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 rounded-full shadow-lg border-2 flex items-center gap-1.5 sm:gap-2 md:gap-3 whitespace-nowrap"
                    style={{
                      backgroundColor: "rgb(254, 202, 202)",
                      borderColor: "rgb(252, 165, 165)",
                    }}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-red-800 shrink-0" />
                    <span className="text-sm sm:text-base md:text-lg font-semibold text-red-900">
                      {pill.label}
                    </span>
                  </motion.div>
                </motion.div>
              )
            })}

            {/* Understanding Box */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ zIndex: 10 }}
              variants={understandingVariants}
              initial="hidden"
              animate={animationPhase === 'complete' ? "visible" : "hidden"}
            >
              <div 
                className="px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-5 lg:px-14 lg:py-7 bg-linear-to-br from-green-200 to-emerald-200 rounded-full shadow-2xl border-2 md:border-3 border-green-300 flex items-center gap-2 sm:gap-3 md:gap-4"
                style={{
                  boxShadow: "0 10px 30px rgba(34, 197, 94, 0.3), 0 0 60px rgba(34, 197, 94, 0.1)",
                }}
              >
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-11 lg:w-11 text-green-800 shrink-0" />
                <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-green-900">
                  Understanding
                </span>
              </div>
            </motion.div>

            {/* Subtle text that appears after completion */}
            {animationPhase === 'complete' && (
              <motion.p
                className="absolute left-1/2 top-[72%] sm:top-[75%] -translate-x-1/2 text-center text-gray-700 font-medium text-base sm:text-lg px-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                Understanding replaces confusion
              </motion.p>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
