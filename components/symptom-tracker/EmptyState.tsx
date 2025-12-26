"use client";

import { useMemo, useState } from "react";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useSymptoms } from "@/hooks/useSymptoms";

export default function EmptyState() {
  const { logs } = useSymptomLogs(1); // Today's logs
  const { symptoms } = useSymptoms();
  const [isLogging, setIsLogging] = useState(false);

  const hasLogsToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return logs.some((log) => {
      const logDate = new Date(log.logged_at);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });
  }, [logs]);

  if (hasLogsToday) return null;

  const handleSymptomFree = async () => {
    try {
      setIsLogging(true);
      // Log a positive data point - we could create a special "symptom-free" entry
      // For now, just show a success message
      alert("Great! Celebrating your symptom-free day! 🎉");
    } catch (error) {
      console.error("Error logging symptom-free day:", error);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#E8E0DB] bg-white p-8 text-center mb-6">
      <p className="text-[#3D3D3D] font-medium mb-2">
        Nothing logged yet today — that could be good news!
      </p>
      <p className="text-[#6B6B6B] text-sm mb-4">
        If you're symptom-free, celebrate it. If not, a quick check-in helps Lisa find patterns.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={handleSymptomFree}
          disabled={isLogging}
          className="px-6 py-2 bg-[#ff74b1] hover:bg-[#d85a9a] text-white font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50"
        >
          {isLogging ? "Logging..." : "Symptom-free today! 🎉"}
        </button>
      </div>
    </div>
  );
}

