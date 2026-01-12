/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

export default function HealthSummaryButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatSeverity = (severity: number): string => {
    if (severity <= 1) return "Mild";
    if (severity <= 2) return "Moderate";
    return "Severe";
  };

  const formatTrend = (trend: string): string => {
    const lowerTrend = trend.toLowerCase();
    if (lowerTrend.includes("increas")) return "↑ Increasing";
    if (lowerTrend.includes("decreas")) return "↓ Decreasing";
    return "→ Stable";
  };

  const formatDateRange = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startFormatted = startDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    const endFormatted = endDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return `${startFormatted} - ${endFormatted}`;
  };

  const formatDateHeader = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // If same month, only show month once: "December 1 - 30, 2025"
    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      const month = startDate.toLocaleDateString("en-US", { month: "long" });
      const startDay = startDate.toLocaleDateString("en-US", { day: "numeric" });
      const endFormatted = endDate.toLocaleDateString("en-US", {
        day: "numeric",
        year: "numeric",
      });
      return `${month} ${startDay} - ${endFormatted}`;
    }
    
    // Different months: "December 1 - December 30, 2025"
    const startFormatted = startDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    const endFormatted = endDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return `${startFormatted} - ${endFormatted}`;
  };

  const generateProgressBar = (count: number, maxCount: number, maxLength: number = 30): string => {
    const ratio = maxCount > 0 ? count / maxCount : 0;
    const filled = Math.round(ratio * maxLength);
    return "█".repeat(filled) + "░".repeat(maxLength - filled);
  };

  const handleGenerateSummary = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch("/api/health-summary?days=30");
      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const { report } = await response.json();

      // Calculate max count for progress bars
      const maxSymptomCount = report.topSymptoms && report.topSymptoms.length > 0
        ? Math.max(...report.topSymptoms.map((s: any) => s.count))
        : 1;

      // Build report text with new format
      const reportText = `
───────────────────────────────────────────────────────────────
                      MY HEALTH SUMMARY
                      
                    ${report.userName || ""}
                ${formatDateHeader(report.dateRange.start, report.dateRange.end)}
───────────────────────────────────────────────────────────────

AT A GLANCE
───────────────────────────────────────────────────────────────
Days Tracked:        ${report.atAGlance.daysTracked} of ${report.atAGlance.totalDays} days (${report.atAGlance.trackingPercentage}%)
Symptoms Logged:     ${report.atAGlance.totalSymptoms} entries
Good Days:           ${report.atAGlance.goodDays} days 🎉
Most Common:         ${report.atAGlance.mostCommonSymptoms}
Typical Severity:    ${formatSeverity(report.atAGlance.typicalSeverity)}


${report.topSymptoms && report.topSymptoms.length > 0 ? `YOUR TOP SYMPTOMS
───────────────────────────────────────────────────────────────

${report.topSymptoms.map((symptom: any, index: number) => {
  const progressBar = generateProgressBar(symptom.count, maxSymptomCount);
  const trend = formatTrend(symptom.trend);
  const mostSeverity = formatSeverity(symptom.mostSeverity);
  return `${symptom.name.padEnd(48)}${symptom.count} times
${progressBar}                     Most: ${mostSeverity}
Trend: ${trend}`;
}).join("\n\n")}

` : ""}${report.patterns && report.patterns.length > 0 ? `PATTERNS FOUND
───────────────────────────────────────────────────────────────

${report.patterns.map((pattern: string) => `  • ${pattern}`).join("\n")}

` : `PATTERNS FOUND
───────────────────────────────────────────────────────────────

  Keep tracking - patterns become clearer with more data.

`}${report.weekByWeek && report.weekByWeek.weeks.length > 0 ? `WEEK BY WEEK
───────────────────────────────────────────────────────────────

         ${report.weekByWeek.weeks.map((w: any) => `Week ${w.week}`).join("    ")}
         ${report.weekByWeek.weeks.map(() => "──────").join("    ")}
Symptoms    ${report.weekByWeek.weeks.map((w: any) => `${w.symptoms}`.padEnd(6)).join("    ")} ${report.weekByWeek.symptomTrend}
Avg Sev.    ${report.weekByWeek.weeks.map((w: any) => `${w.avgSeverity}`.padEnd(6)).join("    ")} ${report.weekByWeek.severityTrend}
Good Days   ${report.weekByWeek.weeks.map((w: any) => `${w.goodDays}`.padEnd(6)).join("    ")} ${report.weekByWeek.goodDaysTrend}

` : ""}${report.triggers && report.triggers.length > 0 ? `COMMON TRIGGERS
───────────────────────────────────────────────────────────────

${report.triggers.map((trigger: any) => `  ${trigger.name.padEnd(20)} appeared in ${trigger.percentage}% of symptom logs`).join("\n")}

` : `COMMON TRIGGERS
───────────────────────────────────────────────────────────────

  No triggers logged yet. Adding triggers helps identify patterns.

`}THINGS TO EXPLORE
───────────────────────────────────────────────────────────────

${report.exploreItems.map((item: string, i: number) => `  □ ${item}`).join("\n")}


───────────────────────────────────────────────────────────────
Generated by MenoLisa • ${new Date().toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
})}

This summary is for personal reference only and does not 
constitute medical advice. Consult a healthcare provider 
for medical concerns.
───────────────────────────────────────────────────────────────
      `.trim();

      // Create and download file
      const blob = new Blob([reportText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `health-summary-${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleGenerateSummary}
        disabled={isGenerating}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-card/40 hover:bg-card/60 backdrop-blur-md text-foreground font-medium rounded-lg transition-colors border border-border/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <FileText className="h-3.5 w-3.5 animate-pulse" />
            Generating...
          </>
        ) : (
          <>
            <Download className="h-3.5 w-3.5" />
            Get Summary
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-sm text-primary">{error}</p>
      )}
    </div>
  );
}

