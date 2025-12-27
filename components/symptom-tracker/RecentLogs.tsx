"use client";

import type { SymptomLog } from "@/lib/symptom-tracker-constants";
import { formatDateSimple } from "@/lib/dateUtils";
import { getIconFromName } from "@/lib/symptomIconMapping";

interface RecentLogsProps {
  logs: SymptomLog[];
  loading?: boolean;
  onLogClick?: (log: SymptomLog) => void;
}

export default function RecentLogs({ logs, loading, onLogClick }: RecentLogsProps) {

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-white/30 bg-white/20 backdrop-blur-md p-4"
          >
            <div className="h-5 w-48 bg-white/30 rounded mb-2" />
            <div className="h-4 w-32 bg-white/30 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 sm:p-12 text-center shadow-xl">
        <p className="text-sm sm:text-base text-[#6B6B6B]">No symptoms logged yet</p>
        <p className="text-xs sm:text-sm text-[#9A9A9A] mt-2">
          Start tracking your symptoms to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {logs.slice(0, 10).map((log, index) => {
        const { dateStr, timeStr } = formatDateSimple(log.logged_at);
        const symptomName = log.symptoms?.name || "Unknown";
        const symptomIconName = log.symptoms?.icon || "Activity";

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
        const iconName = iconMap[symptomName];
        let SymptomIcon;
        if (iconName) {
          SymptomIcon = getIconFromName(iconName);
        } else if (symptomIconName && symptomIconName.length > 1 && !symptomIconName.includes('🔥') && !symptomIconName.includes('💧')) {
          SymptomIcon = getIconFromName(symptomIconName);
        } else {
          SymptomIcon = getIconFromName('Activity');
        }

        return (
          <div
            key={log.id}
            onClick={() => onLogClick?.(log)}
            className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-3 sm:p-4 hover:bg-white/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer shadow-lg"
            style={{
              animation: `fadeInUp 0.4s ease-out forwards`,
              animationDelay: `${index * 40}ms`,
              opacity: 0,
            }}
          >
            <div className="flex items-start justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                  <SymptomIcon className="h-4 w-4 sm:h-5 sm:w-5 text-[#3D3D3D] shrink-0" />
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                    <span className="text-sm sm:text-base text-[#3D3D3D] font-semibold truncate">{symptomName}</span>
                    <span className="text-[#9A9A9A] hidden sm:inline">—</span>
                    <span className="text-sm sm:text-base text-[#3D3D3D] font-medium shrink-0">
                      {log.severity}/3
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-[#9A9A9A] flex-wrap ml-6 sm:ml-8">
                  <span>{dateStr}</span>
                  {dateStr === "Today" && <span className="hidden sm:inline">•</span>}
                  {dateStr === "Today" && <span>{timeStr}</span>}
                </div>
                {log.triggers && log.triggers.length > 0 && (
                  <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[#6B6B6B] ml-6 sm:ml-8 wrap-break-word">
                    <span className="font-medium">Triggers:</span> {log.triggers.join(", ")}
                  </div>
                )}
                {log.notes && (
                  <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[#3D3D3D] ml-6 sm:ml-8 wrap-break-word">{log.notes}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

