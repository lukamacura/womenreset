"use client";

import type { Symptom } from "@/lib/symptom-tracker-constants";

interface SymptomCardProps {
  symptom: Symptom;
  onClick: () => void;
}

export default function SymptomCard({ symptom, onClick }: SymptomCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-5 
                 flex flex-row items-center gap-3
                 border border-[#E8E0DB] transition-all
                 hover:bg-[#F5EDE8] hover:-translate-y-0.5 hover:shadow-md
                 active:scale-95
                 w-full text-left cursor-pointer"
    >
      <span className="text-2xl">{symptom.icon}</span>
      <span className="text-[#3D3D3D] font-medium flex-1">{symptom.name}</span>
    </button>
  );
}

