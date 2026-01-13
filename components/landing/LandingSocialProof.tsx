"use client"

import { Card, CardContent } from "@/components/ui/card"
import { User } from "lucide-react"

export default function LandingSocialProof() {
  const testimonials = [
    {
      quote: "I tried other AI apps for help with hot flashes — useless. Lisa actually understood and helped me find my triggers.",
      author: "Michelle",
      age: 52,
      initial: "M",
    },
    {
      quote: "Finally, answers that make sense. Not scary Google results, not vague AI responses. Real help.",
      author: "Sarah",
      age: 49,
      initial: "S",
    },
    {
      quote: "Lisa remembered my symptoms and connected the dots. It's like having an expert who actually knows me.",
      author: "Linda",
      age: 54,
      initial: "L",
    },
  ]

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 text-foreground">
          Women are getting real answers
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                    }}
                  >
                    {testimonial.initial}
                  </div>
                </div>
                <p className="text-lg text-foreground mb-4 leading-relaxed">
                  &quot;{testimonial.quote}&quot;
                </p>
                <p className="text-muted-foreground font-medium">
                  — {testimonial.author}, {testimonial.age}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-lg text-muted-foreground">
          Join 10,000+ women who stopped guessing and started understanding.
        </p>
      </div>
    </section>
  )
}
