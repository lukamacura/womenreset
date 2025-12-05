import React, { FormEvent, useState, useEffect } from "react";
import { Lock, FileText, Gift, ArrowUpRight } from "lucide-react";
import Image from 'next/image';

const heroImages = [
  "/hero1.svg",
  "/hero2.svg",
  "/hero3.svg",
  "/hero4.svg",
];

const MenoLisaHero: React.FC = () => {
  const [query, setQuery] = useState("I ate chocolate cake. 😨 I feel soo gulity!!!");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    // Generic client-side redirect; replace with router if needed
    if (typeof window !== "undefined") {
      window.location.href = "/register";
    }
  };

  // Rotate images with smooth transitions
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      // After fade out, change image
      setTimeout(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
        setIsTransitioning(false);
      }, 500); // Half of transition duration for smooth fade
    }, 10000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, []);

  // Preload all images for smooth transitions
  useEffect(() => {
    if (typeof window !== "undefined") {
      heroImages.forEach((src) => {
        const img = new window.Image(); // ✅ use window.Image here
        img.src = src;
      });
    }
  }, []);
  

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-pink-100 via-pink-200 to-pink-400 text-slate-900">
      {/* Hero content */}
      <main className="mx-auto flex max-w-8xl flex-col items-center px-4 pb-16 pt-0">
        {/* Avatar */}

        <div className="relative mb-6 flex items-center justify-center">
          {/* Avatar GIF */}

        </div>



        {/* Headline */}
        <section className="text-center py-0 font-sans">
          <h1 className="mx-auto max-w-4xl text-5xl sm:text-6xl md:text-7xl font-extrabold leading-tight tracking-tight bg-linear-to-r from-pink-700 via-fuchsia-700 to-orange-500 bg-clip-text text-transparent drop-shadow-xl">
            Feel like yourself again
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-2xl md:text-3xl font-medium text-slate-700">
            Start your journey to balance and well-being with<span className="text-pink-700 font-script font-semibold"> your personal AI menopause coach</span>
          </p>
        </section>


        {/* Chat card */}
        <section className="mt-0 w-full max-w-6xl">
          {/* Hero illustration with rotating images */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-[70%] max-w-6xl aspect-square sm:aspect-4/3 md:aspect-video">
              {heroImages.map((src, index) => (
                <div
                  key={src}
                  className={`absolute h-auto w-full mx-auto left-0 right-0 top-0 transition-opacity duration-1000 ease-in-out ${
                    index === currentImageIndex && !isTransitioning
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                >
                  <Image
                    src={src}
                    alt={`Lisa illustration ${index + 1}`}
                    className="w-full h-auto object-contain"
                    width={1000}
                    height={1000}
                    priority={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </div>
              ))}
            </div>
          </div>


          <form
            onSubmit={handleSubmit}
            className="rounded-4xl bg-linear-to-br from-pink-200 via-pink-200/90 to-purple-100/90 p-4 text-foreground shadow-2xl backdrop-blur"
          >
            {/* Input */}
            <div className="flex items-center rounded-full bg-pink-400/30 px-4 py-3 shadow-inner transition-all duration-300 ">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mr-3 w-full bg-transparent font-bold text-md text-foreground placeholder:text-purple-200/80 focus:outline-none"
                placeholder="Ask me anything about your symptoms…"
              />
              <button
                type="submit"
                onClick={() => handleSubmit()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-400 text-foreground shadow-md transition-all duration-300 hover:scale-110 hover:bg-pink-500"
                aria-label="Send question"
              >
                <ArrowUpRight className="h-5 w-5" />
              </button>
            </div>

            {/* Trust copy */}
            <p className="mt-4 text-center text-md leading-relaxed text-foreground-100">
              Powered by{" "}
              <span className="font-semibold">
                evidence-based menopause research
              </span>
              , your coach builds a{" "}
              <span className="font-semibold">long-term understanding</span> of
              your symptoms and needs, while keeping every conversation{" "}
              <span className="font-semibold">fully private</span>.
            </p>

            {/* Badges */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-md">
              <div className="flex items-center gap-2 rounded-full bg-pink-400/30 px-4 py-2 shadow-sm transition-transform duration-300 hover:scale-105">
                <FileText className="h-4 w-4" />
                <span>Evidence informed</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-pink-400/30 px-4 py-2 shadow-sm transition-transform duration-300 hover:scale-105">
                <Lock className="h-4 w-4" />
                <span>Private &amp; secure</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-pink-400/30 px-4 py-2 shadow-sm transition-transform duration-300 hover:scale-105">
                <Gift className="h-4 w-4" />
                <span>3 days free</span>
              </div>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default MenoLisaHero;
