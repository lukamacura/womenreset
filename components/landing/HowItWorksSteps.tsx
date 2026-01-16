"use client"

import { useRef, useState, useEffect, useMemo, useCallback } from "react"
import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion"
import { Hand, Check, Sparkles } from "lucide-react"

// Animation timing constants (in ms)
const TIMING = {
  CROSSFADE: 500,
  STEP_HOLD: 1500, // Time to appreciate the completed animation
  STEP_1_ANIMATION: 2000,
  STEP_2_ANIMATION: 2500,
  STEP_3_ANIMATION: 2500,
} as const

export default function HowItWorksSteps() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  const prefersReducedMotion = useReducedMotion()
  const [currentStep, setCurrentStep] = useState(1)

  // Calculate total duration for each step (animation + hold time)
  const getStepDuration = useCallback((step: number) => {
    const animationTimes = {
      1: TIMING.STEP_1_ANIMATION,
      2: TIMING.STEP_2_ANIMATION,
      3: TIMING.STEP_3_ANIMATION,
    }
    return animationTimes[step as keyof typeof animationTimes] + TIMING.STEP_HOLD
  }, [])

  // Step cycling effect
  useEffect(() => {
    if (!isInView || prefersReducedMotion) return

    const timeoutId = setTimeout(() => {
      setCurrentStep((prev) => (prev % 3) + 1)
    }, getStepDuration(currentStep) + TIMING.CROSSFADE)

    return () => clearTimeout(timeoutId)
  }, [isInView, prefersReducedMotion, currentStep, getStepDuration])

  return (
    <section
      ref={ref}
      className="relative py-16 sm:py-20 px-4 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #F5E6FF 0%, #E6D5FF 100%)",
      }}
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Heading */}
        <motion.div
          className="text-center mb-10 sm:mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            type: "spring",
            damping: 20,
            stiffness: 100,
            duration: prefersReducedMotion ? 0 : 0.6,
          }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            How It Works
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Three simple steps to clarity
          </p>
        </motion.div>

        {/* Step Indicators */}
        <StepIndicators
          currentStep={currentStep}
          prefersReducedMotion={!!prefersReducedMotion}
        />

        {/* Phone Frame Container */}
        <div className="flex justify-center my-6 sm:my-10">
          <div className="relative w-full max-w-[280px] sm:max-w-[300px]">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <SymptomTrackingPhone
                  key="step-1"
                  prefersReducedMotion={!!prefersReducedMotion}
                />
              )}
              {currentStep === 2 && (
                <PatternCalendarPhone
                  key="step-2"
                  prefersReducedMotion={!!prefersReducedMotion}
                />
              )}
              {currentStep === 3 && (
                <ChatInterfacePhone
                  key="step-3"
                  prefersReducedMotion={!!prefersReducedMotion}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Step Labels */}
        <StepLabels
          currentStep={currentStep}
          prefersReducedMotion={!!prefersReducedMotion}
        />
      </div>
    </section>
  )
}

// Step Indicators Component
function StepIndicators({
  currentStep,
  prefersReducedMotion,
}: {
  currentStep: number
  prefersReducedMotion: boolean
}) {
  return (
    <div className="flex justify-center items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
      {[1, 2, 3].map((step) => {
        const isActive = currentStep === step
        return (
          <motion.button
            key={step}
            type="button"
            aria-label={`Step ${step}`}
            aria-current={isActive ? "step" : undefined}
            className={`
              w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center
              text-sm sm:text-base font-bold transition-shadow
              ${isActive ? "shadow-lg" : "border-2 border-gray-300 bg-white/50"}
            `}
            style={
              isActive
                ? {
                    background: "linear-gradient(135deg, #FF6B9D 0%, #FFA07A 100%)",
                    color: "white",
                  }
                : {
                    color: "#9CA3AF",
                  }
            }
            animate={{
              scale: isActive ? 1.1 : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              duration: prefersReducedMotion ? 0 : 0.3,
            }}
          >
            {step}
          </motion.button>
        )
      })}
    </div>
  )
}

