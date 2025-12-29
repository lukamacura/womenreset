/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, FormEvent, useEffect } from "react";
import { X, Sunrise, Sun, Moon, Cookie, ArrowRight, ArrowLeft, Zap, Meh, Frown } from "lucide-react";
import type { Nutrition } from "./NutritionList";

type AddNutritionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nutrition: Nutrition) => void;
  editingEntry?: Nutrition | null;
  initialMealType?: "breakfast" | "lunch" | "dinner" | "snack" | null;
};

type Step = 1 | 2 | 3 | 4 | 5;

export default function AddNutritionModal({
  isOpen,
  onClose,
  onSuccess,
  editingEntry = null,
  initialMealType = null,
}: AddNutritionModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [foodItem, setFoodItem] = useState("");
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack" | null>(initialMealType || null);
  const [foodTags, setFoodTags] = useState<string[]>([]);
  const [feelingAfter, setFeelingAfter] = useState<'energized' | 'no_change' | 'sluggish' | 'bloated' | null>(null);
  const [calories, setCalories] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [timeSelection, setTimeSelection] = useState<'now' | 'earlier-today' | 'yesterday'>('now');
  const [customTime, setCustomTime] = useState<string>("");

  // Food tag options
  const triggerFoods = [
    { value: 'caffeine', label: 'Caffeine' },
    { value: 'alcohol', label: 'Alcohol' },
    { value: 'spicy_food', label: 'Spicy food' },
    { value: 'sugar_refined_carbs', label: 'Sugar/refined carbs' },
    { value: 'processed_food', label: 'Processed food' },
  ];

  const supportiveFoods = [
    { value: 'phytoestrogens', label: 'Phytoestrogens' },
    { value: 'calcium_rich', label: 'Calcium-rich' },
    { value: 'omega_3s', label: 'Omega-3s' },
    { value: 'fiber', label: 'Fiber' },
    { value: 'protein', label: 'Protein' },
  ];

  const toggleFoodTag = (tag: string) => {
    setFoodTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };
  // Calculate consumed_at timestamp based on time selection
  const getConsumedAtTimestamp = (): string => {
    if (editingEntry) {
      // When editing, use the existing timestamp
      return editingEntry.consumed_at;
    }

    const now = new Date();
    
    if (timeSelection === 'now') {
      return now.toISOString();
    }
    
    if (timeSelection === 'earlier-today') {
      if (customTime) {
        // Parse custom time (format: HH:MM)
        const [hours, minutes] = customTime.split(':').map(Number);
        const logTime = new Date(now);
        logTime.setHours(hours, minutes, 0, 0);
        return logTime.toISOString();
      }
      // Default to 2 hours ago if no custom time
      const logTime = new Date(now);
      logTime.setHours(logTime.getHours() - 2);
      return logTime.toISOString();
    }
    
    if (timeSelection === 'yesterday') {
      const logTime = new Date(now);
      logTime.setDate(logTime.getDate() - 1);
      if (customTime) {
        const [hours, minutes] = customTime.split(':').map(Number);
        logTime.setHours(hours, minutes, 0, 0);
      } else {
        // Default to same time yesterday
        logTime.setHours(now.getHours(), now.getMinutes(), 0, 0);
      }
      return logTime.toISOString();
    }
    
    // Fallback to current time
    return now.toISOString();
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing or when initialMealType is provided
  useEffect(() => {
    if (editingEntry) {
      setFoodItem(editingEntry.food_item);
      setMealType(editingEntry.meal_type as "breakfast" | "lunch" | "dinner" | "snack");
      setFoodTags(Array.isArray(editingEntry.food_tags) ? editingEntry.food_tags : []);
      setFeelingAfter(editingEntry.feeling_after || null);
      setCalories(editingEntry.calories?.toString() || "");
      setNotes(editingEntry.notes || "");
      setTimeSelection('now'); // When editing, don't change the time
      setCustomTime("");
      setCurrentStep(1); // Start at step 1 when editing
    } else {
      // Reset form for new entry
      setFoodItem("");
      setMealType(initialMealType || null);
      setFoodTags([]);
      setFeelingAfter(null);
      setCalories("");
      setNotes("");
      setTimeSelection('now');
      setCustomTime("");
      setCurrentStep(1);
      // If initialMealType is provided, advance to step 2 (food item)
      if (initialMealType) {
        setCurrentStep(2);
      }
    }
  }, [editingEntry, isOpen, initialMealType]);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Only allow submission on step 5 (final step)
    if (currentStep !== 5) {
      return;
    }
    
    setError(null);
    setIsSubmitting(true);

    try {
      // Get consumed_at timestamp based on time selection
      const consumedAtISO = getConsumedAtTimestamp();

      // Parse calories (allow empty string for null)
      const caloriesValue = calories.trim() === "" ? null : parseFloat(calories);
      if (caloriesValue !== null && (isNaN(caloriesValue) || caloriesValue < 0)) {
        throw new Error("Calories must be a non-negative number");
      }

      const url = editingEntry ? "/api/nutrition" : "/api/nutrition";
      const method = editingEntry ? "PUT" : "POST";

      if (!mealType) {
        throw new Error("Meal type is required");
      }

      const body: any = {
        food_item: foodItem.trim(),
        meal_type: mealType,
        food_tags: foodTags,
        feeling_after: feelingAfter,
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
      setMealType(null);
      setFoodTags([]);
      setFeelingAfter(null);
      setCalories("");
      setNotes("");
      setTimeSelection('now');
      setCustomTime("");
      setCurrentStep(1);

      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return mealType !== null;
      case 2:
        return foodItem.trim().length > 0;
      case 3:
      case 4:
      case 5:
        return true; // Optional steps
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{ background: 'linear-gradient(to bottom, #DBEAFE, #FEF3C7, #FCE7F3)' }}
    >
      {/* Modal */}
      <div
        className="bg-white/30 backdrop-blur-lg rounded-2xl w-full max-w-md mx-4 shadow-xl border border-white/30 cursor-default overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky on mobile */}
        <div className="shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-white/30">
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="rounded-lg p-2 text-muted-foreground transition-colors active:bg-foreground/10 hover:bg-foreground/10 hover:text-foreground touch-manipulation"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-xl sm:text-2xl font-semibold">
              {editingEntry
                ? "Edit Entry"
                : initialMealType && currentStep === 1
                ? `Log ${initialMealType.charAt(0).toUpperCase() + initialMealType.slice(1)}`
                : currentStep === 1
                ? "Select a Meal"
                : "Add Details"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors active:bg-foreground/10 hover:bg-foreground/10 hover:text-foreground touch-manipulation"
            aria-label="Close"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Step 1: Meal Type */}
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Breakfast */}
                <button
                  type="button"
                  onClick={() => {
                    setMealType("breakfast");
                    setTimeout(() => setCurrentStep(2), 300);
                  }}
                  className={`
                    group bg-white/70 relative flex flex-col items-center gap-2 sm:gap-3 rounded-xl border border-foreground/15 p-4 sm:p-5 transition-all duration-200 touch-manipulation
                    ${
                      mealType === "breakfast"
                        ? "border-orange-500 bg-orange-50 shadow-md"
                        : "hover:border-orange-300 hover:bg-orange-50/30 active:scale-95"
                    }
                  `}
                >
                  <Sunrise
                    className={`h-7 w-7 sm:h-9 sm:w-9 transition-colors ${
                      mealType === "breakfast" ? "text-orange-600" : "text-orange-500"
                    }`}
                  />
                  <span
                    className={`text-sm sm:text-base font-semibold transition-colors ${
                      mealType === "breakfast" ? "text-orange-700" : "text-foreground/70"
                    }`}
                  >
                    Breakfast
                  </span>
                </button>

                {/* Lunch */}
                <button
                  type="button"
                  onClick={() => {
                    setMealType("lunch");
                    setTimeout(() => setCurrentStep(2), 300);
                  }}
                  className={`
                    group bg-white/70 relative flex flex-col items-center gap-2 sm:gap-3 rounded-xl border border-foreground/15 p-4 sm:p-5 transition-all duration-200 touch-manipulation
                    ${
                      mealType === "lunch"
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "hover:border-blue-300 hover:bg-blue-50/30 active:scale-95"
                    }
                  `}
                >
                  <Sun
                    className={`h-7 w-7 sm:h-9 sm:w-9 transition-colors ${
                      mealType === "lunch" ? "text-blue-600" : "text-blue-500"
                    }`}
                  />
                  <span
                    className={`text-sm sm:text-base font-semibold transition-colors ${
                      mealType === "lunch" ? "text-blue-700" : "text-foreground/70"
                    }`}
                  >
                    Lunch
                  </span>
                </button>

                {/* Dinner */}
                <button
                  type="button"
                  onClick={() => {
                    setMealType("dinner");
                    setTimeout(() => setCurrentStep(2), 300);
                  }}
                  className={`
                    group bg-white/70 relative flex flex-col items-center gap-2 sm:gap-3 rounded-xl border border-foreground/15 p-4 sm:p-5 transition-all duration-200 touch-manipulation
                    ${
                      mealType === "dinner"
                        ? "border-purple-500 bg-purple-50 shadow-md"
                        : "hover:border-purple-300 hover:bg-purple-50/30 active:scale-95"
                    }
                  `}
                >
                  <Moon
                    className={`h-7 w-7 sm:h-9 sm:w-9 transition-colors ${
                      mealType === "dinner" ? "text-purple-600" : "text-purple-500"
                    }`}
                  />
                  <span
                    className={`text-sm sm:text-base font-semibold transition-colors ${
                      mealType === "dinner" ? "text-purple-700" : "text-foreground/70"
                    }`}
                  >
                    Dinner
                  </span>
                </button>

                {/* Snack */}
                <button
                  type="button"
                  onClick={() => {
                    setMealType("snack");
                    setTimeout(() => setCurrentStep(2), 300);
                  }}
                  className={`
                    group bg-white/70 relative flex flex-col items-center gap-2 sm:gap-3 rounded-xl border border-foreground/15 p-4 sm:p-5 transition-all duration-200 touch-manipulation
                    ${
                      mealType === "snack"
                        ? "border-green-500 bg-green-50 shadow-md"
                        : "hover:border-green-300 hover:bg-green-50/30 active:scale-95"
                    }
                  `}
                >
                  <Cookie
                    className={`h-7 w-7 sm:h-9 sm:w-9 transition-colors ${
                      mealType === "snack" ? "text-green-600" : "text-green-500"
                    }`}
                  />
                  <span
                    className={`text-sm sm:text-base font-semibold transition-colors ${
                      mealType === "snack" ? "text-green-700" : "text-foreground/70"
                    }`}
                  >
                    Snack
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Food Item */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <label
                htmlFor="foodItem"
                className="mb-4 block text-base font-semibold text-foreground"
              >
                What did you eat? <span className="text-primary-dark">*</span>
              </label>
              <input
                id="foodItem"
                type="text"
                value={foodItem}
                onChange={(e) => setFoodItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // Don't auto-submit, require Next button click
                    handleNext();
                  }
                }}
                required
                placeholder="e.g., Grilled chicken salad, Oatmeal with berries"
                className="w-full rounded-xl border border-foreground/15 bg-background px-4 py-4 text-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 touch-manipulation"
                autoFocus
              />
            </div>
          )}

          {/* Step 3: Food Tags */}
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <label className="mb-4 block text-base font-semibold text-foreground">
                Food Tags <span className="text-sm font-normal text-muted-foreground">(optional - tap to select)</span>
              </label>
              
              {/* Trigger Foods */}
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-3 font-medium">Trigger Foods:</p>
                <div className="flex flex-wrap gap-2">
                  {triggerFoods.map((food) => (
                    <button
                      key={food.value}
                      type="button"
                      onClick={() => toggleFoodTag(food.value)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 touch-manipulation border ${
                        foodTags.includes(food.value)
                          ? 'bg-red-100 text-red-700 border-red-400 shadow-md'
                          : 'bg-background/60 text-gray-700 border-foreground/15 hover:bg-red-50 hover:border-red-300 active:scale-95'
                      }`}
                    >
                      {food.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Supportive Foods */}
              <div>
                <p className="text-sm text-muted-foreground mb-3 font-medium">Supportive Foods:</p>
                <div className="flex flex-wrap gap-2">
                  {supportiveFoods.map((food) => (
                    <button
                      key={food.value}
                      type="button"
                      onClick={() => toggleFoodTag(food.value)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 touch-manipulation border ${
                        foodTags.includes(food.value)
                          ? 'bg-green-100 text-green-700 border-green-400 shadow-md'
                          : 'bg-background/60 text-gray-700 border-foreground/15 hover:bg-green-50 hover:border-green-300 active:scale-95'
                      }`}
                    >
                      {food.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Feeling After */}
          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <label className="mb-4 block text-base font-semibold text-foreground">
                How did you feel after? <span className="text-sm font-normal text-muted-foreground">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'energized', label: 'Energized', icon: Zap, activeClass: 'bg-green-50 text-green-700 border-green-400', inactiveClass: 'bg-white text-gray-700 border-gray-300 hover:bg-green-50' },
                  { value: 'no_change', label: 'No change', icon: Meh, activeClass: 'bg-yellow-100 text-gray-800 border-gray-400', inactiveClass: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50' },
                  { value: 'sluggish', label: 'Sluggish', icon: Frown, activeClass: 'bg-orange-50 text-orange-700 border-orange-400', inactiveClass: 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50' },
                  { value: 'bloated', label: 'Bloated', icon: Frown, activeClass: 'bg-red-50 text-red-700 border-red-400', inactiveClass: 'bg-white text-gray-700 border-gray-300 hover:bg-red-50' },
                ].map((feeling) => {
                  const Icon = feeling.icon;
                  return (
                    <button
                      key={feeling.value}
                      type="button"
                      onClick={() => setFeelingAfter(feelingAfter === feeling.value ? null : feeling.value as any)}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 touch-manipulation ${
                        feelingAfter === feeling.value
                          ? feeling.activeClass + ' shadow-md'
                          : feeling.inactiveClass + ' border-foreground/15 bg-background/60 active:scale-95'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-sm font-semibold">{feeling.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: Time & Notes */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-white/40 backdrop-blur-md rounded-xl p-6 border border-white/30">
                <label className="text-[#3D3D3D] text-lg mb-4 block font-semibold">
                  When did you eat this?
                </label>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTimeSelection('now');
                      setCustomTime("");
                    }}
                    className={`px-4 py-3 rounded-xl text-left transition-all cursor-pointer text-base
                      ${
                        timeSelection === 'now'
                          ? "bg-[#ff74b1] text-white shadow-md"
                          : "bg-white/60 text-[#3D3D3D] hover:bg-white/80 border border-white/30"
                      }`}
                  >
                    Just now {timeSelection === 'now' && '✓'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeSelection('earlier-today')}
                    className={`px-4 py-3 rounded-xl text-left transition-all cursor-pointer text-base
                      ${
                        timeSelection === 'earlier-today'
                          ? "bg-[#ff74b1] text-white shadow-md"
                          : "bg-white/60 text-[#3D3D3D] hover:bg-white/80 border border-white/30"
                      }`}
                  >
                    Earlier today {timeSelection === 'earlier-today' && '✓'}
                  </button>
                  {timeSelection === 'earlier-today' && (
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-4 px-4 py-2 rounded-xl border border-white/30 text-base bg-white/60 backdrop-blur-md
                               focus:outline-none focus:ring-2 focus:ring-[#ff74b1]"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setTimeSelection('yesterday')}
                    className={`px-4 py-3 rounded-xl text-left transition-all cursor-pointer text-base
                      ${
                        timeSelection === 'yesterday'
                          ? "bg-[#ff74b1] text-white shadow-md"
                          : "bg-white/60 text-[#3D3D3D] hover:bg-white/80 border border-white/30"
                      }`}
                  >
                    Yesterday {timeSelection === 'yesterday' && '✓'}
                  </button>
                  {timeSelection === 'yesterday' && (
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-4 px-4 py-2 rounded-xl border border-white/30 text-base bg-white/60 backdrop-blur-md
                               focus:outline-none focus:ring-2 focus:ring-[#ff74b1]"
                    />
                  )}
                </div>
              </div>

              <div className="bg-white/40 backdrop-blur-md rounded-xl p-6 border border-white/30">
                <label className="text-[#3D3D3D] text-lg mb-4 block font-semibold">
                  Quick note (optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onKeyDown={(e) => {
                    // Prevent form submission on Enter - only Save button should submit
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      // Allow Ctrl+Enter or Cmd+Enter to submit
                      return;
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      // Allow normal Enter for new lines, but prevent form submission
                      // The form will only submit via the Save button
                    }
                  }}
                  rows={3}
                  placeholder="Any additional details..."
                  className="w-full bg-white/60 backdrop-blur-md text-[#3D3D3D] rounded-xl p-4 text-base 
                           placeholder-[#9A9A9A] resize-none h-32
                           focus:outline-none focus:ring-2 focus:ring-[#ff74b1] border border-white/30"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-error/30 bg-error/10 p-2.5 sm:p-3 text-sm text-error">
              {error}
            </div>
          )}
        </div>

        {/* Actions - Sticky footer on mobile */}
        <div className="shrink-0 flex gap-2 sm:gap-3 p-4 sm:p-6 pt-3 sm:pt-2 border-t border-white/30">
          {currentStep === 1 ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-foreground/15 px-4 py-3 sm:py-2.5 text-base font-medium transition-colors active:bg-foreground/5 hover:bg-foreground/5 touch-manipulation"
            >
              Cancel
            </button>
          ) : currentStep < 5 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-foreground/15 px-4 py-3 sm:py-2.5 text-base font-medium transition-colors active:bg-foreground/5 hover:bg-foreground/5 touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="btn-primary flex-1 px-4 py-3 sm:py-2.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex items-center justify-center gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-foreground/15 px-4 py-3 sm:py-2.5 text-base font-medium transition-colors active:bg-foreground/5 hover:bg-foreground/5 disabled:opacity-50 touch-manipulation flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !foodItem.trim() || !mealType}
                className="btn-primary flex-1 px-4 py-3 sm:py-2.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {isSubmitting
                  ? editingEntry
                    ? "Updating..."
                    : "Saving..."
                  : editingEntry
                  ? "Update Entry"
                  : "Save Entry"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

