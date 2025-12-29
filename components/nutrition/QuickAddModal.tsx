"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Droplet, Clock } from "lucide-react";
import { useNutrition } from "@/hooks/useNutrition";
import AddNutritionModal from "./AddNutritionModal";
import type { Nutrition } from "./NutritionList";

type QuickAddModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function QuickAddModal({
  isOpen,
  onClose,
  onSuccess,
}: QuickAddModalProps) {
  const { nutrition } = useNutrition(30);
  const [selectedFood, setSelectedFood] = useState<{ item: string; mealType: string } | null>(null);
  const [isFullModalOpen, setIsFullModalOpen] = useState(false);

  // Get recent foods (last 10 unique items)
  const recentFoods = useMemo(() => {
    const seen = new Set<string>();
    const recent: Array<{ item: string; mealType: string; date: Date }> = [];
    
    for (const entry of nutrition) {
      const key = `${entry.food_item.toLowerCase()}-${entry.meal_type}`;
      if (!seen.has(key) && recent.length < 10) {
        seen.add(key);
        recent.push({
          item: entry.food_item,
          mealType: entry.meal_type,
          date: new Date(entry.consumed_at),
        });
      }
    }
    
    return recent.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [nutrition]);

  // Get frequent foods (top 6-8 by frequency)
  const frequentFoods = useMemo(() => {
    const counts: Record<string, { item: string; mealType: string; count: number }> = {};
    
    nutrition.forEach((entry) => {
      const key = `${entry.food_item.toLowerCase()}-${entry.meal_type}`;
      if (!counts[key]) {
        counts[key] = {
          item: entry.food_item,
          mealType: entry.meal_type,
          count: 0,
        };
      }
      counts[key].count++;
    });
    
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [nutrition]);

  const handleQuickWater = async () => {
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

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error logging hydration:", error);
    }
  };

  const handleFoodSelect = (item: string, mealType: string) => {
    setSelectedFood({ item, mealType });
    setIsFullModalOpen(true);
  };

  const handleFullModalClose = () => {
    setIsFullModalOpen(false);
    setSelectedFood(null);
  };

  const handleFullModalSuccess = (nutrition: Nutrition) => {
    onSuccess();
    handleFullModalClose();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative z-10 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl border-t sm:border border-foreground/10 bg-background flex flex-col shadow-xl">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-foreground/10">
            <h2 className="text-xl sm:text-2xl font-semibold">Quick Add</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground transition-colors active:bg-foreground/10 hover:bg-foreground/10 hover:text-foreground touch-manipulation"
              aria-label="Close"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Quick Water Button */}
            <div>
              <button
                onClick={handleQuickWater}
                className="w-full flex items-center justify-center gap-3 rounded-xl bg-blue-600 text-white px-6 py-4 font-semibold text-lg transition-colors hover:bg-blue-700 active:bg-blue-800 touch-manipulation shadow-lg"
              >
                <Droplet className="h-6 w-6" />
                Log 1 Glass of Water
              </button>
            </div>

            {/* Recent Foods */}
            {recentFoods.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Recent Foods</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {recentFoods.map((food, index) => (
                    <button
                      key={index}
                      onClick={() => handleFoodSelect(food.item, food.mealType)}
                      className="rounded-lg border-2 border-foreground/15 bg-background/60 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5 active:bg-primary/10 touch-manipulation text-left"
                    >
                      <div className="truncate">{food.item}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 capitalize">{food.mealType}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Frequent Foods */}
            {frequentFoods.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Frequent Foods</h3>
                <div className="grid grid-cols-2 gap-2">
                  {frequentFoods.map((food, index) => (
                    <button
                      key={index}
                      onClick={() => handleFoodSelect(food.item, food.mealType)}
                      className="rounded-lg border-2 border-foreground/15 bg-background/60 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5 active:bg-primary/10 touch-manipulation text-left"
                    >
                      <div className="truncate">{food.item}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {food.mealType} ({food.count}x)
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Full Log Option */}
            <div className="pt-4 border-t border-foreground/10">
              <button
                onClick={() => setIsFullModalOpen(true)}
                className="w-full rounded-lg border-2 border-primary bg-primary/10 text-primary px-4 py-3 font-medium transition-colors hover:bg-primary/20 active:bg-primary/30 touch-manipulation"
              >
                Full Log Entry
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Modal */}
      {isFullModalOpen && (
        <AddNutritionModal
          isOpen={isFullModalOpen}
          onClose={handleFullModalClose}
          onSuccess={handleFullModalSuccess}
          editingEntry={selectedFood ? {
            id: '',
            food_item: selectedFood.item,
            meal_type: selectedFood.mealType,
            calories: null,
            food_tags: [],
            feeling_after: null,
            notes: null,
            consumed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Nutrition : null}
        />
      )}
    </>
  );
}

