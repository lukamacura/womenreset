"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useNutrition } from "@/hooks/useNutrition";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function NutritionGreeting() {
  const { nutrition, loading: nutritionLoading } = useNutrition(30);
  const { profile, loading: profileLoading } = useUserProfile();

  // Time-based greeting with specific time ranges
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

  // Calculate streak from nutrition logs
  const streak = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      const tomorrow = new Date(checkDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const hasLog = nutrition.some((entry) => {
        const logDate = new Date(entry.consumed_at);
        return logDate >= checkDate && logDate < tomorrow;
      });
      
      if (hasLog) {
        streak++;
      } else {
        if (i === 0) continue; // Allow today to be empty
        break;
      }
    }
    
    return streak;
  }, [nutrition]);

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

  // Letter animation state (must be before early returns)
  const [displayedText, setDisplayedText] = useState("");
  const [isAnimating, setIsAnimating] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!greetingText) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setDisplayedText("");
    setIsAnimating(true);

    let currentIndex = 0;
    intervalRef.current = setInterval(() => {
      if (currentIndex < greetingText.length) {
        setDisplayedText(greetingText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsAnimating(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 25); // Slightly faster for smoother feel

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [greetingText]);

  if (profileLoading || nutritionLoading) {
    return (
      <div className="mb-6">
        <div className="h-8 w-64 bg-[#E8E0DB]/30 rounded animate-pulse mb-2" />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#8B7E74] mb-2">
        {displayedText.split("").map((char, index) => (
          <span
            key={index}
            className={`inline-block ${
              isAnimating && index === displayedText.length - 1
                ? "animate-pulse"
                : ""
            }`}
            style={{
              animationDelay: `${index * 0.03}s`,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
        {isAnimating && <span className="inline-block w-0.5 h-5 sm:h-6 md:h-7 bg-[#8B7E74] animate-pulse ml-1" />}
      </h2>
    </div>
  );
}

