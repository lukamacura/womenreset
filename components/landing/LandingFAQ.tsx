"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function LandingFAQ() {
  const faqs = [
    {
      question: "What makes Lisa different from ChatGPT?",
      answer:
        "Lisa is a menopause specialist, not a general AI. Her knowledge comes from curated medical research, and she tracks your symptoms to find personal patterns. ChatGPT can't do that.",
    },
    {
      question: "Is Lisa's information reliable?",
      answer:
        "Yes. Lisa's knowledge base is built from evidence-based sources and reviewed by health experts. She's not pulling random content from the internet.",
    },
    {
      question: "Is my data private?",
      answer: "Yes. Your data is encrypted and never shared. Only you can see it.",
    },
    {
      question: "How does the free trial work?",
      answer:
        "Full access for 3 days. No credit card required. You decide after.",
    },
    {
      question: "Is this medical advice?",
      answer:
        "No. Lisa provides education and tracking, not diagnosis. Always consult a healthcare provider for medical decisions.",
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes. One click, no questions asked.",
    },
  ]

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 text-foreground">
          Questions?
        </h2>

        <Accordion type="single" className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-2 rounded-lg px-4">
              <AccordionTrigger className="text-left font-semibold text-lg">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
