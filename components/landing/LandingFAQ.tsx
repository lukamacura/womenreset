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
        "This app focuses entirely on menopause — not a general health tracker. You get simple symptom tracking, clear data organization, weekly summaries, and a chat with Lisa who answers menopause questions using research-based information. Everything is designed for this phase of life.",
    },
    {
      question: "Is Lisa's information reliable?",
      answer:
        "Yes. Lisa provides general menopause education based on medical research and reviewed by specialists. She answers questions about menopause, but she doesn't diagnose conditions or recommend treatments. Always consult your doctor for medical advice.",
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
        "No. This app provides symptom tracking and menopause education, not diagnosis or treatment. Lisa gives general information about menopause based on research. Always consult your healthcare provider for medical decisions.",
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
