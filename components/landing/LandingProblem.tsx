"use client"

import { Badge } from "@/components/ui/badge"

export default function LandingProblem() {
  const insights = [
    {
      title: "Your symptoms follow patterns",
      text: "Hot weather triggers headaches. Stress amplifies mood swings. See the connections.",
    },
    {
      title: "You need the right information",
      text: "Not more information. The right information, explained clearly, when you need it.",
    },
    {
      title: "Clarity is possible",
      text: "Thousands of women found relief through understanding, not magic solutions.",
    },
  ]

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground leading-tight">
            The problem isn't you.<br />
            It's the confusion.
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Menopause isn't a mystery. It's a transition to understand.
          </p>
        </div>

        <div className="space-y-8 mb-12">
          {insights.map((insight, index) => (
            <div 
              key={index}
              className="flex gap-4 items-start"
            >
              <Badge 
                variant="secondary" 
                className="flex-shrink-0 mt-1 h-8 w-8 rounded-full p-0 flex items-center justify-center text-sm font-bold"
                style={{ 
                  backgroundColor: "rgba(255, 182, 193, 0.15)",
                  color: "var(--primary)",
                  border: "none"
                }}
              >
                {index + 1}
              </Badge>
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-foreground">
                  {insight.title}
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  {insight.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border/30 pt-12">
          <div className="text-center">
            <p className="text-lg sm:text-xl text-foreground mb-2">
              <strong>Evidence-based knowledge.</strong> Reviewed by specialists. Focused on menopause.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
