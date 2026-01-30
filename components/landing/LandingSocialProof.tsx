"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useReplayableInView } from "@/hooks/useReplayableInView"
import { HighlightedTextByRows } from "@/components/landing/HighlightedTextByRows"

export default function LandingSocialProof() {
  const prefersReducedMotion = useReducedMotion()
  const { ref: sectionRef, isInView } = useReplayableInView<HTMLElement>({ amount: 0.3 })
  const testimonials = [
    {
      quote: "Honestly, I wish I'd found this sooner. The tracking part is good but being able to just ask random questions at 3am when I'm wide awake and googling 'is this normal' has saved my sanity.",
      author: "Sarah",
      age: 49,
      initial: "S",
    },
    {
      quote: "I kept a journal before but never saw the patterns until I started using this. Turns out my anxiety spikes aren't random - they line up with everything else. Finally makes sense.",
      author: "Jennifer",
      age: 52,
      initial: "M",
    },
    {
      quote: "My daughter suggested this after I complained for the millionth time. The questions thing is clutch - I've asked stuff I'd never say out loud to my doctor. No judgment, just actual answers.",
      author: "Maria",
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
            Women are <HighlightedTextByRows text="finally getting answers" isInView={isInView} prefersReducedMotion={prefersReducedMotion} delayMs={500} />
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Join 10,000+ women who stopped Googling and started understanding
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
