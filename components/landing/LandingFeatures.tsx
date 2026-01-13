"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ClipboardList,
  Brain,
  LineChart,
  MessageCircle,
  FileText,
  Droplet,
} from "lucide-react"

export default function LandingFeatures() {
  const features = [
    {
      icon: ClipboardList,
      title: "Quick Symptom Tracking",
      description: "Log how you feel in 2 taps",
      bgColor: "var(--chart-1)",
    },
    {
      icon: Brain,
      title: "Evidence-Based Answers",
      description: "Lisa's knowledge comes from research, not guesswork",
      bgColor: "var(--accent)",
    },
    {
      icon: LineChart,
      title: "Pattern Detection",
      description: "See what's triggering your symptoms",
      bgColor: "var(--chart-3)",
    },
    {
      icon: MessageCircle,
      title: "Ask Lisa Anytime",
      description: "Get answers 24/7 — no waiting",
      bgColor: "var(--chart-2)",
    },
    {
      icon: FileText,
      title: "Shareable Health Reports",
      description: "PDF summaries for your records or healthcare provider",
      bgColor: "var(--card)",
    },
    {
      icon: Droplet,
      title: "Lifestyle Tracking",
      description: "Hydration, meals, mood — all connected",
      bgColor: "var(--muted)",
    },
  ]

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 text-foreground">
          Everything you need — nothing you don't
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card 
                key={index} 
                className="border-2 hover:shadow-lg transition-shadow"
                style={{ backgroundColor: feature.bgColor }}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                      }}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
