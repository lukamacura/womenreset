"use client";

import { useMemo } from "react";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import CircleStat from "./CircleStat";

export default function AnalyticsSection() {
  const { logs, loading } = useSymptomLogs(30); // Last 30 days

  const analyticsData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Filter logs for this month (from start of current month to now)
    const monthLogs = logs.filter((log) => {
      const logDate = new Date(log.logged_at);
      logDate.setHours(0, 0, 0, 0);
      return logDate >= startOfMonth;
    });

    // Calculate streak (consecutive days with at least one log, counting backwards from today)
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Start from today and go backwards
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      const hasLog = logs.some((log) => {
        const logDate = new Date(log.logged_at);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === checkDate.getTime();
      });
      
      if (hasLog) {
        streak++;
      } else {
        // Break streak if we hit a day without logs
        // But only break if it's not today (allow today to be empty and still count yesterday's streak)
        if (i === 0) {
          // Today has no logs, but continue checking yesterday
          continue;
        } else {
          // Yesterday or earlier has no logs, break streak
          break;
        }
      }
    }

    const totalSymptoms = monthLogs.length;
    const averageSeverity =
      monthLogs.length > 0
        ? monthLogs.reduce((sum, log) => sum + log.severity, 0) /
          monthLogs.length
        : 0;

    // Most frequent symptom
    const symptomCounts = new Map<string, { name: string; count: number }>();
    monthLogs.forEach((log) => {
      if (log.symptoms) {
        const key = log.symptom_id;
        const existing = symptomCounts.get(key) || {
          name: log.symptoms.name,
          count: 0,
        };
        existing.count += 1;
        symptomCounts.set(key, existing);
      }
    });

    let mostFrequent: { name: string; count: number } | null = null;
    symptomCounts.forEach((value) => {
      if (!mostFrequent || value.count > mostFrequent.count) {
        mostFrequent = value;
      }
    });

    return {
      totalSymptoms,
      averageSeverity: Math.round(averageSeverity * 10) / 10,
      streak,
      mostFrequent: mostFrequent?.name || null,
    };
  }, [logs]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E0DB] p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-[#E8E0DB] rounded mb-6" />
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-28 h-28 bg-[#E8E0DB] rounded-full mb-3" />
                <div className="h-4 w-20 bg-[#E8E0DB] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E0DB] p-6 mb-6 shadow-sm">
      <h3 className="text-[#8B7E74] font-medium mb-6 text-lg">Your Progress</h3>

      <div className="grid grid-cols-3 gap-6">
        <CircleStat
          value={analyticsData.totalSymptoms}
          label="Symptoms"
          sublabel="This month"
          color="rose"
        />

        <CircleStat
          value={analyticsData.averageSeverity.toFixed(1)}
          label="Average"
          sublabel="Severity"
          color="amber"
        />

        <CircleStat
          value={analyticsData.streak}
          label="Day Streak"
          sublabel="Keep it up!"
          color="sage"
        />
      </div>

      {/* Most frequent symptom */}
      {analyticsData.mostFrequent && (
        <div className="mt-6 pt-6 border-t border-[#E8E0DB] text-center">
          <span className="text-[#9A9A9A] text-sm">Most frequent: </span>
          <span className="text-[#3D3D3D] font-medium">
            {analyticsData.mostFrequent}
          </span>
        </div>
      )}
    </div>
  );
}

