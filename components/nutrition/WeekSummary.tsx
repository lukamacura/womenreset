"use client";

import { useMemo, useEffect } from "react";
import { useNutrition } from "@/hooks/useNutrition";
import { useHydration } from "@/hooks/useHydration";
import { Flame } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#E8E0DB]/30 ${className}`} />;
}

export default function WeekSummary() {
  const { nutrition, loading: nutritionLoading, refetch: refetchNutrition } = useNutrition(7);
  const { weeklyAverage, loading: hydrationLoading, refetch: refetchHydration } = useHydration(7);

  // Calculate week summary
  const summary = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const weekNutrition = nutrition.filter((n) => {
      const consumedAt = new Date(n.consumed_at);
      return consumedAt >= weekAgo;
    });

    const totalMeals = weekNutrition.length;

    // Count food tags
    const tagCounts: Record<string, number> = {};
    const triggerFoods = ['caffeine', 'alcohol', 'spicy_food', 'sugar_refined_carbs', 'processed_food'];
    const supportiveFoods = ['phytoestrogens', 'calcium_rich', 'omega_3s', 'fiber', 'protein'];

    weekNutrition.forEach((n) => {
      n.food_tags?.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Top trigger foods
    const topTriggerFoods = Object.entries(tagCounts)
      .filter(([tag]) => triggerFoods.includes(tag))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([tag, count]) => ({ tag: tag.replace(/_/g, ' '), count }));

    // Top supportive foods
    const topSupportiveFoods = Object.entries(tagCounts)
      .filter(([tag]) => supportiveFoods.includes(tag))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([tag, count]) => ({ tag: tag.replace(/_/g, ' '), count }));

    // Find best fuel day (day with most supportive foods)
    const daySupportiveCounts: Record<string, number> = {};
    weekNutrition.forEach((n) => {
      const day = new Date(n.consumed_at).toDateString();
      const supportiveCount = n.food_tags?.filter((tag) => supportiveFoods.includes(tag)).length || 0;
      daySupportiveCounts[day] = (daySupportiveCounts[day] || 0) + supportiveCount;
    });

    const bestFuelDay = Object.entries(daySupportiveCounts)
      .sort(([, a], [, b]) => b - a)[0];

    // Calculate streak (consecutive days with at least one meal logged)
    const daysWithMeals = new Set(
      weekNutrition.map((n) => new Date(n.consumed_at).toDateString())
    );
    const sortedDays = Array.from(daysWithMeals).sort();
    
    let streak = 0;
    const today = new Date().toDateString();
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - streak);
      if (sortedDays.includes(checkDate.toDateString())) {
        streak++;
      } else {
        break;
      }
    }

    return {
      totalMeals,
      weeklyAverage,
      topTriggerFoods,
      topSupportiveFoods,
      bestFuelDay: bestFuelDay ? { day: bestFuelDay[0], count: bestFuelDay[1] } : null,
      streak,
    };
  }, [nutrition, weeklyAverage]);

  const loading = nutritionLoading || hydrationLoading;

  // Listen for custom event when nutrition logs are updated
  useEffect(() => {
    const handleLogUpdate = () => {
      refetchNutrition();
      refetchHydration();
    };

    window.addEventListener('nutrition-log-updated', handleLogUpdate);
    window.addEventListener('hydration-log-updated', handleLogUpdate);
    return () => {
      window.removeEventListener('nutrition-log-updated', handleLogUpdate);
      window.removeEventListener('hydration-log-updated', handleLogUpdate);
    };
  }, [refetchNutrition, refetchHydration]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 shadow-xl">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-[#8B7E74] mb-4">This Week</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#3D3D3D] font-medium">{summary.totalMeals}</span>
          <span className="text-[#9A9A9A]">meals logged</span>
          {summary.weeklyAverage > 0 && (
            <>
              <span className="text-[#9A9A9A]">•</span>
              <span className="text-[#3D3D3D]">{summary.weeklyAverage.toFixed(1)}</span>
              <span className="text-[#9A9A9A]">glasses water/day</span>
            </>
          )}
        </div>

        {summary.topSupportiveFoods.length > 0 && (
          <div className="text-sm text-[#6B6B6B]">
            Top supportive foods: {summary.topSupportiveFoods.map((f) => f.tag).join(", ")}
          </div>
        )}

        {summary.topTriggerFoods.length > 0 && (
          <div className="text-sm text-[#6B6B6B]">
            Top trigger foods: {summary.topTriggerFoods.map((f) => f.tag).join(", ")}
          </div>
        )}

        {summary.bestFuelDay && (
          <div className="text-sm text-[#6B6B6B]">
            Best fuel day: {new Date(summary.bestFuelDay.day).toLocaleDateString('en-US', { weekday: 'long' })} ({summary.bestFuelDay.count} supportive foods)
          </div>
        )}

        {summary.streak > 0 && (
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-[#3D3D3D]">
              {summary.streak} day{summary.streak > 1 ? 's' : ''} streak
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

