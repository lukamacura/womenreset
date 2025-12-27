"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export default function PersonalizedGreeting() {
  const { logs } = useSymptomLogs(30);
  const { profile, loading: profileLoading } = useUserProfile();
  const { preferences, loading: preferencesLoading } = useUserPreferences();

  // Time-based greeting with specific time ranges
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 18) return "Good afternoon";
    if (hour >= 18 && hour < 22) return "Good evening";
    return "Hi"; // Night (10pm-6am): "Hi {Name}. Can't sleep?"
  }, []);

  const isNightTime = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 6;
  }, []);

  // Get display name (prefer name from profile, fallback to email if available)
  const displayName = useMemo(() => {
    if (profile?.name) return profile.name;
    if (profile?.email) {
      // Extract first part of email before @
      return profile.email.split('@')[0];
    }
    return null;
  }, [profile]);

  // Get streak from user_preferences (preferred) or calculate from logs (fallback)
  const streak = useMemo(() => {
    if (preferences?.current_streak !== null && preferences?.current_streak !== undefined) {
      return preferences.current_streak;
    }
    
    // Fallback: calculate from logs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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
        if (i === 0) continue; // Allow today to be empty
        break;
      }
    }
    
    return streak;
  }, [preferences, logs]);

  // Build greeting text based on time of day
  const greetingText = useMemo(() => {
    if (!displayName) {
      return isNightTime ? "Can't sleep?" : "How are you starting your day?";
    }
    
    if (isNightTime) {
      return `Hi ${displayName}. Can't sleep?`;
    }
    
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      return `Good morning, ${displayName}. How are you starting your day?`;
    }
    if (hour >= 12 && hour < 18) {
      return `Good afternoon, ${displayName}. How's your day going?`;
    }
    // Evening
    return `Good evening, ${displayName}. How was today?`;
  }, [displayName, isNightTime]);

  if (profileLoading || preferencesLoading) {
    return (
      <div className="mb-6">
        <div className="h-8 w-64 bg-[#E8E0DB]/30 rounded animate-pulse mb-2" />
        <div className="h-4 w-48 bg-[#E8E0DB]/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-2xl sm:text-3xl font-semibold text-[#8B7E74] mb-2">
        {greetingText}
      </h2>
      {streak > 0 && (
        <p className="text-[#3D3D3D] text-base mb-1 flex items-center gap-2">
          <Flame className="h-4 w-4 text-[#ff74b1]" />
          <span>{streak}-day streak — you&apos;re building real insight into your body</span>
        </p>
      )}
      {streak === 0 && logs.length === 0 && (
        <p className="text-[#6B6B6B] text-base">
          Start a streak by logging today!
        </p>
      )}
    </div>
  );
}

