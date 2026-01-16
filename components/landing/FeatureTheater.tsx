"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion"
import { MessageCircle, TrendingUp, Sparkles, FileText, Send } from "lucide-react"

// Animation timing constants (in ms)
const TIMING = {
  CROSSFADE: 500,
  FEATURE_HOLD: 2000, // Time to appreciate the completed animation
  ANIMATION_DURATION: 2000,
} as const

const features = [
  {
    id: "ask-anything",
    title: "Ask Anything",
    description: "Get answers to your menopause questions",
    icon: MessageCircle,
  },
  {
    id: "pattern-detection",
    title: "Pattern Detection",
    description: "Lisa finds trends in your symptoms",
    icon: TrendingUp,
  },
  {
    id: "personalized-insights",
    title: "Personalized Insights",
    description: "Advice tailored to your unique patterns",
    icon: Sparkles,
  },
  {
    id: "shareable-reports",
    title: "Shareable Reports",
    description: "Share your health summary with your doctor",
    icon: FileText,
  },
]

export default function FeatureTheater() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  const prefersReducedMotion = useReducedMotion()
  const [currentFeature, setCurrentFeature] = useState(0)

  // Calculate total duration for each feature
  const getFeatureDuration = useCallback(() => {
    return TIMING.ANIMATION_DURATION + TIMING.FEATURE_HOLD
  }, [])

  // Feature cycling effect
  useEffect(() => {
    if (!isInView || prefersReducedMotion) return

    const timeoutId = setTimeout(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length)
    }, getFeatureDuration() + TIMING.CROSSFADE)

    return () => clearTimeout(timeoutId)
  }, [isInView, prefersReducedMotion, currentFeature, getFeatureDuration])

  return (
    <section
      ref={ref}
      className="relative py-16 sm:py-20 px-4 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #FFF9E6 0%, #F5E6FF 100%)",
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
            Everything You Need
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful features that work together
          </p>
        </motion.div>

        {/* Feature Indicators */}
        <FeatureIndicators
          currentFeature={currentFeature}
          prefersReducedMotion={!!prefersReducedMotion}
          onSelect={setCurrentFeature}
        />

        {/* Phone Frame Container */}
        <div className="flex justify-center my-6 sm:my-10">
          <div className="relative w-full max-w-[280px] sm:max-w-[300px]">
            <AnimatePresence mode="wait">
              {currentFeature === 0 && (
                <AskAnythingPhone
                  key="feature-0"
                  prefersReducedMotion={!!prefersReducedMotion}
                />
              )}
              {currentFeature === 1 && (
                <PatternDetectionPhone
                  key="feature-1"
                  prefersReducedMotion={!!prefersReducedMotion}
                />
              )}
              {currentFeature === 2 && (
                <PersonalizedInsightsPhone
                  key="feature-2"
                  prefersReducedMotion={!!prefersReducedMotion}
                />
              )}
              {currentFeature === 3 && (
                <ShareableReportsPhone
                  key="feature-3"
                  prefersReducedMotion={!!prefersReducedMotion}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Feature Labels */}
        <FeatureLabels
          currentFeature={currentFeature}
          prefersReducedMotion={!!prefersReducedMotion}
        />
      </div>
    </section>
  )
}

