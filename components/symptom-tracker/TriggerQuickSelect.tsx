"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { TRIGGER_OPTIONS } from "@/lib/symptom-tracker-constants";
import { getSuggestedTriggers } from "@/lib/triggerSuggestions";
import type { SymptomLog } from "@/lib/symptom-tracker-constants";

interface TriggerQuickSelectProps {
  symptomName: string;
  symptomId: string;
  logId: string;
  allLogs: SymptomLog[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (triggers: string[]) => Promise<void>;
}

export default function TriggerQuickSelect({
  symptomName,
  symptomId,
  logId,
  allLogs,
  isOpen,
  onClose,
  onSave,
}: TriggerQuickSelectProps) {
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [customTrigger, setCustomTrigger] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get suggested triggers
  const suggestedTriggers = useMemo(() => {
    return getSuggestedTriggers(symptomId, allLogs, 3);
  }, [symptomId, allLogs]);

  // Get remaining triggers
  const remainingTriggers = useMemo(() => {
    return TRIGGER_OPTIONS.filter(trigger => !suggestedTriggers.includes(trigger));
  }, [suggestedTriggers]);

  if (!isOpen) return null;

  const handleTriggerClick = (trigger: string) => {
    setSelectedTriggers((prev) => {
      if (prev.includes(trigger)) {
        return prev.filter((t) => t !== trigger);
      } else {
        return [...prev, trigger];
      }
    });
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await onSave(selectedTriggers);
      onClose();
    } catch (error) {
      console.error("Failed to save triggers:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{ background: 'linear-gradient(to bottom, #DBEAFE, #FEF3C7, #FCE7F3)' }}
      />
      
      <div
        className="relative bg-white/30 backdrop-blur-lg rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-auto shadow-xl border border-white/30 cursor-default overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-4 border-b border-white/30">
          <h2 className="text-xl font-semibold text-[#3D3D3D]">
            What triggered your {symptomName}?
          </h2>
          <button
            onClick={onClose}
            className="text-[#9A9A9A] hover:text-[#3D3D3D] transition-colors cursor-pointer"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Suggested Triggers */}
          {suggestedTriggers.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-[#6B6B6B] mb-2">
                Top triggers for this symptom:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedTriggers.map((trigger) => (
                  <button
                    key={trigger}
                    type="button"
                    onClick={() => handleTriggerClick(trigger)}
                    className={`px-4 py-2 rounded-full text-base font-medium transition-all cursor-pointer
                      ${
                        selectedTriggers.includes(trigger)
                          ? "bg-[#ff74b1] text-white shadow-md"
                          : "bg-white/60 text-[#3D3D3D] hover:bg-white/80 border border-white/30"
                      }`}
                  >
                    {trigger}
                    {selectedTriggers.includes(trigger) && " ✓"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Other Triggers */}
          {remainingTriggers.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-[#6B6B6B] mb-2">
                Other:
              </p>
              <div className="flex flex-wrap gap-2">
                {remainingTriggers.map((trigger) => (
                  <button
                    key={trigger}
                    type="button"
                    onClick={() => handleTriggerClick(trigger)}
                    className={`px-4 py-2 rounded-full text-base transition-all cursor-pointer
                      ${
                        selectedTriggers.includes(trigger)
                          ? "bg-[#ff74b1] text-white shadow-md"
                          : "bg-white/60 text-[#3D3D3D] hover:bg-white/80 border border-white/30"
                      }`}
                  >
                    {trigger}
                    {selectedTriggers.includes(trigger) && " ✓"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Trigger */}
          <div className="mt-4">
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="px-4 py-2 rounded-full text-base text-[#ff74b1] hover:text-primary-dark hover:bg-white/60 transition-colors cursor-pointer border border-[#ff74b1]/50 bg-white/40"
              >
                + Something else...
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTrigger}
                  onChange={(e) => setCustomTrigger(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customTrigger.trim()) {
                      e.preventDefault();
                      if (!selectedTriggers.includes(customTrigger.trim())) {
                        setSelectedTriggers([...selectedTriggers, customTrigger.trim()]);
                      }
                      setCustomTrigger("");
                      setShowCustomInput(false);
                    }
                  }}
                  placeholder="Enter custom trigger"
                  className="flex-1 px-4 py-2 rounded-xl border border-white/30 text-base bg-white/60 backdrop-blur-md
                           focus:outline-none focus:ring-2 focus:ring-[#ff74b1]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customTrigger.trim() && !selectedTriggers.includes(customTrigger.trim())) {
                      setSelectedTriggers([...selectedTriggers, customTrigger.trim()]);
                    }
                    setCustomTrigger("");
                    setShowCustomInput(false);
                  }}
                  className="px-4 py-2 bg-[#ff74b1] text-white rounded-xl hover:bg-primary-dark transition-colors cursor-pointer text-base"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-white/30 flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-3 text-[#6B6B6B] hover:text-[#3D3D3D] transition-colors cursor-pointer
                     bg-white/40 backdrop-blur-md rounded-xl border border-white/30 hover:bg-white/60"
            type="button"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-[#ff74b1] hover:bg-primary-dark text-white 
                     font-semibold rounded-xl transition-colors cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
