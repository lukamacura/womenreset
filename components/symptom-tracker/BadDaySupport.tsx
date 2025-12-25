"use client";

import { useMemo } from "react";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useRouter } from "next/navigation";

export default function BadDaySupport() {
  const { logs } = useSymptomLogs(1); // Today's logs
  const router = useRouter();

  const isBadDay = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLogs = logs.filter((log) => {
      const logDate = new Date(log.logged_at);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });

    const severeCount = todayLogs.filter((log) => log.severity === 3).length;
    return todayLogs.length >= 4 && severeCount >= 2;
  }, [logs]);

  if (!isBadDay) return null;

  return (
    <div className="rounded-xl border border-[#D4A5A5]/50 bg-[#D4A5A5]/10 p-6 mb-6">
      <p className="text-[#3D3D3D] font-medium mb-2">
        Tough day. You've logged {logs.length} symptoms today, mostly severe. That's hard.
      </p>
      <p className="text-[#6B6B6B] text-sm mb-4">
        Remember: tracking bad days helps us find patterns that lead to better days. You're doing the right thing.
      </p>
      <button
        onClick={() => router.push("/chat/lisa")}
        className="text-[#D4A5A5] hover:text-[#C49494] text-sm font-medium transition-colors cursor-pointer underline"
      >
        💬 Want to talk to Lisa about how you're feeling?
      </button>
    </div>
  );
}

