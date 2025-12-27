"use client";

import { useMemo } from "react";
import { BarChart } from "lucide-react";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";

export default function WeekComparison() {
  const { logs, loading } = useSymptomLogs(14); // Last 14 days for week comparison

  const comparison = useMemo(() => {
    if (logs.length === 0) return null;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // This week: last 7 days (including today)
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(thisWeekStart.getDate() - 6);

    // Last week: 7 days before this week
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    const thisWeekLogs = logs.filter(log => {
      const logDate = new Date(log.logged_at);
      logDate.setHours(0, 0, 0, 0);
      return logDate >= thisWeekStart;
    });

    const lastWeekLogs = logs.filter(log => {
      const logDate = new Date(log.logged_at);
      logDate.setHours(0, 0, 0, 0);
      return logDate >= lastWeekStart && logDate <= lastWeekEnd;
    });

    // Calculate metrics
    const thisWeekTotal = thisWeekLogs.length;
    const lastWeekTotal = lastWeekLogs.length;

    const thisWeekAvgSeverity = thisWeekLogs.length > 0
      ? thisWeekLogs.reduce((sum, log) => sum + log.severity, 0) / thisWeekLogs.length
      : 0;
    const lastWeekAvgSeverity = lastWeekLogs.length > 0
      ? lastWeekLogs.reduce((sum, log) => sum + log.severity, 0) / lastWeekLogs.length
      : 0;

    // Count good days (symptoms named "Good Day")
    const thisWeekGoodDays = new Set(
      thisWeekLogs
        .filter(log => log.symptoms?.name === "Good Day")
        .map(log => {
          const d = new Date(log.logged_at);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
    ).size;

    const lastWeekGoodDays = new Set(
      lastWeekLogs
        .filter(log => log.symptoms?.name === "Good Day")
        .map(log => {
          const d = new Date(log.logged_at);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
    ).size;

    // Most frequent symptom
    const thisWeekSymptomCounts = new Map<string, number>();
    thisWeekLogs.forEach(log => {
      const name = log.symptoms?.name || "Unknown";
      thisWeekSymptomCounts.set(name, (thisWeekSymptomCounts.get(name) || 0) + 1);
    });
    const thisWeekMostFrequent = Array.from(thisWeekSymptomCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

    const lastWeekSymptomCounts = new Map<string, number>();
    lastWeekLogs.forEach(log => {
      const name = log.symptoms?.name || "Unknown";
      lastWeekSymptomCounts.set(name, (lastWeekSymptomCounts.get(name) || 0) + 1);
    });
    const lastWeekMostFrequent = Array.from(lastWeekSymptomCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

    // Calculate percentage changes
    const totalChange = lastWeekTotal > 0
      ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
      : 0;
    const severityChange = lastWeekAvgSeverity > 0
      ? Math.round(((thisWeekAvgSeverity - lastWeekAvgSeverity) / lastWeekAvgSeverity) * 100)
      : 0;
    const goodDaysChange = lastWeekGoodDays > 0
      ? Math.round(((thisWeekGoodDays - lastWeekGoodDays) / lastWeekGoodDays) * 100)
      : (thisWeekGoodDays > 0 ? 100 : 0);

    return {
      thisWeekTotal,
      lastWeekTotal,
      totalChange,
      thisWeekAvgSeverity: Math.round(thisWeekAvgSeverity * 10) / 10,
      lastWeekAvgSeverity: Math.round(lastWeekAvgSeverity * 10) / 10,
      severityChange,
      thisWeekGoodDays,
      lastWeekGoodDays,
      goodDaysChange,
      thisWeekMostFrequent,
      lastWeekMostFrequent,
    };
  }, [logs]);

  if (loading) {
    return (
      <div className="bg-white/30 backdrop-blur-lg rounded-2xl border border-white/30 p-6 mb-6 shadow-xl">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-[#E8E0DB]/30 rounded mb-4" />
          <div className="h-32 w-full bg-[#E8E0DB]/30 rounded" />
        </div>
      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  const isBetter = comparison.totalChange < 0 && comparison.severityChange < 0;

  return (
    <div className="bg-white/30 backdrop-blur-lg rounded-2xl border border-white/30 p-4 sm:p-6 mb-6 shadow-xl transition-all duration-300 hover:shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <BarChart className="h-5 w-5 text-[#8B7E74]" />
        <h3 className="text-lg sm:text-xl font-semibold text-[#8B7E74]">
          This Week vs Last Week
        </h3>
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8E0DB]">
              <th className="text-left py-2 text-[#6B6B6B] font-medium"></th>
              <th className="text-right py-2 text-[#3D3D3D] font-semibold">This Week</th>
              <th className="text-right py-2 text-[#3D3D3D] font-semibold">Last Week</th>
              <th className="text-right py-2 text-[#3D3D3D] font-semibold">Change</th>
            </tr>
          </thead>
          <tbody className="text-base">
            <tr className="border-b border-[#E8E0DB]/50">
              <td className="py-3 text-[#6B6B6B]">Total symptoms logged</td>
              <td className="py-3 text-right font-medium text-[#3D3D3D]">{comparison.thisWeekTotal}</td>
              <td className="py-3 text-right font-medium text-[#3D3D3D]">{comparison.lastWeekTotal}</td>
              <td className="py-3 text-right font-medium">
                {comparison.totalChange > 0 && <span className="text-[#9A9A9A]">↑ {Math.abs(comparison.totalChange)}%</span>}
                {comparison.totalChange < 0 && <span className="text-green-600">↓ {Math.abs(comparison.totalChange)}%</span>}
                {comparison.totalChange === 0 && <span className="text-[#9A9A9A]">—</span>}
              </td>
            </tr>
            <tr className="border-b border-[#E8E0DB]/50">
              <td className="py-3 text-[#6B6B6B]">Average severity</td>
              <td className="py-3 text-right font-medium text-[#3D3D3D]">{comparison.thisWeekAvgSeverity}</td>
              <td className="py-3 text-right font-medium text-[#3D3D3D]">{comparison.lastWeekAvgSeverity}</td>
              <td className="py-3 text-right font-medium">
                {comparison.severityChange > 0 && <span className="text-red-600">↑ Worse</span>}
                {comparison.severityChange < 0 && <span className="text-green-600">↓ Better</span>}
                {comparison.severityChange === 0 && <span className="text-[#9A9A9A]">Same</span>}
              </td>
            </tr>
            <tr className="border-b border-[#E8E0DB]/50">
              <td className="py-3 text-[#6B6B6B]">Good days</td>
              <td className="py-3 text-right font-medium text-[#3D3D3D]">{comparison.thisWeekGoodDays}</td>
              <td className="py-3 text-right font-medium text-[#3D3D3D]">{comparison.lastWeekGoodDays}</td>
              <td className="py-3 text-right font-medium">
                {comparison.goodDaysChange > 0 && <span className="text-green-600">↑ Nice!</span>}
                {comparison.goodDaysChange < 0 && <span className="text-[#9A9A9A]">↓ {Math.abs(comparison.goodDaysChange)}%</span>}
                {comparison.goodDaysChange === 0 && <span className="text-[#9A9A9A]">—</span>}
              </td>
            </tr>
            <tr>
              <td className="py-3 text-[#6B6B6B]">Most frequent</td>
              <td className="py-3 text-right font-medium text-[#3D3D3D]">{comparison.thisWeekMostFrequent}</td>
              <td className="py-3 text-right font-medium text-[#3D3D3D]">{comparison.lastWeekMostFrequent}</td>
              <td className="py-3 text-right font-medium">
                {comparison.thisWeekMostFrequent === comparison.lastWeekMostFrequent 
                  ? <span className="text-[#9A9A9A]">Same</span>
                  : <span className="text-[#9A9A9A]">—</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile: Card layout */}
      <div className="md:hidden space-y-3">
        <div className="border-b border-[#E8E0DB]/50 pb-3">
          <div className="text-sm text-[#6B6B6B] mb-2">Total symptoms logged</div>
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div>
                <div className="text-xs text-[#9A9A9A]">This Week</div>
                <div className="text-base font-medium text-[#3D3D3D]">{comparison.thisWeekTotal}</div>
              </div>
              <div>
                <div className="text-xs text-[#9A9A9A]">Last Week</div>
                <div className="text-base font-medium text-[#3D3D3D]">{comparison.lastWeekTotal}</div>
              </div>
            </div>
            <div className="text-right">
              {comparison.totalChange > 0 && <span className="text-[#9A9A9A] text-sm">↑ {Math.abs(comparison.totalChange)}%</span>}
              {comparison.totalChange < 0 && <span className="text-green-600 text-sm">↓ {Math.abs(comparison.totalChange)}%</span>}
              {comparison.totalChange === 0 && <span className="text-[#9A9A9A] text-sm">—</span>}
            </div>
          </div>
        </div>
        <div className="border-b border-[#E8E0DB]/50 pb-3">
          <div className="text-sm text-[#6B6B6B] mb-2">Average severity</div>
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div>
                <div className="text-xs text-[#9A9A9A]">This Week</div>
                <div className="text-base font-medium text-[#3D3D3D]">{comparison.thisWeekAvgSeverity}</div>
              </div>
              <div>
                <div className="text-xs text-[#9A9A9A]">Last Week</div>
                <div className="text-base font-medium text-[#3D3D3D]">{comparison.lastWeekAvgSeverity}</div>
              </div>
            </div>
            <div className="text-right">
              {comparison.severityChange > 0 && <span className="text-red-600 text-sm">↑ Worse</span>}
              {comparison.severityChange < 0 && <span className="text-green-600 text-sm">↓ Better</span>}
              {comparison.severityChange === 0 && <span className="text-[#9A9A9A] text-sm">Same</span>}
            </div>
          </div>
        </div>
        <div className="border-b border-[#E8E0DB]/50 pb-3">
          <div className="text-sm text-[#6B6B6B] mb-2">Good days</div>
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div>
                <div className="text-xs text-[#9A9A9A]">This Week</div>
                <div className="text-base font-medium text-[#3D3D3D]">{comparison.thisWeekGoodDays}</div>
              </div>
              <div>
                <div className="text-xs text-[#9A9A9A]">Last Week</div>
                <div className="text-base font-medium text-[#3D3D3D]">{comparison.lastWeekGoodDays}</div>
              </div>
            </div>
            <div className="text-right">
              {comparison.goodDaysChange > 0 && <span className="text-green-600 text-sm">↑ Nice!</span>}
              {comparison.goodDaysChange < 0 && <span className="text-[#9A9A9A] text-sm">↓ {Math.abs(comparison.goodDaysChange)}%</span>}
              {comparison.goodDaysChange === 0 && <span className="text-[#9A9A9A] text-sm">—</span>}
            </div>
          </div>
        </div>
        <div className="pb-3">
          <div className="text-sm text-[#6B6B6B] mb-2">Most frequent</div>
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div>
                <div className="text-xs text-[#9A9A9A]">This Week</div>
                <div className="text-base font-medium text-[#3D3D3D] truncate max-w-[100px]">{comparison.thisWeekMostFrequent}</div>
              </div>
              <div>
                <div className="text-xs text-[#9A9A9A]">Last Week</div>
                <div className="text-base font-medium text-[#3D3D3D] truncate max-w-[100px]">{comparison.lastWeekMostFrequent}</div>
              </div>
            </div>
            <div className="text-right">
              {comparison.thisWeekMostFrequent === comparison.lastWeekMostFrequent 
                ? <span className="text-[#9A9A9A] text-sm">Same</span>
                : <span className="text-[#9A9A9A] text-sm">—</span>}
            </div>
          </div>
        </div>
      </div>

      {isBetter && (
        <div className="mt-4 pt-4 border-t border-[#E8E0DB]">
          <p className="text-base text-[#3D3D3D]">
            Summary: Better week overall! Symptoms down, severity down, more good days.
          </p>
        </div>
      )}
    </div>
  );
}

