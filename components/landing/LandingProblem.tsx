"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { BookOpen, Book, FileText, Brain, Lightbulb, Sparkles } from "lucide-react"

// Hook to get responsive dimensions - calculates based on container size
function useResponsiveDimensions() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ centerX: 300, centerY: 200, scale: 1 })
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const updateDimensions = () => {
      if (!containerRef.current) {
        // Fallback to window-based calculation
        const isMobile = window.innerWidth < 640
        setDimensions({
          centerX: isMobile ? 150 : 300,
          centerY: isMobile ? 125 : 200,
          scale: isMobile ? 0.5 : 1,
        })
        return
      }
      
      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const isMobile = rect.width < 640
      
      setDimensions({
        centerX,
        centerY,
        scale: isMobile ? 0.5 : 1,
      })
    }
    
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    // Use ResizeObserver for more accurate container size tracking
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    return () => {
      window.removeEventListener('resize', updateDimensions)
      resizeObserver.disconnect()
    }
  }, [])
  
  return { ...dimensions, containerRef }
}

// Animation 1: Pattern Network - Neural network showing symptom connections
function PatternAnimation({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  const { centerX, centerY, containerRef } = useResponsiveDimensions()
  const nodes = [
    { id: "center", label: "You", x: centerX, y: centerY, isCenter: true },
    { id: "hot", label: "Hot Flashes", x: centerX + 120, y: centerY - 80 },
    { id: "mood", label: "Mood", x: centerX - 100, y: centerY - 60 },
    { id: "sleep", label: "Sleep", x: centerX - 80, y: centerY + 100 },
    { id: "energy", label: "Energy", x: centerX + 100, y: centerY + 90 },
  ]

  if (prefersReducedMotion) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="relative">
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`absolute rounded-full flex items-center justify-center text-xs font-medium ${
                node.isCenter
                  ? "w-16 h-16 bg-linear-to-br from-[#FF6B9D] to-[#FFA07A] text-white shadow-lg"
                  : "w-12 h-12 bg-pink-100 text-gray-700 shadow-md"
              }`}
              style={{
                left: `${node.x - (node.isCenter ? 32 : 24)}px`,
                top: `${node.y - (node.isCenter ? 32 : 24)}px`,
              }}
            >
              {node.label}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" style={{ filter: "drop-shadow(0 0 3px rgba(255, 107, 157, 0.4))" }}>
        {/* Connection lines */}
        {nodes
          .filter((node) => !node.isCenter)
          .map((node, index) => {
            const path = `M ${centerX} ${centerY} L ${node.x} ${node.y}`
            return (
              <motion.path
                key={`line-${node.id}`}
                d={path}
                stroke="url(#pinkGradientPattern)"
                strokeWidth="2.5"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: [0, 1, 1],
                  opacity: [0, 0.7, 0.7],
                }}
                transition={{
                  duration: 5.25,
                  times: [0, 0.3, 1],
                  delay: 0.3 + index * 0.1,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            )
          })}
        <defs>
          <linearGradient id="pinkGradientPattern" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B9D" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFA07A" stopOpacity="0.9" />
          </linearGradient>
          <filter id="glowPattern">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Energy pulses */}
      {nodes
        .filter((node) => !node.isCenter)
        .map((node, index) => {
          const dx = node.x - centerX
          const dy = node.y - centerY

          return (
            <motion.div
              key={`pulse-${node.id}`}
              className="absolute w-4 h-4 rounded-full bg-linear-to-br from-[#FF6B9D] to-[#FFA07A] shadow-lg"
              style={{
                left: centerX - 8,
                top: centerY - 8,
                filter: "drop-shadow(0 0 6px rgba(255, 107, 157, 0.8))",
              }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
              animate={{
                x: [0, dx, dx],
                y: [0, dy, dy],
                opacity: [0, 1, 0],
                scale: [0.3, 1.2, 0.3],
              }}
              transition={{
                duration: 3.5,
                times: [0, 0.4, 1],
                delay: 0.9 + index * 0.2,
                repeat: Infinity,
                repeatDelay: 0.3,
                ease: "easeOut",
              }}
            />
          )
        })}

      {/* Nodes */}
      {nodes.map((node, index) => (
        <motion.div
          key={node.id}
          className={`absolute rounded-full flex items-center justify-center text-xs font-medium ${
            node.isCenter
              ? "w-16 h-16 bg-linear-to-br from-[#FF6B9D] to-[#FFA07A] text-white shadow-lg"
              : "w-12 h-12 bg-pink-100/90 text-gray-700 shadow-md backdrop-blur-sm border border-pink-200/50"
          }`}
          style={{
            left: `${node.x - (node.isCenter ? 32 : 24)}px`,
            top: `${node.y - (node.isCenter ? 32 : 24)}px`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 1],
            scale: [0, 1, 1],
          }}
          transition={{
            duration: 3.5,
            times: [0, 0.15, 1],
            delay: index * 0.1,
            repeat: Infinity,
            repeatDelay: 0.5,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <motion.span
            animate={node.isCenter ? {} : { scale: [1, 1.15, 1] }}
            transition={{
              duration: 0.4,
              delay: 1.4 + index * 0.2,
              repeat: Infinity,
              repeatDelay: 0.6,
              ease: "easeInOut",
            }}
            className="text-center px-1"
          >
            {node.label}
          </motion.span>
        </motion.div>
      ))}
    </div>
  )
}

