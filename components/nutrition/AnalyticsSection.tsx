"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Droplet, TrendingUp, Clock, Link2 } from "lucide-react";
import type { PlainLanguageInsight } from "@/lib/trackerAnalysis";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#E8E0DB]/30 ${className}`} />;
}

export default function AnalyticsSection() {
  const router = useRouter();
  const [insights, setInsights] = useState<PlainLanguageInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [showFullPatterns, setShowFullPatterns] = useState(false);

  const fetchInsights = async () => {
    try {
      setInsightsLoading(true);
      const response = await fetch('/api/nutrition-insights?days=30');
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

  // Mark insights as seen when they're displayed
  useEffect(() => {
    const markInsightsAsSeen = async () => {
      if (insights.length > 0 && !insightsLoading) {
        try {
          await fetch('/api/user-preferences/mark-insights-seen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ insights }),
          });
        } catch (error) {
          // Silently fail - don't interrupt user experience
          console.error('Error marking insights as seen:', error);
        }
      }
    };
    markInsightsAsSeen();
  }, [insights, insightsLoading]);

  // Always show skeleton when loading
  if (insightsLoading) {
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
      case 'food-correlation':
        if (insight.foodTag && insight.symptomName) {
          const foodLabel = insight.foodTag.replace(/_/g, ' ');
          return `Lisa, I notice I have more ${insight.symptomName} after ${foodLabel}. What should I do?`;
        }
        return `Lisa, can you tell me more about this food-symptom connection?`;
      case 'hydration':
        return `Lisa, ${insight.text}`;
      case 'food-progress':
        if (insight.foodTag) {
          const foodLabel = insight.foodTag.replace(/_/g, ' ');
          return `Lisa, I've been making progress with ${foodLabel}. What should I do to keep improving?`;
        }
        return `Lisa, can you tell me more about this progress I'm seeing?`;
      case 'meal-timing':
        return `Lisa, ${insight.text}. Can you explain why this matters?`;
      default:
        return `Lisa, can you tell me more about this pattern I'm seeing?`;
    }
  };

  const handleAskLisa = async (insight: PlainLanguageInsight) => {
    // Mark this specific insight as seen before navigating
    try {
      await fetch('/api/user-preferences/mark-insights-seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insights: [insight] }),
      });
    } catch (error) {
      // Silently fail - still navigate to chat
      console.error('Error marking insight as seen:', error);
    }
    
    const prompt = generateLisaPrompt(insight);
    router.push(`/chat/lisa?prompt=${encodeURIComponent(prompt)}`);
  };

  // Get insight icon and title based on type
  const getInsightMeta = (type: PlainLanguageInsight['type']) => {
    switch (type) {
      case 'food-correlation':
        return { icon: Link2, title: 'Food-Symptom Link' };
      case 'hydration':
        return { icon: Droplet, title: 'Hydration Pattern' };
      case 'food-progress':
        return { icon: TrendingUp, title: 'Progress' };
      case 'meal-timing':
        return { icon: Clock, title: 'Meal Timing' };
      default:
        return { icon: Lightbulb, title: 'Pattern Detected' };
    }
  };

  return (
    <div className="bg-white/30 backdrop-blur-lg rounded-2xl border border-white/30 p-6 mb-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-[#8B7E74]" />
          <h3 className="text-[#8B7E74] font-semibold text-xl">What Lisa Noticed</h3>
        </div>
        {insights.length > 4 && (
          <button
            onClick={() => setShowFullPatterns(!showFullPatterns)}
            className="text-[#ff74b1] hover:text-primary-dark text-sm font-medium transition-colors cursor-pointer"
          >
            {showFullPatterns ? 'Show less' : 'See all patterns →'}
          </button>
        )}
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[#9A9A9A] text-base">
            Keep logging food to see insights and patterns!
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
                  {insight.type === 'food-progress' && (
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

