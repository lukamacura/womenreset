"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ClipboardList, MessageCircle, TrendingUp } from "lucide-react"

export default function LandingHowItWorks() {
  const steps = [
    {
      number: 1,
      icon: ClipboardList,
      title: "Track",
      description: "Log symptoms in seconds — just tap and go",
    },
    {
      number: 2,
      icon: MessageCircle,
      title: "Ask Lisa",
      description: "Get evidence-based answers, not internet noise",
    },
    {
      number: 3,
      icon: TrendingUp,
      title: "See Patterns",
      description: "Discover what triggers your symptoms",
    },
  ]

  return (
    <section id="how-it-works" className="py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 text-foreground">
          Simple as 1-2-3
        </h2>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <Card 
                key={step.number} 
                className="border-2 text-center hover:shadow-lg transition-shadow"
                style={{ backgroundColor: "var(--accent)" }}
              >
                <CardContent className="p-8">
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                        style={{
                          background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                        }}
                      >
                        {step.number}
                      </div>
                      <div className="absolute -top-2 -right-2 bg-background rounded-full p-1">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-foreground">{step.title}</h3>
                  <p className="text-lg text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          Lisa is your AI menopause companion — trained on curated medical knowledge.
        </p>
      </div>
    </section>
  )
}
