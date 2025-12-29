"use client";

import { useMemo, useState, useEffect } from "react";
import { PartyPopper, Flame, Star, Trophy, X } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { AnimatedText } from "@/components/ui/AnimatedComponents";

const STORAGE_KEY = "milestone-celebrations-dismissed";

export default function MilestoneCelebration() {
  const { preferences } = useUserPreferences();
  const [dismissedMilestones, setDismissedMilestones] = useState<Set<string>>(new Set());
  const [currentMilestone, setCurrentMilestone] = useState<string | null>(null);
  const [lastSeenStreak, setLastSeenStreak] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const currentStreak = preferences?.current_streak || 0;

  // Load dismissed milestones from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setDismissedMilestones(new Set(parsed));
      }
    } catch (error) {
      console.error("Failed to load dismissed milestones:", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save dismissed milestones to localStorage
  const saveDismissedMilestones = (milestones: Set<string>) => {
    if (typeof window === "undefined") return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(milestones)));
    } catch (error) {
      console.error("Failed to save dismissed milestones:", error);
    }
  };

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
    if (milestones.length > 0 && !currentMilestone && isInitialized) {
      setCurrentMilestone(milestones[0]);
    }
  }, [milestones, currentMilestone, isInitialized]);

  const handleDismiss = () => {
    if (currentMilestone) {
      const newDismissed = new Set([...dismissedMilestones, currentMilestone]);
      setDismissedMilestones(newDismissed);
      saveDismissedMilestones(newDismissed);
      setCurrentMilestone(null);
    }
  };

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

  // Don't render until initialized to prevent flash
  if (!isInitialized || !currentMilestone) return null;

  const content = getMilestoneContent(currentMilestone);
  if (!content) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity duration-300"
      style={{ animation: "fadeIn 0.3s ease-out" }}
    >
      <div
        className="bg-white/30 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full shadow-xl border border-white/30 relative"
        style={{ animation: "fadeInScale 0.4s ease-out" }}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-[#9A9A9A] hover:text-[#3D3D3D] transition-all duration-200 cursor-pointer hover:scale-110"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div
            className="mb-4 flex justify-center"
            style={{ animation: "scaleIn 0.5s ease-out 0.2s backwards" }}
          >
            <content.icon className="h-16 w-16 text-primary" />
          </div>
          <h3 className="text-3xl font-bold text-gray-900! mb-3">
            <AnimatedText
              text={content.title}
              delay={400}
              letterDelay={40}
            />
          </h3>
          <p className="text-gray-600! font-medium text-base mb-6">
            <AnimatedText
              text={content.message}
              delay={800}
              letterDelay={25}
            />
          </p>
          <button
            onClick={handleDismiss}
            className="px-6 py-3 bg-[#ff74b1] hover:bg-primary-dark text-white font-bold rounded-xl transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            style={{ animation: "fadeInUp 0.5s ease-out 1.2s backwards" }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

