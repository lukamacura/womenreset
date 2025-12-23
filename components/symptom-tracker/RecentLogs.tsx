"use client";

import type { SymptomLog } from "@/lib/symptom-tracker-constants";
import { formatDateSimple } from "@/lib/dateUtils";

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
            className="animate-pulse rounded-xl border border-[#E8E0DB] bg-white p-4"
          >
            <div className="h-5 w-48 bg-[#E8E0DB] rounded mb-2" />
            <div className="h-4 w-32 bg-[#E8E0DB] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-[#E8E0DB] bg-white p-12 text-center shadow-sm">
        <p className="text-[#6B6B6B]">No symptoms logged yet</p>
        <p className="text-sm text-[#9A9A9A] mt-2">
          Start tracking your symptoms to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.slice(0, 10).map((log) => {
        const { dateStr, timeStr } = formatDateSimple(log.logged_at);
        const symptomName = log.symptoms?.name || "Unknown";
        const symptomIcon = log.symptoms?.icon || "🔴";

        return (
          <div
            key={log.id}
            onClick={() => onLogClick?.(log)}
            className="rounded-xl border border-[#E8E0DB] bg-white p-4 hover:bg-[#F5EDE8] transition-colors cursor-pointer shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="text-xl">{symptomIcon}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#3D3D3D] font-semibold">{symptomName}</span>
                    <span className="text-[#9A9A9A]">—</span>
                    <span className="text-[#3D3D3D] font-medium">
                      {log.severity}/10
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#9A9A9A] flex-wrap ml-8">
                  <span>{dateStr}</span>
                  {dateStr === "Today" && <span>•</span>}
                  {dateStr === "Today" && <span>{timeStr}</span>}
                </div>
                {log.triggers && log.triggers.length > 0 && (
                  <div className="mt-2 text-sm text-[#6B6B6B] ml-8">
                    Triggers: {log.triggers.join(", ")}
                  </div>
                )}
                {log.notes && (
                  <div className="mt-2 text-sm text-[#3D3D3D] ml-8">{log.notes}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

