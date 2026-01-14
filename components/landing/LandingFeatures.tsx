"use client"

import { Badge } from "@/components/ui/badge"
import {
  ClipboardList,
  LineChart,
  MessageCircle,
  FileText,
} from "lucide-react"

export default function LandingFeatures() {
  const features = [
    {
      icon: ClipboardList,
      title: "Quick symptom tracking",
      description: "Log how you feel in seconds",
    },
    {
      icon: LineChart,
      title: "Pattern detection",
      description: "See what triggers your symptoms",
    },
    {
      icon: MessageCircle,
      title: "Personalized answers",
      description: "Get guidance tailored to your experience",
    },
    {
      icon: FileText,
      title: "Shareable reports",
      description: "PDF summaries for your healthcare provider",
    },
  ]

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Everything you need
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Simple tools that actually help.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div 
                key={index} 
                className="p-8 rounded-lg bg-card shadow-2xl"

              >
                <div className="flex items-start gap-4">
                  <div
                    className="p-3 rounded-lg shrink-0"
                    style={{
                      background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                    }}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <Badge 
                      variant="outline" 
                      className="mb-3 text-sm font-semibold"
                    >
                      {feature.title}
                    </Badge>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