// Animation 2: Information Flow - Books organizing themselves
function InformationAnimation({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  const icons = [BookOpen, Book, FileText, Brain, Lightbulb]
  const { centerX, centerY, containerRef } = useResponsiveDimensions()
  
  // Start positions from edges - calculated relative to center
  const [startPositions] = useState(() => {
    return icons.map((_, i) => {
      // Distribute icons from different edges in a circle pattern
      const angle = (i / icons.length) * Math.PI * 2
      const radius = 180 // Distance from center
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const rotation = (Math.random() - 0.5) * 30
      
      return { x, y, rotation }
    })
  })
  
  const cardWidth = 80
  const cardHeight = 100
  const stackOffset = 8

  if (prefersReducedMotion) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="flex gap-2">
          {icons.map((Icon, index) => (
            <div
              key={index}
              className="w-16 h-20 rounded-lg bg-linear-to-br from-[#FF6B9D]/20 to-[#FFA07A]/20 border-2 border-[#FF6B9D]/30 flex items-center justify-center text-[#FF6B9D] shadow-lg"
            >
              <Icon size={32} strokeWidth={2} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {icons.map((Icon, index) => {
        // Target position: centered stack with slight offset
        const targetX = centerX - cardWidth / 2 + index * stackOffset
        const targetY = centerY - cardHeight / 2 - index * stackOffset
        const startX = centerX + startPositions[index].x - cardWidth / 2
        const startY = centerY + startPositions[index].y - cardHeight / 2

        return (
          <motion.div
            key={index}
            className="absolute"
            style={{
              left: startX,
              top: startY,
            }}
            initial={{
              x: 0,
              y: 0,
              rotate: startPositions[index].rotation,
              scale: 0.5,
              opacity: 0,
            }}
            animate={{
              x: [0, targetX - startX, targetX - startX, 0],
              y: [0, targetY - startY, targetY - startY, 0],
              rotate: [startPositions[index].rotation, 0, 0, startPositions[index].rotation],
              scale: [0.5, 1, 1, 0.5],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 3.5,
              times: [0, 0.4, 0.7, 1],
              delay: index * 0.15,
              repeat: Infinity,
              repeatDelay: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {/* Card container */}
            <motion.div
              className="w-16 h-20 rounded-lg bg-linear-to-br from-white to-pink-50/50 border-2 border-[#FF6B9D]/40 flex items-center justify-center shadow-xl backdrop-blur-sm"
              style={{
                boxShadow: "0 8px 24px rgba(255, 107, 157, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
              }}
              animate={{
                boxShadow: [
                  "0 8px 24px rgba(255, 107, 157, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
                  "0 12px 32px rgba(255, 107, 157, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.9)",
                  "0 8px 24px rgba(255, 107, 157, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
                ],
              }}
              transition={{
                duration: 0.6,
                delay: 1.4 + index * 0.1,
                repeat: Infinity,
                repeatDelay: 2.4,
                ease: "easeInOut",
              }}
            >
              <motion.div
                className="text-[#FF6B9D]"
                style={{
                  filter: "drop-shadow(0 2px 4px rgba(255, 107, 157, 0.4))",
                }}
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 0.5,
                  delay: 1.5 + index * 0.1,
                  repeat: Infinity,
                  repeatDelay: 2.3,
                  ease: "easeInOut",
                }}
              >
                <Icon size={36} strokeWidth={2.5} fill="rgba(255, 107, 157, 0.15)" />
              </motion.div>
            </motion.div>
          </motion.div>
        )
      })}
      
      {/* Central glow effect when organized */}
      <motion.div
        className="absolute rounded-2xl bg-linear-to-br from-[#FF6B9D]/30 to-[#FFA07A]/30 blur-3xl"
        style={{
          left: centerX - 60,
          top: centerY - 60,
          width: 120,
          height: 140,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 1.2,
          delay: 1.4,
          repeat: Infinity,
          repeatDelay: 2.3,
          ease: "easeInOut",
        }}
      />
      
      {/* Connecting lines animation */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <defs>
          <linearGradient id="pinkGradientInfo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B9D" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFA07A" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {icons.map((_, index) => {
          const startX = centerX + startPositions[index].x
          const startY = centerY + startPositions[index].y
          const targetX = centerX + index * stackOffset
          const targetY = centerY - index * stackOffset
          const path = `M ${startX} ${startY} L ${targetX} ${targetY}`
          
          return (
            <motion.path
              key={`line-${index}`}
              d={path}
              stroke="url(#pinkGradientInfo)"
              strokeWidth="2"
              strokeDasharray="4 4"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 1, 0],
                opacity: [0, 0.5, 0.5, 0],
              }}
              transition={{
                duration: 3.5,
                times: [0, 0.4, 0.7, 1],
                delay: index * 0.15,
                repeat: Infinity,
                repeatDelay: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          )
        })}
      </svg>
    </div>
  )
}

