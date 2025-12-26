'use client';

import { useEffect } from 'react';
import MenopauseResetHero from "@/components/MenopauseResetHero";
import MenoLisaHero from "@/components/Hero";
import HomeSwipeButton from "@/components/HomeSwipeButton";

export default function Home() {
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/117acbca-7710-4e6c-a5b5-905727104271',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/page.tsx:7',message:'Home component render CLIENT',data:{hasWindow:true},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
  }, []);
  // #endregion
  return (
    <main className="relative overflow-hidden p-0 m-0">
      <MenoLisaHero/>
      <MenopauseResetHero/>
      <HomeSwipeButton />
    </main>
  );
}
