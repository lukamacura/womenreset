"use client"

export default function LandingSocialProof() {
  const testimonials = [
    {
      quote: "I finally have all my symptoms organized in one place. When I see my doctor, I have real data to show her instead of trying to remember everything from the last three months.",
      author: "Michelle",
      age: 52,
      initial: "M",
    },
    {
      quote: "The chat with Lisa is amazing. I can ask questions about menopause anytime and get clear, research-based answers. No more scary Google rabbit holes.",
      author: "Sarah",
      age: 49,
      initial: "S",
    },
    {
      quote: "I track my symptoms every morning — takes 30 seconds. The weekly summary shows me that I had fewer hot flashes this week, which gives me so much hope.",
      author: "Linda",
      age: 54,
      initial: "L",
    },
  ]

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Women are taking control of menopause
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Join 10,000+ women who track symptoms, get answers, and feel informed.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="p-8 rounded-lg bg-card shadow-2xl "

            >
              <div className="flex justify-center mb-6">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                  }}
                >
                  {testimonial.initial}
                </div>
              </div>
              <p className="text-lg text-foreground mb-6 leading-relaxed">
                &quot;{testimonial.quote}&quot;
              </p>
              <p className="text-muted-foreground font-medium text-center">
                {testimonial.author}, {testimonial.age}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
