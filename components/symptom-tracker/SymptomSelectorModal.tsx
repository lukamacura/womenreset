"use client";

import { X } from "lucide-react";
import type { Symptom } from "@/lib/symptom-tracker-constants";

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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 cursor-pointer"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl mx-4 p-6 shadow-xl border border-[#E8E0DB] cursor-default max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[#3D3D3D]">
            Select a Symptom
          </h2>
          <button
            onClick={onClose}
            className="text-[#9A9A9A] hover:text-[#3D3D3D] text-2xl transition-colors cursor-pointer"
            type="button"
          >
            ×
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
            {symptoms.map((symptom) => (
              <button
                key={symptom.id}
                onClick={() => handleSymptomClick(symptom)}
                className="bg-white rounded-xl p-4 
                           flex flex-row items-center gap-3
                           border border-[#E8E0DB] transition-all
                           hover:bg-[#F5EDE8] hover:-translate-y-0.5 hover:shadow-md
                           active:scale-95 cursor-pointer text-left"
              >
                <span className="text-2xl">{symptom.icon}</span>
                <span className="text-[#3D3D3D] font-medium flex-1">
                  {symptom.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

