"use client";

import { useMemo, useState, useEffect } from "react";
import { PartyPopper, Flame, Star, Trophy, X } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export default function MilestoneCelebration() {
  const { preferences } = useUserPreferences();
  const [dismissedMilestones, setDismissedMilestones] = useState<Set<string>>(new Set());
  const [currentMilestone, setCurrentMilestone] = useState<string | null>(null);
  const [lastSeenStreak, setLastSeenStreak] = useState<number>(0);

  const currentStreak = preferences?.current_streak || 0;

  // Detect milestone achievements based on streak
  const milestones = useMemo(() => {
    const detected: string[] = [];

    // Check if streak reached a new milestone threshold
    const milestoneThresholds = [3, 7, 14, 30];
    
    milestoneThresholds.forEach(threshold => {
      const milestoneKey = `${threshold}-streak`;
      // Only show if current streak equals threshold AND we haven't seen this milestone before
      if (currentStreak === threshold && 
          !dismissedMilestones.has(milestoneKey) &&
          lastSeenStreak < threshold) {
        detected.push(milestoneKey);
      }
    });

    return detected;
  }, [currentStreak, dismissedMilestones, lastSeenStreak]);

  // Update last seen streak when it changes
  useEffect(() => {
    if (currentStreak > lastSeenStreak) {
      setLastSeenStreak(currentStreak);
    }
  }, [currentStreak, lastSeenStreak]);

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
      case '3-streak':
        return {
          icon: PartyPopper,
          title: '3 days in a row!',
          message: "You're building a habit.",
        };
      case '7-streak':
        return {
          icon: Flame,
          title: 'One week streak!',
          message: "Lisa is learning your patterns.",
        };
      case '14-streak':
        return {
          icon: Star,
          title: 'Two weeks!',
          message: "You're in the top 20% of consistent trackers.",
        };
      case '30-streak':
        return {
          icon: Trophy,
          title: '30 days!',
          message: "You now have a full month of data.",
        };
      default:
        return null;
    }
  };

  const content = getMilestoneContent(currentMilestone);
  if (!content) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/30 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full shadow-xl border border-white/30 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-[#9A9A9A] hover:text-[#3D3D3D] transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <content.icon className="h-16 w-16 text-[#ff74b1]" />
          </div>
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

