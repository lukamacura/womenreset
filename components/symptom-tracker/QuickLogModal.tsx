"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { SEVERITY_LABELS } from "@/lib/symptom-tracker-constants";
import type { Symptom, LogSymptomData } from "@/lib/symptom-tracker-constants";
import { getIconFromName } from "@/lib/symptomIconMapping";

interface QuickLogModalProps {
  symptom: Symptom;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LogSymptomData) => Promise<void>;
  onExpand?: () => void; // Callback to expand to full modal
}

export default function QuickLogModal({
  symptom,
  isOpen,
  onClose,
  onSave,
  onExpand,
}: QuickLogModalProps) {
  const isGoodDay = symptom.name === "Good Day";
  const [severity, setSeverity] = useState(2); // Default to Moderate (not used for Good Day)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get icon component - always map by symptom name for consistency
  const SymptomIcon = useMemo(() => {
    // Map symptom names to icon names (prioritize name mapping for unique icons)
    const iconMap: Record<string, string> = {
      'Hot flashes': 'Flame',
      'Night sweats': 'Droplet',
      'Fatigue': 'Zap',
      'Brain fog': 'Brain',
      'Mood swings': 'Heart',
      'Anxiety': 'AlertCircle',
      'Headaches': 'AlertTriangle',
      'Joint pain': 'Activity',
      'Bloating': 'CircleDot',
      'Insomnia': 'Moon',
      'Weight gain': 'TrendingUp',
      'Low libido': 'HeartOff',
      'Good Day': 'Sun',
    };
    
    // Try to get icon by symptom name first (ensures unique icons)
    const iconName = iconMap[symptom.name];
    if (iconName) {
      return getIconFromName(iconName);
    }
    
    // Fallback: try to use icon from database if it's a valid icon name
    if (symptom.icon && symptom.icon.length > 1 && !symptom.icon.includes('🔥') && !symptom.icon.includes('💧')) {
      return getIconFromName(symptom.icon);
    }
    
    // Default fallback
    return getIconFromName('Activity');
  }, [symptom.icon, symptom.name]);

  if (!isOpen) return null;

  // Handle backdrop click to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle save (quick log)
  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      await onSave({
        symptomId: symptom.id,
        severity: isGoodDay ? 2 : severity, // Use default for Good Day
        triggers: [],
        notes: "",
      });

      // Reset form
      setSeverity(2);
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
      className="fixed inset-0 z-50 overflow-auto"
      onClick={handleBackdropClick}
    >
      {/* Backdrop overlay with blur */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ background: 'linear-gradient(to bottom, #DBEAFE, #FEF3C7, #FCE7F3)' }}
      />
      {/* Modal container */}
      <div className="relative min-h-full flex items-center justify-center p-4 cursor-pointer">
        {/* Modal */}
        <div
          className="bg-white/30 backdrop-blur-lg rounded-2xl w-full max-w-md mx-4 my-4 p-6 shadow-xl border border-white/30 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <SymptomIcon className="h-6 w-6 text-[#3D3D3D]" />
            <h2 className="text-xl font-semibold text-[#3D3D3D]">
              {symptom.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#9A9A9A] hover:text-[#3D3D3D] transition-colors cursor-pointer"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Severity Selection - Hidden for Good Day */}
        {!isGoodDay && (
          <div className="mb-6">
            <label className="text-[#6B6B6B] text-base mb-4 block font-medium">
              How bad?
            </label>
            <div className="flex gap-3 justify-center">
              {[1, 2, 3].map((level) => {
                const severityInfo = SEVERITY_LABELS[level as keyof typeof SEVERITY_LABELS];
                const SeverityIconComponent = severityInfo.icon;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSeverity(level);
                    }}
                    className={`flex flex-col items-center gap-2 px-6 py-4 rounded-xl transition-all cursor-pointer min-w-[100px]
                      ${
                        severity === level
                          ? level === 1
                            ? "bg-green-500 text-white scale-105 shadow-md"
                            : level === 2
                            ? "bg-yellow-500 text-white scale-105 shadow-md"
                            : "bg-red-500 text-white scale-105 shadow-md"
                          : "bg-white/40 backdrop-blur-md text-[#6B6B6B] hover:bg-white/60 hover:text-[#3D3D3D] border border-white/30"
                      }`}
                  >
                    <SeverityIconComponent className={`h-8 w-8 ${
                      severity === level 
                        ? 'text-white' 
                        : level === 1
                        ? 'text-green-500'
                        : level === 2
                        ? 'text-yellow-500'
                        : 'text-red-500'
                    }`} />
                    <span className="font-medium text-sm">{severityInfo.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-[#ff74b1]/30 bg-[#ff74b1]/10 p-3 text-sm text-[#ff74b1]">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full bg-[#ff74b1] hover:bg-primary-dark text-white 
                     font-semibold py-4 rounded-xl transition-colors cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg"
          >
            {isSubmitting ? "Logging..." : "Log it"}
          </button>

          {onExpand && (
            <button
              onClick={onExpand}
              className="w-full text-[#ff74b1] hover:text-primary-dark 
                       font-medium py-3 rounded-xl transition-colors cursor-pointer text-base
                       bg-white/40 backdrop-blur-md border border-white/30"
              type="button"
            >
              + Add triggers & notes
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

