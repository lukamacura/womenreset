/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, FormEvent, useEffect } from "react";
import { X, Smile, Meh, Frown } from "lucide-react";
import type { Symptom } from "./SymptomList";

type AddSymptomModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (symptom: Symptom) => void;
  editingEntry?: Symptom | null;
};

export default function AddSymptomModal({
  isOpen,
  onClose,
  onSuccess,
  editingEntry = null,
}: AddSymptomModalProps) {
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [notes, setNotes] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => {
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
      setName(editingEntry.name);
      // Map numeric severity to string: 1-3 = low, 4-6 = medium, 7-10 = high
      if (editingEntry.severity <= 3) {
        setSeverity("low");
      } else if (editingEntry.severity <= 6) {
        setSeverity("medium");
      } else {
        setSeverity("high");
      }
      setNotes(editingEntry.notes || "");
      const date = new Date(editingEntry.occurred_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      setOccurredAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      // Reset form for new entry
      setName("");
      setSeverity("medium");
      setNotes("");
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setOccurredAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  }, [editingEntry, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Convert local datetime to ISO string
      const occurredAtISO = new Date(occurredAt).toISOString();

      // Map severity to numeric value: Low = 3, Medium = 6, High = 9
      const severityMap = { low: 3, medium: 6, high: 9 };
      const severityValue = severityMap[severity];

      const url = editingEntry ? "/api/symptoms" : "/api/symptoms";
      const method = editingEntry ? "PUT" : "POST";

      const body: any = {
        name: name.trim(),
        severity: severityValue,
        notes: notes.trim() || null,
        occurred_at: occurredAtISO,
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
        throw new Error(data.error || `Failed to ${editingEntry ? "update" : "save"} symptom`);
      }

      const { data } = await response.json();
      
      // Reset form
      setName("");
      setSeverity("medium");
      setNotes("");
      setOccurredAt(() => {
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
            {editingEntry ? "Edit Symptom" : "Add Symptom"}
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
        <form id="symptom-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Symptom Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 sm:mb-2 block text-sm font-medium text-foreground"
            >
              Symptom Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Hot flashes, Headache, Fatigue"
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 sm:px-4 py-2.5 sm:py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 touch-manipulation"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="mb-2 sm:mb-3 block text-sm font-medium text-foreground">
              Severity <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* Low */}
              <button
                type="button"
                onClick={() => setSeverity("low")}
                className={`
                  group relative flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2.5 sm:p-4 transition-all duration-200 touch-manipulation
                  ${
                    severity === "low"
                      ? "border-green-500 bg-green-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-green-300 active:bg-green-50/50"
                  }
                `}
              >
                <Smile
                  className={`h-7 w-7 sm:h-10 sm:w-10 ${
                    severity === "low" ? "text-green-600" : "text-green-500"
                  }`}
                />
                <span
                  className={`text-xs sm:text-sm font-semibold ${
                    severity === "low" ? "text-green-700" : "text-foreground/70"
                  }`}
                >
                  Low
                </span>
              </button>

              {/* Medium */}
              <button
                type="button"
                onClick={() => setSeverity("medium")}
                className={`
                  group relative flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2.5 sm:p-4 transition-all duration-200 touch-manipulation
                  ${
                    severity === "medium"
                      ? "border-yellow-500 bg-yellow-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-yellow-300 active:bg-yellow-50/50"
                  }
                `}
              >
                <Meh
                  className={`h-7 w-7 sm:h-10 sm:w-10 ${
                    severity === "medium" ? "text-yellow-600" : "text-yellow-500"
                  }`}
                />
                <span
                  className={`text-xs sm:text-sm font-semibold ${
                    severity === "medium" ? "text-yellow-700" : "text-foreground/70"
                  }`}
                >
                  Medium
                </span>
              </button>

              {/* High */}
              <button
                type="button"
                onClick={() => setSeverity("high")}
                className={`
                  group relative flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border-2 p-2.5 sm:p-4 transition-all duration-200 touch-manipulation
                  ${
                    severity === "high"
                      ? "border-red-500 bg-red-50 shadow-md"
                      : "border-foreground/15 bg-background/60 active:border-red-300 active:bg-red-50/50"
                  }
                `}
              >
                <Frown
                  className={`h-7 w-7 sm:h-10 sm:w-10 ${
                    severity === "high" ? "text-red-600" : "text-red-500"
                  }`}
                />
                <span
                  className={`text-xs sm:text-sm font-semibold ${
                    severity === "high" ? "text-red-700" : "text-foreground/70"
                  }`}
                >
                  High
                </span>
              </button>
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <label
              htmlFor="occurredAt"
              className="mb-1.5 sm:mb-2 block text-sm font-medium text-foreground"
            >
              Date & Time <span className="text-rose-500">*</span>
            </label>
            <input
              id="occurredAt"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
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
            form="symptom-form"
            disabled={isSubmitting || !name.trim()}
            className="flex-1 rounded-lg bg-linear-to-r from-rose-500 to-pink-500 px-4 py-3 sm:py-2.5 text-base font-bold text-white transition-colors active:bg-primary/80 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {isSubmitting ? "Saving..." : editingEntry ? "Update Symptom" : "Save Symptom"}
          </button>
        </div>
      </div>
    </div>
  );
}

