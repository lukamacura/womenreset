"use client"

import { useRef, useState, useEffect, useCallback, useMemo } from "react"
import { motion, useInView, useReducedMotion, AnimatePresence } from "framer-motion"
import { 
  MessageCircle, 
  TrendingUp, 
  Sparkles, 
  FileText, 
  Send,
  Calendar,
  Flame,
  Moon,
  Heart,
  TrendingDown,
  Check,
  Share2,
  Clock,
  BarChart3
} from "lucide-react"

// Smooth spring configs
const smoothSpring = {
  type: "spring" as const,
  damping: 30,
  stiffness: 200,
}

const ultraSmoothSpring = {
  type: "spring" as const,
  damping: 35,
  stiffness: 150,
}

// Animation timing constants (KEEPING SAME)
const TIMING = {
  CROSSFADE: 500,
  FEATURE_HOLD: 2000,
  ANIMATION_DURATION: 2000,
} as const

const features = [
  {
    id: "ask-anything",
    title: "Ask Lisa Anything",
    description: "Get clear answers to your menopause questions — backed by medical research",
    icon: MessageCircle,
  },
  {
    id: "symptom-timeline",
    title: "Your Symptom Timeline",
    description: "See all your logged symptoms organized by day, week, or month",
    icon: Calendar,
  },
  {
    id: "weekly-summaries",
    title: "Weekly Summaries",
    description: "See your symptom frequency compared to last week — your data at a glance",
    icon: BarChart3,
  },
  {
    id: "shareable-reports",
    title: "Share with Your Doctor",
    description: "Generate professional PDF symptom reports for your appointments",
    icon: FileText,
  },
]

