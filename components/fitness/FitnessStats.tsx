"use client";

import { useMemo } from "react";
import type { Fitness } from "./FitnessList";

type DateRange = 7 | 30 | 90;

type FitnessStatsProps = {
  fitness: Fitness[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
};

export default function FitnessStats({
  fitness,
  dateRange,
  onDateRangeChange,
}: FitnessStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - dateRange);
    startDate.setHours(0, 0, 0, 0);

    const filteredFitness = fitness.filter((f) => {
      const performedAt = new Date(f.performed_at);
      return performedAt >= startDate;
    });

    const totalCount = filteredFitness.length;

    // Calculate total duration
    const entriesWithDuration = filteredFitness.filter((f) => f.duration_minutes !== null);
    const totalDuration = entriesWithDuration.reduce((sum, f) => sum + (f.duration_minutes || 0), 0);

    // Calculate average calories burned per day
    const entriesWithCalories = filteredFitness.filter((f) => f.calories_burned !== null);
    const totalCalories = entriesWithCalories.reduce((sum, f) => sum + (f.calories_burned || 0), 0);
    const daysWithEntries = new Set(
      filteredFitness.map((f) => {
        const date = new Date(f.performed_at);
        return date.toISOString().split("T")[0];
      })
    ).size;
    
    const averageCaloriesPerDay =
      daysWithEntries > 0 && entriesWithCalories.length > 0
        ? Math.round(totalCalories / daysWithEntries)
        : 0;

    // Count frequency of each exercise type
    const exerciseTypeMap = new Map<string, number>();
    filteredFitness.forEach((f) => {
      const count = exerciseTypeMap.get(f.exercise_type) || 0;
      exerciseTypeMap.set(f.exercise_type, count + 1);
    });

    // Get top 3 most frequent exercise types
    const topExerciseTypes = Array.from(exerciseTypeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([exerciseType, count]) => ({ exerciseType, count }));

    return {
      totalCount,
      totalDuration,
      averageCaloriesPerDay,
      topExerciseTypes,
      hasDurationData: entriesWithDuration.length > 0,
      hasCalorieData: entriesWithCalories.length > 0,
    };
  }, [fitness, dateRange]);

  const formatExerciseType = (exerciseType: string) => {
    return exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

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
            Total Workouts
          </div>
          <div className="text-3xl font-bold text-foreground">
            {stats.totalCount}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            in the last {dateRange} days
          </div>
        </div>

        {/* Total Duration */}
        <div className="rounded-xl border border-foreground/10 bg-background/60 p-5">
          <div className="text-sm text-muted-foreground mb-1">
            Total Duration
          </div>
          <div className="text-3xl font-bold text-foreground">
            {stats.hasDurationData ? formatDuration(stats.totalDuration) : "—"}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {stats.hasDurationData
              ? "across all workouts"
              : "no duration data"}
          </div>
        </div>

        {/* Average Calories per Day */}
        <div className="rounded-xl border border-foreground/10 bg-background/60 p-5">
          <div className="text-sm text-muted-foreground mb-1">
            Avg Calories/Day
          </div>
          <div className="text-3xl font-bold text-foreground">
            {stats.hasCalorieData ? stats.averageCaloriesPerDay : "—"}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {stats.hasCalorieData
              ? "across tracked days"
              : "no calorie data"}
          </div>
        </div>
      </div>

      {/* Most Frequent Exercise Types */}
      <div className="rounded-xl border border-foreground/10 bg-background/60 p-5">
        <div className="text-sm text-muted-foreground mb-3">
          Most Frequent Exercise Types
        </div>
        {stats.topExerciseTypes.length > 0 ? (
          <div className="space-y-2">
            {stats.topExerciseTypes.map((item, index) => (
              <div
                key={item.exerciseType}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-foreground truncate flex-1">
                  {index + 1}. {formatExerciseType(item.exerciseType)}
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
  );
}