// Step Labels Component
function StepLabels({
  currentStep,
  prefersReducedMotion,
}: {
  currentStep: number
  prefersReducedMotion: boolean
}) {
  const labels = [
    "Log your symptom — Takes seconds",
    "Lisa finds patterns — Automatically",
    "Get clear insights — Personalized for you",
  ]

  return (
    <div className="mt-6 sm:mt-10 min-h-[56px] flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={`label-${currentStep}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.4,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="text-center text-base sm:text-lg text-gray-700 font-medium px-4"
        >
          {labels[currentStep - 1]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

// Phone Frame Component
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative rounded-[2.5rem] border-[3px] border-gray-900 w-full aspect-[9/18] shadow-2xl"
      style={{
        boxShadow:
          "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Notch */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-10" />
      
      {/* Screen */}
      <div className="w-full h-full rounded-[2.25rem] bg-white overflow-hidden">
        <div className="w-full h-full pt-8">{children}</div>
      </div>
    </div>
  )
}

// Shared transition variants
const phoneTransition = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

// Step 1: Symptom Tracking Phone
function SymptomTrackingPhone({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean
}) {
  const [animationPhase, setAnimationPhase] = useState(0)
  // Phase 0: Initial
  // Phase 1: Header visible
  // Phase 2: Button visible
  // Phase 3: Finger appears
  // Phase 4: Button tapped, finger animates
  // Phase 5: Tags appear
  // Phase 6: Checkmark appears

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimationPhase(6)
      return
    }

    // Reset on mount
    setAnimationPhase(0)

    const timers: NodeJS.Timeout[] = []
    
    // Sequence with proper cleanup
    timers.push(setTimeout(() => setAnimationPhase(1), 100))   // Header
    timers.push(setTimeout(() => setAnimationPhase(2), 400))   // Button
    timers.push(setTimeout(() => setAnimationPhase(3), 800))   // Finger appears
    timers.push(setTimeout(() => setAnimationPhase(4), 1200))  // Tap animation
    timers.push(setTimeout(() => setAnimationPhase(5), 1500))  // Tags appear
    timers.push(setTimeout(() => setAnimationPhase(6), 1800))  // Checkmark

    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion])

  const showHeader = animationPhase >= 1
  const showButton = animationPhase >= 2
  const showFinger = animationPhase >= 3 && animationPhase < 5
  const buttonTapped = animationPhase >= 4
  const showTags = animationPhase >= 5
  const showCheckmark = animationPhase >= 6

  return (
    <motion.div
      variants={phoneTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: prefersReducedMotion ? 0 : 0.5,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="w-full"
    >
      <PhoneFrame>
        <div className="h-full p-4 flex flex-col gap-3 bg-gray-50">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={showHeader ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className="h-11 bg-gradient-to-r from-[#FF6B9D] to-[#FFA07A] rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          >
            <span className="text-white text-sm font-semibold">Quick Log</span>
          </motion.div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Add Symptom Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={showButton ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
              className="relative"
            >
              <motion.div
                className={`
                  w-full bg-white rounded-xl p-4 border-2 border-dashed
                  flex items-center justify-center gap-2
                  ${buttonTapped ? "border-[#FF6B9D]" : "border-gray-300"}
                `}
                animate={buttonTapped ? { scale: 0.97 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <span className="text-sm text-gray-500 font-medium">+ Add symptom</span>
              </motion.div>

              {/* Finger Pointer */}
              <AnimatePresence>
                {showFinger && !prefersReducedMotion && (
                  <motion.div
                    className="absolute right-3 top-1/2 pointer-events-none"
                    initial={{ x: 30, y: "-50%", opacity: 0 }}
                    animate={{ 
                      x: 0, 
                      y: "-50%", 
                      opacity: 1,
                      scale: buttonTapped ? 0.85 : 1,
                    }}
                    exit={{ x: 30, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Hand className="h-7 w-7 text-[#FF6B9D] rotate-[-15deg]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Symptom Tags Card */}
            <AnimatePresence>
              {showTags && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    duration: prefersReducedMotion ? 0 : 0.4,
                  }}
                  className="bg-white rounded-xl p-4 shadow-sm relative"
                >
                  <div className="text-sm font-semibold text-gray-800 mb-3">Today</div>
                  <div className="flex flex-wrap gap-2">
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                        delay: prefersReducedMotion ? 0 : 0.1,
                      }}
                      className="px-4 py-2 bg-pink-100 rounded-full text-sm font-medium text-pink-700"
                    >
                      Hot Flash
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                        delay: prefersReducedMotion ? 0 : 0.2,
                      }}
                      className="px-4 py-2 bg-orange-100 rounded-full text-sm font-medium text-orange-700"
                    >
                      Moderate
                    </motion.span>
                  </div>

                  {/* Checkmark - inside the card */}
                  <AnimatePresence>
                    {showCheckmark && (
                      <motion.div
                        className="absolute -top-2 -right-2"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 25,
                          duration: prefersReducedMotion ? 0 : 0.3,
                        }}
                      >
                        <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                          <Check className="h-4 w-4 text-white" strokeWidth={3} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </PhoneFrame>
    </motion.div>
  )
}

// Step 2: Pattern Calendar Phone
function PatternCalendarPhone({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean
}) {
  const [animationPhase, setAnimationPhase] = useState(0)
  // Phase 0: Initial
  // Phase 1: Header visible
  // Phase 2: Calendar visible
  // Phase 3-6: Dots appear (one per phase)
  // Phase 7: Line draws
  // Phase 8: Pattern detected text + sparkles

  const patternDays = useMemo(() => [3, 10, 17, 24], []) // Weekly pattern

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimationPhase(8)
      return
    }

    setAnimationPhase(0)
    const timers: NodeJS.Timeout[] = []

    timers.push(setTimeout(() => setAnimationPhase(1), 100))   // Header
    timers.push(setTimeout(() => setAnimationPhase(2), 400))   // Calendar
    timers.push(setTimeout(() => setAnimationPhase(3), 700))   // Dot 1
    timers.push(setTimeout(() => setAnimationPhase(4), 900))   // Dot 2
    timers.push(setTimeout(() => setAnimationPhase(5), 1100))  // Dot 3
    timers.push(setTimeout(() => setAnimationPhase(6), 1300))  // Dot 4
    timers.push(setTimeout(() => setAnimationPhase(7), 1600))  // Line
    timers.push(setTimeout(() => setAnimationPhase(8), 2200))  // Pattern detected

    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion])

  const showHeader = animationPhase >= 1
  const showCalendar = animationPhase >= 2
  const visibleDotCount = Math.max(0, Math.min(animationPhase - 2, 4))
  const showLine = animationPhase >= 7
  const showPatternDetected = animationPhase >= 8

  return (
    <motion.div
      variants={phoneTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: prefersReducedMotion ? 0 : 0.5,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="w-full"
    >
      <PhoneFrame>
        <div className="h-full p-4 flex flex-col gap-3 bg-gray-50">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={showHeader ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className="h-11 bg-gradient-to-r from-[#FF6B9D] to-[#FFA07A] rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          >
            <span className="text-white text-sm font-semibold">Pattern Analysis</span>
          </motion.div>

          {/* Calendar Container */}
          <div className="flex-1 flex flex-col justify-center">
            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
                  className="bg-white rounded-xl p-3 shadow-sm"
                >
                  {/* Month header */}
                  <div className="text-center text-sm font-semibold text-gray-700 mb-2">
                    January 2026
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                      <div
                        key={i}
                        className="text-[10px] font-medium text-gray-400 text-center py-1"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid - 4 weeks */}
                  <div className="grid grid-cols-7 gap-1 relative">
                    {Array.from({ length: 28 }, (_, i) => {
                      const day = i + 1
                      const isPatternDay = patternDays.includes(day)
                      const patternIndex = patternDays.indexOf(day)
                      const isDotVisible = isPatternDay && patternIndex < visibleDotCount

                      return (
                        <div
                          key={day}
                          className={`
                            aspect-square rounded-md flex items-center justify-center
                            text-[11px] font-medium relative
                            ${isDotVisible ? "bg-[#FF6B9D] text-white" : "bg-gray-50 text-gray-600"}
                          `}
                        >
                          <motion.div
                            initial={isPatternDay ? { scale: 0 } : { scale: 1 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 20,
                            }}
                          >
                            {day}
                          </motion.div>
                          
                          {/* Pulse ring on pattern days */}
                          {isDotVisible && showLine && !prefersReducedMotion && (
                            <motion.div
                              className="absolute inset-0 rounded-md border-2 border-[#FF6B9D]"
                              initial={{ scale: 1, opacity: 0.8 }}
                              animate={{ scale: 1.4, opacity: 0 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: patternIndex * 0.2,
                              }}
                            />
                          )}
                        </div>
                      )
                    })}

                    {/* Connecting curved line */}
                    {showLine && visibleDotCount === 4 && (
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ overflow: "visible" }}
                      >
                        <defs>
                          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#FF6B9D" />
                            <stop offset="100%" stopColor="#FFA07A" />
                          </linearGradient>
                        </defs>
                        <motion.path
                          d="M 22 22 C 45 10, 70 35, 93 22 S 140 10, 163 22 S 210 35, 233 22"
                          stroke="url(#lineGrad)"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray="200"
                          initial={{ strokeDashoffset: 200 }}
                          animate={{ strokeDashoffset: 0 }}
                          transition={{
                            duration: prefersReducedMotion ? 0 : 0.6,
                            ease: "easeOut",
                          }}
                        />
                      </svg>
                    )}
                  </div>

                  {/* Pattern Detected Badge */}
                  <AnimatePresence>
                    {showPatternDetected && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                        className="mt-3 flex items-center justify-center gap-2"
                      >
                        <motion.div
                          animate={!prefersReducedMotion ? { rotate: [0, 15, -15, 0] } : {}}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        >
                          <Sparkles className="h-4 w-4 text-amber-500" />
                        </motion.div>
                        <span className="text-xs font-semibold text-[#FF6B9D]">
                          Weekly pattern detected!
                        </span>
                        <motion.div
                          animate={!prefersReducedMotion ? { rotate: [0, -15, 15, 0] } : {}}
                          transition={{ duration: 0.5, delay: 0.3 }}
                        >
                          <Sparkles className="h-4 w-4 text-amber-500" />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </PhoneFrame>
    </motion.div>
  )
}

// Step 3: Chat Interface Phone
function ChatInterfacePhone({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean
}) {
  const [animationPhase, setAnimationPhase] = useState(0)
  const [revealedText, setRevealedText] = useState("")
  // Phase 0: Initial
  // Phase 1: Header visible
  // Phase 2: Typing indicator visible
  // Phase 3: Message bubble appears, text reveals

  const fullMessage = "I noticed your hot flashes happen weekly. Try cooling down 30 mins before bed! 💙"

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimationPhase(3)
      setRevealedText(fullMessage)
      return
    }

    setAnimationPhase(0)
    setRevealedText("")
    const timers: NodeJS.Timeout[] = []

    timers.push(setTimeout(() => setAnimationPhase(1), 100))   // Header
    timers.push(setTimeout(() => setAnimationPhase(2), 500))   // Typing indicator
    timers.push(setTimeout(() => setAnimationPhase(3), 1400))  // Message

    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion, fullMessage])

  // Text reveal effect
  useEffect(() => {
    if (animationPhase < 3 || prefersReducedMotion) return
    
    const words = fullMessage.split(" ")
    let index = 0
    
    const interval = setInterval(() => {
      if (index < words.length) {
        setRevealedText(words.slice(0, index + 1).join(" "))
        index++
      } else {
        clearInterval(interval)
      }
    }, 60)

    return () => clearInterval(interval)
  }, [animationPhase, prefersReducedMotion, fullMessage])

  const showHeader = animationPhase >= 1
  const showTyping = animationPhase === 2
  const showMessage = animationPhase >= 3

  return (
    <motion.div
      variants={phoneTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: prefersReducedMotion ? 0 : 0.5,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="w-full"
    >
      <PhoneFrame>
        <div className="h-full p-4 flex flex-col bg-gray-50">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={showHeader ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className="h-11 bg-gradient-to-r from-[#FF6B9D] to-[#FFA07A] rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          >
            <span className="text-white text-sm font-semibold">Chat with Lisa</span>
          </motion.div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col justify-end py-4 min-h-0">
            <AnimatePresence mode="wait">
              {/* Typing Indicator */}
              {showTyping && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                  className="flex items-start gap-2"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B9D] to-[#FFA07A] flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-white text-xs font-bold">L</span>
                  </div>
                  
                  {/* Typing bubble */}
                  <div className="bg-[#FFE5F0] rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-[#FF6B9D] rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Message */}
              {showMessage && (
                <motion.div
                  key="message"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    duration: prefersReducedMotion ? 0 : 0.4,
                  }}
                  className="flex items-start gap-2"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B9D] to-[#FFA07A] flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-white text-xs font-bold">L</span>
                  </div>
                  
                  {/* Message bubble */}
                  <div className="flex-1 max-w-[85%]">
                    <span className="text-[10px] font-semibold text-[#FF6B9D] ml-1 mb-1 block">
                      Lisa
                    </span>
                    <div className="bg-[#FFE5F0] rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {revealedText || fullMessage}
                        {!prefersReducedMotion && revealedText && revealedText !== fullMessage && (
                          <motion.span
                            className="inline-block w-0.5 h-4 bg-[#FF6B9D] ml-0.5 align-middle"
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                          />
                        )}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </PhoneFrame>
    </motion.div>
  )
}
