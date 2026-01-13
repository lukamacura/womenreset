"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Moon, Search, HeartCrack } from "lucide-react"

export default function LandingProblem() {
  const painPoints = [
    {
      icon: Moon,
      text: "You can't sleep, then can't think straight the next day",
    },
    {
      icon: Search,
      text: "You Google symptoms and get confused, scary, or wrong answers",
    },
    {
      icon: HeartCrack,
      text: "You feel dismissed — by apps, by articles, even by people around you",
    },
  ]

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 text-foreground">
          Sound familiar?
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {painPoints.map((point, index) => {
            const Icon = point.icon
            return (
              <Card 
                key={index} 
                className="border-2 hover:shadow-lg transition-shadow"
                style={{ backgroundColor: "var(--accent)" }}
              >
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <Icon className="h-8 w-8" style={{ color: "var(--primary)" }} />
                  </div>
                  <p className="text-lg text-foreground leading-relaxed">{point.text}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <p className="text-xl sm:text-2xl text-center text-foreground font-semibold">
          You deserve answers from a source you can trust.
        </p>
      </div>
    </section>
  )
}
