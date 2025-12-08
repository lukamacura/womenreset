/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, FormEvent, useEffect } from "react";
import { X, Sunrise, Sun, Moon, Cookie } from "lucide-react";
import type { Nutrition } from "./NutritionList";

type AddNutritionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nutrition: Nutrition) => void;
  editingEntry?: Nutrition | null;
};

export default function AddNutritionModal({
  isOpen,
  onClose,
  onSuccess,
  editingEntry = null,
}: AddNutritionModalProps) {
  const [foodItem, setFoodItem] = useState("");
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("breakfast");
  const [calories, setCalories] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [consumedAt, setConsumedAt] = useState(() => {
    // Default to current date/time
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (editingEntry) {
      setFoodItem(editingEntry.food_item);
      setMealType(editingEntry.meal_type as "breakfast" | "lunch" | "dinner" | "snack");
      setCalories(editingEntry.calories?.toString() || "");
      setNotes(editingEntry.notes || "");
      const date = new Date(editingEntry.consumed_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      setConsumedAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      // Reset form for new entry
      setFoodItem("");
      setMealType("breakfast");
      setCalories("");
      setNotes("");
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setConsumedAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  }, [editingEntry, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Convert local datetime to ISO string
      const consumedAtISO = new Date(consumedAt).toISOString();

      // Parse calories (allow empty string for null)
      const caloriesValue = calories.trim() === "" ? null : parseFloat(calories);
      if (caloriesValue !== null && (isNaN(caloriesValue) || caloriesValue < 0)) {
        throw new Error("Calories must be a non-negative number");
      }

      const url = editingEntry ? "/api/nutrition" : "/api/nutrition";
      const method = editingEntry ? "PUT" : "POST";

      const body: any = {
        food_item: foodItem.trim(),
        meal_type: mealType,
        calories: caloriesValue,
        notes: notes.trim() || null,
        consumed_at: consumedAtISO,
      };

      if (editingEntry) {
        body.id = editingEntry.id;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${editingEntry ? "update" : "save"} nutrition entry`);
      }

      const { data } = await response.json();
      
      // Reset form
      setFoodItem("");
      setMealType("breakfast");
      setCalories("");
      setNotes("");
      setConsumedAt(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      });

      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl border-t sm:border border-foreground/10 bg-background flex flex-col shadow-xl">
        {/* Header - Sticky on mobile */}
        <div className="shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-foreground/10">
          <h2 className="text-xl sm:text-2xl font-semibold">
            {editingEntry ? "Edit Nutrition Entry" : "Add Nutrition Entry"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors active:bg-foreground/10 hover:bg-foreground/10 hover:text-foreground touch-manipulation"
            aria-label="Close"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form id="nutrition-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Food Item */}
          <div>
            <label
              htmlFor="foodItem"
              className="mb-1.5 sm:mb-2 block text-sm font-medium text-foreground"
            >
              Food Item <span className="text-rose-500">*</span>
            </label>
            <input
              id="foodItem"
              type="text"
              value={foodItem}
              onChange={(e) => setFoodItem(e.target.value)}
              required
              placeholder="e.g., Grilled chicken salad, Oatmeal with berries"
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 sm:px-4 py-2.5 sm:py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 touch-manipulation"
            />
          </div>

          {/* Meal Type */}
          <div>
            <label className="mb-2 sm:mb-3 block text-sm font-medium text-foreground">
              Meal Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Breakfast */}
              <button
                type="button"
                onClick={() => setMealType("breakfast")}
                className={`
                  group relative flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2.5 sm:p-4 transition-all duration-200 touch-manipulation
                  ${
                    mealType === "breakfast"
                      ? "border-orange-500 bg-orange-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-orange-300 active:bg-orange-50/50"
                  }
                `}
              >
                <Sunrise
                  className={`h-6 w-6 sm:h-8 sm:w-8 ${
                    mealType === "breakfast" ? "text-orange-600" : "text-orange-500"
                  }`}
                />
                <span
                  className={`text-xs sm:text-sm font-semibold ${
                    mealType === "breakfast" ? "text-orange-700" : "text-foreground/70"
                  }`}
                >
                  Breakfast
                </span>
              </button>

              {/* Lunch */}
              <button
                type="button"
                onClick={() => setMealType("lunch")}
                className={`
                  group relative flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2.5 sm:p-4 transition-all duration-200 touch-manipulation
                  ${
                    mealType === "lunch"
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-blue-300 active:bg-blue-50/50"
                  }
                `}
              >
                <Sun
                  className={`h-6 w-6 sm:h-8 sm:w-8 ${
                    mealType === "lunch" ? "text-blue-600" : "text-blue-500"
                  }`}
                />
                <span
                  className={`text-xs sm:text-sm font-semibold ${
                    mealType === "lunch" ? "text-blue-700" : "text-foreground/70"
                  }`}
                >
                  Lunch
                </span>
              </button>

              {/* Dinner */}
              <button
                type="button"
                onClick={() => setMealType("dinner")}
                className={`
                  group relative flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2.5 sm:p-4 transition-all duration-200 touch-manipulation
                  ${
                    mealType === "dinner"
                      ? "border-purple-500 bg-purple-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-purple-300 active:bg-purple-50/50"
                  }
                `}
              >
                <Moon
                  className={`h-6 w-6 sm:h-8 sm:w-8 ${
                    mealType === "dinner" ? "text-purple-600" : "text-purple-500"
                  }`}
                />
                <span
                  className={`text-xs sm:text-sm font-semibold ${
                    mealType === "dinner" ? "text-purple-700" : "text-foreground/70"
                  }`}
                >
                  Dinner
                </span>
              </button>

              {/* Snack */}
              <button
                type="button"
                onClick={() => setMealType("snack")}
                className={`
                  group relative flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2.5 sm:p-4 transition-all duration-200 touch-manipulation
                  ${
                    mealType === "snack"
                      ? "border-green-500 bg-green-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-green-300 active:bg-green-50/50"
                  }
                `}
              >
                <Cookie
                  className={`h-6 w-6 sm:h-8 sm:w-8 ${
                    mealType === "snack" ? "text-green-600" : "text-green-500"
                  }`}
                />
                <span
                  className={`text-xs sm:text-sm font-semibold ${
                    mealType === "snack" ? "text-green-700" : "text-foreground/70"
                  }`}
                >
                  Snack
                </span>
              </button>
            </div>
          </div>

          {/* Calories */}
          <div>
            <label
              htmlFor="calories"
              className="mb-1.5 sm:mb-2 block text-sm font-medium text-foreground"
            >
              Calories <span className="text-xs sm:text-sm font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="calories"
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              min="0"
              step="1"
              placeholder="e.g., 350"
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 sm:px-4 py-2.5 sm:py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 touch-manipulation"
            />
          </div>

          {/* Date & Time */}
          <div>
            <label
              htmlFor="consumedAt"
              className="mb-1.5 sm:mb-2 block text-sm font-medium text-foreground"
            >
              Date & Time <span className="text-rose-500">*</span>
            </label>
            <input
              id="consumedAt"
              type="datetime-local"
              value={consumedAt}
              onChange={(e) => setConsumedAt(e.target.value)}
              required
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 sm:px-4 py-2.5 sm:py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 touch-manipulation"
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="mb-1.5 sm:mb-2 block text-sm font-medium text-foreground"
            >
              Notes <span className="text-xs sm:text-sm font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional details..."
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 sm:px-4 py-2 sm:py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none touch-manipulation"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2.5 sm:p-3 text-sm text-rose-300">
              {error}
            </div>
          )}
        </form>

        {/* Actions - Sticky footer on mobile */}
        <div className="shrink-0 flex gap-2 sm:gap-3 p-4 sm:p-6 pt-3 sm:pt-2 border-t border-foreground/10 bg-background">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-foreground/15 px-4 py-3 sm:py-2.5 text-base font-medium transition-colors active:bg-foreground/5 hover:bg-foreground/5 disabled:opacity-50 touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="nutrition-form"
            disabled={isSubmitting || !foodItem.trim()}
            className="flex-1 rounded-lg bg-linear-to-r from-orange-500 to-rose-500 px-4 py-3 sm:py-2.5 text-base font-bold text-white transition-colors active:bg-primary/80 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {isSubmitting
              ? editingEntry
                ? "Updating..."
                : "Saving..."
              : editingEntry
              ? "Update Entry"
              : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

