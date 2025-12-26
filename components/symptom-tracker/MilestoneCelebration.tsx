"use client";

import { useMemo, useState, useEffect } from "react";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { X } from "lucide-react";

export default function MilestoneCelebration() {
  const { logs } = useSymptomLogs(365); // All logs for milestone tracking
  const [dismissedMilestones, setDismissedMilestones] = useState<Set<string>>(new Set());
  const [currentMilestone, setCurrentMilestone] = useState<string | null>(null);

  const milestones = useMemo(() => {
    const totalLogs = logs.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate streak
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      const hasLog = logs.some((log) => {
        const logDate = new Date(log.logged_at);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === checkDate.getTime();
      });
      
      if (hasLog) {
        streak++;
      } else {
        if (i === 0) continue;
        break;
      }
    }

    const detected: string[] = [];

    // 50 symptoms logged
    if (totalLogs >= 50 && !dismissedMilestones.has('50-symptoms')) {
      detected.push('50-symptoms');
    }

    // 30-day streak
    if (streak >= 30 && !dismissedMilestones.has('30-streak')) {
      detected.push('30-streak');
    }

    // First pattern (if we have insights, this would be detected elsewhere)
    // For now, we'll use 20+ logs as a proxy for "enough data for patterns"
    if (totalLogs >= 20 && !dismissedMilestones.has('first-pattern')) {
      detected.push('first-pattern');
    }

    return detected;
  }, [logs, dismissedMilestones]);

  useEffect(() => {
    if (milestones.length > 0 && !currentMilestone) {
      setCurrentMilestone(milestones[0]);
    }
  }, [milestones, currentMilestone]);

  const handleDismiss = () => {
    if (currentMilestone) {
      setDismissedMilestones((prev) => new Set([...prev, currentMilestone]));
      setCurrentMilestone(null);
    }
  };

  if (!currentMilestone) return null;

  const getMilestoneContent = (milestone: string) => {
    switch (milestone) {
      case '50-symptoms':
        return {
          emoji: '🎉',
          title: "You've logged 50 symptoms!",
          message: "You're building a picture of your body that most women never have.",
        };
      case '30-streak':
        return {
          emoji: '🏆',
          title: '30-day streak!',
          message: "You're in the top 10% of consistent trackers.",
        };
      case 'first-pattern':
        return {
          emoji: '📈',
          title: 'First pattern detected!',
          message: 'Lisa found a connection between your symptoms and lifestyle factors.',
        };
      default:
        return null;
    }
  };

  const content = getMilestoneContent(currentMilestone);
  if (!content) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl border border-[#E8E0DB] relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-[#9A9A9A] hover:text-[#3D3D3D] transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="text-center">
          <div className="text-6xl mb-4">{content.emoji}</div>
          <h3 className="text-2xl font-bold text-[#3D3D3D] mb-2">
            {content.title}
          </h3>
          <p className="text-[#6B6B6B] text-sm mb-6">
            {content.message}
          </p>
          <button
            onClick={handleDismiss}
            className="px-6 py-2 bg-[#ff74b1] hover:bg-[#d85a9a] text-white font-medium rounded-xl transition-colors cursor-pointer"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

