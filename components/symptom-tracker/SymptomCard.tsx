"use client";

import { useMemo } from "react";
import type { Symptom, SymptomLog } from "@/lib/symptom-tracker-constants";

interface SymptomCardProps {
  symptom: Symptom;
  onClick: () => void;
  lastLoggedAt?: string | null; // ISO timestamp of most recent log
  onQuickLog?: () => void; // Optional quick log handler
}

export default function SymptomCard({ symptom, onClick, lastLoggedAt, onQuickLog }: SymptomCardProps) {
  const timeAgo = useMemo(() => {
    if (!lastLoggedAt) return null;
    
    const now = new Date();
    const logged = new Date(lastLoggedAt);
    const diffMs = now.getTime() - logged.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    return null;
  }, [lastLoggedAt]);

  const isLoggedToday = useMemo(() => {
    if (!lastLoggedAt) return false;
    const today = new Date();
    const logged = new Date(lastLoggedAt);
    return (
      today.getFullYear() === logged.getFullYear() &&
      today.getMonth() === logged.getMonth() &&
      today.getDate() === logged.getDate()
    );
  }, [lastLoggedAt]);

  const handleClick = (e: React.MouseEvent) => {
    // If quick log is available and user double-clicks or long-presses, use quick log
    if (onQuickLog && e.detail === 2) {
      e.preventDefault();
      onQuickLog();
      return;
    }
    onClick();
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className={`bg-white rounded-2xl p-5 
                   flex flex-col gap-2
                   border transition-all
                   hover:bg-[#F5EDE8] hover:-translate-y-0.5 hover:shadow-md
                   active:scale-95
                   w-full text-left cursor-pointer
                   ${!isLoggedToday ? 'border-[#D4A5A5] border-2 animate-pulse' : 'border-[#E8E0DB]'}`}
      >
        <div className="flex flex-row items-center gap-3">
          <span className="text-2xl">{symptom.icon}</span>
          <span className="text-[#3D3D3D] font-medium flex-1">{symptom.name}</span>
        </div>
        {timeAgo && (
          <p className="text-xs text-[#9A9A9A] ml-11">{timeAgo}</p>
        )}
        {!lastLoggedAt && (
          <p className="text-xs text-[#9A9A9A] ml-11">Not logged yet</p>
        )}
      </button>
    </div>
  );
}

