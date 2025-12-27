"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Clock, Coffee, TrendingUp, Link2 } from "lucide-react";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import type { PlainLanguageInsight } from "@/lib/trackerAnalysis";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#E8E0DB]/30 ${className}`} />;
}

export default function AnalyticsSection() {
  const router = useRouter();
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
      <div className="bg-white/30 backdrop-blur-lg rounded-2xl border border-white/30 p-6 mb-6 shadow-xl">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const displayedInsights = showFullPatterns ? insights : insights.slice(0, 4);

  // Generate "Ask Lisa" prompt based on insight type
  const generateLisaPrompt = (insight: PlainLanguageInsight): string => {
    switch (insight.type) {
      case 'time-of-day':
        return `Lisa, I noticed my ${insight.symptomName || 'symptoms'} happen mostly ${insight.timeOfDay ? `in the ${insight.timeOfDay}` : 'at certain times'}. What could be causing this and what can I do?`;
      case 'trigger':
        return `Lisa, ${insight.triggerName || 'something'} seems to trigger my ${insight.symptomName || 'symptoms'}. Can you explain why and suggest alternatives?`;
      case 'progress':
        if (insight.changeDirection === 'down') {
          return `Lisa, my ${insight.symptomName || 'symptoms'} are ${insight.changePercent || ''}% better. What should I do next?`;
        } else {
          return `Lisa, my ${insight.symptomName || 'symptoms'} seem to be getting worse. What can I do?`;
        }
      case 'correlation':
        return `Lisa, I noticed ${insight.symptomName || 'some symptoms'} seem connected. Can you explain?`;
      default:
        return `Lisa, can you tell me more about this pattern I'm seeing?`;
    }
  };

  const handleAskLisa = (insight: PlainLanguageInsight) => {
    const prompt = generateLisaPrompt(insight);
    router.push(`/chat/lisa?prompt=${encodeURIComponent(prompt)}`);
  };

  // Get insight icon and title based on type
  const getInsightMeta = (type: PlainLanguageInsight['type']) => {
    switch (type) {
      case 'time-of-day':
        return { icon: Clock, title: 'Timing Pattern' };
      case 'trigger':
        return { icon: Coffee, title: 'Trigger Found' };
      case 'progress':
        return { icon: TrendingUp, title: 'Progress' };
      case 'correlation':
        return { icon: Link2, title: 'Connection Found' };
      default:
        return { icon: Lightbulb, title: 'Pattern Detected' };
    }
  };

  // Check if user has enough data (20+ logs)
  const hasEnoughData = logs.length >= 20;

  return (
    <div className="bg-white/30 backdrop-blur-lg rounded-2xl border border-white/30 p-6 mb-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-[#8B7E74]" />
          <h3 className="text-[#8B7E74] font-semibold text-xl">What Lisa Noticed</h3>
        </div>
        <p className="text-[#9A9A9A] text-sm">Last 7 days</p>
        {insights.length > 4 && (
          <button
            onClick={() => setShowFullPatterns(!showFullPatterns)}
            className="text-[#ff74b1] hover:text-primary-dark text-sm font-medium transition-colors cursor-pointer"
          >
            {showFullPatterns ? 'Show less' : 'See all patterns →'}
          </button>
        )}
      </div>

      {!hasEnoughData ? (
        <div className="text-center py-8">
          <p className="text-[#3D3D3D] text-base mb-2">
            Lisa needs a bit more data to find patterns.
          </p>
          <div className="mb-4">
            <div className="w-full bg-[#E8E0DB] rounded-full h-3 mb-2">
              <div
                className="bg-[#ff74b1] h-3 rounded-full transition-all"
                style={{ width: `${Math.min(100, (logs.length / 20) * 100)}%` }}
              />
            </div>
            <p className="text-sm text-[#9A9A9A]">
              Progress: {logs.length}/20 logs
            </p>
          </div>
          <p className="text-[#6B6B6B] text-base">
            Keep logging for a few more days and Lisa will start showing you what she finds.
          </p>
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[#9A9A9A] text-base">
            Keep logging symptoms to see insights and patterns!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedInsights.map((insight, index) => {
            const meta = getInsightMeta(insight.type);
            return (
              <div
                key={index}
                className="rounded-xl border border-white/30 p-5 bg-white/40 backdrop-blur-md"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <meta.icon className="h-5 w-5 text-[#3D3D3D]" />
                    <h4 className="text-base font-semibold text-[#3D3D3D]">
                      {meta.title}
                    </h4>
                  </div>
                  {insight.type === 'progress' && (
                    <span className="text-2xl">+</span>
                  )}
                </div>
                <p className="text-[#3D3D3D] text-base mb-4 leading-relaxed">
                  {insight.text}
                </p>
                <button
                  onClick={() => handleAskLisa(insight)}
                  className="text-[#ff74b1] hover:text-primary-dark text-base font-medium transition-colors cursor-pointer underline"
                >
                  Ask Lisa about this →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

