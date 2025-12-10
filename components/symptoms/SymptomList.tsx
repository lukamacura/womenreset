"use client";

import { useState } from "react";
import { Trash2, Edit2, Smile, Meh, Frown } from "lucide-react";

export type Symptom = {
  id: string;
  name: string;
  severity: number;
  notes: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
};

type SymptomListProps = {
  symptoms: Symptom[];
  onDelete?: (id: string) => void;
  onEdit?: (symptom: Symptom) => void;
  isLoading?: boolean;
};

export default function SymptomList({
  symptoms,
  onDelete,
  onEdit,
  isLoading = false,
}: SymptomListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    
    if (!confirm("Are you sure you want to delete this symptom entry?")) {
      return;
    }

    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity <= 3) return "bg-green-500/20 text-green-700";
    if (severity <= 6) return "bg-yellow-500/20 text-yellow-700";
    return "bg-red-500/20 text-red-700";
  };

  const getSeverityLabel = (severity: number) => {
    if (severity <= 3) return "Low";
    if (severity <= 6) return "Medium";
    return "High";
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

  if (symptoms.length === 0) {
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          No symptoms logged yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Start tracking your symptoms to see patterns over time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {symptoms.map((symptom) => {
        const { date, time } = formatDateTime(symptom.occurred_at);
        const severityColor = getSeverityColor(symptom.severity);
        const severityLabel = getSeverityLabel(symptom.severity);

        return (
          <div
            key={symptom.id}
            className="group rounded-xl border border-foreground/10 bg-background/60 p-4 transition-colors hover:border-foreground/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onEdit?.(symptom)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base font-semibold text-foreground truncate">
                    {symptom.name}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {symptom.severity <= 3 && (
                      <Smile className="h-4 w-4 text-green-600" />
                    )}
                    {symptom.severity > 3 && symptom.severity <= 6 && (
                      <Meh className="h-4 w-4 text-yellow-600" />
                    )}
                    {symptom.severity > 6 && (
                      <Frown className="h-4 w-4 text-red-600" />
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${severityColor}`}
                    >
                      {severityLabel}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{date}</span>
                  <span>•</span>
                  <span>{time}</span>
                </div>
                {symptom.notes && (
                  <p className="mt-2 text-sm text-foreground/80 line-clamp-2">
                    {symptom.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              {onDelete && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(symptom.id);
                    }}
                    disabled={deletingId === symptom.id}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary-light/50 hover:text-primary-dark disabled:opacity-50"
                    aria-label="Delete symptom"
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

