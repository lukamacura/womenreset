"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Droplet, Minus, GlassWater, CheckCircle2 } from "lucide-react";
import { useHydration } from "@/hooks/useHydration";

type HydrationState = "behind" | "ontrack" | "good" | "complete";

interface HydrationStatus {
  state: HydrationState;
  message: string;
  nextTarget: string;
  badgeText: string;
  progressColor: string;
  bgTint: string;
  badgeBg: string;
  badgeTextColor: string;
}

const GOAL_GLASSES = 8;

// Get expected minimum and "good" target based on current hour
function getTimeBasedTargets(currentHour: number): { expected: number; good: number } {
  if (currentHour < 7) {
    // Before 7am - very early, don't pressure
    return { expected: 0, good: 1 };
  } else if (currentHour < 9) {
    // 7am-9am
    return { expected: 1, good: 2 };
  } else if (currentHour < 12) {
    // 9am-12pm
    return { expected: 2, good: 3 };
  } else if (currentHour < 15) {
    // 12pm-3pm
    return { expected: 3, good: 4 };
  } else if (currentHour < 18) {
    // 3pm-6pm
    return { expected: 5, good: 6 };
  } else if (currentHour < 21) {
    // 6pm-9pm
    return { expected: 6, good: 7 };
  } else {
    // After 9pm
    return { expected: 7, good: 8 };
  }
}

// Determine hydration state
function getHydrationState(currentGlasses: number, currentHour: number): HydrationState {
  if (currentGlasses >= GOAL_GLASSES) {
    return "complete";
  }

  const { expected, good } = getTimeBasedTargets(currentHour);

  if (currentGlasses >= good) {
    return "good";
  } else if (currentGlasses >= expected) {
    return "ontrack";
  } else {
    return "behind";
  }
}

// Get status message
function getStatusMessage(state: HydrationState, currentGlasses: number, currentHour: number): string {
  if (state === "complete") {
    return "Daily goal reached! 🎉";
  }

  if (state === "good") {
    return "You're ahead of schedule! 💧";
  }

  if (state === "ontrack") {
    return "Keep going - you're on track! 💧";
  }

  // Behind state
  if (currentHour < 12) {
    return "Start your day with water 💧";
  } else if (currentHour < 18) {
    return "You're a bit behind - drink up! 💧";
  } else {
    return "Try to catch up before bed 💧";
  }
}

// Get next target message
function getNextTarget(currentGlasses: number, currentHour: number): string {
  if (currentGlasses >= GOAL_GLASSES) {
    return "You've hit your goal for today!";
  }

  if (currentHour < 12) {
    const remaining = Math.max(0, 3 - currentGlasses);
    if (remaining === 0) {
      return "Next target: 6 glasses by 6pm";
    }
    return `${remaining} more glass${remaining === 1 ? '' : 'es'} by noon`;
  } else if (currentHour < 18) {
    const remaining = Math.max(0, 6 - currentGlasses);
    if (remaining === 0) {
      return "Next target: 8 glasses by end of day";
    }
    return `${remaining} more glass${remaining === 1 ? '' : 'es'} by 6pm`;
  } else {
    const remaining = Math.max(0, GOAL_GLASSES - currentGlasses);
    if (remaining === 0) {
      return "You've hit your goal for today!";
    }
    return `${remaining} more glass${remaining === 1 ? '' : 'es'} to reach your goal`;
  }
}

