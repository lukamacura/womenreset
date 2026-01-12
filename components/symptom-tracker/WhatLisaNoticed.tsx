"use client";

import { useState, useEffect, useMemo } from "react";
import { Network, RefreshCw, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[#E8E0DB]/30 ${className}`} />;
}

interface ActionSteps {
  easy: string;
  medium: string;
  advanced: string;
}

interface Insight {
  patternHeadline: string;
  why: string;
  whatsWorking?: string | null;
  actionSteps: ActionSteps;
  doctorNote: string;
  trend: "improving" | "worsening" | "stable";
  whyThisMatters?: string;
}

// Render text with bold formatting
function renderBoldText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      return <strong key={index} className="font-semibold text-[#8B7E74]">{boldText}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case "improving":
      return "↗️";
    case "worsening":
      return "↘️";
    default:
      return "→";
  }
}

function getTrendColor(trend: string) {
  switch (trend) {
    case "improving":
      return "text-green-600 bg-green-50 border-green-200";
    case "worsening":
      return "text-amber-600 bg-amber-50 border-amber-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

export default function WhatLisaNoticed() {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  const fetchInsight = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const url = refresh ? "/api/insights?refresh=true" : "/api/insights";
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch insight");
      }

      const { insight: insightData } = await response.json();
      
      // Handle both old format (string) and new format (object)
      if (typeof insightData === "string") {
        // Legacy format - convert to new structure
        setInsight({
          patternHeadline: insightData.split('\n')[0] || "Your patterns this week",
          why: insightData.substring(0, 200) || "Let's explore what your data shows.",
          whatsWorking: null,
          actionSteps: {
            easy: "Keep tracking your symptoms to see patterns",
            medium: "Try one small change this week and see if it helps",
            advanced: "Create a consistent routine that supports your body"
          },
          doctorNote: "Tracking symptoms and patterns. Reviewing data with healthcare provider.",
          trend: "stable",
          whyThisMatters: "Understanding your patterns helps you and your healthcare team make informed decisions."
        });
      } else {
        setInsight(insightData);
      }
    } catch (err) {
      console.error("Error fetching insight:", err);
      setError("Failed to load insight");
      setInsight(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, []);

  const handleRefresh = () => {
    fetchInsight(true);
  };

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  const copyDoctorNote = async (note: string) => {
    try {
      await navigator.clipboard.writeText(note);
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white/30 backdrop-blur-lg rounded-2xl border border-white/30 p-4 sm:p-6 shadow-xl mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !insight) {
    return (
      <div className="bg-white/30 backdrop-blur-lg rounded-2xl border border-white/30 p-4 sm:p-6 shadow-xl mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Network className="h-8 w-8 text-pink-500" />
            <h3 className="text-2xl font-semibold text-[#8B7E74]">Your Insights This Week</h3>
          </div>
        </div>
        <p className="text-sm text-[#9A9A9A]">{error}</p>
      </div>
    );
  }

  // No insight available
  if (!insight) {
    return null;
  }

  const trendIcon = getTrendIcon(insight.trend);
  const trendColor = getTrendColor(insight.trend);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/30 backdrop-blur-lg rounded-2xl border border-white/30 p-4 sm:p-6 shadow-xl mb-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <Network className="h-8 w-8 text-pink-500 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl font-semibold text-[#8B7E74]">Your Insights This Week</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${trendColor}`}>
                {trendIcon} {insight.trend}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg text-[#6B6B6B] hover:bg-white/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          aria-label="Refresh insight"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Pattern Headline */}
      <div className="mb-4">
        <h4 className="text-lg sm:text-xl font-bold text-[#8B7E74] leading-tight">
          {renderBoldText(insight.patternHeadline)}
        </h4>
      </div>

      {/* The Why */}
      <div className="mb-4">
        <p className="text-[#6B6B6B] text-base leading-relaxed">
          {renderBoldText(insight.why)}
        </p>
      </div>

      {/* What's Working */}
      {insight.whatsWorking && (
        <div className="mb-4 p-3 rounded-xl bg-green-50/50 border border-green-200/50">
          <p className="text-green-700 text-sm font-medium">
            ✨ {renderBoldText(insight.whatsWorking)}
          </p>
        </div>
      )}

      {/* Action Steps */}
      <div className="mb-4">
        <h5 className="text-sm font-semibold text-[#8B7E74] mb-3">What You Can Try:</h5>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700 shrink-0 mt-0.5">
              Easy
            </span>
            <p className="text-[#6B6B6B] text-sm flex-1">{renderBoldText(insight.actionSteps.easy)}</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              Medium
            </span>
            <p className="text-[#6B6B6B] text-sm flex-1">{renderBoldText(insight.actionSteps.medium)}</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-2 py-1 rounded text-xs font-semibold bg-pink-100 text-pink-700 shrink-0 mt-0.5">
              Advanced
            </span>
            <p className="text-[#6B6B6B] text-sm flex-1">{renderBoldText(insight.actionSteps.advanced)}</p>
          </div>
        </div>
      </div>

      {/* Doctor Note */}
      <div className="mb-4 p-3 rounded-xl bg-blue-50/50 border border-blue-200/50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-700 mb-1">For Your Healthcare Provider:</p>
            <p className="text-blue-800 text-sm leading-relaxed">{insight.doctorNote}</p>
          </div>
          <button
            onClick={() => copyDoctorNote(insight.doctorNote)}
            className="p-1.5 rounded-lg hover:bg-blue-100/50 transition-colors shrink-0"
            aria-label="Copy doctor note"
          >
            {copiedNote ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-blue-600" />
            )}
          </button>
        </div>
      </div>

      {/* Why This Matters (Expandable) */}
      {insight.whyThisMatters && (
        <div className="border-t border-white/30 pt-4">
          <button
            onClick={toggleExpand}
            className="flex items-center gap-2 w-full text-left text-sm font-semibold text-[#8B7E74] hover:text-pink-600 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span>Why this matters</span>
          </button>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="text-[#6B6B6B] text-sm leading-relaxed mt-2 pl-6">
                  {renderBoldText(insight.whyThisMatters)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
