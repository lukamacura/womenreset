"use client";

import { useMemo } from "react";
import type { Symptom } from "./SymptomList";
import { Calendar, Heart, AlertCircle, TrendingUp, Activity as ActivityIcon } from "lucide-react";

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

    // Calculate symptoms per week for progress indication
    const symptomsPerWeek = dateRange > 0 ? (totalCount / dateRange) * 7 : 0;

    return {
      totalCount,
      averageSeverity,
      topSymptoms,
      symptomsPerWeek,
    };
  }, [symptoms, dateRange]);

  // Calculate progress percentage for visual bars
  const maxSymptoms = Math.max(stats.totalCount, 10);
  const symptomsProgress = Math.min(100, (stats.totalCount / maxSymptoms) * 100);
  const severityProgress = parseFloat(stats.averageSeverity) * 10; // Convert 0-10 to 0-100

  return (
    <div className="space-y-6">
      {/* Modern Date Range Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        
        {([7, 30, 90] as DateRange[]).map((range) => (
          <button
            key={range}
            onClick={() => onDateRangeChange(range)}
            className={`
              relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2
              ${
                dateRange === range
                  ? "bg-linear-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/30 scale-105"
                  : "bg-white/60 text-muted-foreground hover:bg-white/80 hover:text-foreground border border-foreground/10"
              }
            `}
          >
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {range} days
          </button>
        ))}
      </div>

      {/* Modern Stats Cards with Visual Progress */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Symptoms Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-primary-light/30 via-primary-light/20 to-white border-2 border-primary-light/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-linear-to-br from-primary to-primary-dark shadow-md">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            
            <div className="mb-3">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Total Symptoms
              </div>
              <div className="text-4xl font-extrabold text-foreground tracking-tight">
                {stats.totalCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Last {dateRange} days
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-2 w-full bg-primary-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-primary to-primary-dark rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${symptomsProgress}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                {stats.symptomsPerWeek.toFixed(1)} symptoms/week avg
              </div>
            </div>
          </div>
        </div>

        {/* Average Severity Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-red-50 via-red-100/50 to-white border-2 border-red-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 sm:col-span-2 lg:col-span-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-red-400/20 to-transparent rounded-full blur-2xl" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-linear-to-br from-red-500 to-red-600 shadow-md">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <TrendingUp className="h-5 w-5 text-red-500" />
            </div>
            
            <div className="mb-3">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Average Severity
              </div>
              <div className="text-4xl font-extrabold text-foreground tracking-tight">
                {stats.averageSeverity}
                <span className="text-lg text-muted-foreground ml-1">/10</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                across all symptoms
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-2 w-full bg-red-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-red-500 to-red-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${severityProgress}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                Severity level
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Most Frequent Symptoms Card */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white via-primary-light/20 to-white border-2 border-primary-light/50 p-6 shadow-lg">
        <div className="absolute top-0 right-0 w-40 h-40 bg-linear-to-br from-purple-300/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-lg bg-linear-to-br from-gold to-primary">
              <ActivityIcon className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Most Frequent Symptoms</h3>
          </div>

          {stats.topSymptoms.length > 0 ? (
            <div className="space-y-4">
              {stats.topSymptoms.map((item) => {
                const percentage = stats.totalCount > 0 ? (item.count / stats.totalCount) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-foreground/5">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">
                            {item.name}
                          </span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-foreground">
                        {item.count}x
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-red-500/20 to-red-600/10 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex p-4 rounded-full bg-foreground/5 mb-3">
                <ActivityIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No symptom data yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start logging symptoms to see your stats</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
