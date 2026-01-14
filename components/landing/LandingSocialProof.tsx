"use client"

export default function LandingSocialProof() {
  const testimonials = [
    {
      quote: "Lisa helped me find my triggers. Hot weather before headaches, stress before mood swings. Now I understand why I feel the way I do.",
      author: "Michelle",
      age: 52,
      initial: "M",
    },
    {
      quote: "Finally, answers that make sense. Not scary Google results. Real help that's tailored to my experience.",
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
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Women are getting real answers
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Join 10,000+ women who stopped guessing and started understanding.
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
