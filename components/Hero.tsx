
import React, { FormEvent } from "react";
import { Lock, FileText, Gift } from "lucide-react";
import Image from 'next/image';

const MenoLisaHero: React.FC = () => {
  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (typeof window !== "undefined") {
      window.location.href = "/register";
    }
  };

  const rootDivClassName = "min-h-screen w-full text-foreground flex flex-col";
  const rootDivStyle = { background: 'linear-gradient(to bottom, var(--primary) 0%, var(--accent) 30%, var(--secondary) 60%, var(--background) 100%)' };
  
  return (
    <div className={rootDivClassName} style={rootDivStyle} suppressHydrationWarning>
      {/* Hero content */}
      <main className="mx-auto flex max-w-8xl flex-col items-center px-2 pb-16 pt-0 flex-1 w-full">
        {/* Avatar */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Avatar GIF */}
        </div>

        {/* Headline */}
        <section className="flex flex-col justify-start items-center w-full text-center py-0 font-sans flex-1">
          <h1 className="mx-auto max-w-4xl text-5xl pt-14 sm:text-6xl md:text-7xl font-extrabold leading-tight tracking-tight bg-clip-text text-transparent drop-shadow-xl" style={{ backgroundImage: 'linear-gradient(to right, var(--primary) 0%, var(--accent) 50%, var(--secondary) 100%)' }}>
            Smart AI Coach for Women in Menopause
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-script text-lg sm:text-2xl md:text-3xl font-medium text-muted-foreground">
            Feel like yourself again
          </p>
          {/* Chat card */}
          <section className="mt-4 w-full max-w-6xl flex flex-col items-center flex-1">
            {/* Hero illustration - single large image */}
            <div className="mb-3 mt-1 flex justify-center w-full">
              <div
                className="relative w-full max-w-5xl md:max-w-7xl lg:max-w-[90vw] aspect-25/9 max-h-[50vh]"
              >
                <Image
                  src="/hero1.svg"
                  alt="Lisa illustration"
                  fill
                  className="object-contain"
                  priority
                  loading="eager"
                  sizes="(max-width: 1280px) 90vw, 1280px"
                />
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-4xl p-4 text-foreground shadow-2xl backdrop-blur w-full max-w-2xl border-2 border-white/50"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 30%, var(--secondary) 60%, var(--card) 100%)' }}
            >


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
                <div className="flex items-center gap-2 rounded-full px-4 py-2 shadow-sm transition-transform duration-300 hover:scale-105 text-primary-foreground font-medium" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)' }}>
                  <FileText className="h-4 w-4" />
                  <span>Evidence informed</span>
                </div>
                <div className="flex items-center gap-2 rounded-full px-4 py-2 shadow-sm transition-transform duration-300 hover:scale-105 text-foreground font-medium" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent) 100%)' }}>
                  <Lock className="h-4 w-4" />
                  <span>Private &amp; secure</span>
                </div>
                <div className="flex items-center gap-2 rounded-full px-4 py-2 shadow-sm transition-transform duration-300 hover:scale-105 text-secondary-foreground font-medium" style={{ background: 'linear-gradient(135deg, var(--secondary) 0%, var(--secondary) 100%)' }}>
                  <Gift className="h-4 w-4" />
                  <span>3 days free</span>
                </div>
              </div>
            </form>
          </section>
        </section>
      </main>
    </div>
  );
};

export default MenoLisaHero;
