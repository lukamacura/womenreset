"use client";

import { useEffect } from "react";
import { useWeekSummary } from "@/hooks/useWeekSummary";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#E8E0DB]/30 ${className}`} />;
}

export default function WeekSummary() {
  const { totalLogged, mostFrequentSymptom, averageSeverity, loading, error, refetch } =
    useWeekSummary();

  // Listen for custom event when symptom logs are updated
  useEffect(() => {
    const handleLogUpdate = () => {
      refetch();
    };

    // Listen for custom event
    window.addEventListener('symptom-log-updated', handleLogUpdate);

    return () => {
      window.removeEventListener('symptom-log-updated', handleLogUpdate);
    };
  }, [refetch]);

  // Always show skeleton when loading
  if (loading) {
    return (
      <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 shadow-xl">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#ff74b1]/30 bg-[#ff74b1]/10 p-6">
        <p className="text-[#ff74b1] text-sm">Error loading summary</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 shadow-xl">
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
            Average severity: {averageSeverity.toFixed(1)}/3
          </div>
        )}
      </div>
    </div>
  );
}

