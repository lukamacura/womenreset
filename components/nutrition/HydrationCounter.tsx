"use client";

import { useState } from "react";
import { Droplet, Minus, GlassWater } from "lucide-react";
import { useHydration } from "@/hooks/useHydration";

export default function HydrationCounter() {
  const { todayGlasses, weeklyAverage, loading, refetch } = useHydration(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddGlass = async () => {
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

  const goalGlasses = 6;
  const progressPercentage = Math.min(100, (todayGlasses / goalGlasses) * 100);

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
    <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <Droplet className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-[#8B7E74]">Hydration</h3>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-[#3D3D3D]">
            {todayGlasses} <span className="text-base font-normal text-[#9A9A9A]">glasses</span>
          </span>
          <span className="text-sm text-[#9A9A9A]">Goal: {goalGlasses}+</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-blue-100 rounded-full h-3 mb-2">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleAddGlass}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2.5 font-bold transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          <GlassWater className="h-4 w-4" />
          Add Glass
        </button>
        <button
          onClick={handleRemoveGlass}
          disabled={isSubmitting || todayGlasses <= 0}
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 text-gray-700 px-4 py-2.5 font-medium transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Weekly average */}
      <div className="text-sm text-[#6B6B6B]">
        Weekly average: <span className="font-semibold text-[#3D3D3D]">{weeklyAverage.toFixed(1)}</span> glasses/day
      </div>
    </div>
  );
}

