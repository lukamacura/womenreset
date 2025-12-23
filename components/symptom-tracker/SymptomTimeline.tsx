"use client";

import { useMemo } from "react";
import type { SymptomLog } from "@/lib/symptom-tracker-constants";

interface SymptomTimelineProps {
  logs: SymptomLog[];
}

interface TimelineData {
  period: string;
  avgSeverity: number;
}

export default function SymptomTimeline({ logs }: SymptomTimelineProps) {
  const timelineData = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Calculate averages for each period
    const todayLogs = logs.filter((log) => {
      const logDate = new Date(log.logged_at);
      return logDate.toDateString() === now.toDateString();
    });

    const threeMonthsLogs = logs.filter((log) => {
      const logDate = new Date(log.logged_at);
      return logDate >= threeMonthsAgo && logDate < now;
    });

    const sixMonthsLogs = logs.filter((log) => {
      const logDate = new Date(log.logged_at);
      return logDate >= sixMonthsAgo && logDate < threeMonthsAgo;
    });

    const calculateAvg = (logList: SymptomLog[]) => {
      if (logList.length === 0) return 0;
      const sum = logList.reduce((acc, log) => acc + log.severity, 0);
      return Math.round((sum / logList.length) * 10) / 10;
    };

    const data: TimelineData[] = [];

    if (sixMonthsLogs.length > 0) {
      data.push({
        period: "6 mo ago",
        avgSeverity: calculateAvg(sixMonthsLogs),
      });
    }

    if (threeMonthsLogs.length > 0) {
      data.push({
        period: "3 mo ago",
        avgSeverity: calculateAvg(threeMonthsLogs),
      });
    }

    if (todayLogs.length > 0) {
      data.push({
        period: "Today",
        avgSeverity: calculateAvg(todayLogs),
      });
    }

    return data;
  }, [logs]);

  if (timelineData.length === 0) {
    return null;
  }

  // Size based on severity (higher = bigger)
  const getSize = (severity: number) => {
    const base = 40;
    const scale = severity * 8;
    return base + scale;
  };

  // Color based on severity
  const getColor = (severity: number) => {
    if (severity <= 3) return "bg-[#A8D5BA]";
    if (severity <= 6) return "bg-[#F5D697]";
    return "bg-[#E8B4B4]";
  };

  return (
    <div className="flex items-end justify-center gap-6 py-8">
      {timelineData.map((item, index) => (
        <div key={index} className="flex flex-col items-center">
          <div
            className={`rounded-full flex items-center justify-center 
                        text-white font-bold ${getColor(item.avgSeverity)}`}
            style={{
              width: getSize(item.avgSeverity),
              height: getSize(item.avgSeverity),
            }}
          >
            {item.avgSeverity}
          </div>
          <span className="text-[#9A9A9A] text-xs mt-2">{item.period}</span>
        </div>
      ))}
    </div>
  );
}

