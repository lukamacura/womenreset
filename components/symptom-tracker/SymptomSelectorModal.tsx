"use client";

import { X } from "lucide-react";
import type { Symptom } from "@/lib/symptom-tracker-constants";
import { getIconFromName } from "@/lib/symptomIconMapping";

interface SymptomSelectorModalProps {
  symptoms: Symptom[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (symptom: Symptom) => void;
}

export default function SymptomSelectorModal({
  symptoms,
  isOpen,
  onClose,
  onSelect,
}: SymptomSelectorModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSymptomClick = (symptom: Symptom) => {
    onSelect(symptom);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-pointer"
      onClick={handleBackdropClick}
      style={{ background: 'linear-gradient(to bottom, #DBEAFE, #FEF3C7, #FCE7F3)' }}
    >
      <div
        className="bg-white/30 backdrop-blur-lg rounded-2xl w-full max-w-2xl mx-4 p-6 shadow-xl border border-white/30 cursor-default max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[#3D3D3D]">
            Select a Symptom
          </h2>
          <button
            onClick={onClose}
            className="text-[#9A9A9A] hover:text-[#3D3D3D] transition-colors cursor-pointer"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Symptoms Grid */}
        {symptoms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#6B6B6B]">No symptoms available</p>
            <p className="text-sm text-[#9A9A9A] mt-2">
              Default symptoms will be created when you first log in.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {symptoms.map((symptom) => {
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
              let SymptomIcon;
              if (iconName) {
                SymptomIcon = getIconFromName(iconName);
              } else if (symptom.icon && symptom.icon.length > 1 && !symptom.icon.includes('🔥') && !symptom.icon.includes('💧')) {
                SymptomIcon = getIconFromName(symptom.icon);
              } else {
                SymptomIcon = getIconFromName('Activity');
              }
              
              return (
                <button
                  key={symptom.id}
                  onClick={() => handleSymptomClick(symptom)}
                  className="bg-white/40 backdrop-blur-md rounded-xl p-4 
                             flex flex-row items-center gap-3
                             border border-white/30 transition-all
                             hover:bg-white/60 hover:-translate-y-0.5 hover:shadow-lg
                             active:scale-95 cursor-pointer text-left"
                >
                  <SymptomIcon className="h-6 w-6 text-[#3D3D3D] shrink-0" />
                  <span className="text-[#3D3D3D] font-medium flex-1">
                    {symptom.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

