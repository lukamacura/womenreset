"use client";

import { useWeekSummary } from "@/hooks/useWeekSummary";

export default function WeekSummary() {
  const { totalLogged, mostFrequentSymptom, averageSeverity, loading, error } =
    useWeekSummary();

  if (loading) {
    return (
      <div className="rounded-xl border border-[#E8E0DB] bg-white p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-[#E8E0DB] rounded mb-4" />
          <div className="h-8 w-48 bg-[#E8E0DB] rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#D4A5A5]/30 bg-[#D4A5A5]/10 p-6">
        <p className="text-[#D4A5A5] text-sm">Error loading summary</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E8E0DB] bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-[#8B7E74] mb-4">This Week</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#3D3D3D] font-medium">{totalLogged}</span>
          <span className="text-[#9A9A9A]">logged</span>
          {mostFrequentSymptom && (
            <>
              <span className="text-[#9A9A9A]">•</span>
              <span className="text-[#3D3D3D]">
                {mostFrequentSymptom.name} ({mostFrequentSymptom.count}x)
              </span>
              <span className="text-2xl">{mostFrequentSymptom.icon}</span>
            </>
          )}
        </div>
        {averageSeverity > 0 && (
          <div className="text-sm text-[#6B6B6B]">
            Average severity: {averageSeverity.toFixed(1)}/10
          </div>
        )}
      </div>
    </div>
  );
}

