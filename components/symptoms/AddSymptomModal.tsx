"use client";

import { useState, FormEvent } from "react";
import { X, Smile, Meh, Frown } from "lucide-react";
import type { Symptom } from "./SymptomList";

type AddSymptomModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (symptom: Symptom) => void;
};

export default function AddSymptomModal({
  isOpen,
  onClose,
  onSuccess,
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

      const response = await fetch("/api/symptoms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          severity: severityValue,
          notes: notes.trim() || null,
          occurred_at: occurredAtISO,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save symptom");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-foreground/10 bg-background p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Add Symptom</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Symptom Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-foreground"
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
              className="w-full rounded-lg border border-foreground/15 bg-background px-4 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="mb-3 block text-sm font-medium text-foreground">
              Severity <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Low */}
              <button
                type="button"
                onClick={() => setSeverity("low")}
                className={`
                  group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200
                  ${
                    severity === "low"
                      ? "border-green-500 bg-green-50 shadow-md scale-105"
                      : "border-foreground/15 bg-background/60 hover:border-green-300 hover:bg-green-50/50"
                  }
                `}
              >
                <div
                  className={`
                    transition-transform duration-300
                    ${severity === "low" ? "animate-pulse scale-110" : "group-hover:scale-110"}
                  `}
                >
                  <Smile
                    className={`h-10 w-10 ${
                      severity === "low" ? "text-green-600" : "text-green-500"
                    }`}
                  />
                </div>
                <span
                  className={`text-sm font-semibold ${
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
                  group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200
                  ${
                    severity === "medium"
                      ? "border-yellow-500 bg-yellow-50 shadow-md scale-105"
                      : "border-foreground/15 bg-background/60 hover:border-yellow-300 hover:bg-yellow-50/50"
                  }
                `}
              >
                <div
                  className={`
                    transition-transform duration-300
                    ${severity === "medium" ? "animate-pulse scale-110" : "group-hover:scale-110"}
                  `}
                >
                  <Meh
                    className={`h-10 w-10 ${
                      severity === "medium" ? "text-yellow-600" : "text-yellow-500"
                    }`}
                  />
                </div>
                <span
                  className={`text-sm font-semibold ${
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
                  group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200
                  ${
                    severity === "high"
                      ? "border-red-500 bg-red-50 shadow-md scale-105"
                      : "border-foreground/15 bg-background/60 hover:border-red-300 hover:bg-red-50/50"
                  }
                `}
              >
                <div
                  className={`
                    transition-transform duration-300
                    ${severity === "high" ? "animate-pulse scale-110" : "group-hover:scale-110"}
                  `}
                >
                  <Frown
                    className={`h-10 w-10 ${
                      severity === "high" ? "text-red-600" : "text-red-500"
                    }`}
                  />
                </div>
                <span
                  className={`text-sm font-semibold ${
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
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Date & Time <span className="text-rose-500">*</span>
            </label>
            <input
              id="occurredAt"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
              className="w-full rounded-lg border border-foreground/15 bg-background px-4 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Notes <span className="text-sm font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional details..."
              className="w-full rounded-lg border border-foreground/15 bg-background px-4 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-foreground/15 px-4 py-2.5 text-base font-medium transition-colors hover:bg-foreground/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-base font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Save Symptom"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

