"use client";

import { useMemo } from "react";
import type { Nutrition } from "./NutritionList";

type DateRange = 7 | 30 | 90;

type NutritionStatsProps = {
  nutrition: Nutrition[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
};

export default function NutritionStats({
  nutrition,
  dateRange,
  onDateRangeChange,
}: NutritionStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - dateRange);
    startDate.setHours(0, 0, 0, 0);

    const filteredNutrition = nutrition.filter((n) => {
      const consumedAt = new Date(n.consumed_at);
      return consumedAt >= startDate;
    });

    const totalCount = filteredNutrition.length;

    // Calculate average calories per day
    const entriesWithCalories = filteredNutrition.filter((n) => n.calories !== null);
    const totalCalories = entriesWithCalories.reduce((sum, n) => sum + (n.calories || 0), 0);
    const daysWithEntries = new Set(
      filteredNutrition.map((n) => {
        const date = new Date(n.consumed_at);
        return date.toISOString().split("T")[0];
      })
    ).size;
    
    const averageCaloriesPerDay =
      daysWithEntries > 0 && entriesWithCalories.length > 0
        ? Math.round(totalCalories / daysWithEntries)
        : 0;

    // Count frequency of each meal type
    const mealTypeMap = new Map<string, number>();
    filteredNutrition.forEach((n) => {
      const count = mealTypeMap.get(n.meal_type) || 0;
      mealTypeMap.set(n.meal_type, count + 1);
    });

    // Get top 3 most frequent meal types
    const topMealTypes = Array.from(mealTypeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([mealType, count]) => ({ mealType, count }));

    return {
      totalCount,
      averageCaloriesPerDay,
      topMealTypes,
      hasCalorieData: entriesWithCalories.length > 0,
    };
  }, [nutrition, dateRange]);

  const formatMealType = (mealType: string) => {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
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
            Total Entries
          </div>
          <div className="text-3xl font-bold text-foreground">
            {stats.totalCount}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            in the last {dateRange} days
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

        {/* Top Meal Types */}
        <div className="rounded-xl border border-foreground/10 bg-background/60 p-5">
          <div className="text-sm text-muted-foreground mb-3">
            Most Frequent Meals
          </div>
          {stats.topMealTypes.length > 0 ? (
            <div className="space-y-2">
              {stats.topMealTypes.map((item, index) => (
                <div
                  key={item.mealType}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground truncate flex-1">
                    {index + 1}. {formatMealType(item.mealType)}
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