export default function FeatureTheater() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  const prefersReducedMotion = useReducedMotion()
  const [currentFeature, setCurrentFeature] = useState(0)

  const getFeatureDuration = useCallback(() => {
    return TIMING.ANIMATION_DURATION + TIMING.FEATURE_HOLD
  }, [])

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
          transition={ultraSmoothSpring}
        >
          <HeadingWithHighlight
            isInView={isInView}
            prefersReducedMotion={!!prefersReducedMotion}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-gray-900">
              Everything You Need
            </h2>
          </HeadingWithHighlight>
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
                <SymptomTimelinePhone
                  key="feature-1"
                  prefersReducedMotion={!!prefersReducedMotion}
                />
              )}
              {currentFeature === 2 && (
                <WeeklySummaryPhone
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

// ============================================
// Heading with Highlight Animation
// ============================================
function HeadingWithHighlight({
  children,
  isInView,
  prefersReducedMotion,
}: {
  children: React.ReactNode
  isInView: boolean
  prefersReducedMotion: boolean
}) {
  const [shouldHighlight, setShouldHighlight] = useState(false)

  useEffect(() => {
    if (!isInView || prefersReducedMotion) return
    const timer = setTimeout(() => setShouldHighlight(true), 300)
    return () => clearTimeout(timer)
  }, [isInView, prefersReducedMotion])

  return (
    <div className="relative inline-block">
      <div className="relative z-10">{children}</div>
      <motion.span
        className="absolute inset-0 bg-yellow-400/40 rounded pointer-events-none"
        initial={{ scaleX: 0, transformOrigin: "left" }}
        animate={shouldHighlight ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
        style={{ zIndex: 0 }}
      />
    </div>
  )
}

// ============================================
// Feature Indicators
// ============================================
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
            className={`
              h-10 sm:h-11 px-3 sm:px-4 rounded-full flex items-center justify-center gap-2
              text-xs sm:text-sm font-medium transition-shadow
              ${isActive ? "shadow-lg" : "border-2 border-gray-200 bg-white/80"}
            `}
            style={
              isActive
                ? { background: "linear-gradient(135deg, #FF6B9D 0%, #FFA07A 100%)", color: "white" }
                : { color: "#6B7280" }
            }
            animate={{ scale: isActive ? 1.05 : 1 }}
            transition={{ ...smoothSpring, duration: prefersReducedMotion ? 0 : 0.3 }}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{feature.title}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

// ============================================
// Feature Labels
// ============================================
function FeatureLabels({
  currentFeature,
  prefersReducedMotion,
}: {
  currentFeature: number
  prefersReducedMotion: boolean
}) {
  return (
    <div className="mt-6 sm:mt-10 min-h-[70px] flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={`label-${currentFeature}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ ...smoothSpring, duration: prefersReducedMotion ? 0 : 0.4 }}
          className="text-center px-4"
        >
          <p className="text-base sm:text-lg text-gray-800 font-semibold">
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

// ============================================
// Phone Frame (UNCHANGED)
// ============================================
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative rounded-[2.5rem] border-[3px] border-gray-900 w-full aspect-9/18 shadow-2xl"
      style={{
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-10" />
      <div className="w-full h-full rounded-[2.25rem] bg-white overflow-hidden">
        <div className="w-full h-full pt-8">{children}</div>
      </div>
    </div>
  )
}

const phoneTransition = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
}

// ============================================
// Feature 1: Ask Lisa Anything (ENHANCED with longer response & emojis)
// ============================================
function AskAnythingPhone({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean
}) {
  const [phase, setPhase] = useState(0)
  const [revealedLines, setRevealedLines] = useState(0)
  
  const question = "Why do I get hot flashes at night?"
  
  // Lisa's comprehensive response with emojis
  const lisaResponse = useMemo(() => [
    { type: "intro", content: "Great question! 🌙 Here's what research shows:" },
    { type: "explanation", content: "Night sweats happen because your body's thermostat gets disrupted by hormone changes." },
    { type: "tip", emoji: "❄️", title: "Keep it cool", desc: "Room temp around 65°F (18°C)" },
    { type: "tip", emoji: "👚", title: "Breathable fabrics", desc: "Cotton or moisture-wicking PJs" },
    { type: "tip", emoji: "💧", title: "Stay hydrated", desc: "Water by your bed helps!" },
    { type: "outro", content: "Want more tips? Just ask! 💕" },
  ], [])

  useEffect(() => {
    if (prefersReducedMotion) {
      setPhase(4)
      setRevealedLines(lisaResponse.length)
      return
    }
    setPhase(0)
    setRevealedLines(0)
    const timers: NodeJS.Timeout[] = []
    timers.push(setTimeout(() => setPhase(1), 100))   // Header
    timers.push(setTimeout(() => setPhase(2), 400))   // Question
    timers.push(setTimeout(() => setPhase(3), 900))   // Typing
    timers.push(setTimeout(() => setPhase(4), 1400))  // Answer
    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion, lisaResponse.length])

  // Progressive line reveal
  useEffect(() => {
    if (phase < 4 || prefersReducedMotion) return
    let line = 0
    const interval = setInterval(() => {
      if (line < lisaResponse.length) {
        setRevealedLines(line + 1)
        line++
      } else {
        clearInterval(interval)
      }
    }, 120)
    return () => clearInterval(interval)
  }, [phase, prefersReducedMotion, lisaResponse.length])

  const showHeader = phase >= 1
  const showQuestion = phase >= 2
  const showTyping = phase === 3
  const showAnswer = phase >= 4

  return (
    <motion.div
      variants={phoneTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ ...ultraSmoothSpring, duration: prefersReducedMotion ? 0 : 0.5 }}
      className="w-full"
    >
      <PhoneFrame>
        <div className="h-full p-4 flex flex-col bg-gray-50">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={showHeader ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            transition={{ ...smoothSpring }}
            className="h-11 bg-linear-to-r from-[#FF6B9D] to-[#FFA07A] rounded-xl flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <MessageCircle className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">Ask Lisa</span>
          </motion.div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col gap-2 py-3 min-h-0 overflow-hidden">
            {/* User Question */}
            <AnimatePresence>
              {showQuestion && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...smoothSpring }}
                  className="self-end max-w-[85%]"
                >
                  <div className="bg-[#FF6B9D] text-white rounded-2xl rounded-br-sm px-3 py-2 shadow-sm">
                    <p className="text-xs leading-relaxed">{question}</p>
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
                  transition={{ ...smoothSpring }}
                  className="flex items-start gap-2"
                >
                  <div className="w-7 h-7 rounded-full bg-linear-to-br from-[#FF6B9D] to-[#FFA07A] flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-[#FFE5F0] rounded-2xl rounded-tl-sm px-3 py-2">
                    <div className="flex gap-1.5 items-center h-3">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 bg-[#FF6B9D] rounded-full"
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lisa's Response */}
            <AnimatePresence>
              {showAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...smoothSpring }}
                  className="flex items-start gap-2"
                >
                  <div className="w-7 h-7 rounded-full bg-linear-to-br from-[#FF6B9D] to-[#FFA07A] flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 max-w-[88%]">
                    <div className="bg-[#FFE5F0] rounded-2xl rounded-tl-sm px-2.5 py-2 shadow-sm space-y-1.5">
                      {lisaResponse.slice(0, revealedLines).map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...smoothSpring }}
                        >
                          {item.type === "intro" && (
                            <p className="text-[11px] font-semibold text-gray-800">{item.content}</p>
                          )}
                          {item.type === "explanation" && (
                            <p className="text-[10px] text-gray-600 leading-relaxed">{item.content}</p>
                          )}
                          {item.type === "tip" && (
                            <div className="flex items-start gap-1.5 bg-white/50 rounded-lg px-2 py-1">
                              <span className="text-xs">{item.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-gray-800">{item.title}</p>
                                <p className="text-[9px] text-gray-500">{item.desc}</p>
                              </div>
                            </div>
                          )}
                          {item.type === "outro" && (
                            <p className="text-[10px] font-medium text-[#FF6B9D] pt-0.5">{item.content}</p>
                          )}
                        </motion.div>
                      ))}
                      {!prefersReducedMotion && revealedLines < lisaResponse.length && (
                        <motion.span
                          className="inline-block w-0.5 h-2.5 bg-[#FF6B9D] rounded-sm"
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        />
                      )}
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
            className="h-9 bg-white rounded-full border border-gray-200 flex items-center px-3 gap-2 shrink-0"
          >
            <span className="text-[10px] text-gray-400 flex-1">Ask anything...</span>
            <Send className="h-3.5 w-3.5 text-[#FF6B9D]" />
          </motion.div>
        </div>
      </PhoneFrame>
    </motion.div>
  )
}