// Feature Indicators Component
function FeatureIndicators({
  currentFeature,
  prefersReducedMotion,
  onSelect,
}: {
  currentFeature: number
  prefersReducedMotion: boolean
  onSelect: (index: number) => void
}) {
  return (
    <div className="flex justify-center items-center gap-2 sm:gap-3 mb-6 sm:mb-8 flex-wrap">
      {features.map((feature, index) => {
        const isActive = currentFeature === index
        const Icon = feature.icon
        return (
          <motion.button
            key={feature.id}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={feature.title}
            aria-current={isActive ? "true" : undefined}
            className={`
              h-10 sm:h-11 px-3 sm:px-4 rounded-full flex items-center justify-center gap-2
              text-xs sm:text-sm font-medium transition-shadow
              ${isActive ? "shadow-lg" : "border-2 border-gray-300 bg-white/50"}
            `}
            style={
              isActive
                ? {
                    background: "linear-gradient(135deg, #FF6B9D 0%, #FFA07A 100%)",
                    color: "white",
                  }
                : {
                    color: "#6B7280",
                  }
            }
            animate={{
              scale: isActive ? 1.05 : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              duration: prefersReducedMotion ? 0 : 0.3,
            }}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{feature.title}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

// Feature Labels Component
function FeatureLabels({
  currentFeature,
  prefersReducedMotion,
}: {
  currentFeature: number
  prefersReducedMotion: boolean
}) {
  return (
    <div className="mt-6 sm:mt-10 min-h-[56px] flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={`label-${currentFeature}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.4,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="text-center px-4"
        >
          <p className="text-base sm:text-lg text-gray-700 font-medium">
            {features[currentFeature].title}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {features[currentFeature].description}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Phone Frame Component (same as HowItWorksSteps)
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative rounded-[2.5rem] border-[3px] border-gray-900 w-full aspect-9/18 shadow-2xl"
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

// Feature 1: Ask Anything Phone
function AskAnythingPhone({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean
}) {
  const [animationPhase, setAnimationPhase] = useState(0)
  const [revealedText, setRevealedText] = useState("")
  
  const question = "Why do I get hot flashes at night?"
  const answer = "Night sweats often occur because your body temperature drops during sleep, triggering a hot flash response. Try keeping your room cool!"

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimationPhase(4)
      setRevealedText(answer)
      return
    }

    setAnimationPhase(0)
    setRevealedText("")
    const timers: NodeJS.Timeout[] = []

    timers.push(setTimeout(() => setAnimationPhase(1), 100))   // Header
    timers.push(setTimeout(() => setAnimationPhase(2), 400))   // Question
    timers.push(setTimeout(() => setAnimationPhase(3), 1000))  // Typing
    timers.push(setTimeout(() => setAnimationPhase(4), 1600))  // Answer

    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion, answer])

  // Text reveal effect
  useEffect(() => {
    if (animationPhase < 4 || prefersReducedMotion) return
    
    const words = answer.split(" ")
    let index = 0
    
    const interval = setInterval(() => {
      if (index < words.length) {
        setRevealedText(words.slice(0, index + 1).join(" "))
        index++
      } else {
        clearInterval(interval)
      }
    }, 40)

    return () => clearInterval(interval)
  }, [animationPhase, prefersReducedMotion, answer])

  const showHeader = animationPhase >= 1
  const showQuestion = animationPhase >= 2
  const showTyping = animationPhase === 3
  const showAnswer = animationPhase >= 4

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
            className="h-11 bg-linear-to-r from-[#FF6B9D] to-[#FFA07A] rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          >
            <span className="text-white text-sm font-semibold">Ask Lisa</span>
          </motion.div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col gap-3 py-4 min-h-0 overflow-hidden">
            {/* User Question */}
            <AnimatePresence>
              {showQuestion && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                  className="self-end max-w-[85%]"
                >
                  <div className="bg-[#FF6B9D] text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
                    <p className="text-sm leading-relaxed">{question}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Typing Indicator */}
            <AnimatePresence>
              {showTyping && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2"
                >
                  <div className="w-7 h-7 rounded-full bg-linear-to-br from-[#FF6B9D] to-[#FFA07A] flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-white text-[10px] font-bold">L</span>
                  </div>
                  <div className="bg-[#FFE5F0] rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 bg-[#FF6B9D] rounded-full"
                          animate={{ y: [0, -3, 0] }}
                          transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            delay: i * 0.12,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lisa Answer */}
            <AnimatePresence>
              {showAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                  className="flex items-start gap-2"
                >
                  <div className="w-7 h-7 rounded-full bg-linear-to-br from-[#FF6B9D] to-[#FFA07A] flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-white text-[10px] font-bold">L</span>
                  </div>
                  <div className="flex-1 max-w-[85%]">
                    <div className="bg-[#FFE5F0] rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {revealedText || answer}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={showHeader ? { opacity: 1 } : { opacity: 0 }}
            className="h-10 bg-white rounded-full border border-gray-200 flex items-center px-4 gap-2 shrink-0"
          >
            <span className="text-xs text-gray-400 flex-1">Ask anything...</span>
            <Send className="h-4 w-4 text-[#FF6B9D]" />
          </motion.div>
        </div>
      </PhoneFrame>
    </motion.div>
  )
}

// Feature 2: Pattern Detection Phone
function PatternDetectionPhone({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean
}) {
  const [animationPhase, setAnimationPhase] = useState(0)

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    
    if (prefersReducedMotion) {
      timers.push(setTimeout(() => setAnimationPhase(3), 0))
      return () => timers.forEach(clearTimeout)
    }

    timers.push(setTimeout(() => setAnimationPhase(0), 0))
    timers.push(setTimeout(() => setAnimationPhase(1), 100))   // Header
    timers.push(setTimeout(() => setAnimationPhase(2), 500))   // Chart
    timers.push(setTimeout(() => setAnimationPhase(3), 1500))  // Insight

    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion])

  const showHeader = animationPhase >= 1
  const showChart = animationPhase >= 2
  const showInsight = animationPhase >= 3

  // Chart data points
  const dataPoints = [
    { x: 10, y: 70 },
    { x: 30, y: 55 },
    { x: 50, y: 65 },
    { x: 70, y: 40 },
    { x: 90, y: 50 },
    { x: 110, y: 35 },
    { x: 130, y: 45 },
    { x: 150, y: 25 },
  ]

  const pathD = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

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
            className="h-11 bg-linear-to-r from-[#FF6B9D] to-[#FFA07A] rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          >
            <span className="text-white text-sm font-semibold">Your Patterns</span>
          </motion.div>

          {/* Chart Card */}
          <AnimatePresence>
            {showChart && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
                className="bg-white rounded-xl p-4 shadow-sm flex-1"
              >
                <div className="text-sm font-semibold text-gray-800 mb-2">
                  Hot Flashes This Month
                </div>
                <div className="text-xs text-gray-500 mb-4">Trending downward 📉</div>
                
                {/* Chart */}
                <div className="h-28 relative">
                  <svg className="w-full h-full" viewBox="0 0 160 80" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[0, 20, 40, 60].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="160"
                        y2={y}
                        stroke="#E5E7EB"
                        strokeWidth="1"
                      />
                    ))}
                    
                    {/* Area fill */}
                    <motion.path
                      d={`${pathD} L 150 80 L 10 80 Z`}
                      fill="url(#areaGradient)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.3 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    />
                    
                    {/* Line */}
                    <motion.path
                      d={pathD}
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 1, ease: "easeOut" }}
                    />
                    
                    {/* Dots */}
                    {dataPoints.map((point, i) => (
                      <motion.circle
                        key={i}
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill="#FF6B9D"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0.1 * i + 0.3 }}
                      />
                    ))}
                    
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FF6B9D" />
                        <stop offset="100%" stopColor="#FFA07A" />
                      </linearGradient>
                      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FF6B9D" />
                        <stop offset="100%" stopColor="white" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Insight Badge */}
                <AnimatePresence>
                  {showInsight && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                      className="mt-4 flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2"
                    >
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700">
                        23% fewer symptoms than last month!
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PhoneFrame>
    </motion.div>
  )
}

