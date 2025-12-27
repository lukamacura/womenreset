/* eslint-disable react-hooks/static-components */
"use client";

import { useMemo, useRef, useState } from "react";
import { SEVERITY_LABELS } from "@/lib/symptom-tracker-constants";
import type { Symptom } from "@/lib/symptom-tracker-constants";
import { getIconFromName } from "@/lib/symptomIconMapping";

interface SymptomCardProps {
  symptom: Symptom;
  onClick: () => void; // Opens full modal
  lastLoggedAt?: string | null; // ISO timestamp of most recent log
  lastLoggedSeverity?: number | null; // Severity of most recent log
  onQuickLog?: () => void; // Opens quick log modal (single tap)
}

export default function SymptomCard({ 
  symptom, 
  onClick, 
  lastLoggedAt, 
  lastLoggedSeverity,
  onQuickLog 
}: SymptomCardProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [, setIsLongPressing] = useState(false);

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

  const loggedTime = useMemo(() => {
    if (!lastLoggedAt) return null;
    
    const logged = new Date(lastLoggedAt);
    return logged.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
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

  // Single tap - opens quick log modal
  const handleClick = () => {
    // Clear any pending long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (onQuickLog) {
      onQuickLog();
    } else {
      onClick(); // Fallback to full modal if no quick log handler
    }
  };

  // Long press - opens full modal
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only handle left mouse button
    
    setIsLongPressing(false);
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      if (onClick) {
        onClick();
      }
      longPressTimer.current = null;
    }, 500); // 500ms for long press
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  const handleTouchStart = () => {
    setIsLongPressing(false);
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      if (onClick) {
        onClick();
      }
      longPressTimer.current = null;
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  // Get severity icon if logged today
  const SeverityIcon = useMemo(() => {
    if (!isLoggedToday || !lastLoggedSeverity) return null;
    const severityInfo = SEVERITY_LABELS[lastLoggedSeverity as keyof typeof SEVERITY_LABELS];
    return severityInfo?.icon || null;
  }, [isLoggedToday, lastLoggedSeverity]);

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`rounded-2xl p-3 sm:p-4 md:p-5 min-h-20 sm:min-h-20 h-full
                   flex flex-col gap-1.5 sm:gap-2
                   border-2 transition-all
                   hover:-translate-y-0.5 hover:shadow-xl
                   active:scale-95
                   w-full text-left cursor-pointer
                   ${isLoggedToday 
                     ? 'border-[#ff74b1] bg-white/40 backdrop-blur-lg hover:bg-white/60' 
                     : 'border-white/30 bg-white/30 backdrop-blur-md hover:bg-white/50'}`}
      >
        <div className="flex flex-row items-center gap-2 sm:gap-3">
          <SymptomIcon className="h-5 w-5 sm:h-6 sm:w-6 text-[#3D3D3D] shrink-0" />
          <span className="text-[#3D3D3D] font-medium flex-1 text-sm sm:text-base truncate">{symptom.name}</span>
          {isLoggedToday && SeverityIcon && lastLoggedSeverity && (
            <SeverityIcon className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${
              lastLoggedSeverity === 1 
                ? 'text-green-500' 
                : lastLoggedSeverity === 2 
                ? 'text-yellow-500' 
                : 'text-red-500'
            }`} />
          )}
        </div>
        {isLoggedToday && loggedTime && (
          <p className="text-sm sm:text-base font-medium text-foreground/30">
            {loggedTime}
          </p>
        )}
        {!isLoggedToday && (
          <p className="text-xs sm:text-sm text-[#9A9A9A] ml-7 sm:ml-11">Tap to log</p>
        )}
      </button>
    </div>
  );
}

