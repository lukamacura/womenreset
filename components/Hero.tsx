import React, { FormEvent, useState } from "react";
import { Lock, FileText, Gift, ArrowUpRight } from "lucide-react";
const MenoLisaHero: React.FC = () => {
  const [query, setQuery] = useState("Why do I gain weight?");

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    // Generic client-side redirect; replace with router if needed
    if (typeof window !== "undefined") {
      window.location.href = "/register";
    }
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-pink-100 via-pink-200 to-pink-400 text-slate-900">
      {/* Hero content */}
      <main className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-34">
        {/* Avatar */}

<div className="relative mb-6 flex items-center justify-center">
  {/* Avatar GIF */}
   
</div>



        {/* Headline */}
        <section className="text-center">
          <p className="text-6xl font-medium text-slate-800">
            Feel{" "}
            <span className="font-extrabold tracking-tight text-slate-900">
              LIKE YOU
            </span>{" "}
            again within a
          </p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 md:text-6xl">
            <span className="block">FEW DAYS</span>
            <span className="mt-1 block text-lg font-normal font-script text-slate-800 md:text-5xl">
              with your
            </span>
          </p>

        {/* Personal support pill */}
          <div className="mt-5 flex justify-center">
            <button className="rounded-xl bg-teal-500 px-10 py-3 text-5xl font-semibold tracking-wide text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-teal-600">
              PERSONAL SUPPORT
            </button>
          </div>
        </section>

        {/* “For women 40+” script text – umesto kruga */}
        <div className="pointer-events-none mt-6 flex w-full justify-end md:-mt-24 md:-mr-10">
          <p className="font-script rotate-6 text-3xl md:text-4xl text-pink-600 drop-shadow-md tracking-wide">
            For women 40+
          </p>
        </div>

        {/* Chat card */}
        <section className="mt-34 w-full max-w-2xl">
          <form
            onSubmit={handleSubmit}
            className="rounded-4xl bg-linear-to-br from-teal-600 via-teal-600/90 to-purple-800/90 p-4 text-white shadow-2xl backdrop-blur"
          >
            {/* Input */}
            <div className="flex items-center rounded-full bg-black/30 px-4 py-3 shadow-inner transition-all duration-300 ">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mr-3 w-full bg-transparent text-sm text-white placeholder:text-purple-200/80 focus:outline-none"
                placeholder="Ask me anything about your symptoms…"
              />
              <button
                type="submit"
                onClick={() => handleSubmit()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-400 text-white shadow-md transition-all duration-300 hover:scale-110 hover:bg-pink-500"
                aria-label="Send question"
              >
                <ArrowUpRight className="h-5 w-5" />
              </button>
            </div>

            {/* Trust copy */}
            <p className="mt-4 text-center text-md leading-relaxed text-purple-100">
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
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs">
              <div className="flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 shadow-sm transition-transform duration-300 hover:scale-105">
                <FileText className="h-4 w-4" />
                <span>Evidence informed</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 shadow-sm transition-transform duration-300 hover:scale-105">
                <Lock className="h-4 w-4" />
                <span>Private &amp; secure</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 shadow-sm transition-transform duration-300 hover:scale-105">
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
