"use client";

import { useState, useEffect, useMemo } from "react";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import type { PlainLanguageInsight } from "@/lib/trackerAnalysis";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#E8E0DB]/30 ${className}`} />;
}

export default function AnalyticsSection() {
  const { logs, loading, refetch } = useSymptomLogs(30); // Last 30 days
  const [insights, setInsights] = useState<PlainLanguageInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [showFullPatterns, setShowFullPatterns] = useState(false);

  // Listen for custom event when symptom logs are updated
  useEffect(() => {
    const handleLogUpdate = () => {
      refetch();
      fetchInsights();
    };

    // Listen for custom event
    window.addEventListener('symptom-log-updated', handleLogUpdate);

    return () => {
      window.removeEventListener('symptom-log-updated', handleLogUpdate);
    };
  }, [refetch]);

  const fetchInsights = async () => {
    try {
      setInsightsLoading(true);
      const response = await fetch('/api/tracker-insights?days=30');
      if (!response.ok) throw new Error('Failed to fetch insights');
      const { data } = await response.json();
      setInsights(data.plainLanguageInsights || []);
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsights([]);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  // Always show skeleton when loading
  if (loading || insightsLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E0DB] p-6 mb-6 shadow-sm">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const displayedInsights = showFullPatterns ? insights : insights.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-[#E8E0DB] p-6 mb-6 shadow-sm">
      <h3 className="text-[#8B7E74] font-medium mb-6 text-lg">What Lisa Noticed This Week</h3>

      {insights.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[#9A9A9A] text-sm">
            Keep logging symptoms to see insights and patterns!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {displayedInsights.map((insight, index) => (
              <div key={index} className="flex gap-3 items-start">
                <span className="text-xl mt-0.5">💡</span>
                <p className="text-[#3D3D3D] text-sm flex-1 leading-relaxed">
                  {insight.text}
                </p>
              </div>
            ))}
          </div>

          {insights.length > 5 && (
            <button
              onClick={() => setShowFullPatterns(!showFullPatterns)}
              className="mt-6 text-[#D4A5A5] hover:text-[#C49494] text-sm font-medium transition-colors cursor-pointer"
            >
              {showFullPatterns ? 'Show less' : 'See full patterns →'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

