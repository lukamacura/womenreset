"use client";

import { useMemo, useEffect } from "react";
import { UtensilsCrossed, CheckCircle2 } from "lucide-react";
import { useNutrition } from "@/hooks/useNutrition";
import type { Nutrition } from "./NutritionList";

type MealType = "breakfast" | "lunch" | "dinner";
type MealState = "behind" | "meal-time" | "on-track" | "complete";

interface MealStatus {
  state: MealState;
  message: string;
  nextTarget: string;
  badgeText: string;
  progressColor: string;
  bgTint: string;
  badgeBg: string;
  badgeTextColor: string;
}

interface MealInfo {
  type: MealType;
  logged: boolean;
  loggedEntry: Nutrition | null;
  windowStart: number;
  windowEnd: number;
  deadline: number;
  lateAfter: number;
}

const GOAL_MEALS = 3;

// Get meal time windows
function getMealWindows(): MealInfo[] {
  return [
    {
      type: "breakfast",
      logged: false,
      loggedEntry: null,
      windowStart: 6,
      windowEnd: 10,
      deadline: 10,
      lateAfter: 11,
    },
    {
      type: "lunch",
      logged: false,
      loggedEntry: null,
      windowStart: 11,
      windowEnd: 14,
      deadline: 14,
      lateAfter: 15,
    },
    {
      type: "dinner",
      logged: false,
      loggedEntry: null,
      windowStart: 17,
      windowEnd: 21,
      deadline: 21,
      lateAfter: 22,
    },
  ];
}

// Determine which meal should be logged now
function getCurrentExpectedMeal(currentHour: number): MealType | null {
  if (currentHour < 10) return "breakfast";
  if (currentHour < 14) return "lunch";
  if (currentHour < 21) return "dinner";
  return null; // After dinner window
}

// Determine meal state
function getMealState(
  meals: MealInfo[],
  currentHour: number
): MealState {
  const loggedCount = meals.filter((m) => m.logged).length;

  // Complete: all 3 meals logged
  if (loggedCount >= GOAL_MEALS) {
    return "complete";
  }

  const currentMeal = getCurrentExpectedMeal(currentHour);
  if (!currentMeal) {
    // After dinner window - check if all meals are logged
    return loggedCount >= GOAL_MEALS ? "complete" : "behind";
  }

  const currentMealInfo = meals.find((m) => m.type === currentMeal);
  if (!currentMealInfo) return "behind";

  // Check if current meal is logged
  if (currentMealInfo.logged) {
    return "on-track";
  }

  // Check if we're in the meal window
  if (
    currentHour >= currentMealInfo.windowStart &&
    currentHour <= currentMealInfo.windowEnd
  ) {
    return "meal-time";
  }

  // Check if we're past the deadline
  if (currentHour > currentMealInfo.lateAfter) {
    return "behind";
  }

  // Between deadline and late after - still meal time but getting late
  if (currentHour > currentMealInfo.deadline) {
    return "meal-time";
  }

  return "behind";
}

// Get status message
function getStatusMessage(
  state: MealState,
  meals: MealInfo[],
  currentHour: number
): string {
  if (state === "complete") {
    return "All meals logged today! 🎉";
  }

  if (state === "on-track") {
    const currentMeal = getCurrentExpectedMeal(currentHour);
    if (currentMeal === "breakfast") {
      return "Breakfast logged ✓ - Lunch by 2pm";
    } else if (currentMeal === "lunch") {
      return "On track! Dinner by 9pm";
    }
    return "All meals logged! 🎉";
  }

  if (state === "meal-time") {
    const currentMeal = getCurrentExpectedMeal(currentHour);
    if (currentMeal === "breakfast") {
      return "Good morning - log your breakfast 🍳";
    } else if (currentMeal === "lunch") {
      return "Lunch time - what are you eating? 🥗";
    } else if (currentMeal === "dinner") {
      return "Dinner time - log your meal 🍽️";
    }
  }

  // Behind state
  const missedMeals = meals.filter((m) => !m.logged && currentHour > m.lateAfter);
  if (missedMeals.length >= 2) {
    return "You've missed meals today - eating regularly helps manage symptoms";
  }

  const currentMeal = getCurrentExpectedMeal(currentHour);
  if (currentMeal === "breakfast" && currentHour > 11) {
    return "You missed breakfast - try not to skip lunch";
  } else if (currentMeal === "lunch" && currentHour > 15) {
    return "Lunch skipped - make sure to eat dinner";
  } else if (currentHour > 22) {
    return "You've missed meals today - eating regularly helps manage symptoms";
  }

  return "Don't skip meals - they help with energy";
}

// Get next target
function getNextTarget(meals: MealInfo[], currentHour: number): string {
  const loggedCount = meals.filter((m) => m.logged).length;
  if (loggedCount >= GOAL_MEALS) {
    return "You're done for today!";
  }

  const breakfast = meals.find((m) => m.type === "breakfast");
  const lunch = meals.find((m) => m.type === "lunch");
  const dinner = meals.find((m) => m.type === "dinner");

  if (!breakfast?.logged && currentHour < 11) {
    return "Log breakfast by 10am";
  }
  if (!lunch?.logged && currentHour < 15) {
    return "Log lunch by 2pm";
  }
  if (!dinner?.logged && currentHour < 22) {
    return "Log dinner by 9pm";
  }

  const remaining = GOAL_MEALS - loggedCount;
  return `${remaining} more meal${remaining === 1 ? "" : "s"} to reach your goal`;
}

// Get status configuration
function getStatusConfig(state: MealState): Omit<
  MealStatus,
  "state" | "message" | "nextTarget" | "badgeText"
