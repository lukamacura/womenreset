"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { Activity, ArrowRight, Meh, UtensilsCrossed, Dumbbell, Trash2, Sunrise, Sun, Moon, Cookie, Heart, StretchHorizontal, Trophy } from "lucide-react";
import type { Symptom } from "@/components/symptoms/SymptomList";
import type { Nutrition } from "@/components/nutrition/NutritionList";
import type { Fitness } from "@/components/fitness/FitnessList";
import type { SymptomLog } from "@/lib/symptom-tracker-constants";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { formatDateSimple } from "@/lib/dateUtils";
import { getIconFromName } from "@/lib/symptomIconMapping";
import { SEVERITY_LABELS } from "@/lib/symptom-tracker-constants";
import AddSymptomModal from "@/components/symptoms/AddSymptomModal";
import AddNutritionModal from "@/components/nutrition/AddNutritionModal";
import AddFitnessModal from "@/components/fitness/AddFitnessModal";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";

// Prevent static prerendering (safe)
export const dynamic = "force-dynamic";

// ---------------------------
// Small UI helpers
// ---------------------------
const MS = {
  SECOND: 1000,
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
};

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function Skeleton({ className }: { className?: string }) {
  return <div className={classNames("animate-pulse rounded-xl bg-foreground/10", className)} />;
}

// Optimized Animated Card Component (for overview cards and sections)
function AnimatedCard({
  children,
  index = 0,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
            // Remove will-change after animation completes
            setTimeout(() => {
              if (cardRef.current) {
                cardRef.current.style.willChange = "auto";
              }
            }, 600 + delay + index * 50);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    const currentRef = cardRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [delay, index]);

  const totalDelay = delay + index * 50;

  return (
    <div
      ref={cardRef}
      className={classNames(
        "transition-all duration-600 ease-out",
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-4 scale-98",
        className
      )}
      style={{
        transitionDelay: isVisible ? `${totalDelay}ms` : "0ms",
        willChange: isVisible ? "auto" : "transform, opacity",
        transform: isVisible 
          ? "translate3d(0, 0, 0) scale(1)" 
          : "translate3d(0, 16px, 0) scale(0.98)",
      }}
    >
      {children}
    </div>
  );
}

