"use client";

import { useMemo } from "react";
import { Calendar, TrendingUp, TrendingDown, Minus, Smile, Meh, Frown } from "lucide-react";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useDailyMoodRange } from "@/hooks/useDailyMoodRange";

// Convert numeric severity to human-readable with icon
function getSeverityLabel(avgSeverity: number): { label: string; icon: typeof Smile } {
  if (avgSeverity === 0 || !avgSeverity) return { label: "None", icon: Minus };
  if (avgSeverity >= 1.0 && avgSeverity < 1.5) return { label: "Mild", icon: Smile };
  if (avgSeverity >= 1.5 && avgSeverity < 2.5) return { label: "Moderate", icon: Meh };
  if (avgSeverity >= 2.5 && avgSeverity <= 3.0) return { label: "Severe", icon: Frown };
  return { label: "None", icon: Minus };
}

// Generate contextual insight
function generateInsight(comparison: {
  thisWeekSymptomDays: number;
  lastWeekSymptomDays: number;
  thisWeekAvgSeverity: number;
  lastWeekAvgSeverity: number;
  thisWeekPositiveDays: number;
  lastWeekPositiveDays: number;
  severityChange: number;
  symptomDaysChange: number;
  positiveDaysChange: number;
}): string {
  // Check for significant improvements
  const severityImproved = comparison.severityChange < -10; // More than 10% decrease
  const symptomDaysImproved = comparison.symptomDaysChange < -20; // More than 20% fewer days
  const positiveDaysImproved = comparison.positiveDaysChange > 20; // More than 20% increase

  if (severityImproved && comparison.lastWeekAvgSeverity >= 2.5 && comparison.thisWeekAvgSeverity < 2.5) {
    const lastWeekLabel = getSeverityLabel(comparison.lastWeekAvgSeverity);
    const thisWeekLabel = getSeverityLabel(comparison.thisWeekAvgSeverity);
    return `Your severity dropped from ${lastWeekLabel.label} to ${thisWeekLabel.label} - that's real improvement!`;
  }

  if (positiveDaysImproved && comparison.thisWeekPositiveDays > comparison.lastWeekPositiveDays) {
    return `${comparison.thisWeekPositiveDays} good days this week vs ${comparison.lastWeekPositiveDays} last week - you're trending up!`;
  }

  if (symptomDaysImproved && comparison.thisWeekSymptomDays < comparison.lastWeekSymptomDays) {
    return `Your symptoms are down from last week - nice progress!`;
  }

  // Check if things got worse
  const severityWorse = comparison.severityChange > 10;
  const symptomDaysWorse = comparison.symptomDaysChange > 20;
  const positiveDaysWorse = comparison.positiveDaysChange < -20;

  if (severityWorse || symptomDaysWorse) {
    return "Tougher week than last. Lisa is watching for what might be triggering this.";
  }

  if (positiveDaysWorse && comparison.thisWeekPositiveDays === 0) {
    return "Symptoms up this week. Hang in there - tracking helps find answers.";
  }

  // Similar week
  const isSimilar = Math.abs(comparison.severityChange) < 10 && 
                    Math.abs(comparison.symptomDaysChange) < 20 &&
                    Math.abs(comparison.positiveDaysChange) < 20;

  if (isSimilar && (comparison.thisWeekSymptomDays > 0 || comparison.lastWeekSymptomDays > 0)) {
    return "Similar week to last. Keep tracking to spot patterns.";
  }

  // Default encouragement
  return "Keep tracking - patterns become clearer with more data.";
}

