/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useMemo } from "react";
import type { Fitness } from "./FitnessList";
import { Calendar, Dumbbell, Clock, Flame, TrendingUp, Heart, Dumbbell as StrengthIcon, StretchHorizontal, Trophy, Activity } from "lucide-react";

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

    // Calculate weekly average for progress indication
    const workoutsPerWeek = dateRange > 0 ? (totalCount / dateRange) * 7 : 0;

    return {
      totalCount,
      totalDuration,
      averageCaloriesPerDay,
      topExerciseTypes,
      hasDurationData: entriesWithDuration.length > 0,
      hasCalorieData: entriesWithCalories.length > 0,
      workoutsPerWeek,
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

  const getExerciseTypeIcon = (exerciseType: string) => {
    switch (exerciseType.toLowerCase()) {
      case "cardio":
        return <Heart className="h-5 w-5 text-red-500" />;
      case "strength":
        return <StrengthIcon className="h-5 w-5 text-blue-500" />;
      case "flexibility":
        return <StretchHorizontal className="h-5 w-5 text-purple-500" />;
      case "sports":
        return <Trophy className="h-5 w-5 text-green-500" />;
      case "other":
        return <Activity className="h-5 w-5 text-gray-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getExerciseTypeColor = (exerciseType: string) => {
    switch (exerciseType.toLowerCase()) {
      case "cardio":
        return "from-red-500/20 to-red-600/10";
      case "strength":
        return "from-blue-500/20 to-blue-600/10";
      case "flexibility":
        return "from-purple-500/20 to-purple-600/10";
      case "sports":
        return "from-green-500/20 to-green-600/10";
      default:
        return "from-gray-500/20 to-gray-600/10";
    }
  };

  // Calculate progress percentage for visual bars (normalized to 0-100)
  const maxWorkouts = Math.max(stats.totalCount, 20); // Use 20 as baseline or actual max
  const workoutProgress = Math.min(100, (stats.totalCount / maxWorkouts) * 100);
  const maxDuration = Math.max(stats.totalDuration, 300); // 5 hours baseline
  const durationProgress = stats.hasDurationData ? Math.min(100, (stats.totalDuration / maxDuration) * 100) : 0;
  const maxCalories = Math.max(stats.averageCaloriesPerDay, 500);
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
        {/* Total Workouts Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-primary-light/30 via-primary-light/20 to-white border-2 border-primary-light/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-linear-to-br from-primary to-primary-dark shadow-md">
                <Dumbbell className="h-6 w-6 text-white" />
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            
            <div className="mb-3">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Total Workouts
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
                  style={{ width: `${workoutProgress}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                {stats.workoutsPerWeek.toFixed(1)} workouts/week avg
              </div>
            </div>
          </div>
        </div>

        {/* Total Duration Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-50 via-blue-100/50 to-white border-2 border-blue-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-blue-400/20 to-transparent rounded-full blur-2xl" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-md">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            
            <div className="mb-3">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Total Duration
              </div>
              <div className="text-4xl font-extrabold text-foreground tracking-tight">
                {stats.hasDurationData ? formatDuration(stats.totalDuration) : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.hasDurationData ? "across all workouts" : "no duration data"}
              </div>
            </div>

            {/* Progress Bar */}
            {stats.hasDurationData && (
              <div className="mt-4">
                <div className="h-2 w-full bg-blue-bell-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${durationProgress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  {formatDuration(stats.totalDuration / stats.totalCount)} avg per workout
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Average Calories Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-orange-50 via-orange-100/50 to-white border-2 border-orange-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 sm:col-span-2 lg:col-span-1">
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

      {/* Modern Most Frequent Exercise Types Card */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white via-primary-light/20 to-white border-2 border-primary-light/50 p-6 shadow-lg">
        <div className="absolute top-0 right-0 w-40 h-40 bg-linear-to-br from-purple-300/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-lg bg-linear-to-br from-gold to-primary">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Most Frequent Exercise Types</h3>
          </div>

          {stats.topExerciseTypes.length > 0 ? (
            <div className="space-y-4">
              {stats.topExerciseTypes.map((item, index) => {
                const percentage = stats.totalCount > 0 ? (item.count / stats.totalCount) * 100 : 0;
                return (
                  <div key={item.exerciseType} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-foreground/5">
                          {getExerciseTypeIcon(item.exerciseType)}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">
                            {formatExerciseType(item.exerciseType)}
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
                        className={`h-full bg-linear-to-r ${getExerciseTypeColor(item.exerciseType)} rounded-full transition-all duration-700 ease-out`}
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
              <p className="text-sm font-medium text-muted-foreground">No exercise data yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start logging workouts to see your stats</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

