"use client";

import { useState } from "react";
import { Trash2, Edit2 } from "lucide-react";

export type Nutrition = {
  id: string;
  food_item: string;
  meal_type: string;
  calories: number | null;
  notes: string | null;
  consumed_at: string;
  created_at: string;
  updated_at: string;
};

type NutritionListProps = {
  nutrition: Nutrition[];
  onDelete?: (id: string) => void;
  onEdit?: (nutrition: Nutrition) => void;
  isLoading?: boolean;
};

export default function NutritionList({
  nutrition,
  onDelete,
  onEdit,
  isLoading = false,
}: NutritionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    
    if (!confirm("Are you sure you want to delete this nutrition entry?")) {
      return;
    }

    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case "breakfast":
        return "bg-orange-500/20 text-orange-700";
      case "lunch":
        return "bg-blue-500/20 text-blue-700";
      case "dinner":
        return "bg-purple-500/20 text-purple-700";
      case "snack":
        return "bg-green-500/20 text-green-700";
      default:
        return "bg-gray-500/20 text-gray-700";
    }
  };

  const formatMealType = (mealType: string) => {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-foreground/10 bg-background/60 p-4"
          >
            <div className="h-4 w-32 bg-foreground/10 rounded mb-2" />
            <div className="h-3 w-24 bg-foreground/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (nutrition.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-background/60 p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-foreground/5">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          No nutrition entries logged yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Start tracking your meals to see patterns over time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {nutrition.map((entry) => {
        const { date, time } = formatDateTime(entry.consumed_at);
        const mealTypeColor = getMealTypeColor(entry.meal_type);
        const mealTypeLabel = formatMealType(entry.meal_type);

        return (
          <div
            key={entry.id}
            className="group rounded-xl border border-foreground/10 bg-background/60 p-4 transition-colors hover:border-foreground/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base font-semibold text-foreground truncate">
                    {entry.food_item}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${mealTypeColor}`}
                    >
                      {mealTypeLabel}
                    </span>
                    {entry.calories !== null && (
                      <span className="text-xs text-muted-foreground font-medium">
                        {entry.calories} cal
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{date}</span>
                  <span>•</span>
                  <span>{time}</span>
                </div>
                {entry.notes && (
                  <p className="mt-2 text-sm text-foreground/80 line-clamp-2">
                    {entry.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              {(onEdit || onDelete) && (
                <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(entry)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                      aria-label="Edit nutrition entry"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                      aria-label="Delete nutrition entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

