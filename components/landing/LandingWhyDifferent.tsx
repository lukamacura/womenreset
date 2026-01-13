"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, Target, FileWarning, BookOpen, MessageSquare, MessageCircleHeart, Brain, X, CheckCircle, BadgeCheck } from "lucide-react"

export default function LandingWhyDifferent() {
  const comparisons = [
    {
      generic: (
        <>
          Knows <strong>everything</strong>, masters <strong>nothing</strong>
        </>
      ),
      genericIcon: Globe,
      lisa: (
        <>
          Menopause <strong>specialist</strong> only
        </>
      ),
      lisaIcon: Target,
    },
    {
      generic: (
        <>
          Scrapes <strong>random internet</strong> content
        </>
      ),
      genericIcon: FileWarning,
      lisa: (
        <>
          <strong>Curated medical</strong> knowledge base
        </>
      ),
      lisaIcon: BookOpen,
    },
    {
      generic: (
        <>
          Gives <strong>generic</strong>, <strong>cautious</strong> answers
        </>
      ),
      genericIcon: MessageSquare,
      lisa: (
        <>
          Gives <strong>relevant</strong>, <strong>practical</strong> guidance
        </>
      ),
      lisaIcon: MessageCircleHeart,
    },
    {
      generic: (
        <>
          <strong>No memory</strong> of your history
        </>
      ),
      genericIcon: Brain,
      lisa: (
        <>
          <strong>Learns</strong> your <strong>patterns</strong> over time
        </>
      ),
      lisaIcon: Brain,
    },
    {
      generic: (
        <>
          <strong>Can't track</strong> anything
        </>
      ),
      genericIcon: X,
      lisa: (
        <>
          <strong>Tracks</strong> symptoms, <strong>finds triggers</strong>
        </>
      ),
      lisaIcon: CheckCircle,
    },
  ]

  const trustElements = [
    {
      icon: BadgeCheck,
      text: "Reviewed by health experts",
    },
    {
      icon: BookOpen,
      text: "Based on medical research",
    },
    {
      icon: Target,
      text: "100% focused on menopause",
    },
  ]


  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-foreground">
          Lisa isn't another chatbot.
        </h2>
        <p className="text-xl sm:text-2xl text-center text-muted-foreground mb-12">
          She's a menopause specialist — trained on curated, evidence-based knowledge.
        </p>

        {/* Comparison Table */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          <Card 
            className="border-2"
            style={{ 
              borderLeftColor: "var(--destructive)",
              borderLeftWidth: "4px",
              backgroundColor: "var(--card)"
            }}
          >
            <CardHeader>
              <CardTitle className="text-center text-xl">Other AI Apps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comparisons.map((comp, index) => {
                const GenericIcon = comp.genericIcon
                return (
                  <div key={index} className="p-4 rounded-lg flex items-start gap-3">
                    <GenericIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-foreground">{comp.generic}</p>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card 
            className="border-2 border-primary"
            style={{ 
              borderLeftColor: "var(--chart-2)",
              borderLeftWidth: "4px",
              backgroundColor: "var(--accent)"
            }}
          >
            <CardHeader>
              <CardTitle className="text-center text-xl text-primary">Lisa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comparisons.map((comp, index) => {
                const LisaIcon = comp.lisaIcon
                return (
                  <div key={index} className="p-4 rounded-lg flex items-start gap-3">
                    <LisaIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-foreground font-medium">{comp.lisa}</p>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Trust Elements */}
        <div className="grid sm:grid-cols-3 gap-4">
          {trustElements.map((element, index) => {
            const Icon = element.icon
            return (
              <div 
                key={index} 
                className="flex items-start gap-3 p-4 rounded-lg border"
                style={{ backgroundColor: "var(--card)" }}
              >
                <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-foreground">{element.text}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
