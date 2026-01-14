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
      question: "What makes Lisa different?",
      answer:
        "Lisa is a menopause specialist focused entirely on your experience. Her knowledge comes from curated medical research, and she tracks your symptoms to find personal patterns. She's not a general assistant—she's built specifically for menopause.",
    },
    {
      question: "Is Lisa's information reliable?",
      answer:
        "Yes. Lisa's knowledge base is built from evidence-based sources and reviewed by menopause specialists. She's not pulling random content from the internet—everything is curated and focused on menopause.",
    },
    {
      question: "Is my data private?",
      answer: "Yes. Your data is encrypted and never shared. Only you can see it. We take your privacy seriously.",
    },
    {
      question: "How does the free trial work?",
      answer:
        "Full access for 3 days. No credit card required. You decide after if Lisa is right for you.",
    },
    {
      question: "Is this medical advice?",
      answer:
        "No. Lisa provides education and tracking, not diagnosis or treatment. Always consult a healthcare provider for medical decisions.",
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes. One click, no questions asked. Cancel anytime from your account settings.",
    },
  ]

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div 
          className="bg-card rounded-lg p-8 sm:p-12 shadow-2xl backdrop-blur-lg"

        >
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
              Common questions
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground">
              Everything you need to know.
            </p>
          </div>

          <Accordion type="single" className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`} 
                className="rounded-lg px-6 py-2 bg-[rgba(255,255,255,0.5)] backdrop-blur"
              >
                <AccordionTrigger className="text-left font-semibold text-lg">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pt-2">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