export default function WeekComparison() {
  const { logs, loading: logsLoading } = useSymptomLogs(14);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - 6);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

  const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];
  const thisWeekEndStr = now.toISOString().split('T')[0];
  const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
  const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0];

  const { moods: thisWeekMoods, loading: thisWeekMoodsLoading } = useDailyMoodRange(thisWeekStartStr, thisWeekEndStr);
  const { moods: lastWeekMoods, loading: lastWeekMoodsLoading } = useDailyMoodRange(lastWeekStartStr, lastWeekEndStr);

  const loading = logsLoading || thisWeekMoodsLoading || lastWeekMoodsLoading;

  const comparison = useMemo(() => {
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

    const thisWeekSymptomDays = new Set(
      thisWeekLogs.map(log => {
        const d = new Date(log.logged_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    ).size;

    const lastWeekSymptomDays = new Set(
      lastWeekLogs.map(log => {
        const d = new Date(log.logged_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    ).size;

    const thisWeekAvgSeverity = thisWeekLogs.length > 0
      ? thisWeekLogs.reduce((sum, log) => sum + log.severity, 0) / thisWeekLogs.length
      : 0;
    const lastWeekAvgSeverity = lastWeekLogs.length > 0
      ? lastWeekLogs.reduce((sum, log) => sum + log.severity, 0) / lastWeekLogs.length
      : 0;

    const thisWeekPositiveDays = thisWeekMoods.filter(mood => mood.mood >= 3).length;
    const lastWeekPositiveDays = lastWeekMoods.filter(mood => mood.mood >= 3).length;

    const thisWeekSymptomCounts = new Map<string, number>();
    thisWeekLogs.forEach(log => {
      const name = log.symptoms?.name || "Unknown";
      thisWeekSymptomCounts.set(name, (thisWeekSymptomCounts.get(name) || 0) + 1);
    });
    const thisWeekMostFrequent = Array.from(thisWeekSymptomCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    const lastWeekSymptomCounts = new Map<string, number>();
    lastWeekLogs.forEach(log => {
      const name = log.symptoms?.name || "Unknown";
      lastWeekSymptomCounts.set(name, (lastWeekSymptomCounts.get(name) || 0) + 1);
    });
    const lastWeekMostFrequent = Array.from(lastWeekSymptomCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    const symptomDaysChange = lastWeekSymptomDays > 0
      ? Math.round(((thisWeekSymptomDays - lastWeekSymptomDays) / lastWeekSymptomDays) * 100)
      : (thisWeekSymptomDays > 0 ? 100 : 0);

    const severityChange = lastWeekAvgSeverity > 0
      ? Math.round(((thisWeekAvgSeverity - lastWeekAvgSeverity) / lastWeekAvgSeverity) * 100)
      : 0;

    const positiveDaysChange = lastWeekPositiveDays > 0
      ? Math.round(((thisWeekPositiveDays - lastWeekPositiveDays) / lastWeekPositiveDays) * 100)
      : (thisWeekPositiveDays > 0 ? 100 : 0);

    return {
      thisWeekSymptomDays,
      lastWeekSymptomDays,
      symptomDaysChange,
      thisWeekAvgSeverity: Math.round(thisWeekAvgSeverity * 10) / 10,
      lastWeekAvgSeverity: Math.round(lastWeekAvgSeverity * 10) / 10,
      severityChange,
      thisWeekPositiveDays,
      lastWeekPositiveDays,
      positiveDaysChange,
      thisWeekMostFrequent: thisWeekMostFrequent?.[0] || null,
      thisWeekMostFrequentCount: thisWeekMostFrequent?.[1] || 0,
      lastWeekMostFrequent: lastWeekMostFrequent?.[0] || null,
      lastWeekMostFrequentCount: lastWeekMostFrequent?.[1] || 0,
      totalThisWeekLogs: thisWeekLogs.length,
      totalLastWeekLogs: lastWeekLogs.length,
    };
  }, [logs, thisWeekMoods, lastWeekMoods, thisWeekStart, lastWeekStart, lastWeekEnd]);

  if (loading) {
    return (
      <div className="bg-card backdrop-blur-lg rounded-2xl border border-border/30 p-6 mb-6 shadow-xl">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-card/60 rounded mb-4" />
          <div className="h-32 w-full bg-card/60 rounded" />
        </div>
      </div>
    );
  }

  // Empty state - no data at all
  if (comparison.totalThisWeekLogs === 0 && comparison.totalLastWeekLogs === 0) {
    return (
      <div className="bg-card backdrop-blur-lg rounded-2xl border border-border/30 p-4 sm:p-6 mb-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-card-foreground" />
          <h3 className="text-lg sm:text-xl font-semibold text-card-foreground">
            Your Week
          </h3>
        </div>
        <p className="text-base text-muted-foreground mb-2">
          No symptoms logged yet.
        </p>
        <p className="text-sm text-muted-foreground/70">
          Start tracking to see weekly insights and patterns.
        </p>
      </div>
    );
  }

  // First Week View - no previous data
  if (comparison.totalLastWeekLogs === 0 && comparison.totalThisWeekLogs > 0) {
    return (
      <div className="bg-card backdrop-blur-lg rounded-2xl border border-border/30 p-4 sm:p-6 mb-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-card-foreground" />
          <h3 className="text-lg sm:text-xl font-semibold text-card-foreground">
            Your First Week
          </h3>
        </div>
        <p className="text-base text-card-foreground mb-4">
          You've logged on <span className="font-semibold">{comparison.thisWeekSymptomDays}</span> day{comparison.thisWeekSymptomDays !== 1 ? 's' : ''} so far - great start!
        </p>
        {comparison.thisWeekMostFrequent && (
          <div className="space-y-2 mb-4">
            <div className="text-sm text-muted-foreground">
              Most common symptom: <span className="font-medium text-card-foreground">{comparison.thisWeekMostFrequent} ({comparison.thisWeekMostFrequentCount}x)</span>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              Average severity: <span className="font-medium text-card-foreground flex items-center gap-1.5">
                {(() => {
                  const severity = getSeverityLabel(comparison.thisWeekAvgSeverity);
                  const Icon = severity.icon;
                  return (
                    <>
                      <Icon className="h-4 w-4" />
                      <span>{severity.label}</span>
                    </>
                  );
                })()}
              </span>
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground/70">
          Keep tracking - next week you'll see your first comparison!
        </p>
      </div>
    );
  }

  // Normal Comparison View
  const insight = generateInsight(comparison);
  const showPositiveDays = comparison.thisWeekPositiveDays > 0 || comparison.lastWeekPositiveDays > 0;

  const getChangeDisplay = (change: number, isPositiveMetric: boolean) => {
    if (change > 0) {
      return {
        icon: <TrendingUp className="h-4 w-4" />,
        text: isPositiveMetric ? "↑ Nice!" : "↑ More",
        color: isPositiveMetric ? "text-green-600" : "text-orange-600",
      };
    } else if (change < 0) {
      return {
        icon: <TrendingDown className="h-4 w-4" />,
        text: isPositiveMetric ? "↓ Fewer" : "↓ Better",
        color: isPositiveMetric ? "text-orange-600" : "text-green-600",
      };
    }
    return {
      icon: <Minus className="h-4 w-4" />,
      text: "Same",
      color: "text-[#9A9A9A]",
    };
  };

  const symptomDaysChange = getChangeDisplay(comparison.symptomDaysChange, false);
  const severityChange = getChangeDisplay(comparison.severityChange, false);
  const positiveDaysChange = getChangeDisplay(comparison.positiveDaysChange, true);

  return (
    <div className="bg-card backdrop-blur-lg rounded-2xl border border-border/30 p-4 sm:p-6 mb-6 shadow-xl transition-all duration-300 hover:shadow-2xl">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-5 w-5 text-[#8B7E74]" />
        <h3 className="text-lg sm:text-xl font-semibold text-[#8B7E74]">
          This Week vs Last Week
        </h3>
      </div>

      {/* Insight line */}
      <p className="text-base text-[#3D3D3D] mb-4 font-medium">
        {insight}
      </p>

      {/* Desktop: Table layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8E0DB]">
              <th className="text-left py-2 text-muted-foreground font-medium"></th>
              <th className="text-right py-2 text-card-foreground font-semibold">This Week</th>
              <th className="text-right py-2 text-card-foreground font-semibold">Last Week</th>
              <th className="text-right py-2 text-card-foreground font-semibold">Change</th>
            </tr>
          </thead>
          <tbody className="text-base">
            <tr className="border-b border-[#E8E0DB]/50">
              <td className="py-3 text-muted-foreground">Days with symptoms</td>
              <td className="py-3 text-right font-medium text-card-foreground">{comparison.thisWeekSymptomDays}</td>
              <td className="py-3 text-right font-medium text-card-foreground">{comparison.lastWeekSymptomDays}</td>
              <td className="py-3 text-right font-medium flex items-center justify-end gap-1">
                <span className={symptomDaysChange.color}>{symptomDaysChange.icon}</span>
                <span className={symptomDaysChange.color}>{symptomDaysChange.text}</span>
              </td>
            </tr>
            <tr className="border-b border-[#E8E0DB]/50">
              <td className="py-3 text-[#6B6B6B]">Average severity</td>
              <td className="py-3 text-right font-medium text-card-foreground">
                <div className="flex items-center justify-end gap-1.5">
                  {(() => {
                    const severity = getSeverityLabel(comparison.thisWeekAvgSeverity);
                    const Icon = severity.icon;
                    return (
                      <>
                        <Icon className="h-4 w-4" />
                        <span>{severity.label}</span>
                      </>
                    );
                  })()}
                </div>
              </td>
              <td className="py-3 text-right font-medium text-card-foreground">
                <div className="flex items-center justify-end gap-1.5">
                  {(() => {
                    const severity = getSeverityLabel(comparison.lastWeekAvgSeverity);
                    const Icon = severity.icon;
                    return (
                      <>
                        <Icon className="h-4 w-4" />
                        <span>{severity.label}</span>
                      </>
                    );
                  })()}
                </div>
              </td>
              <td className="py-3 text-right font-medium flex items-center justify-end gap-1">
                <span className={severityChange.color}>{severityChange.icon}</span>
                <span className={severityChange.color}>{severityChange.text}</span>
              </td>
            </tr>
            {showPositiveDays && (
              <tr className="border-b border-[#E8E0DB]/50">
                <td className="py-3 text-[#6B6B6B]">Good days</td>
                <td className="py-3 text-right font-medium text-card-foreground">{comparison.thisWeekPositiveDays}</td>
                <td className="py-3 text-right font-medium text-card-foreground">{comparison.lastWeekPositiveDays}</td>
                <td className="py-3 text-right font-medium flex items-center justify-end gap-1">
                  <span className={positiveDaysChange.color}>{positiveDaysChange.icon}</span>
                  <span className={positiveDaysChange.color}>{positiveDaysChange.text}</span>
                </td>
              </tr>
            )}
            <tr>
              <td className="py-3 text-muted-foreground">Most frequent</td>
              <td className="py-3 text-right font-medium text-card-foreground">
                {comparison.thisWeekMostFrequent || "None"}
                {comparison.thisWeekMostFrequentCount > 0 && (
                  <span className="text-xs text-muted-foreground/70 ml-1">({comparison.thisWeekMostFrequentCount}x)</span>
                )}
              </td>
              <td className="py-3 text-right font-medium text-card-foreground">
                {comparison.lastWeekMostFrequent || "None"}
                {comparison.lastWeekMostFrequentCount > 0 && (
                  <span className="text-xs text-[#9A9A9A] ml-1">({comparison.lastWeekMostFrequentCount}x)</span>
                )}
              </td>
              <td className="py-3 text-right font-medium">
                {comparison.thisWeekMostFrequent === comparison.lastWeekMostFrequent 
                  ? <span className="text-muted-foreground/70">Same</span>
                  : comparison.lastWeekMostFrequent === null
                  ? <span className="text-muted-foreground/70">New</span>
                  : <span className="text-muted-foreground/70">Changed</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile: Card layout */}
      <div className="md:hidden space-y-3">
        <div className="border-b border-[#E8E0DB]/50 pb-3">
          <div className="text-sm text-muted-foreground mb-2">Days with symptoms</div>
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div>
                <div className="text-xs text-muted-foreground/70">This Week</div>
                <div className="text-base font-medium text-card-foreground">{comparison.thisWeekSymptomDays}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground/70">Last Week</div>
                <div className="text-base font-medium text-card-foreground">{comparison.lastWeekSymptomDays}</div>
              </div>
            </div>
            <div className="text-right flex items-center gap-1">
              <span className={symptomDaysChange.color}>{symptomDaysChange.icon}</span>
              <span className={`${symptomDaysChange.color} text-sm`}>{symptomDaysChange.text}</span>
            </div>
          </div>
        </div>
        <div className="border-b border-[#E8E0DB]/50 pb-3">
          <div className="text-sm text-muted-foreground mb-2">Average severity</div>
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div>
                <div className="text-xs text-[#9A9A9A]">This Week</div>
                <div className="text-base font-medium text-card-foreground flex items-center gap-1.5">
                  {(() => {
                    const severity = getSeverityLabel(comparison.thisWeekAvgSeverity);
                    const Icon = severity.icon;
                    return (
                      <>
                        <Icon className="h-4 w-4" />
                        <span>{severity.label}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#9A9A9A]">Last Week</div>
                <div className="text-base font-medium text-card-foreground flex items-center gap-1.5">
                  {(() => {
                    const severity = getSeverityLabel(comparison.lastWeekAvgSeverity);
                    const Icon = severity.icon;
                    return (
                      <>
                        <Icon className="h-4 w-4" />
                        <span>{severity.label}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="text-right flex items-center gap-1">
              <span className={severityChange.color}>{severityChange.icon}</span>
              <span className={`${severityChange.color} text-sm`}>{severityChange.text}</span>
            </div>
          </div>
        </div>
        {showPositiveDays && (
          <div className="border-b border-[#E8E0DB]/50 pb-3">
            <div className="text-sm text-muted-foreground mb-2">Good days</div>
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <div>
                  <div className="text-xs text-[#9A9A9A]">This Week</div>
                  <div className="text-base font-medium text-card-foreground">{comparison.thisWeekPositiveDays}</div>
                </div>
                <div>
                  <div className="text-xs text-[#9A9A9A]">Last Week</div>
                  <div className="text-base font-medium text-[#3D3D3D]">{comparison.lastWeekPositiveDays}</div>
                </div>
              </div>
              <div className="text-right flex items-center gap-1">
                <span className={positiveDaysChange.color}>{positiveDaysChange.icon}</span>
                <span className={`${positiveDaysChange.color} text-sm`}>{positiveDaysChange.text}</span>
              </div>
            </div>
          </div>
        )}
        <div className="pb-3">
          <div className="text-sm text-muted-foreground mb-2">Most frequent</div>
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div>
                <div className="text-xs text-[#9A9A9A]">This Week</div>
                <div className="text-base font-medium text-card-foreground truncate max-w-[100px]">
                  {comparison.thisWeekMostFrequent || "None"}
                  {comparison.thisWeekMostFrequentCount > 0 && (
                    <span className="text-xs text-muted-foreground/70 ml-1">({comparison.thisWeekMostFrequentCount}x)</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#9A9A9A]">Last Week</div>
                <div className="text-base font-medium text-card-foreground truncate max-w-[100px]">
                  {comparison.lastWeekMostFrequent || "None"}
                  {comparison.lastWeekMostFrequentCount > 0 && (
                    <span className="text-xs text-[#9A9A9A] ml-1">({comparison.lastWeekMostFrequentCount}x)</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              {comparison.thisWeekMostFrequent === comparison.lastWeekMostFrequent 
                ? <span className="text-muted-foreground/70 text-sm">Same</span>
                : comparison.lastWeekMostFrequent === null
                ? <span className="text-muted-foreground/70 text-sm">New</span>
                : <span className="text-muted-foreground/70 text-sm">Changed</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Footer encouragement */}
      <div className="mt-4 pt-4 border-t border-[#E8E0DB]">
        <p className="text-sm text-muted-foreground/70">
          Keep tracking to identify patterns.
        </p>
      </div>
    </div>
  );
}