// Feature 3: Personalized Insights Phone
function PersonalizedInsightsPhone({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean
}) {
  const [animationPhase, setAnimationPhase] = useState(0)

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    
    if (prefersReducedMotion) {
      timers.push(setTimeout(() => setAnimationPhase(4), 0))
      return () => timers.forEach(clearTimeout)
    }

    timers.push(setTimeout(() => setAnimationPhase(0), 0))
    timers.push(setTimeout(() => setAnimationPhase(1), 100))   // Header
    timers.push(setTimeout(() => setAnimationPhase(2), 400))   // Card 1
    timers.push(setTimeout(() => setAnimationPhase(3), 700))   // Card 2
    timers.push(setTimeout(() => setAnimationPhase(4), 1000))  // Card 3

    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion])

  const showHeader = animationPhase >= 1
  
  const insights = [
    {
      emoji: "🌙",
      title: "Evening Routine",
      text: "Your symptoms peak at 9 PM. Try a cooling routine 30 mins before.",
      delay: 0.1,
    },
    {
      emoji: "☕",
      title: "Caffeine Trigger",
      text: "Hot flashes increase 2x after afternoon coffee.",
      delay: 0.2,
    },
    {
      emoji: "🧘",
      title: "Stress Connection",
      text: "Symptoms are 40% lower on days you exercise.",
      delay: 0.3,
    },
  ]

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
            className="h-11 bg-linear-to-r from-[#FF6B9D] to-[#FFA07A] rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          >
            <span className="text-white text-sm font-semibold">Your Insights</span>
          </motion.div>

          {/* Insights Cards */}
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            {insights.map((insight, index) => (
              <AnimatePresence key={index}>
                {animationPhase >= index + 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.4,
                      delay: prefersReducedMotion ? 0 : insight.delay,
                    }}
                    className="bg-white rounded-xl p-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{insight.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800">
                          {insight.title}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                          {insight.text}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ))}
          </div>
        </div>
      </PhoneFrame>
    </motion.div>
  )
}

