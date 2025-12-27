"use client";

import { useState } from "react";
import type { Symptom } from "@/lib/symptom-tracker-constants";
import QuickLogModal from "./QuickLogModal";

interface GoodDayCardProps {
  goodDaySymptom: Symptom | null;
  onSave: (data: { symptomId: string; severity: number; triggers: string[]; notes: string }) => Promise<void>;
}

export default function GoodDayCard({ goodDaySymptom, onSave }: GoodDayCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Create a temporary symptom object if it doesn't exist yet (will be created by API on first log)
  const symptomForModal = goodDaySymptom || {
    id: 'temp-good-day',
    user_id: '',
    name: 'Good Day',
    icon: 'Sun',
    is_default: false,
    created_at: new Date().toISOString(),
  };

  const handleSave = async (data: { symptomId: string; severity: number; triggers: string[]; notes: string }) => {
    await onSave(data);
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Good Day Card */}
      <div className="rounded-2xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 text-center shadow-xl">
        <p className="text-[#3D3D3D] font-semibold text-lg mb-2">
          ✨ Feeling okay today?
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-[#ffeb76] hover:bg-[#e6d468] text-[#3D3D3D] font-semibold rounded-xl transition-colors cursor-pointer text-base"
          type="button"
        >
          Log a good day
        </button>
      </div>

      {/* Quick Log Modal - same as regular symptoms */}
      <QuickLogModal
        symptom={symptomForModal}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}