// Get status configuration
function getStatusConfig(state: HydrationState): Omit<HydrationStatus, "state" | "message" | "nextTarget" | "badgeText"> {
  switch (state) {
    case "behind":
      return {
        progressColor: "#EF4444", // red-500
        bgTint: "#FEF2F2", // red-50
        badgeBg: "#FEE2E2", // red-100
        badgeTextColor: "#DC2626", // red-600
      };
    case "ontrack":
      return {
        progressColor: "#F59E0B", // amber-500
        bgTint: "#FFFBEB", // amber-50
        badgeBg: "#FEF3C7", // amber-100
        badgeTextColor: "#D97706", // amber-600
      };
    case "good":
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

export default function HydrationCounter() {
  const { todayGlasses, weeklyAverage, loading, refetch } = useHydration(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayGlasses, setDisplayGlasses] = useState(todayGlasses);
  const [isAnimating, setIsAnimating] = useState(false);
  const [buttonScale, setButtonScale] = useState(1);
  const previousGlasses = useRef(todayGlasses);

  // Animate number transition smoothly
  useEffect(() => {
    if (todayGlasses !== previousGlasses.current) {
      setIsAnimating(true);
      const startValue = previousGlasses.current;
      const endValue = todayGlasses;
      const duration = 500; // milliseconds
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out cubic function for smooth deceleration
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (endValue - startValue) * easeOutCubic);
        
        setDisplayGlasses(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayGlasses(endValue);
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
      previousGlasses.current = todayGlasses;
    }
  }, [todayGlasses]);

  // Sync displayGlasses on initial load
  useEffect(() => {
    if (displayGlasses !== todayGlasses && !isAnimating) {
      setDisplayGlasses(todayGlasses);
      previousGlasses.current = todayGlasses;
    }
  }, [todayGlasses, displayGlasses, isAnimating]);

  // Calculate hydration status
  const hydrationStatus = useMemo((): HydrationStatus => {
    const now = new Date();
    const currentHour = now.getHours();
    const state = getHydrationState(todayGlasses, currentHour);
    const config = getStatusConfig(state);
    const message = getStatusMessage(state, todayGlasses, currentHour);
    const nextTarget = getNextTarget(todayGlasses, currentHour);

    let badgeText: string;
    switch (state) {
      case "behind":
        badgeText = "Behind";
        break;
      case "ontrack":
        badgeText = "On Track";
        break;
      case "good":
        badgeText = "Great!";
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
  }, [todayGlasses]);

  const handleAddGlass = async () => {
    // Button press animation
    setButtonScale(0.95);
    setTimeout(() => setButtonScale(1), 150);

    setIsSubmitting(true);
    try {
      const now = new Date();
      const response = await fetch("/api/hydration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          glasses: 1,
          logged_at: now.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log hydration");
      }

      await refetch();
    } catch (error) {
      console.error("Error logging hydration:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveGlass = async () => {
    if (todayGlasses <= 0) return;

    setIsSubmitting(true);
    try {
      // Get today's hydration logs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await fetch(
        `/api/hydration?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch hydration logs");
      }

      const { data } = await response.json();
      const todayLogs = data || [];

      // Delete the most recent log
      if (todayLogs.length > 0) {
        const mostRecent = todayLogs[0];
        const deleteResponse = await fetch(`/api/hydration?id=${mostRecent.id}`, {
          method: "DELETE",
        });

        if (!deleteResponse.ok) {
          throw new Error("Failed to delete hydration log");
        }
      }

      await refetch();
    } catch (error) {
      console.error("Error removing hydration:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = Math.min(100, (displayGlasses / GOAL_GLASSES) * 100);

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
        backgroundColor: `${hydrationStatus.bgTint}CC`, // Add transparency to tint
      }}
    >
      {/* Header with status badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Droplet
            className="h-5 w-5"
            style={{ color: hydrationStatus.progressColor }}
          />
          <h3 className="text-lg font-semibold text-[#8B7E74]">Hydration</h3>
        </div>
        <div
          className="px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1"
          style={{
            backgroundColor: hydrationStatus.badgeBg,
            color: hydrationStatus.badgeTextColor,
          }}
        >
          {hydrationStatus.state === "complete" && (
            <CheckCircle2 className="h-3 w-3" />
          )}
          {hydrationStatus.badgeText}
        </div>
      </div>

      {/* Progress display */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-[#3D3D3D]">
            <span
              className={`inline-block transition-transform duration-300 ${
                isAnimating ? "scale-110" : "scale-100"
              }`}
              style={{
                color: isAnimating ? hydrationStatus.progressColor : "#3D3D3D",
              }}
            >
              {displayGlasses}
            </span>
            {" / "}
            {GOAL_GLASSES} <span className="text-base font-normal text-[#9A9A9A]">glasses</span>
          </span>
          <span 
            className={`text-sm font-semibold text-[#6B6B6B] transition-all duration-300 ${
              isAnimating ? "scale-110" : "scale-100"
            }`}
          >
            {Math.round(progressPercentage)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${progressPercentage}%`,
              backgroundColor: hydrationStatus.progressColor,
            }}
          />
        </div>
      </div>

      {/* Status message */}
      <div className="mb-3">
        <p className="text-md font-medium text-[#3D3D3D]">
          {hydrationStatus.message}
        </p>
      </div>

      {/* Next target */}
      <div className="mb-4">
        <p className="text-sm text-[#6B6B6B]">
          {hydrationStatus.nextTarget}
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleAddGlass}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg text-white px-4 py-2.5 font-bold transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95 relative overflow-hidden"
          style={{
            backgroundColor: hydrationStatus.progressColor,
            transform: `scale(${buttonScale})`,
          }}
        >
          {/* Ripple effect */}
          <span className="absolute inset-0 rounded-lg bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-200"></span>
          <GlassWater className="h-4 w-4 relative z-10 transition-transform duration-200 hover:scale-110" />
          <span className="relative z-10">Add Glass</span>
        </button>
        <button
          onClick={handleRemoveGlass}
          disabled={isSubmitting || todayGlasses <= 0}
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 text-gray-700 px-4 py-2.5 font-medium transition-all duration-150 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Weekly average - deprioritized */}
      <div className="text-sm text-[#9A9A9A] pt-2 border-t border-white/30">
        Weekly average: <span className="font-medium text-[#6B6B6B]">{weeklyAverage.toFixed(1)}</span> glasses/day
      </div>
    </div>
  );
}

