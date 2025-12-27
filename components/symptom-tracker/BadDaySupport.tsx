/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useMemo, useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";

export default function BadDaySupport() {
  const { logs } = useSymptomLogs(1); // Today's logs
  const { profile } = useUserProfile();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const isBadDay = useMemo(() => {
    if (dismissed) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLogs = logs.filter((log) => {
      const logDate = new Date(log.logged_at);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });

    // Trigger conditions: 3+ symptoms in one day, OR any symptom logged as Severe
    const severeCount = todayLogs.filter((log) => log.severity === 3).length;
    const hasSevere = severeCount > 0;
    const hasManySymptoms = todayLogs.length >= 3;

    return hasSevere || hasManySymptoms;
  }, [logs, dismissed]);

  // Check if already dismissed today (store in localStorage)
  useEffect(() => {
    const today = new Date().toDateString();
    const dismissedDate = localStorage.getItem('badDaySupportDismissed');
    if (dismissedDate === today) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    const today = new Date().toDateString();
    localStorage.setItem('badDaySupportDismissed', today);
    setDismissed(true);
  };

  if (!isBadDay) return null;

  const todayLogs = logs.filter((log) => {
    const logDate = new Date(log.logged_at);
    logDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return logDate.getTime() === today.getTime();
  });

  const displayName = profile?.name || '';

  return (
    <div className="rounded-xl border border-[#ff74b1]/50 bg-[#ff74b1]/10 p-6 mb-6">
      <h3 className="text-lg font-semibold text-[#3D3D3D] mb-2 flex items-center gap-2">
        <Heart className="h-5 w-5 text-primary" fill="#ff74b1" />
        Tough Day Support
      </h3>
      <p className="text-[#3D3D3D] text-base mb-2">
        {displayName ? `${displayName}, ` : ''}You&apos;ve logged {todayLogs.length} {todayLogs.length === 1 ? 'symptom' : 'symptoms'} today.
      </p>
      <p className="text-[#6B6B6B] text-base mb-4">
        That&apos;s hard, and we see you.
      </p>
      <p className="text-[#6B6B6B] text-base mb-4">
        Remember: Tracking the hard days helps Lisa find patterns that lead to better days. You&apos;re doing something important by being here.
      </p>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => router.push("/chat/lisa")}
          className="px-4 py-2 bg-[#ff74b1] hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors cursor-pointer text-base"
          type="button"
        >
          Talk to Lisa
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 bg-white/40 hover:bg-white/60 backdrop-blur-md text-[#3D3D3D] font-medium rounded-xl transition-colors cursor-pointer border border-white/30 text-base"
        >
          I&apos;m okay, just logging
        </button>
      </div>
    </div>
  );
}

