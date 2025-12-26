"use client";

import { useMemo } from "react";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useWeekSummary } from "@/hooks/useWeekSummary";

interface PersonalizedGreetingProps {
  userName?: string;
}

export default function PersonalizedGreeting({ userName }: PersonalizedGreetingProps) {
  const { logs } = useSymptomLogs(30);
  useWeekSummary();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const streak = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    
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
        if (i === 0) continue; // Allow today to be empty
        break;
      }
    }
    
    return streak;
  }, [logs]);

  const monthlyCount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    return logs.filter((log) => {
      const logDate = new Date(log.logged_at);
      logDate.setHours(0, 0, 0, 0);
      return logDate >= startOfMonth;
    }).length;
  }, [logs]);

  const currentDay = new Date().getDate();

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold text-[#8B7E74] mb-2">
        {greeting}{userName ? `, ${userName}` : ""}.
      </h2>
      {streak > 0 && (
        <p className="text-[#3D3D3D] text-sm mb-1">
          🔥 {streak}-day streak - You&lsquo;re building great habits{userName ? `, ${userName}` : ""}!
        </p>
      )}
      <p className="text-[#6B6B6B] text-sm">
        This month: {monthlyCount}/{currentDay} days logged
      </p>
    </div>
  );
}

