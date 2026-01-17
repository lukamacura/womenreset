"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useInView, useReducedMotion } from "framer-motion"

function HighlightedText({
  text,
  isInView,
  prefersReducedMotion,
}: {
  text: string
  isInView: boolean
  prefersReducedMotion: boolean | null
}) {
  const [shouldHighlight, setShouldHighlight] = useState(false)

  useEffect(() => {
    if (!isInView || prefersReducedMotion) return
    const timer = setTimeout(() => setShouldHighlight(true), 500)
    return () => clearTimeout(timer)
  }, [isInView, prefersReducedMotion])

  return (
    <span className="relative inline-block">
      <span className="relative z-10">{text}</span>
      <motion.span
        className="absolute inset-0 bg-yellow-400/40 rounded pointer-events-none"
        initial={{ scaleX: 0, transformOrigin: "left" }}
        animate={shouldHighlight ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
        style={{ zIndex: 0 }}
      />
    </span>
  )
}

export default function LandingSocialProof() {
  const prefersReducedMotion = useReducedMotion()
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 })
  const testimonials = [
    {
      quote: "I finally have all my symptoms organized in one place. When I see my doctor, I have real data to show her instead of trying to remember everything from the last three months.",
      author: "Michelle",
      age: 52,
      initial: "M",
    },
    {
      quote: "The chat with Lisa is amazing. I can ask questions about menopause anytime and get clear, research-based answers. No more scary Google rabbit holes.",
      author: "Sarah",
      age: 49,
      initial: "S",
    },
    {
      quote: "I track my symptoms every morning — takes 30 seconds. The weekly summary shows me that I had fewer hot flashes this week, which gives me so much hope.",
      author: "Linda",
      age: 54,
      initial: "L",
    },
  ]

  return (
    <section ref={sectionRef} className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Women are <HighlightedText text="taking control" isInView={isInView} prefersReducedMotion={prefersReducedMotion} /> of menopause
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Join 10,000+ women who track symptoms, get answers, and feel informed.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="p-8 rounded-lg bg-card shadow-2xl "

            >
              <div className="flex justify-center mb-6">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                  }}
                >
                  {testimonial.initial}
                </div>
              </div>
              <p className="text-lg text-foreground mb-6 leading-relaxed">
                &quot;{testimonial.quote}&quot;
              </p>
              <p className="text-muted-foreground font-medium text-center">
                {testimonial.author}, {testimonial.age}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
