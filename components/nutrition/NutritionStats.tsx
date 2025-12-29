"use client";

import { useMemo } from "react";
import type { Nutrition } from "./NutritionList";
import { Calendar, Sunrise, Sun, Moon, Cookie, Activity, UtensilsCrossed } from "lucide-react";

const getTodayLabel = () => {
  const today = new Date();
  return today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};

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

    const totalCount = filteredNutrition.length;

    return {
      topMealTypes,
      totalCount, // Only needed for percentage calculation
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

  return (
    <div className="space-y-6">
      {/* Today's Date Display */}
      <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#9A9A9A] mb-1">Today</p>
            <p className="text-lg font-semibold text-[#3D3D3D]">{getTodayLabel()}</p>
          </div>
          <Calendar className="h-5 w-5 text-[#8B7E74]" />
        </div>
      </div>

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

      {/* Modern Most Frequent Meal Types Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 shadow-xl">
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
                    <div className="h-2 w-full bg-white/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out`}
                        style={{ 
                          width: `${percentage}%`,
                          background: item.mealType.toLowerCase() === 'breakfast' 
                            ? 'linear-gradient(to right, #fb923c, #f97316)' 
                            : item.mealType.toLowerCase() === 'lunch'
                            ? 'linear-gradient(to right, #60a5fa, #3b82f6)'
                            : item.mealType.toLowerCase() === 'dinner'
                            ? 'linear-gradient(to right, #a78bfa, #8b5cf6)'
                            : 'linear-gradient(to right, #4ade80, #22c55e)'
                        }}
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
