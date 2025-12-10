/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, FormEvent, useEffect } from "react";
import { X, Heart, Dumbbell, StretchHorizontal, Trophy, Activity, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { Fitness } from "./FitnessList";

type AddFitnessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (fitness: Fitness) => void;
  editingEntry?: Fitness | null;
};

export default function AddFitnessModal({
  isOpen,
  onClose,
  onSuccess,
  editingEntry = null,
}: AddFitnessModalProps) {
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseType, setExerciseType] = useState<"cardio" | "strength" | "flexibility" | "sports" | "other">("cardio");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [caloriesBurned, setCaloriesBurned] = useState<string>("");
  const [intensity, setIntensity] = useState<"low" | "medium" | "high" | null>(null);
  const [notes, setNotes] = useState("");
  const [performedAt, setPerformedAt] = useState(() => {
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
      setExerciseName(editingEntry.exercise_name);
      setExerciseType(editingEntry.exercise_type as "cardio" | "strength" | "flexibility" | "sports" | "other");
      setDurationMinutes(editingEntry.duration_minutes?.toString() || "");
      setCaloriesBurned(editingEntry.calories_burned?.toString() || "");
      setIntensity(editingEntry.intensity as "low" | "medium" | "high" | null);
      setNotes(editingEntry.notes || "");
      const date = new Date(editingEntry.performed_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      setPerformedAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      // Reset form for new entry
      setExerciseName("");
      setExerciseType("cardio");
      setDurationMinutes("");
      setCaloriesBurned("");
      setIntensity(null);
      setNotes("");
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setPerformedAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  }, [editingEntry, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Convert local datetime to ISO string
      const performedAtISO = new Date(performedAt).toISOString();

      // Parse duration and calories (allow empty string for null)
      const durationValue = durationMinutes.trim() === "" ? null : parseFloat(durationMinutes);
      if (durationValue !== null && (isNaN(durationValue) || durationValue < 0)) {
        throw new Error("Duration must be a non-negative number");
      }

      const caloriesValue = caloriesBurned.trim() === "" ? null : parseFloat(caloriesBurned);
      if (caloriesValue !== null && (isNaN(caloriesValue) || caloriesValue < 0)) {
        throw new Error("Calories burned must be a non-negative number");
      }

      const url = editingEntry ? "/api/fitness" : "/api/fitness";
      const method = editingEntry ? "PUT" : "POST";

      const body: any = {
        exercise_name: exerciseName.trim(),
        exercise_type: exerciseType,
        duration_minutes: durationValue,
        calories_burned: caloriesValue,
        intensity: intensity || null,
        notes: notes.trim() || null,
        performed_at: performedAtISO,
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
        throw new Error(data.error || `Failed to ${editingEntry ? "update" : "save"} fitness entry`);
      }

      const { data } = await response.json();
      
      // Reset form
      setExerciseName("");
      setExerciseType("cardio");
      setDurationMinutes("");
      setCaloriesBurned("");
      setIntensity(null);
      setNotes("");
      setPerformedAt(() => {
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
      <div className="relative z-100 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl border-t sm:border border-foreground/10 bg-background flex flex-col shadow-xl">
        {/* Header - Sticky on mobile */}
        <div className="shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-foreground/10">
          <h2 className="text-xl sm:text-2xl font-semibold">
            {editingEntry ? "Edit Workout" : "Add Workout"}
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
        <form id="fitness-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Exercise Name */}
          <div>
            <label
              htmlFor="exerciseName"
              className="mb-1.5 sm:mb-2 block text-sm font-medium text-foreground"
            >
              Exercise Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="exerciseName"
              type="text"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              required
              placeholder="e.g., Running, Weight lifting, Yoga"
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 sm:px-4 py-2.5 sm:py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 touch-manipulation"
            />
          </div>

          {/* Exercise Type */}
          <div>
            <label className="mb-2 sm:mb-3 block text-sm font-medium text-foreground">
              Exercise Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {/* Cardio */}
              <button
                type="button"
                onClick={() => setExerciseType("cardio")}
                className={`
                  group relative flex flex-col items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2 sm:p-3 transition-all duration-200 touch-manipulation
                  ${
                    exerciseType === "cardio"
                      ? "border-red-500 bg-red-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-red-300 active:bg-red-50/50"
                  }
                `}
              >
                <Heart
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    exerciseType === "cardio" ? "text-red-600" : "text-red-500"
                  }`}
                />
                <span
                  className={`text-xs font-semibold ${
                    exerciseType === "cardio" ? "text-red-700" : "text-foreground/70"
                  }`}
                >
                  Cardio
                </span>
              </button>

              {/* Strength */}
              <button
                type="button"
                onClick={() => setExerciseType("strength")}
                className={`
                  group relative flex flex-col items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2 sm:p-3 transition-all duration-200 touch-manipulation
                  ${
                    exerciseType === "strength"
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-blue-300 active:bg-blue-50/50"
                  }
                `}
              >
                <Dumbbell
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    exerciseType === "strength" ? "text-blue-600" : "text-blue-500"
                  }`}
                />
                <span
                  className={`text-xs font-semibold ${
                    exerciseType === "strength" ? "text-blue-700" : "text-foreground/70"
                  }`}
                >
                  Strength
                </span>
              </button>

              {/* Flexibility */}
              <button
                type="button"
                onClick={() => setExerciseType("flexibility")}
                className={`
                  group relative flex flex-col items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2 sm:p-3 transition-all duration-200 touch-manipulation
                  ${
                    exerciseType === "flexibility"
                      ? "border-purple-500 bg-purple-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-purple-300 active:bg-purple-50/50"
                  }
                `}
              >
                <StretchHorizontal
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    exerciseType === "flexibility" ? "text-purple-600" : "text-purple-500"
                  }`}
                />
                <span
                  className={`text-xs font-semibold ${
                    exerciseType === "flexibility" ? "text-purple-700" : "text-foreground/70"
                  }`}
                >
                  Flexibility
                </span>
              </button>

              {/* Sports */}
              <button
                type="button"
                onClick={() => setExerciseType("sports")}
                className={`
                  group relative flex flex-col items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2 sm:p-3 transition-all duration-200 touch-manipulation
                  ${
                    exerciseType === "sports"
                      ? "border-green-500 bg-green-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-green-300 active:bg-green-50/50"
                  }
                `}
              >
                <Trophy
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    exerciseType === "sports" ? "text-green-600" : "text-green-500"
                  }`}
                />
                <span
                  className={`text-xs font-semibold ${
                    exerciseType === "sports" ? "text-green-700" : "text-foreground/70"
                  }`}
                >
                  Sports
                </span>
              </button>

              {/* Other */}
              <button
                type="button"
                onClick={() => setExerciseType("other")}
                className={`
                  group relative flex flex-col items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2 sm:p-3 transition-all duration-200 touch-manipulation
                  ${
                    exerciseType === "other"
                      ? "border-gray-500 bg-gray-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-gray-300 active:bg-gray-50/50"
                  }
                `}
              >
                <Activity
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    exerciseType === "other" ? "text-gray-600" : "text-gray-500"
                  }`}
                />
                <span
                  className={`text-xs font-semibold ${
                    exerciseType === "other" ? "text-gray-700" : "text-foreground/70"
                  }`}
                >
                  Other
                </span>
              </button>
            </div>
          </div>

          {/* Intensity */}
          <div>
            <label className="mb-2 sm:mb-3 block text-sm font-medium text-foreground">
              Intensity <span className="text-xs sm:text-sm font-normal text-muted-foreground">(optional)</span>
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* Low */}
              <button
                type="button"
                onClick={() => setIntensity(intensity === "low" ? null : "low")}
                className={`
                  group relative flex flex-col items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2 sm:p-3 transition-all duration-200 touch-manipulation
                  ${
                    intensity === "low"
                      ? "border-green-500 bg-green-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-green-300 active:bg-green-50/50"
                  }
                `}
              >
                <TrendingDown
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    intensity === "low" ? "text-green-600" : "text-green-500"
                  }`}
                />
                <span
                  className={`text-xs font-semibold ${
                    intensity === "low" ? "text-green-700" : "text-foreground/70"
                  }`}
                >
                  Low
                </span>
              </button>

              {/* Medium */}
              <button
                type="button"
                onClick={() => setIntensity(intensity === "medium" ? null : "medium")}
                className={`
                  group relative flex flex-col items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2 sm:p-3 transition-all duration-200 touch-manipulation
                  ${
                    intensity === "medium"
                      ? "border-yellow-500 bg-yellow-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-yellow-300 active:bg-yellow-50/50"
                  }
                `}
              >
                <Minus
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    intensity === "medium" ? "text-yellow-600" : "text-yellow-500"
                  }`}
                />
                <span
                  className={`text-xs font-semibold ${
                    intensity === "medium" ? "text-yellow-700" : "text-foreground/70"
                  }`}
                >
                  Medium
                </span>
              </button>

              {/* High */}
              <button
                type="button"
                onClick={() => setIntensity(intensity === "high" ? null : "high")}
                className={`
                  group relative flex flex-col items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2 sm:p-3 transition-all duration-200 touch-manipulation
                  ${
                    intensity === "high"
                      ? "border-red-500 bg-red-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-red-300 active:bg-red-50/50"
                  }
                `}
              >
                <TrendingUp
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    intensity === "high" ? "text-red-600" : "text-red-500"
                  }`}
                />
                <span
                  className={`text-xs font-semibold ${
                    intensity === "high" ? "text-red-700" : "text-foreground/70"
                  }`}
                >
                  High
                </span>
              </button>
            </div>
          </div>

          {/* Duration & Calories Row */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Duration */}
            <div>
              <label
                htmlFor="durationMinutes"
                className="mb-1.5 sm:mb-2 block text-sm font-medium text-foreground"
              >
                Duration (min) <span className="text-xs sm:text-sm font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="durationMinutes"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                min="0"
                step="1"
                placeholder="e.g., 30"
                className="w-full rounded-lg border border-foreground/15 bg-background px-3 sm:px-4 py-2.5 sm:py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 touch-manipulation"
              />
            </div>

            {/* Calories Burned */}
            <div>
              <label
                htmlFor="caloriesBurned"
                className="mb-1.5 sm:mb-2 block text-sm font-medium text-foreground"
              >
                Calories <span className="text-xs sm:text-sm font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="caloriesBurned"
                type="number"
                value={caloriesBurned}
                onChange={(e) => setCaloriesBurned(e.target.value)}
                min="0"
                step="1"
                placeholder="e.g., 300"
                className="w-full rounded-lg border border-foreground/15 bg-background px-3 sm:px-4 py-2.5 sm:py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 touch-manipulation"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <label
              htmlFor="performedAt"
              className="mb-1.5 sm:mb-2 block text-sm font-medium text-foreground"
            >
              Date & Time <span className="text-rose-500">*</span>
            </label>
            <input
              id="performedAt"
              type="datetime-local"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
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
            form="fitness-form"
            disabled={isSubmitting || !exerciseName.trim()}
            className="flex-1 rounded-lg bg-linear-to-r from-rose-500 to-pink-500 px-4 py-3 sm:py-2.5 text-base font-bold text-white transition-colors active:bg-primary/80 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {isSubmitting
              ? editingEntry
                ? "Updating..."
                : "Saving..."
              : editingEntry
              ? "Update Workout"
              : "Save Workout"}
          </button>
        </div>
      </div>
    </div>
  );
}

