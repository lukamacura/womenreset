"use client"

import { Badge } from "@/components/ui/badge"

export default function LandingWhyDifferent() {
  const steps = [
    {
      number: "1",
      title: "Log your experience",
      description: "Quick notes when something feels off—or right. No forms.",
      outcome: "You build a clear picture without overwhelm.",
    },
    {
      number: "2",
      title: "See your patterns",
      description: "Lisa finds connections: hot weather before headaches, stress before mood swings.",
      outcome: "You understand why, not just what.",
    },
    {
      number: "3",
      title: "Get personalized guidance",
      description: "Based on your patterns, Lisa explains what's happening and what helps.",
      outcome: "You have a clear path forward, tailored to you.",
    },
  ]

  const trustSignals = [
    "Reviewed by menopause specialists",
    "Evidence-based medical knowledge",
    "100% focused on menopause",
  ]

  return (
    <section id="how-it-works" className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground leading-tight">
            How it works
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Three steps. No complexity. Just clarity.
          </p>
        </div>

        <div className="space-y-12 mb-12">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="flex gap-6 items-start"
            >
              <Badge 
                variant="secondary" 
                className="flex-shrink-0 h-12 w-12 rounded-full p-0 flex items-center justify-center text-xl font-bold"
                style={{ 
                  backgroundColor: "rgba(255, 182, 193, 0.2)",
                  color: "var(--primary)",
                  border: "none"
                }}
              >
                {step.number}
              </Badge>
              <div className="flex-1 space-y-3">
                <h3 className="text-2xl sm:text-3xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
                <p className="text-base sm:text-lg text-foreground font-medium">
                  {step.outcome}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border/30 pt-12">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {trustSignals.map((signal, index) => (
              <Badge 
                key={index}
                variant="outline"
                className="text-sm font-medium px-4 py-2"
              >
                {signal}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
