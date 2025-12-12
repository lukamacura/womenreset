"use client";

import { useMemo } from "react";
import type { Nutrition } from "./NutritionList";
import { Calendar, UtensilsCrossed, Flame, TrendingUp, Sunrise, Sun, Moon, Cookie, Activity } from "lucide-react";

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

    // Calculate entries per week for progress indication
    const entriesPerWeek = dateRange > 0 ? (totalCount / dateRange) * 7 : 0;

    return {
      totalCount,
      averageCaloriesPerDay,
      topMealTypes,
      hasCalorieData: entriesWithCalories.length > 0,
      entriesPerWeek,
    };
  }, [nutrition, dateRange]);

  const formatMealType = (mealType: string) => {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case "breakfast":
        return <Sunrise className="h-5 w-5 text-orange-500" />;
      case "lunch":
        return <Sun className="h-5 w-5 text-blue-500" />;
      case "dinner":
        return <Moon className="h-5 w-5 text-purple-500" />;
      case "snack":
        return <Cookie className="h-5 w-5 text-green-500" />;
      default:
        return <UtensilsCrossed className="h-5 w-5 text-gray-500" />;
    }
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case "breakfast":
        return "from-orange-500/20 to-orange-600/10";
      case "lunch":
        return "from-blue-500/20 to-blue-600/10";
      case "dinner":
        return "from-purple-500/20 to-purple-600/10";
      case "snack":
        return "from-green-500/20 to-green-600/10";
      default:
        return "from-gray-500/20 to-gray-600/10";
    }
  };

  // Calculate progress percentage for visual bars
  const maxEntries = Math.max(stats.totalCount, 20);
  const entriesProgress = Math.min(100, (stats.totalCount / maxEntries) * 100);
  const maxCalories = Math.max(stats.averageCaloriesPerDay, 2000);
  const caloriesProgress = stats.hasCalorieData ? Math.min(100, (stats.averageCaloriesPerDay / maxCalories) * 100) : 0;

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
                  ? "bg-primary-light text-primary-dark shadow-lg shadow-primary/30 scale-105"
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
        {/* Total Entries Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-green-50 via-green-100/50 to-white border-2 border-green-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-linear-to-br from-green-500 to-green-600 shadow-md">
                <UtensilsCrossed className="h-6 w-6 text-white" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            
            <div className="mb-3">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Total Entries
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
                <div className="h-2 w-full bg-green-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-green-500 to-green-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${entriesProgress}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                {stats.entriesPerWeek.toFixed(1)} entries/week avg
              </div>
            </div>
          </div>
        </div>

        {/* Average Calories per Day Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-orange-50 via-orange-100/50 to-white border-2 border-orange-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 sm:col-span-2 lg:col-span-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-orange-400/20 to-transparent rounded-full blur-2xl" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-linear-to-br from-orange-500 to-orange-600 shadow-md">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
            
            <div className="mb-3">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Avg Calories/Day
              </div>
              <div className="text-4xl font-extrabold text-foreground tracking-tight">
                {stats.hasCalorieData ? stats.averageCaloriesPerDay : "—"}
                {stats.hasCalorieData && <span className="text-lg text-muted-foreground ml-1">kcal</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.hasCalorieData ? "across tracked days" : "no calorie data"}
              </div>
            </div>

            {/* Progress Bar */}
            {stats.hasCalorieData && (
              <div className="mt-4">
                <div className="h-2 w-full bg-orange-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${caloriesProgress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  Daily average
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Most Frequent Meal Types Card */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white via-primary-light/20 to-white border-2 border-primary-light/50 p-6 shadow-lg">
        <div className="absolute top-0 right-0 w-40 h-40 bg-linear-to-br from-purple-300/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-5">

            <h3 className="text-lg font-bold text-foreground">Most Frequent Meal Types</h3>
          </div>

          {stats.topMealTypes.length > 0 ? (
            <div className="space-y-4">
              {stats.topMealTypes.map((item) => {
                const percentage = stats.totalCount > 0 ? (item.count / stats.totalCount) * 100 : 0;
                return (
                  <div key={item.mealType} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-foreground/5">
                          {getMealTypeIcon(item.mealType)}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">
                            {formatMealType(item.mealType)}
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
                        className={`h-full bg-linear-to-r ${getMealTypeColor(item.mealType)} rounded-full transition-all duration-700 ease-out`}
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
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No meal data yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start logging meals to see your stats</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