// Feature 4: Shareable Reports Phone
function ShareableReportsPhone({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean
}) {
  const [animationPhase, setAnimationPhase] = useState(0)

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    
    if (prefersReducedMotion) {
      timers.push(setTimeout(() => setAnimationPhase(3), 0))
      return () => timers.forEach(clearTimeout)
    }

    timers.push(setTimeout(() => setAnimationPhase(0), 0))
    timers.push(setTimeout(() => setAnimationPhase(1), 100))   // Header
    timers.push(setTimeout(() => setAnimationPhase(2), 400))   // Report card
    timers.push(setTimeout(() => setAnimationPhase(3), 1200))  // Share button

    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion])

  const showHeader = animationPhase >= 1
  const showReport = animationPhase >= 2
  const showShare = animationPhase >= 3

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
            className="h-11 bg-linear-to-r from-[#FF6B9D] to-[#FFA07A] rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          >
            <span className="text-white text-sm font-semibold">Health Reports</span>
          </motion.div>

          {/* Report Card */}
          <AnimatePresence>
            {showReport && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
                className="bg-white rounded-xl p-4 shadow-sm flex-1"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      Monthly Summary
                    </div>
                    <div className="text-xs text-gray-500">January 2026</div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600">Symptoms tracked</span>
                    <span className="font-semibold text-gray-800">47</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600">Patterns found</span>
                    <span className="font-semibold text-gray-800">5</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600">Insights generated</span>
                    <span className="font-semibold text-gray-800">12</span>
                  </motion.div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <div className="text-xs text-gray-500 mb-2">Ready to share with:</div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-blue-50 rounded-full text-xs font-medium text-blue-700">
                      Dr. Smith
                    </span>
                    <span className="px-3 py-1 bg-purple-50 rounded-full text-xs font-medium text-purple-700">
                      Gynecologist
                    </span>
                  </div>
                </div>

                {/* Share Button */}
                <AnimatePresence>
                  {showShare && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                      className="mt-4 w-full h-10 bg-linear-to-r from-[#FF6B9D] to-[#FFA07A] rounded-lg flex items-center justify-center gap-2 shadow-sm"
                    >
                      <FileText className="h-4 w-4 text-white" />
                      <span className="text-white text-sm font-semibold">
                        Share Report
                      </span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PhoneFrame>
    </motion.div>
  )
}