// ============================================
// Feature 2: Symptom Timeline Phone (ENHANCED with icons)
// ============================================
function SymptomTimelinePhone({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean
}) {
  const [phase, setPhase] = useState(0)

  const timelineEntries = useMemo(() => [
    { date: "Jan 3", symptom: "Hot Flash", icon: Flame, color: "bg-orange-100 text-orange-600" },
    { date: "Jan 5", symptom: "Mood Swing", icon: Heart, color: "bg-pink-100 text-pink-600" },
    { date: "Jan 7", symptom: "Hot Flash", icon: Flame, color: "bg-orange-100 text-orange-600" },
    { date: "Jan 10", symptom: "Poor Sleep", icon: Moon, color: "bg-indigo-100 text-indigo-600" },
    { date: "Jan 12", symptom: "Hot Flash", icon: Flame, color: "bg-orange-100 text-orange-600" },
  ], [])

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    if (prefersReducedMotion) {
      timers.push(setTimeout(() => setPhase(3), 0))
      return () => timers.forEach(clearTimeout)
    }
    timers.push(setTimeout(() => setPhase(0), 0))
    timers.push(setTimeout(() => setPhase(1), 100))
    timers.push(setTimeout(() => setPhase(2), 500))
    timers.push(setTimeout(() => setPhase(3), 1500))
    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion])

  const showHeader = phase >= 1
  const showTimeline = phase >= 2
  const showSummary = phase >= 3

  return (
    <motion.div
      variants={phoneTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ ...ultraSmoothSpring, duration: prefersReducedMotion ? 0 : 0.5 }}
      className="w-full"
    >
      <PhoneFrame>
        <div className="h-full p-4 flex flex-col gap-3 bg-gray-50">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={showHeader ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            transition={{ ...smoothSpring }}
            className="h-11 bg-linear-to-r from-[#FF6B9D] to-[#FFA07A] rounded-xl flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <Calendar className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">Your Timeline</span>
          </motion.div>

          {/* Timeline Card */}
          <AnimatePresence>
            {showTimeline && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...smoothSpring }}
                className="bg-white rounded-xl p-3 shadow-sm flex-1 overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800">January 2026</span>
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                
                <div className="space-y-2">
                  {timelineEntries.map((entry, i) => {
                    const Icon = entry.icon
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...smoothSpring, delay: prefersReducedMotion ? 0 : 0.08 * i + 0.2 }}
                        className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                      >
                        <div className="text-xs font-medium text-gray-400 w-10">
                          {entry.date}
                        </div>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${entry.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-gray-700">{entry.symptom}</span>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Summary */}
                <AnimatePresence>
                  {showSummary && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...smoothSpring }}
                      className="mt-3 p-2.5 bg-linear-to-r from-pink-50 to-orange-50 rounded-xl border border-pink-100"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#FF6B9D]" />
                        <span className="text-xs font-bold text-gray-800">24 symptoms logged this month</span>
                      </div>
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

// ============================================
// Feature 3: Weekly Summary Phone (ENHANCED)
// ============================================
function WeeklySummaryPhone({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean
}) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    if (prefersReducedMotion) {
      timers.push(setTimeout(() => setPhase(4), 0))
      return () => timers.forEach(clearTimeout)
    }
    timers.push(setTimeout(() => setPhase(0), 0))
    timers.push(setTimeout(() => setPhase(1), 100))
    timers.push(setTimeout(() => setPhase(2), 400))
    timers.push(setTimeout(() => setPhase(3), 700))
    timers.push(setTimeout(() => setPhase(4), 1000))
    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion])

  const showHeader = phase >= 1
  
  const summaries = useMemo(() => [
    {
      emoji: "📉",
      icon: TrendingDown,
      iconColor: "text-green-600",
      title: "43% fewer symptoms",
      text: "8 this week vs 14 last week",
      bg: "bg-green-50",
    },
    {
      emoji: "🔥",
      icon: Flame,
      iconColor: "text-orange-600",
      title: "Hot flashes: 5 times",
      text: "Most common symptom",
      bg: "bg-orange-50",
    },
    {
      emoji: "✅",
      icon: Check,
      iconColor: "text-emerald-600",
      title: "6 out of 7 days tracked",
      text: "Amazing consistency! 🎉",
      bg: "bg-emerald-50",
    },
  ], [])

  return (
    <motion.div
      variants={phoneTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ ...ultraSmoothSpring, duration: prefersReducedMotion ? 0 : 0.5 }}
      className="w-full"
    >
      <PhoneFrame>
        <div className="h-full p-4 flex flex-col gap-3 bg-gray-50">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={showHeader ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            transition={{ ...smoothSpring }}
            className="h-11 bg-linear-to-r from-[#FF6B9D] to-[#FFA07A] rounded-xl flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <BarChart3 className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">Weekly Summary</span>
          </motion.div>

          {/* Summary Cards */}
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            {summaries.map((summary, index) => {
              const Icon = summary.icon
              return (
                <AnimatePresence key={index}>
                  {phase >= index + 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...smoothSpring, delay: prefersReducedMotion ? 0 : index * 0.1 }}
                      className={`${summary.bg} rounded-xl p-3 shadow-sm border border-white/50`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <Icon className={`w-4 h-4 ${summary.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800">
                            {summary.title}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {summary.text}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )
            })}
          </div>
        </div>
      </PhoneFrame>
    </motion.div>
  )
}

// ============================================
// Feature 4: Shareable Reports Phone (ENHANCED)
// ============================================
function ShareableReportsPhone({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean
}) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    if (prefersReducedMotion) {
      timers.push(setTimeout(() => setPhase(3), 0))
      return () => timers.forEach(clearTimeout)
    }
    timers.push(setTimeout(() => setPhase(0), 0))
    timers.push(setTimeout(() => setPhase(1), 100))
    timers.push(setTimeout(() => setPhase(2), 400))
    timers.push(setTimeout(() => setPhase(3), 1200))
    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion])

  const showHeader = phase >= 1
  const showReport = phase >= 2
  const showShare = phase >= 3

  const stats = useMemo(() => [
    { label: "Symptoms tracked", value: "47", icon: TrendingUp },
    { label: "Days tracked", value: "28", icon: Calendar },
    { label: "Weekly reports", value: "4", icon: BarChart3 },
  ], [])

  return (
    <motion.div
      variants={phoneTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ ...ultraSmoothSpring, duration: prefersReducedMotion ? 0 : 0.5 }}
      className="w-full"
    >
      <PhoneFrame>
        <div className="h-full p-4 flex flex-col gap-3 bg-gray-50">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={showHeader ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            transition={{ ...smoothSpring }}
            className="h-11 bg-linear-to-r from-[#FF6B9D] to-[#FFA07A] rounded-xl flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <FileText className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">Health Reports</span>
          </motion.div>

          {/* Report Card */}
          <AnimatePresence>
            {showReport && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...smoothSpring }}
                className="bg-white rounded-xl p-4 shadow-sm flex-1"
              >
                {/* Report Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Monthly Summary</div>
                    <div className="text-xs text-gray-500">January 2026</div>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2.5 mb-4">
                  {stats.map((stat, index) => {
                    const Icon = stat.icon
                    return (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...smoothSpring, delay: prefersReducedMotion ? 0 : 0.1 * index + 0.2 }}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-600">{stat.label}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-800">{stat.value}</span>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Ready to share */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <Share2 className="w-3 h-3" />
                    Ready to share with:
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 bg-blue-50 rounded-full text-[10px] font-medium text-blue-700">
                      Dr. Smith
                    </span>
                    <span className="px-2.5 py-1 bg-purple-50 rounded-full text-[10px] font-medium text-purple-700">
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
                      transition={{ ...smoothSpring }}
                      className="mt-4 w-full h-10 bg-linear-to-r from-[#FF6B9D] to-[#FFA07A] rounded-xl flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Share2 className="h-4 w-4 text-white" />
                      <span className="text-white text-sm font-semibold">Share Report</span>
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
