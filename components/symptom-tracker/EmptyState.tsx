"use client";

import { useMemo } from "react";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useSymptoms } from "@/hooks/useSymptoms";

export default function EmptyState() {
  const { logs, loading } = useSymptomLogs(30); // Last 30 days for new user check
  const { loading: symptomsLoading } = useSymptoms();

  const hasLogsToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return logs.some((log) => {
      const logDate = new Date(log.logged_at);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });
  }, [logs]);

  const isNewUser = useMemo(() => {
    return logs.length === 0;
  }, [logs]);


  // Don't show if already logged today or still loading
  if (hasLogsToday || loading || symptomsLoading) return null;

  // New user welcome message
  if (isNewUser) {
    return (
      <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-8 text-center mb-6 shadow-xl">
        <h3 className="text-xl font-semibold text-[#3D3D3D] mb-2">
          Welcome to your Daily Check-in! 👋
        </h3>
        <p className="text-[#6B6B6B] text-base mb-4">
          This is where you&apos;ll track how you&apos;re feeling.
          It only takes a few seconds.
        </p>
        <p className="text-[#6B6B6B] text-base mb-6">
          Tap any symptom below to log it.
          The more you log, the more patterns Lisa can find.
        </p>
        <button
          onClick={() => {
            // Scroll to symptoms grid or focus first symptom card
            const symptomsGrid = document.querySelector('[data-symptoms-grid]');
            if (symptomsGrid) {
              symptomsGrid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }}
          className="px-6 py-3 bg-[#ff74b1] hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors cursor-pointer text-base"
        >
          Got it, let&apos;s start
        </button>
      </div>
    );
  }

  // No logs today (but user has logged before)
  return (
    <div className="rounded-xl border border-white/25 bg-gray-900 backdrop-blur-lg p-8 text-center mb-6 shadow-lg">
      <p className="text-white font-medium text-base mb-2">
        No symptoms logged yet today.
      </p>
      <p className="text-white/80 text-base mb-4">
        That might be good news! If you&apos;re feeling okay,
        log a good day. If not, a quick check-in helps
        Lisa understand your patterns.
      </p>
      <div className="flex gap-3 justify-center flex-wrap">

      </div>
    </div>
  );
}

