
import React, { FormEvent, useEffect, useState } from "react";
import { Lock, FileText, Gift } from "lucide-react";
import Image from 'next/image';

const MenoLisaHero: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  
  // #region agent log
  useEffect(() => {
    setIsMounted(true);
    fetch('http://127.0.0.1:7242/ingest/117acbca-7710-4e6c-a5b5-905727104271',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:6',message:'MenoLisaHero render CLIENT',data:{hasWindow:true,className:'min-h-screen w-full text-navy flex flex-col',hasStyle:true},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
  }, []);
  // #endregion
  
  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (typeof window !== "undefined") {
      window.location.href = "/register";
    }
  };

  const rootDivClassName = "min-h-screen w-full text-navy flex flex-col";
  const rootDivStyle = { background: 'linear-gradient(to bottom, #ffb4d5 0%, #fff5f9 30%, #f0f9ff 60%, #a6eaff 100%)' };
  
  // #region agent log
  useEffect(() => {
    if (isMounted) {
      fetch('http://127.0.0.1:7242/ingest/117acbca-7710-4e6c-a5b5-905727104271',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Hero.tsx:20',message:'CLIENT div props before render',data:{className:rootDivClassName,styleExists:!!rootDivStyle},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    }
  }, [isMounted, rootDivClassName, rootDivStyle]);
  // #endregion
  
  // Ensure server and client render the same initial HTML
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
          <h1 className="mx-auto max-w-4xl text-5xl pt-14 sm:text-6xl md:text-7xl font-extrabold leading-tight tracking-tight bg-clip-text text-transparent drop-shadow-xl" style={{ backgroundImage: 'linear-gradient(to right, #ff74b1 0%, #ffeb76 50%, #65dbff 100%)' }}>
            Smart AI Coach for Women in Menopause
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-script text-lg sm:text-2xl md:text-3xl font-medium text-navy/70">
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
                />
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-4xl p-4 text-foreground shadow-2xl backdrop-blur w-full max-w-2xl border-2 border-white/50"
              style={{ background: 'linear-gradient(135deg, #ffb4d5 0%, #fff4a3 30%, #a6eaff 60%, rgba(255,255,255,0.9) 100%)' }}
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
                <div className="flex items-center gap-2 rounded-full px-4 py-2 shadow-sm transition-transform duration-300 hover:scale-105 text-white font-medium" style={{ background: 'linear-gradient(135deg, #ff74b1 0%, #ffb4d5 100%)' }}>
                  <FileText className="h-4 w-4" />
                  <span>Evidence informed</span>
                </div>
                <div className="flex items-center gap-2 rounded-full px-4 py-2 shadow-sm transition-transform duration-300 hover:scale-105 text-[#1D3557] font-medium" style={{ background: 'linear-gradient(135deg, #ffeb76 0%, #fff4a3 100%)' }}>
                  <Lock className="h-4 w-4" />
                  <span>Private &amp; secure</span>
                </div>
                <div className="flex items-center gap-2 rounded-full px-4 py-2 shadow-sm transition-transform duration-300 hover:scale-105 text-white font-medium" style={{ background: 'linear-gradient(135deg, #65dbff 0%, #a6eaff 100%)' }}>
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
