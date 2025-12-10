"use client";

import { useState } from "react";
import { Trash2, Heart, Dumbbell, StretchHorizontal, Trophy, Activity } from "lucide-react";

export type Fitness = {
  id: string;
  exercise_name: string;
  exercise_type: string;
  duration_minutes: number | null;
  calories_burned: number | null;
  intensity: string | null;
  notes: string | null;
  performed_at: string;
  created_at: string;
  updated_at: string;
};

type FitnessListProps = {
  fitness: Fitness[];
  onDelete?: (id: string) => void;
  onEdit?: (fitness: Fitness) => void;
  isLoading?: boolean;
};

export default function FitnessList({
  fitness,
  onDelete,
  onEdit,
  isLoading = false,
}: FitnessListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    
    if (!confirm("Are you sure you want to delete this fitness entry?")) {
      return;
    }

    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getExerciseTypeColor = (exerciseType: string) => {
    switch (exerciseType.toLowerCase()) {
      case "cardio":
        return "bg-red-500/20 text-red-700";
      case "strength":
        return "bg-blue-500/20 text-blue-700";
      case "flexibility":
        return "bg-purple-500/20 text-purple-700";
      case "sports":
        return "bg-green-500/20 text-green-700";
      case "other":
        return "bg-gray-500/20 text-gray-700";
      default:
        return "bg-gray-500/20 text-gray-700";
    }
  };

  const formatExerciseType = (exerciseType: string) => {
    return exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1);
  };

  const getExerciseTypeIcon = (exerciseType: string) => {
    switch (exerciseType.toLowerCase()) {
      case "cardio":
        return <Heart className="h-4 w-4 text-red-600" />;
      case "strength":
        return <Dumbbell className="h-4 w-4 text-blue-600" />;
      case "flexibility":
        return <StretchHorizontal className="h-4 w-4 text-purple-600" />;
      case "sports":
        return <Trophy className="h-4 w-4 text-green-600" />;
      case "other":
        return <Activity className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getIntensityColor = (intensity: string | null) => {
    if (!intensity) return "";
    switch (intensity.toLowerCase()) {
      case "low":
        return "bg-green-500/20 text-green-700";
      case "medium":
        return "bg-yellow-500/20 text-yellow-700";
      case "high":
        return "bg-red-500/20 text-red-700";
      default:
        return "";
    }
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

  if (fitness.length === 0) {
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          No fitness entries logged yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Start tracking your workouts to see patterns over time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fitness.map((entry) => {
        const { date, time } = formatDateTime(entry.performed_at);
        const exerciseTypeColor = getExerciseTypeColor(entry.exercise_type);
        const exerciseTypeLabel = formatExerciseType(entry.exercise_type);
        const intensityColor = getIntensityColor(entry.intensity);

        return (
          <div
            key={entry.id}
            className="group rounded-xl border border-foreground/10 bg-background/60 p-4 transition-colors hover:border-foreground/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onEdit?.(entry)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base font-semibold text-foreground truncate">
                    {entry.exercise_name}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {getExerciseTypeIcon(entry.exercise_type)}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${exerciseTypeColor}`}
                    >
                      {exerciseTypeLabel}
                    </span>
                    {entry.intensity && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${intensityColor}`}
                      >
                        {entry.intensity.charAt(0).toUpperCase() + entry.intensity.slice(1)}
                      </span>
                    )}
                    {entry.duration_minutes !== null && (
                      <span className="text-xs text-muted-foreground font-medium">
                        {entry.duration_minutes} min
                      </span>
                    )}
                    {entry.calories_burned !== null && (
                      <span className="text-xs text-muted-foreground font-medium">
                        {entry.calories_burned} cal
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
              {onDelete && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entry.id);
                    }}
                    disabled={deletingId === entry.id}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary-light/50 hover:text-primary-dark disabled:opacity-50"
                    aria-label="Delete fitness entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