// Optimized Animated List Item Component
function AnimatedListItem({
  children,
  index,
  className = "",
}: {
  children: React.ReactNode;
  index: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
            // Remove will-change after animation completes
            setTimeout(() => {
              if (itemRef.current) {
                itemRef.current.style.willChange = "auto";
              }
            }, 500 + index * 80);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    const currentRef = itemRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [index]);

  return (
    <div
      ref={itemRef}
      className={classNames(
        "transition-all duration-500 ease-out",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6",
        className
      )}
      style={{
        transitionDelay: isVisible ? `${index * 80}ms` : "0ms",
        willChange: isVisible ? "auto" : "transform, opacity",
        transform: isVisible ? "translate3d(0, 0, 0)" : "translate3d(0, 24px, 0)",
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------
// Types
// ---------------------------

// ---------------------------
// Card Components
// ---------------------------

// Trial Status Card
function TrialStatusCard({
  trial,
}: {
  trial: {
    expired: boolean | null;
    start: Date | null;
    end: Date | null;
    daysLeft: number;
    elapsedDays: number;
    progressPct: number;
    remaining: { d: number; h: number; m: number; s: number };
    trialDays?: number;
  };
}) {
  return (
    <AnimatedCard index={0} delay={0}>
      <div className="relative overflow-hidden rounded-2xl border border-white/25 bg-linear-to-l from-gray-900 via-blue-900 to-pink-900  backdrop-blur-lg p-6 lg:p-8 shadow-xl transition-all duration-300 hover:shadow-2xl">
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white! mb-2">
              {trial.expired ? "Trial Expired" : "Your Trial"}
            </h2>
            <p className="text-sm text-white/80">
              {trial.start && !trial.expired && (
                <>
                  Started {trial.start.toLocaleDateString()} · Ends {trial.end?.toLocaleDateString()}
                </>
              )}
              {trial.expired && "Upgrade to continue using the platform."}
            </p>
          </div>
          <div
            className={`rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 ml-2 ${
              trial.expired
                ? "bg-red-500/30 text-red-300 border border-red-500/50"
                : "bg-green-500/30 text-green-300 border border-green-500/50"
            }`}
          >
            {trial.expired ? "Expired" : "Active"}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
              {trial.daysLeft}
            </span>
            <span className="text-lg text-white/80">days left</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full transition-[width] duration-500 ${
                trial.expired
                  ? "bg-linear-to-r from-error to-error"
                  : "bg-linear-to-r from-[#ff74b1] via-[#ffeb76] to-info"
              }`}
              style={{ width: `${Math.max(0, Math.min(100, trial.progressPct))}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-white/70">
            <span>
              {Math.min(trial.trialDays || 3, trial.elapsedDays)} / {trial.trialDays || 3} days used
            </span>
            <span>{trial.progressPct.toFixed(0)}%</span>
          </div>
        </div>

        {!trial.expired && (
          <div className="text-sm text-white/80">
            Ends in {trial.remaining.d}d {trial.remaining.h}h {trial.remaining.m}m
          </div>
        )}
      </div>
      </div>
    </AnimatedCard>
  );
}


// Symptoms Overview Card
function SymptomsOverviewCard({
  totalSymptoms,
  isLoading,
}: {
  totalSymptoms: number;
  isLoading: boolean;
}) {
  return (
    <AnimatedCard index={1} delay={100}>
      <Link
        href="/dashboard/symptoms"
        className="group relative overflow-hidden block h-full rounded-2xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
        >
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #ff74b1 0%, #d85a9a 100%)' }}>
            <Activity className="h-6 w-6 text-white" />
          </div>
          <ArrowRight className="h-5 w-5 text-[#ff74b1] transition-transform group-hover:translate-x-1" />
        </div>
        <div>
          <h3 className="text-base font-medium text-muted-foreground mb-1">Symptom Tracker</h3>
          {isLoading ? (
            <div className="h-8 w-20 bg-foreground/10 rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-foreground tracking-tight">
                {totalSymptoms}
              </span>
              <span className="text-sm text-foreground/50 font-bold">
                {totalSymptoms === 1 ? "symptom" : "symptoms"}
              </span>
            </div>
          )}
        </div>
      </div>
      </Link>
    </AnimatedCard>
  );
}

// Recent Symptoms Card
function RecentSymptomsCard({
  logs,
  isLoading,
  onLogClick,
}: {
  logs: SymptomLog[];
  isLoading: boolean;
  onLogClick?: (log: SymptomLog) => void;
}) {
  const recentLogs = logs.slice(0, 5);

  return (
    <AnimatedCard index={4} delay={300}>
      <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 shadow-xl transition-all duration-300 hover:shadow-2xl">
        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-[#3D3D3D]">Recent Symptoms</h3>
            <Link
              href="/dashboard/symptoms"
              className="text-sm text-[#ff74b1] hover:text-primary-dark hover:underline flex items-center gap-1 font-medium transition-colors"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
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
          ) : recentLogs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-[#9A9A9A]/30 mx-auto mb-3" />
              <p className="text-sm text-[#6B6B6B]">No symptoms logged yet</p>
              <Link
                href="/dashboard/symptoms"
                className="text-sm text-[#ff74b1] hover:text-primary-dark hover:underline mt-2 inline-block transition-colors"
              >
                Start tracking →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log, index) => {
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

                // Get severity info (1=Mild/Green, 2=Moderate/Yellow, 3=Severe/Red)
                const severityInfo = SEVERITY_LABELS[log.severity as keyof typeof SEVERITY_LABELS];
                const SeverityIcon = severityInfo?.icon || Meh;
                const severityColor = log.severity === 1 
                  ? "text-green-500" 
                  : log.severity === 2 
                  ? "text-yellow-500" 
                  : "text-red-500";

                return (
                  <AnimatedListItem key={log.id} index={index}>
                    <div
                      onClick={() => onLogClick?.(log)}
                      className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-4 hover:bg-white/40 transition-all cursor-pointer shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <SymptomIcon className="h-5 w-5 text-[#3D3D3D] shrink-0" />
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[#3D3D3D] font-semibold">{symptomName}</span>
                              <span className="text-[#9A9A9A]">-</span>
                              <div className="flex items-center gap-1">
                                <SeverityIcon className={`h-4 w-4 ${severityColor}`} />
                                <span className={`text-[#3D3D3D] font-medium ${severityColor}`}>
                                  {severityInfo?.label || 'Moderate'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[#9A9A9A] flex-wrap ml-8">
                            <span>{dateStr}</span>
                            {dateStr === "Today" && (
                              <>
                                <span>•</span>
                                <span>{timeStr}</span>
                              </>
                            )}
                          </div>
                          {log.triggers && log.triggers.length > 0 && (
                            <div className="mt-2 text-sm text-[#6B6B6B] ml-8">
                              Triggers: {log.triggers.join(", ")}
                            </div>
                          )}
                          {log.notes && (
                            <div className="mt-2 text-sm text-[#3D3D3D] ml-8 line-clamp-2">{log.notes}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </AnimatedListItem>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AnimatedCard>
  );
}

// Nutrition Overview Card
function NutritionOverviewCard({
  totalNutrition,
  isLoading,
}: {
  totalNutrition: number;
  isLoading: boolean;
}) {
  return (
    <AnimatedCard index={2} delay={150}>
      <Link
        href="/dashboard/nutrition"
        className="group relative overflow-hidden block h-full rounded-2xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
      >
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #ffeb76 0%, #e6d468 100%)' }}>
            <UtensilsCrossed className="h-6 w-6 text-[#1D3557]" />
          </div>
          <ArrowRight className="h-5 w-5 text-[#e6d468] transition-transform group-hover:translate-x-1" />
        </div>
        <div>
          <h3 className="text-base font-medium text-muted-foreground mb-1">Nutrition Tracker</h3>
          {isLoading ? (
            <div className="h-8 w-20 bg-foreground/10 rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-foreground tracking-tight">
                {totalNutrition}
              </span>
              <span className="text-sm text-foreground/50 font-bold">
                {totalNutrition === 1 ? "entry" : "entries"}
              </span>
            </div>
          )}
        </div>
      </div>
      </Link>
    </AnimatedCard>
  );
}

// Recent Nutrition Card
function RecentNutritionCard({
  nutrition,
  isLoading,
  onEdit,
  onDelete,
}: {
  nutrition: Nutrition[];
  isLoading: boolean;
  onEdit?: (nutrition: Nutrition) => void;
  onDelete?: (nutrition: Nutrition) => void;
}) {
  const recentNutrition = nutrition.slice(0, 5);

  const getMealTypeColor = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case "breakfast":
        return "bg-[#ffeb76]/30 text-[#e6d468] border border-[#ffeb76]/40";
      case "lunch":
        return "bg-[#65dbff]/30 text-[#4bc4e6] border border-[#65dbff]/40";
      case "dinner":
        return "bg-[#ff74b1]/30 text-[#d85a9a] border border-[#ff74b1]/40";
      case "snack":
        return "bg-[#a6eaff]/30 text-[#65dbff] border border-[#a6eaff]/40";
      default:
        return "bg-gray-500/20 text-gray-700";
    }
  };

  const formatMealType = (mealType: string) => {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case "breakfast":
        return <Sunrise className="h-4 w-4 text-orange-600" />;
      case "lunch":
        return <Sun className="h-4 w-4 text-blue-600" />;
      case "dinner":
        return <Moon className="h-4 w-4 text-purple-600" />;
      case "snack":
        return <Cookie className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  return (
    <AnimatedCard index={5} delay={350}>
      <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]">
      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground">Recent Meals</h3>
          <Link
            href="/dashboard/nutrition"
            className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : recentNutrition.length === 0 ? (
        <div className="text-center py-8">
          <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No nutrition entries logged yet</p>
          <Link
            href="/dashboard/nutrition"
            className="text-sm text-primary hover:underline mt-2 inline-block"
          >
            Start tracking →
          </Link>
        </div>
        ) : (
        <div className="space-y-3">
          {recentNutrition.map((entry, index) => {
            const formatDateTime = (dateString: string) => {
              const date = new Date(dateString);
              return {
                date: date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }),
                time: date.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                }),
              };
            };
            const { date, time } = formatDateTime(entry.consumed_at);
            const mealTypeColor = getMealTypeColor(entry.meal_type);
            const mealTypeLabel = formatMealType(entry.meal_type);

            return (
              <AnimatedListItem key={entry.id} index={index}>
                <div
                  className="group rounded-xl border border-foreground/10 bg-background/60 p-4 transition-colors hover:border-foreground/20"
                >
                <div className="flex items-start justify-between gap-4">
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onEdit?.(entry)}
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-base font-semibold text-foreground truncate">
                        {entry.food_item}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${mealTypeColor}`}
                        >
                          {getMealTypeIcon(entry.meal_type)}
                          {mealTypeLabel}
                        </span>
                        {entry.calories !== null && (
                          <span className="text-xs text-muted-foreground font-medium">
                            {entry.calories} cal
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{date}</span>
                      <span>•</span>
                      <span>{time}</span>
                    </div>
                    {entry.notes && (
                      <p className="mt-2 text-sm text-foreground/80 line-clamp-2">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  {onDelete && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(entry);
                        }}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary-light/50 hover:text-primary-dark"
                        aria-label="Delete nutrition entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                </div>
              </AnimatedListItem>
            );
          })}
        </div>
      )}
      </div>
      </div>
    </AnimatedCard>
  );
}

// Fitness Overview Card
function FitnessOverviewCard({
  totalFitness,
  isLoading,
}: {
  totalFitness: number;
  isLoading: boolean;
}) {
  return (
    <AnimatedCard index={3} delay={200}>
      <Link
        href="/dashboard/fitness"
        className="group relative overflow-hidden block h-full rounded-2xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
      >
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #65dbff 0%, #4bc4e6 100%)' }}>
            <Dumbbell className="h-6 w-6 text-white" />
          </div>
          <ArrowRight className="h-5 w-5 text-info transition-transform group-hover:translate-x-1" />
        </div>
        <div>
          <h3 className="text-base font-medium text-muted-foreground mb-1">Fitness Tracker</h3>
          {isLoading ? (
            <div className="h-8 w-20 bg-foreground/10 rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-foreground tracking-tight">
                {totalFitness}
              </span>
              <span className="text-sm text-foreground/50 font-bold">
                {totalFitness === 1 ? "workout" : "workouts"}
              </span>
            </div>
          )}
        </div>
      </div>
      </Link>
    </AnimatedCard>
  );
}

// Recent Fitness Card
function RecentFitnessCard({
  fitness,
  isLoading,
  onEdit,
  onDelete,
}: {
  fitness: Fitness[];
  isLoading: boolean;
  onEdit?: (fitness: Fitness) => void;
  onDelete?: (fitness: Fitness) => void;
}) {
  const recentFitness = fitness.slice(0, 5);

  const getExerciseTypeColor = (exerciseType: string) => {
    switch (exerciseType.toLowerCase()) {
      case "cardio":
        return "bg-[#ff74b1]/30 text-[#d85a9a] border border-[#ff74b1]/40";
      case "strength":
        return "bg-[#65dbff]/30 text-[#4bc4e6] border border-[#65dbff]/40";
      case "flexibility":
        return "bg-[#ffeb76]/30 text-[#e6d468] border border-[#ffeb76]/40";
      case "sports":
        return "bg-[#a6eaff]/30 text-[#65dbff] border border-[#a6eaff]/40";
      case "other":
        return "bg-gray-500/20 text-gray-700";
      default:
        return "bg-gray-500/20 text-gray-700";
    }
  };

  const formatExerciseType = (exerciseType: string) => {
    return exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1);
  };

  const getExerciseTypeIcon = (exerciseType: string) => {
    switch (exerciseType.toLowerCase()) {
      case "cardio":
        return <Heart className="h-4 w-4 text-red-600" />;
      case "strength":
        return <Dumbbell className="h-4 w-4 text-blue-600" />;
      case "flexibility":
        return <StretchHorizontal className="h-4 w-4 text-purple-600" />;
      case "sports":
        return <Trophy className="h-4 w-4 text-green-600" />;
      case "other":
        return <Activity className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  return (
    <AnimatedCard index={6} delay={400}>
      <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-white/30 backdrop-blur-lg p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]">
      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground">Recent Workouts</h3>
          <Link
            href="/dashboard/fitness"
            className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : recentFitness.length === 0 ? (
        <div className="text-center py-8">
          <Dumbbell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No fitness entries logged yet</p>
          <Link
            href="/dashboard/fitness"
            className="text-sm text-primary hover:underline mt-2 inline-block"
          >
            Start tracking →
          </Link>
        </div>
        ) : (
        <div className="space-y-3">
          {recentFitness.map((entry, index) => {
            const formatDateTime = (dateString: string) => {
              const date = new Date(dateString);
              return {
                date: date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }),
                time: date.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                }),
              };
            };
            const { date, time } = formatDateTime(entry.performed_at);
            const exerciseTypeColor = getExerciseTypeColor(entry.exercise_type);
            const exerciseTypeLabel = formatExerciseType(entry.exercise_type);
            const getIntensityColor = (intensity: string | null) => {
              if (!intensity) return "";
              switch (intensity.toLowerCase()) {
                case "low":
                  return "bg-[#a6eaff]/30 text-[#65dbff] border border-[#a6eaff]/40";
                case "medium":
                  return "bg-[#ffeb76]/30 text-[#e6d468] border border-[#ffeb76]/40";
                case "high":
                  return "bg-[#ff74b1]/30 text-[#d85a9a] border border-[#ff74b1]/40";
                default:
                  return "";
              }
            };
            const intensityColor = getIntensityColor(entry.intensity);

            return (
              <AnimatedListItem key={entry.id} index={index}>
                <div
                  className="group rounded-xl border border-foreground/10 bg-background/60 p-4 transition-colors hover:border-foreground/20"
                >
                <div className="flex items-start justify-between gap-4">
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onEdit?.(entry)}
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-base font-semibold text-foreground truncate">
                        {entry.exercise_name}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${exerciseTypeColor}`}
                          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                        >
                          {getExerciseTypeIcon(entry.exercise_type)}
                          {exerciseTypeLabel}
                        </span>
                        {entry.intensity && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${intensityColor}`}
                          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                        >
                            {entry.intensity.charAt(0).toUpperCase() + entry.intensity.slice(1)}
                          </span>
                        )}
                        {entry.duration_minutes !== null && (
                          <span className="text-xs text-muted-foreground font-medium">
                            {entry.duration_minutes} min
                          </span>
                        )}
                        {entry.calories_burned !== null && (
                          <span className="text-xs text-muted-foreground font-medium">
                            {entry.calories_burned} cal
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{date}</span>
                      <span>•</span>
                      <span>{time}</span>
                    </div>
                    {entry.notes && (
                      <p className="mt-2 text-sm text-foreground/80 line-clamp-2">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  {onDelete && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(entry);
                        }}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary-light/50 hover:text-primary-dark"
                        aria-label="Delete fitness entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                </div>
              </AnimatedListItem>
            );
          })}
        </div>
      )}
      </div>
      </div>
    </AnimatedCard>
  );
}

// ---------------------------
// Page
// ---------------------------
export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading] = useState(false); // Start as false - don't block rendering
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [, setSymptoms] = useState<Symptom[]>([]);
  const [, setSymptomsLoading] = useState(true);
  const { logs: symptomLogs, loading: symptomLogsLoading } = useSymptomLogs(30);
  const [nutrition, setNutrition] = useState<Nutrition[]>([]);
  const [nutritionLoading, setNutritionLoading] = useState(true);
  const [fitness, setFitness] = useState<Fitness[]>([]);
  const [fitnessLoading, setFitnessLoading] = useState(true);
  const [userTrial, setUserTrial] = useState<{
    trial_start: string | null;
    trial_end: string | null;
    trial_days: number;
    account_status: string;
  } | null>(null);
  
  // Modal states
  const [isSymptomModalOpen, setIsSymptomModalOpen] = useState(false);
  const [isNutritionModalOpen, setIsNutritionModalOpen] = useState(false);
  const [isFitnessModalOpen, setIsFitnessModalOpen] = useState(false);
  const [editingSymptom, setEditingSymptom] = useState<Symptom | null>(null);
  const [editingNutrition, setEditingNutrition] = useState<Nutrition | null>(null);
  const [editingFitness, setEditingFitness] = useState<Fitness | null>(null);
  
  // Delete confirmation states
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: "symptom" | "nutrition" | "fitness" | null;
    id: string | null;
    name: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: "",
    isLoading: false,
  });

  // Ticker for live countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), MS.SECOND);
    return () => clearInterval(id);
  }, []);

  // Fetch symptoms data
  const fetchSymptoms = useCallback(async () => {
    // Don't fetch if user is not authenticated
    if (!user) {
      setSymptomsLoading(false);
      return;
    }

    try {
      setSymptomsLoading(true);
      const response = await fetch("/api/symptoms", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        // If 401, user is not authenticated - stop trying
        if (response.status === 401) {
          console.warn("Symptoms fetch: Unauthorized - user not authenticated");
          setSymptoms([]);
          setSymptomsLoading(false);
          return;
        }
        throw new Error("Failed to fetch symptoms");
      }

      const { data } = await response.json();
      setSymptoms(data || []);
    } catch (err) {
      console.error("Error fetching symptoms:", err);
      // Don't show error to user, just use empty array
      setSymptoms([]);
    } finally {
      setSymptomsLoading(false);
    }
  }, [user]);

  // Fetch nutrition data
  const fetchNutrition = useCallback(async () => {
    // Don't fetch if user is not authenticated
    if (!user) {
      setNutritionLoading(false);
      return;
    }

    try {
      setNutritionLoading(true);
      const response = await fetch("/api/nutrition", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        // If 401, user is not authenticated - stop trying
        if (response.status === 401) {
          console.warn("Nutrition fetch: Unauthorized - user not authenticated");
          setNutrition([]);
          setNutritionLoading(false);
          return;
        }
        throw new Error("Failed to fetch nutrition");
      }

      const { data } = await response.json();
      setNutrition(data || []);
    } catch (err) {
      console.error("Error fetching nutrition:", err);
      // Don't show error to user, just use empty array
      setNutrition([]);
    } finally {
      setNutritionLoading(false);
    }
  }, [user]);

  // Fetch fitness data
  const fetchFitness = useCallback(async () => {
    // Don't fetch if user is not authenticated
    if (!user) {
      setFitnessLoading(false);
      return;
    }

    try {
      setFitnessLoading(true);
      const response = await fetch("/api/fitness", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        // If 401, user is not authenticated - stop trying
        if (response.status === 401) {
          console.warn("Fitness fetch: Unauthorized - user not authenticated");
          setFitness([]);
          setFitnessLoading(false);
          return;
        }
        throw new Error("Failed to fetch fitness");
      }

      const { data } = await response.json();
      setFitness(data || []);
    } catch (err) {
      console.error("Error fetching fitness:", err);
      // Don't show error to user, just use empty array
      setFitness([]);
    } finally {
      setFitnessLoading(false);
    }
  }, [user]);

  // Keep session fresh and react to auth changes
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login?redirectedFrom=/dashboard");
      }
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        const { data } = await supabase.auth.getUser();
        setUser(data.user ?? null);
      }
      if (event === "SIGNED_IN") {
        // Session was established - refresh user data
        const { data } = await supabase.auth.getUser();
        setUser(data.user ?? null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  // Verify session on mount and save quiz data if present
  useEffect(() => {
    let mounted = true;

    async function verifySessionAndSaveQuiz() {
      try {
        // Verify session exists
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Dashboard: Session error:", sessionError);
          if (mounted) {
            router.replace("/login?redirectedFrom=/dashboard");
          }
          return;
        }

        if (!sessionData?.session?.user) {
          console.warn("Dashboard: No session found");
          if (mounted) {
            router.replace("/login?redirectedFrom=/dashboard");
          }
          return;
        }
        
        console.log("Dashboard: Session verified - user:", sessionData.session.user.email);

        // Set user
        if (mounted) {
          setUser(sessionData.session.user);
        }

        // Check for quiz data in sessionStorage and save immediately
        const pendingQuizData = sessionStorage.getItem("pending_quiz_answers");
        
        if (pendingQuizData) {
          try {
            const quizAnswers = JSON.parse(pendingQuizData);
            
            // Verify quiz data has required fields
            if (quizAnswers && (quizAnswers.top_problems || quizAnswers.name)) {
              console.log("Dashboard: Found quiz data in sessionStorage, saving to database...");
              
              const response = await fetch("/api/intake", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  user_id: sessionData.session.user.id,
                  name: quizAnswers.name || null,
                  top_problems: quizAnswers.top_problems || [],
                  severity: quizAnswers.severity || null,
                  timing: quizAnswers.timing || null,
                  tried_options: quizAnswers.tried_options || [],
                  doctor_status: quizAnswers.doctor_status || null,
                  goal: quizAnswers.goal || null,
                }),
              });

              if (response.ok) {
                const result = await response.json();
                console.log("Dashboard: Quiz data saved successfully:", result);
                // Clear sessionStorage after successful save
                sessionStorage.removeItem("pending_quiz_answers");
              } else {
                const errorData = await response.json();
                console.error("Dashboard: Failed to save quiz data:", errorData);
                // Don't clear on error - allow retry (though sessionStorage will clear on tab close)
              }
            } else {
              // Invalid quiz data - clear it
              sessionStorage.removeItem("pending_quiz_answers");
            }
          } catch (parseError) {
            console.error("Dashboard: Error parsing quiz data:", parseError);
            sessionStorage.removeItem("pending_quiz_answers");
          }
        }
      } catch (error) {
        console.error("Dashboard: Error in session verification:", error);
        if (mounted) {
          router.replace("/login?redirectedFrom=/dashboard");
        }
      }
    }

    verifySessionAndSaveQuiz();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Fetch user trial info from user_trials table
  const fetchUserTrial = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_trials")
        .select("trial_start, trial_end, trial_days, account_status")
        .eq("user_id", userId)
        .single();

      if (error) {
        // Check if table doesn't exist
        const errorMsg = error.message?.toLowerCase() || "";
        const isTableMissing = errorMsg.includes("does not exist") || 
                               errorMsg.includes("relation") ||
                               error.code === "42P01";
        
        if (isTableMissing) {
          // Table doesn't exist yet - return defaults silently
          return {
            trial_start: new Date().toISOString(),
            trial_end: null,
            trial_days: 3,
            account_status: "trial",
          };
        }
        
        // If row doesn't exist (PGRST116), try to create it
        if (error.code === "PGRST116") {
          const nowIso = new Date().toISOString();
          const { data: newTrial, error: insertError } = await supabase
            .from("user_trials")
            .insert([
              {
                user_id: userId,
                trial_start: nowIso,
                trial_days: 3,
                account_status: "trial",
              },
            ])
            .select("trial_start, trial_end, trial_days, account_status")
            .single();

          if (insertError) {
            // If insert fails, return defaults
            return {
              trial_start: nowIso,
              trial_end: null,
              trial_days: 3,
              account_status: "trial",
            };
          }
          return newTrial;
        }
        
        // Any other error - return defaults silently
        return {
          trial_start: new Date().toISOString(),
          trial_end: null,
          trial_days: 3,
          account_status: "trial",
        };
      }

      // If trial_start is null, initialize it
      if (!data.trial_start) {
        const nowIso = new Date().toISOString();
        const { data: updated, error: updateError } = await supabase
          .from("user_trials")
          .update({
            trial_start: nowIso,
            trial_days: data.trial_days || 3,
            account_status: "trial",
          })
          .eq("user_id", userId)
          .select("trial_start, trial_end, trial_days, account_status")
          .single();

        if (updateError) {
          return {
            trial_start: nowIso,
            trial_end: null,
            trial_days: data.trial_days || 3,
            account_status: "trial",
          };
        }
        return updated;
      }

      return data;
    } catch {
      // Silently return defaults on any error
      return {
        trial_start: new Date().toISOString(),
        trial_end: null,
        trial_days: 3,
        account_status: "trial",
      };
    }
  }, []);

  // Initial load - don't block rendering, fetch in background
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Don't set loading to true - show UI immediately
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        const u = data.user;
        if (!u) {
          router.replace("/login?redirectedFrom=/dashboard");
          return;
        }

        if (mounted) {
          setUser(u);
          // Fetch user trial info in background - don't block
          fetchUserTrial(u.id).then((trial) => {
            if (mounted) setUserTrial(trial);
          });
        }
      } catch (e) {
        if (mounted) setErr(e instanceof Error ? e.message : "Unknown error");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, fetchUserTrial]);

  // Fetch symptoms, nutrition, and fitness when user is loaded - run in parallel
  useEffect(() => {
    if (user) {
      // Start all fetches immediately in parallel - don't wait for each other
      fetchSymptoms();
      fetchNutrition();
      fetchFitness();
    } else {
      // User not authenticated - stop loading states
      setNutritionLoading(false);
      setFitnessLoading(false);
    }
  }, [user, fetchSymptoms, fetchNutrition, fetchFitness]);

  // Trial computations (UTC-safe) - now from user_trials
  const trial = useMemo(() => {
    if (!userTrial) {
      return {
        start: null as Date | null,
        end: null as Date | null,
        expired: false,
        daysLeft: 3,
        elapsedDays: 0,
        progressPct: 0,
        remaining: { d: 3, h: 0, m: 0, s: 0 },
      };
    }

    const trialDays = userTrial.trial_days || 3;
    const start = userTrial.trial_start ? new Date(userTrial.trial_start) : null;
    const end = userTrial.trial_end ? new Date(userTrial.trial_end) : null;

    if (!start) {
      return {
        start: null,
        end: null,
        expired: false,
        daysLeft: trialDays,
        elapsedDays: 0,
        progressPct: 0,
        remaining: { d: trialDays, h: 0, m: 0, s: 0 },
      };
    }

    // Use trial_end from database if available, otherwise calculate
    const endTs = end ? end.getTime() : start.getTime() + trialDays * MS.DAY;
    const startTs = start.getTime();
    const nowTs = now.getTime();

    const remainingMs = Math.max(0, endTs - nowTs);
    const expired =
      userTrial.account_status === "expired" ||
      remainingMs === 0 ||
      (end && end.getTime() < nowTs);

    const elapsedDays = Math.floor((nowTs - startTs) / MS.DAY);
    const daysLeft = Math.max(0, Math.ceil(remainingMs / MS.DAY));
    const progressPct = Math.min(100, (elapsedDays / trialDays) * 100);

    const d = Math.floor(remainingMs / MS.DAY);
    const h = Math.floor((remainingMs % MS.DAY) / MS.HOUR);
    const m = Math.floor((remainingMs % MS.HOUR) / MS.MINUTE);
    const s = Math.floor((remainingMs % MS.MINUTE) / MS.SECOND);

    return {
      start,
      end: new Date(endTs),
      expired,
      daysLeft,
      elapsedDays,
      progressPct,
      remaining: { d, h, m, s },
      trialDays,
    };
  }, [userTrial, now]);

  // ---------------------------
  // Event handlers
  // ---------------------------
  
  // Handle symptom added/updated
  const handleSymptomAdded = useCallback((symptom: Symptom) => {
    if (editingSymptom) {
      setSymptoms((prev) => prev.map((s) => (s.id === symptom.id ? symptom : s)));
      setEditingSymptom(null);
    } else {
      setSymptoms((prev) => [symptom, ...prev]);
    }
    setIsSymptomModalOpen(false);
  }, [editingSymptom]);

  const handleSymptomDeleted = useCallback(async () => {
    if (!deleteDialog.id || deleteDialog.type !== "symptom") return;

    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`/api/symptoms?id=${deleteDialog.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete symptom");
      }

      setSymptoms((prev) => prev.filter((s) => s.id !== deleteDialog.id));
      setDeleteDialog({ isOpen: false, type: null, id: null, name: "", isLoading: false });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete symptom");
      setDeleteDialog((prev) => ({ ...prev, isLoading: false }));
    }
  }, [deleteDialog.id, deleteDialog.type]);

  // Handle nutrition added/updated
  const handleNutritionAdded = useCallback((entry: Nutrition) => {
    if (editingNutrition) {
      setNutrition((prev) => prev.map((n) => (n.id === entry.id ? entry : n)));
      setEditingNutrition(null);
    } else {
      setNutrition((prev) => [entry, ...prev]);
    }
    setIsNutritionModalOpen(false);
  }, [editingNutrition]);

  const handleNutritionEdit = useCallback((entry: Nutrition) => {
    setEditingNutrition(entry);
    setIsNutritionModalOpen(true);
  }, []);

  const handleNutritionDeleteClick = useCallback((entry: Nutrition) => {
    setDeleteDialog({
      isOpen: true,
      type: "nutrition",
      id: entry.id,
      name: entry.food_item,
      isLoading: false,
    });
  }, []);

  const handleNutritionDeleted = useCallback(async () => {
    if (!deleteDialog.id || deleteDialog.type !== "nutrition") return;

    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`/api/nutrition?id=${deleteDialog.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete nutrition entry");
      }

      setNutrition((prev) => prev.filter((n) => n.id !== deleteDialog.id));
      setDeleteDialog({ isOpen: false, type: null, id: null, name: "", isLoading: false });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete nutrition entry");
      setDeleteDialog((prev) => ({ ...prev, isLoading: false }));
    }
  }, [deleteDialog.id, deleteDialog.type]);

  // Handle fitness added/updated
  const handleFitnessAdded = useCallback((entry: Fitness) => {
    if (editingFitness) {
      setFitness((prev) => prev.map((f) => (f.id === entry.id ? entry : f)));
      setEditingFitness(null);
    } else {
      setFitness((prev) => [entry, ...prev]);
    }
    setIsFitnessModalOpen(false);
  }, [editingFitness]);

  const handleFitnessEdit = useCallback((entry: Fitness) => {
    setEditingFitness(entry);
    setIsFitnessModalOpen(true);
  }, []);

  const handleFitnessDeleteClick = useCallback((entry: Fitness) => {
    setDeleteDialog({
      isOpen: true,
      type: "fitness",
      id: entry.id,
      name: entry.exercise_name,
      isLoading: false,
    });
  }, []);

  const handleFitnessDeleted = useCallback(async () => {
    if (!deleteDialog.id || deleteDialog.type !== "fitness") return;

    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`/api/fitness?id=${deleteDialog.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete fitness entry");
      }

      setFitness((prev) => prev.filter((f) => f.id !== deleteDialog.id));
      setDeleteDialog({ isOpen: false, type: null, id: null, name: "", isLoading: false });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete fitness entry");
      setDeleteDialog((prev) => ({ ...prev, isLoading: false }));
    }
  }, [deleteDialog.id, deleteDialog.type]);

  function handleLogout() {
    // Navigate immediately - no waiting
    window.location.href = "/login";
    // Sign out in background (don't await, don't block)
    supabase.auth.signOut().catch(() => {
      // Silently fail - we're already navigating away
    });
  }

  // ---------------------------
  // Render
  // ---------------------------
  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6 sm:p-8">
        <div className="mb-6">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-3" />
        </div>
      </main>
    );
  }

  if (err) {
    return (
      <main className="mx-auto max-w-7xl p-6 sm:p-8">
        <div role="alert" className="rounded-xl border border-error/30 bg-error/10 p-4">
          <div className="font-semibold text-error text-lg">Error</div>
          <p className="mt-1 text-base text-error/90">{err}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => router.refresh()}
              className="inline-flex items-center rounded-lg bg-foreground/10 px-3 py-2 text-base hover:bg-foreground/15"
            >
              Try again
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center rounded-lg border border-foreground/15 px-3 py-2 text-base hover:bg-foreground/5"
            >
              Log out
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background: 'linear-gradient(to bottom, #DBEAFE 0%, #FEF3C7 50%, #FCE7F3 100%)' }}>
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-1 sm:mb-2">
          Dashboard
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Welcome{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </p>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Trial Status Card - Full width on desktop (3 columns) */}
        <div className="lg:col-span-3">
          <TrialStatusCard trial={trial} />
        </div>


        {/* Symptoms Overview Card - 1 column */}
        <div>
          <SymptomsOverviewCard
            totalSymptoms={new Set(symptomLogs.map(log => log.symptom_id)).size}
            isLoading={symptomLogsLoading}
          />
        </div>

        {/* Nutrition Overview Card - 1 column */}
        <div>
          <NutritionOverviewCard
            totalNutrition={nutrition.length}
            isLoading={nutritionLoading}
          />
        </div>

        {/* Fitness Overview Card - 1 column */}
        <div>
          <FitnessOverviewCard
            totalFitness={fitness.length}
            isLoading={fitnessLoading}
          />
        </div>

        {/* Recent Symptoms Card - Full width on desktop (3 columns) */}
        <div className="lg:col-span-3">
          <RecentSymptomsCard 
            logs={symptomLogs} 
            isLoading={symptomLogsLoading}
            onLogClick={() => {
              // Navigate to symptoms page where logs can be viewed and edited
              router.push("/dashboard/symptoms");
            }}
          />
        </div>

        {/* Recent Nutrition Card - Full width on desktop (3 columns) */}
        <div className="lg:col-span-3">
          <RecentNutritionCard 
            nutrition={nutrition} 
            isLoading={nutritionLoading}
            onEdit={handleNutritionEdit}
            onDelete={handleNutritionDeleteClick}
          />
        </div>

        {/* Recent Fitness Card - Full width on desktop (3 columns) */}
        <div className="lg:col-span-3">
          <RecentFitnessCard 
            fitness={fitness} 
            isLoading={fitnessLoading}
            onEdit={handleFitnessEdit}
            onDelete={handleFitnessDeleteClick}
          />
        </div>
      </div>

      {/* Modals */}
      <AddSymptomModal
        isOpen={isSymptomModalOpen}
        onClose={() => {
          setIsSymptomModalOpen(false);
          setEditingSymptom(null);
        }}
        onSuccess={handleSymptomAdded}
        editingEntry={editingSymptom}
      />

      <AddNutritionModal
        isOpen={isNutritionModalOpen}
        onClose={() => {
          setIsNutritionModalOpen(false);
          setEditingNutrition(null);
        }}
        onSuccess={handleNutritionAdded}
        editingEntry={editingNutrition}
      />

      <AddFitnessModal
        isOpen={isFitnessModalOpen}
        onClose={() => {
          setIsFitnessModalOpen(false);
          setEditingFitness(null);
        }}
        onSuccess={handleFitnessAdded}
        editingEntry={editingFitness}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, type: null, id: null, name: "", isLoading: false })}
        onConfirm={() => {
          if (deleteDialog.type === "symptom") {
            handleSymptomDeleted();
          } else if (deleteDialog.type === "nutrition") {
            handleNutritionDeleted();
          } else if (deleteDialog.type === "fitness") {
            handleFitnessDeleted();
          }
        }}
        title={`Delete ${deleteDialog.type === "symptom" ? "Symptom" : deleteDialog.type === "nutrition" ? "Nutrition Entry" : "Workout"}?`}
        message={`Are you sure you want to delete this ${deleteDialog.type === "symptom" ? "symptom" : deleteDialog.type === "nutrition" ? "nutrition entry" : "workout"}? This action cannot be undone.`}
        itemName={deleteDialog.name}
        isLoading={deleteDialog.isLoading}
      />
    </main>
  );
}
