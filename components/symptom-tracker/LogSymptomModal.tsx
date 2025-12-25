"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { TRIGGER_OPTIONS, SEVERITY_LABELS } from "@/lib/symptom-tracker-constants";
import type { LogSymptomData, Symptom, SymptomLog } from "@/lib/symptom-tracker-constants";

interface LogSymptomModalProps {
  symptom: Symptom;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LogSymptomData) => Promise<void>;
  editingLog?: SymptomLog | null; // Optional: if provided, we're editing
}

export default function LogSymptomModal({
  symptom,
  isOpen,
  onClose,
  onSave,
  editingLog = null,
}: LogSymptomModalProps) {
  const [severity, setSeverity] = useState(2); // Default to Moderate
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingLog;

  // Reset form when modal opens/closes or editing log changes
  useEffect(() => {
    if (isOpen) {
      if (editingLog) {
        // Pre-populate form with existing log data
        setSeverity(editingLog.severity);
        setSelectedTriggers(editingLog.triggers || []);
        setNotes(editingLog.notes || "");
      } else {
        // Reset to defaults for new log
        setSeverity(2); // Default to Moderate
        setSelectedTriggers([]);
        setNotes("");
      }
      setError(null);
    }
  }, [isOpen, editingLog]);

  if (!isOpen) return null;

  // CRITICAL: Toggle trigger without closing modal
  const handleTriggerClick = (trigger: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop bubbling - THIS FIXES THE BUG

    setSelectedTriggers((prev) => {
      if (prev.includes(trigger)) {
        return prev.filter((t) => t !== trigger);
      } else {
        return [...prev, trigger];
      }
    });
  };

  // Handle backdrop click to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle save
  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      await onSave({
        symptomId: symptom.id,
        severity,
        triggers: selectedTriggers,
        notes,
        logId: editingLog?.id, // Include log ID if editing
      });

      // Reset form
      setSeverity(2); // Default to Moderate
      setSelectedTriggers([]);
      setNotes("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save symptom log");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 cursor-pointer"
      onClick={handleBackdropClick}
    >
      {/* Modal - stop propagation here too */}
      <div
        className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl border border-[#E8E0DB] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[#3D3D3D]">
            {isEditing ? "Update" : "Log"} {symptom.name}
          </h2>
          <button
            onClick={onClose}
            className="text-[#9A9A9A] hover:text-[#3D3D3D] text-2xl transition-colors cursor-pointer"
            type="button"
          >
            ×
          </button>
        </div>

        {/* Severity */}
        <div className="mb-6">
          <label className="text-[#6B6B6B] text-sm mb-3 block">
            How severe?
          </label>
          <div className="flex gap-4 justify-center">
            {[1, 2, 3].map((level) => {
              const severityInfo = SEVERITY_LABELS[level as keyof typeof SEVERITY_LABELS];
              return (
                <button
                  key={level}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSeverity(level);
                  }}
                  className={`flex flex-col items-center gap-2 px-6 py-4 rounded-xl transition-all cursor-pointer
                    ${
                      severity === level
                        ? "bg-[#D4A5A5] text-white scale-105 shadow-md"
                        : "bg-[#F5EDE8] text-[#6B6B6B] hover:bg-[#E8E0DB] hover:text-[#3D3D3D]"
                    }`}
                >
                  <span className="text-4xl">{severityInfo.emoji}</span>
                  <span className="font-medium text-sm">{severityInfo.label}</span>
                  <span className="text-xs opacity-80">{severityInfo.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Triggers */}
        <div className="mb-6">
          <label className="text-[#6B6B6B] text-sm mb-3 block">
            What triggered it? (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {TRIGGER_OPTIONS.map((trigger) => (
              <button
                key={trigger}
                type="button"
                onClick={(e) => handleTriggerClick(trigger, e)}
                className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer
                  ${
                    selectedTriggers.includes(trigger)
                      ? "bg-[#D4A5A5] text-white"
                      : "bg-[#F5EDE8] text-[#3D3D3D] hover:bg-[#E8E0DB]"
                  }`}
              >
                {trigger}
                {selectedTriggers.includes(trigger) && " ✓"}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="text-[#6B6B6B] text-sm mb-3 block">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Add any notes..."
            className="w-full bg-[#FDF8F6] text-[#3D3D3D] rounded-xl p-4 text-sm 
                       placeholder-[#9A9A9A] resize-none h-20
                       focus:outline-none focus:ring-2 focus:ring-[#D4A5A5] border border-[#E8E0DB]"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-[#D4A5A5]/30 bg-[#D4A5A5]/10 p-3 text-sm text-[#D4A5A5]">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-rose-500 text-white 
                     font-semibold py-4 rounded-xl transition-colors cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting 
            ? (isEditing ? "Updating..." : "Logging...") 
            : (isEditing ? "Update Symptom" : "Log Symptom")}
        </button>
      </div>
    </div>
  );
}

