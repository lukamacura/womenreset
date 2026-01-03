"use client";

import { useState, useEffect, useMemo } from "react";
import { Lightbulb, RefreshCw, Link2 } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[#E8E0DB]/30 ${className}`} />;
}

interface InsightSection {
  type: "pattern" | "tryThis";
  content: string;
}

// Parse the insight text into sections
function parseInsight(insightText: string): InsightSection[] {
  const sections: InsightSection[] = [];
  
  // Match sections using **Pattern:** and **Try this:** format
  // NOTE: Remove the 's' RegExp flag to be compatible with ES2020 or lower
  const patternMatch = insightText.match(/\*\*Pattern:\*\*\s*([\s\S]+?)(?=\*\*Try this:\*\*|$)/i);
  const tryThisMatch = insightText.match(/\*\*Try this:\*\*\s*([\s\S]+?)$/i);

  if (patternMatch) {
    // Clean up content: remove trailing numbers/periods and trim whitespace
    let content = patternMatch[1].trim();
    // Remove trailing patterns like "2." or "2. " at the end
    content = content.replace(/\s*\d+\.\s*$/, '').trim();
    sections.push({
      type: "pattern",
      content,
    });
  }
  
  if (tryThisMatch) {
    let content = tryThisMatch[1].trim();
    // Remove trailing patterns like "2." or "2. " at the end
    content = content.replace(/\s*\d+\.\s*$/, '').trim();
    sections.push({
      type: "tryThis",
      content,
    });
  }
  
  // Fallback: if no sections found, treat entire text as pattern (backward compatibility)
  if (sections.length === 0) {
    sections.push({
      type: "pattern",
      content: insightText.trim(),
    });
  }
  
  return sections;
}

// Render text with bold formatting
function renderBoldText(text: string) {
  // Split by **bold** markers and render accordingly
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      return <strong key={index}>{boldText}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

export default function WhatLisaNoticed() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const parsedSections = useMemo(() => {
    if (!insight) return [];
    return parseInsight(insight);
  }, [insight]);

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

      const { insight: insightText } = await response.json();
      setInsight(insightText || null);
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

  // Loading state
  if (loading) {
    return (
      <div className="bg-white/30 backdrop-blur-lg rounded-2xl border border-white/30 p-4 sm:p-6 shadow-xl mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
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
            <Lightbulb className="h-6 w-6 text-amber-500" />
            <h3 className="text-2xl font-semibold text-[#8B7E74]">What Lisa Noticed</h3>
          </div>
        </div>
        <p className="text-sm text-[#9A9A9A]">{error}</p>
      </div>
    );
  }

  // No insight available
  if (!insight || parsedSections.length === 0) {
    return null;
  }

  const getSectionIcon = (type: InsightSection["type"]) => {
    switch (type) {
      case "pattern":
        return Link2;
      case "tryThis":
        return Lightbulb;
      default:
        return Lightbulb;
    }
  };

  const getSectionLabel = (type: InsightSection["type"]) => {
    switch (type) {
      case "pattern":
        return "Pattern:";
      case "tryThis":
        return "Try this:";
      default:
        return "";
    }
  };

  return (
    <div className="bg-white/30 backdrop-blur-lg rounded-2xl border border-white/30 p-4 sm:p-6 shadow-xl mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-8 w-8 text-pink-500" />
          <h3 className="text-2xl font-semibold text-[#8B7E74]">What Lisa Noticed</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg text-[#6B6B6B] hover:bg-white/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Refresh insight"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>
      
      <div className="space-y-4">
        {parsedSections.map((section, index) => {
          const Icon = getSectionIcon(section.type);
          const label = getSectionLabel(section.type);
          
          return (
            <div key={index} className="flex items-start gap-3">
              <Icon className="h-6 w-6 text-pink-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold text-[#6B6B6B]">{label} </span>
                <span className="text-[#6B6B6B] text-lg leading-relaxed">
                  {renderBoldText(section.content)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