> {
  switch (state) {
    case "behind":
      return {
        progressColor: "#EF4444", // red-500
        bgTint: "#FEF2F2", // red-50
        badgeBg: "#FEE2E2", // red-100
        badgeTextColor: "#DC2626", // red-600
      };
    case "meal-time":
      return {
        progressColor: "#F59E0B", // amber-500
        bgTint: "#FFFBEB", // amber-50
        badgeBg: "#FEF3C7", // amber-100
        badgeTextColor: "#D97706", // amber-600
      };
    case "on-track":
      return {
        progressColor: "#3B82F6", // blue-500
        bgTint: "#EFF6FF", // blue-50
        badgeBg: "#DBEAFE", // blue-100
        badgeTextColor: "#2563EB", // blue-600
      };
    case "complete":
      return {
        progressColor: "#22C55E", // green-500
        bgTint: "#F0FDF4", // green-50
        badgeBg: "#DCFCE7", // green-100
        badgeTextColor: "#16A34A", // green-600
      };
  }
}

type MealTrackerProps = {
  onMealClick: (mealType: MealType, existingEntry?: Nutrition) => void;
};

export default function MealTracker({ onMealClick }: MealTrackerProps) {
  const { nutrition, loading, refetch } = useNutrition(1); // Only need today's data

  // Calculate today's meals
  const todayMeals = useMemo((): MealInfo[] => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filter today's nutrition entries
    const todayNutrition = nutrition.filter((n) => {
      const consumedAt = new Date(n.consumed_at);
      return consumedAt >= today && consumedAt < tomorrow;
    });

    // Get meal windows
    const meals = getMealWindows();

    // Mark which meals are logged
    meals.forEach((meal) => {
      const loggedEntry = todayNutrition.find(
        (n) => n.meal_type === meal.type
      );
      meal.logged = !!loggedEntry;
      meal.loggedEntry = loggedEntry || null;
    });

    return meals;
  }, [nutrition]);

  // Calculate meal status
  const mealStatus = useMemo((): MealStatus => {
    const now = new Date();
    const currentHour = now.getHours();
    const state = getMealState(todayMeals, currentHour);
    const config = getStatusConfig(state);
    const message = getStatusMessage(state, todayMeals, currentHour);
    const nextTarget = getNextTarget(todayMeals, currentHour);

    let badgeText: string;
    switch (state) {
      case "behind":
        badgeText = "Behind";
        break;
      case "meal-time":
        badgeText = "Meal Time";
        break;
      case "on-track":
        badgeText = "On Track";
        break;
      case "complete":
        badgeText = "Complete ✓";
        break;
    }

    return {
      state,
      message,
      nextTarget,
      badgeText,
      ...config,
    };
  }, [todayMeals]);

  const loggedCount = todayMeals.filter((m) => m.logged).length;
  const progressPercentage = Math.min(100, (loggedCount / GOAL_MEALS) * 100);

  // Listen for nutrition updates
  useEffect(() => {
    const handleLogUpdate = () => {
      refetch();
    };
    window.addEventListener("nutrition-log-updated", handleLogUpdate);
    return () => {
      window.removeEventListener("nutrition-log-updated", handleLogUpdate);
    };
  }, [refetch]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 shadow-xl">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-foreground/10 rounded mb-4" />
          <div className="h-12 w-full bg-foreground/10 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-white/30 backdrop-blur-lg p-6 shadow-xl transition-colors duration-300"
      style={{
        backgroundColor: `${mealStatus.bgTint}CC`, // Add transparency to tint
      }}
    >
      {/* Header with status badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed
            className="h-5 w-5"
            style={{ color: mealStatus.progressColor }}
          />
          <h3 className="text-lg font-semibold text-[#8B7E74]">Meals</h3>
        </div>
        <div
          className="px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1"
          style={{
            backgroundColor: mealStatus.badgeBg,
            color: mealStatus.badgeTextColor,
          }}
        >
          {mealStatus.state === "complete" && (
            <CheckCircle2 className="h-3 w-3" />
          )}
          {mealStatus.badgeText}
        </div>
      </div>

      {/* Progress display */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-[#3D3D3D]">
            {loggedCount} / {GOAL_MEALS}{" "}
            <span className="text-base font-normal text-[#9A9A9A]">meals</span>
          </span>
          <span className="text-sm font-semibold text-[#6B6B6B]">
            {Math.round(progressPercentage)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${progressPercentage}%`,
              backgroundColor: mealStatus.progressColor,
            }}
          />
        </div>
      </div>

      {/* Status message */}
      <div className="mb-3">
        <p className="text-md font-medium text-[#3D3D3D]">
          {mealStatus.message}
        </p>
      </div>

      {/* Next target */}
      <div className="mb-4">
        <p className="text-sm text-[#6B6B6B]">{mealStatus.nextTarget}</p>
      </div>

      {/* Meal buttons */}
      <div className="flex gap-2 mb-4">
        {todayMeals.map((meal) => {
          const isLogged = meal.logged;
          const now = new Date();
          const currentHour = now.getHours();
          const isMissed = !isLogged && currentHour > meal.lateAfter;

          return (
            <button
              key={meal.type}
              onClick={() => onMealClick(meal.type, meal.loggedEntry || undefined)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 touch-manipulation ${
                isLogged
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : isMissed
                  ? "border-2 border-red-300 text-red-600 bg-red-50 hover:bg-red-100 opacity-75"
                  : "border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              }`}
            >
              {isLogged && <CheckCircle2 className="h-4 w-4" />}
              <span className="capitalize">{meal.type}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

