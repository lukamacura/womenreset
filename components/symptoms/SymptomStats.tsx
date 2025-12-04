"use client";

import { useMemo } from "react";
import type { Symptom } from "./SymptomList";

type DateRange = 7 | 30 | 90;

type SymptomStatsProps = {
  symptoms: Symptom[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
};

export default function SymptomStats({
  symptoms,
  dateRange,
  onDateRangeChange,
}: SymptomStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - dateRange);
    startDate.setHours(0, 0, 0, 0);

    const filteredSymptoms = symptoms.filter((s) => {
      const occurredAt = new Date(s.occurred_at);
      return occurredAt >= startDate;
    });

    const totalCount = filteredSymptoms.length;

    const averageSeverity =
      filteredSymptoms.length > 0
        ? (
            filteredSymptoms.reduce((sum, s) => sum + s.severity, 0) /
            filteredSymptoms.length
          ).toFixed(1)
        : "0";

    // Count frequency of each symptom name
    const frequencyMap = new Map<string, number>();
    filteredSymptoms.forEach((s) => {
      const count = frequencyMap.get(s.name) || 0;
      frequencyMap.set(s.name, count + 1);
    });

    // Get top 3 most frequent
    const topSymptoms = Array.from(frequencyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return {
      totalCount,
      averageSeverity,
      topSymptoms,
    };
  }, [symptoms, dateRange]);

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Viewing:
        </span>
        {([7, 30, 90] as DateRange[]).map((range) => (
          <button
            key={range}
            onClick={() => onDateRangeChange(range)}
            className={`
              rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
              ${
                dateRange === range
                  ? "bg-primary/20 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              }
            `}
          >
            Last {range} days
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Count */}
        <div className="rounded-xl border border-foreground/10 bg-background/60 p-5">
          <div className="text-sm text-muted-foreground mb-1">
            Total Symptoms
          </div>
          <div className="text-3xl font-bold text-foreground">
            {stats.totalCount}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            in the last {dateRange} days
          </div>
        </div>

        {/* Average Severity */}
        <div className="rounded-xl border border-foreground/10 bg-background/60 p-5">
          <div className="text-sm text-muted-foreground mb-1">
            Average Severity
          </div>
          <div className="text-3xl font-bold text-foreground">
            {stats.averageSeverity}
            <span className="text-lg text-muted-foreground">/10</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            across all symptoms
          </div>
        </div>

        {/* Top Symptoms */}
        <div className="rounded-xl border border-foreground/10 bg-background/60 p-5">
          <div className="text-sm text-muted-foreground mb-3">
            Most Frequent
          </div>
          {stats.topSymptoms.length > 0 ? (
            <div className="space-y-2">
              {stats.topSymptoms.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground truncate flex-1">
                    {index + 1}. {item.name}
                  </span>
                  <span className="ml-2 text-muted-foreground font-medium">
                    {item.count}x
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