// Animation 3: Clarity Bloom - Confusion transforming to clarity
function ClarityAnimation({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  const petalCount = 12
  const { centerX, centerY, scale, containerRef } = useResponsiveDimensions()
  const radius = 90 * scale

  const petals = Array.from({ length: petalCount }, (_, i) => {
    const angle = (i * 360) / petalCount
    const radian = (angle * Math.PI) / 180
    return {
      angle,
      radian,
      x: centerX + Math.cos(radian) * radius,
      y: centerY + Math.sin(radian) * radius,
    }
  })

  if (prefersReducedMotion) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-linear-to-br from-[#FF6B9D] to-[#FFA07A] flex items-center justify-center shadow-lg">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Center confusion circle */}
      <motion.div
        className="absolute w-24 h-24 rounded-full bg-gray-400/80 backdrop-blur-sm flex items-center justify-center border-2 border-gray-500/50"
        style={{
          left: centerX - 48,
          top: centerY - 48,
        }}
        initial={{ opacity: 0.8, scale: 1 }}
        animate={{
          opacity: [0.8, 0.4, 0],
          scale: [1, 0.7, 0],
        }}
        transition={{
          duration: 3.5,
          times: [0, 0.15, 0.3],
          repeat: Infinity,
          repeatDelay: 0.5,
          ease: "easeIn",
        }}
      >
        <motion.span
          className="text-gray-700 text-2xl font-bold"
          animate={{ rotate: [0, 360] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          ?
        </motion.span>
      </motion.div>

      {/* Petals bursting out */}
      {petals.map((petal, index) => (
        <motion.div
          key={index}
          className="absolute w-14 h-14 rounded-full bg-linear-to-br from-[#FF6B9D] to-[#FFA07A] shadow-xl"
          style={{
            left: centerX - 28,
            top: centerY - 28,
            filter: "drop-shadow(0 0 8px rgba(255, 107, 157, 0.6))",
          }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
          animate={{
            x: [0, petal.x - centerX, petal.x - centerX, 0],
            y: [0, petal.y - centerY, petal.y - centerY, 0],
            scale: [0, 1.1, 1, 0],
            opacity: [0, 1, 0.9, 0],
            rotate: [0, petal.angle + 45, petal.angle + 45, 0],
          }}
          transition={{
            duration: 3.5,
            times: [0, 0.4, 0.65, 1],
            delay: 0.3 + index * 0.04,
            repeat: Infinity,
            repeatDelay: 0.5,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}

      {/* Center clarity icon */}
      <motion.div
        className="absolute w-24 h-24 rounded-full bg-linear-to-br from-[#FF6B9D] to-[#FFA07A] flex items-center justify-center shadow-2xl"
        style={{
          left: centerX - 48,
          top: centerY - 48,
          filter: "drop-shadow(0 0 20px rgba(255, 107, 157, 0.8))",
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0, 1.1, 1, 0],
        }}
        transition={{
          duration: 3.5,
          times: [0, 0.5, 0.7, 1],
          delay: 0.5,
          repeat: Infinity,
          repeatDelay: 0.5,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 0.8,
            delay: 0.7,
            repeat: Infinity,
            repeatDelay: 1.2,
            ease: "easeInOut",
          }}
        >
          <Sparkles className="w-12 h-12 text-white" strokeWidth={1.5} />
        </motion.div>
      </motion.div>
      
      {/* Outer glow ring */}
      <motion.div
        className="absolute rounded-full border-2 border-[#FF6B9D]/40"
        style={{
          left: centerX - radius - 20,
          top: centerY - radius - 20,
          width: (radius + 20) * 2,
          height: (radius + 20) * 2,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 1.2,
          delay: 0.8,
          repeat: Infinity,
          repeatDelay: 1.2,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}

// Step text content component
function StepText({ step }: { step: number }) {
  const content = [
    {
      headline: "Your symptoms follow patterns",
      description: "Hot weather triggers headaches. Stress amplifies mood swings.",
    },
    {
      headline: "You deserve clear answers",
      description: "Evidence-based guidance, explained simply, when you need it.",
    },
    {
      headline: "Clarity brings relief",
      description: "Join thousands of women who found understanding and relief.",
    },
  ]

  const current = content[step - 1]

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="text-center"
    >
      <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4">
        {current.headline}
      </h3>
      <p className="text-lg sm:text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto">
        {current.description}
      </p>
    </motion.div>
  )
}

// Main component
export default function LandingProblem() {
  const [currentStep, setCurrentStep] = useState(1)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) return

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev % 3) + 1)
    }, 5500) // Change every 5.5 seconds (matches animation duration)

    return () => clearInterval(interval)
  }, [prefersReducedMotion])

  return (
    <section
      className="py-20 px-4"
      style={{
        background: "linear-gradient(135deg, #F5E6FF 0%, #FFE6F5 100%)",
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-gray-900 leading-tight">
            The problem isn&apos;t you.<br />
            <mark className="bg-pink-300/40 rounded px-2 py-1">It&apos;s the confusion.</mark>
          </h2>
        </motion.div>

        {/* Animation Container */}
        <div className="relative h-[300px] sm:h-[400px] mb-12 rounded-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
                aria-label="Animation showing symptom patterns and connections"
              >
                <PatternAnimation prefersReducedMotion={prefersReducedMotion} />
              </motion.div>
            )}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
                aria-label="Animation showing knowledge and information organizing"
              >
                <InformationAnimation prefersReducedMotion={prefersReducedMotion} />
              </motion.div>
            )}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
                aria-label="Animation showing transformation from confusion to clarity"
              >
                <ClarityAnimation prefersReducedMotion={prefersReducedMotion} />
              </motion.div>
            )}
          </AnimatePresence>
              </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((step) => (
            <button
              key={step}
              onClick={() => setCurrentStep(step)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                step === currentStep
                  ? "w-8 bg-linear-to-r from-[#FF6B9D] to-[#FFA07A]"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to step ${step}`}
            />
          ))}
        </div>

        {/* Text Content */}
        <div className="min-h-[120px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <StepText key={currentStep} step={currentStep} />
          </AnimatePresence>
        </div>

        {/* Trust Badge */}
        <motion.div
          className="border-t border-gray-300/50 pt-12 mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="text-center">
            <p className="text-lg sm:text-xl text-gray-700">
              <strong>Evidence-based knowledge.</strong> Reviewed by specialists. Focused on menopause.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
