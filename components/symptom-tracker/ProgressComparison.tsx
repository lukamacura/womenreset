"use client";

import { useMemo } from "react";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";

interface ProgressComparisonProps {
  symptomName?: string; // Optional: compare specific symptom, otherwise overall
}

export default function ProgressComparison({ symptomName }: ProgressComparisonProps) {
  const { logs, loading } = useSymptomLogs(30);

  const comparison = useMemo(() => {
    if (logs.length < 10) return null; // Need at least 10 logs for comparison

    // Filter by symptom if specified
    const filteredLogs = symptomName
      ? logs.filter((log) => log.symptoms?.name === symptomName)
      : logs;

    if (filteredLogs.length < 10) return null;

    // Sort by date
    const sortedLogs = [...filteredLogs].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );

    // Split into first half and second half
    const mid = Math.floor(sortedLogs.length / 2);
    const firstHalf = sortedLogs.slice(0, mid);
    const secondHalf = sortedLogs.slice(mid);

    const firstCount = firstHalf.length;
    const secondCount = secondHalf.length;
    const firstAvgSeverity =
      firstHalf.reduce((sum, log) => sum + log.severity, 0) / firstCount;
    const secondAvgSeverity =
      secondHalf.reduce((sum, log) => sum + log.severity, 0) / secondCount;

    const countChange = ((secondCount - firstCount) / firstCount) * 100;
    const severityChange = ((secondAvgSeverity - firstAvgSeverity) / firstAvgSeverity) * 100;

    return {
      firstCount,
      secondCount,
      firstAvgSeverity: Math.round(firstAvgSeverity * 10) / 10,
      secondAvgSeverity: Math.round(secondAvgSeverity * 10) / 10,
      countChange: Math.round(countChange),
      severityChange: Math.round(severityChange),
    };
  }, [logs, symptomName]);

  if (loading || !comparison) return null;

  const isImproving = comparison.countChange < 0 && comparison.severityChange < 0;
  const displayName = symptomName || "Symptoms";

  return (
    <div className="rounded-xl border border-[#E8E0DB] bg-white p-6 shadow-sm mb-6">
      <h3 className="text-lg font-semibold text-[#8B7E74] mb-4">
        Your Progress: {displayName}
      </h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#6B6B6B]">First 2 weeks</span>
            <span className="text-sm font-medium text-[#3D3D3D]">
              {comparison.firstCount} episodes, avg severity {comparison.firstAvgSeverity}/3
            </span>
          </div>
          <div className="h-3 bg-[#F5EDE8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ff74b1] rounded-full"
              style={{ width: `${Math.min(100, (comparison.firstCount / 20) * 100)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#6B6B6B]">Last 2 weeks</span>
            <span className="text-sm font-medium text-[#3D3D3D]">
              {comparison.secondCount} episodes, avg severity {comparison.secondAvgSeverity}/3
            </span>
          </div>
          <div className="h-3 bg-[#F5EDE8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ff74b1] rounded-full"
              style={{ width: `${Math.min(100, (comparison.secondCount / 20) * 100)}%` }}
            />
          </div>
        </div>

        {isImproving && (
          <div className="pt-4 border-t border-[#E8E0DB]">
            <p className="text-sm text-[#3D3D3D]">
              📉 {Math.abs(comparison.countChange)}% fewer episodes •{" "}
              {Math.abs(comparison.severityChange)}% less severe
            </p>
            <p className="text-sm text-[#6B6B6B] mt-1">Keep it up!</p>
          </div>
        )}

        {!isImproving && comparison.countChange > 0 && (
          <div className="pt-4 border-t border-[#E8E0DB]">
            <p className="text-sm text-[#3D3D3D]">
              {displayName} have increased {comparison.countChange}% - let's discuss strategies
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

