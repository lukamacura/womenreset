'use client';

import MenopauseResetHero from "@/components/MenopauseResetHero";
import MenoLisaHero from "@/components/Hero";
import HomeSwipeButton from "@/components/HomeSwipeButton";

export default function Home() {
  return (
    <main className="relative overflow-hidden p-0 m-0">
      <MenoLisaHero/>
      <MenopauseResetHero/>
      <HomeSwipeButton />
    </main>
  );
}
