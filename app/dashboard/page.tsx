"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { MessageSquare, Activity, ArrowRight, Smile, Meh, Frown, UtensilsCrossed, Dumbbell } from "lucide-react";
import type { Symptom } from "@/components/symptoms/SymptomList";
import type { Nutrition } from "@/components/nutrition/NutritionList";
import type { Fitness } from "@/components/fitness/FitnessList";

// Prevent static prerendering (safe)
export const dynamic = "force-dynamic";

// TRIAL_DAYS is now fetched from user_trials.trial_days (default: 3)
const CHAT_BASE = "/chat";

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
    <div className="rounded-xl sm:rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-6 lg:p-8 shadow-sm">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-1 sm:mb-2">
            {trial.expired ? "Trial Expired" : "Your Trial"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {trial.start && !trial.expired && (
              <>
                Started {trial.start.toLocaleDateString()} · Ends {trial.end?.toLocaleDateString()}
              </>
            )}
            {trial.expired && "Upgrade to continue using the platform."}
          </p>
        </div>
        <div
          className={`rounded-full px-2.5 sm:px-3 py-1 text-xs font-semibold shrink-0 ml-2 ${
            trial.expired
              ? "bg-rose-500/20 text-rose-700"
              : "bg-green-500/20 text-green-700"
          }`}
        >
          {trial.expired ? "Expired" : "Active"}
        </div>
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            {trial.daysLeft}
          </span>
          <span className="text-base sm:text-lg text-muted-foreground">days left</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full bg-primary transition-[width] duration-500"
            style={{ width: `${Math.max(0, Math.min(100, trial.progressPct))}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {Math.min(trial.trialDays || 3, trial.elapsedDays)} / {trial.trialDays || 3} days used
          </span>
          <span>{trial.progressPct.toFixed(0)}%</span>
        </div>
      </div>

      {!trial.expired && (
        <div className="text-xs sm:text-sm text-muted-foreground">
          Ends in {trial.remaining.d}d {trial.remaining.h}h {trial.remaining.m}m
        </div>
      )}
    </div>
  );
}

// Quick Chat Card
function QuickChatCard({
  trial,
}: {
  trial: {
    expired: boolean | null;
  };
}) {
  const trialLocked = trial.expired === true;

  const CardContent = (
    <div
      className={classNames(
        "group relative h-full rounded-xl sm:rounded-2xl border border-foreground/10 bg-linear-to-br from-pink-200 via-fuchsia-200 to-orange-100 p-4 sm:p-6 shadow-sm transition-all hover:shadow-md",
        trialLocked && "opacity-60"
      )}
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 sm:mb-4 relative">
          <Image
            src="/profile.webp"
            alt="Lisa"
            width={200}
            height={200}
            className="rounded-full sm:w-20 sm:h-20"
          />
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">Chat with Lisa</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
          Your menopause support expert
        </p>
        <div
          className={classNames(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            trialLocked
              ? "bg-foreground/10 text-muted-foreground cursor-not-allowed"
              : "bg-pink-600 text-white hover:bg-pink-800 group-hover:translate-x-1"
          )}
        >
          <MessageSquare className="h-4 w-4" />
          <span>{trialLocked ? "Locked" : "Start Chat"}</span>
          {!trialLocked && <ArrowRight className="h-4 w-4" />}
        </div>
      </div>
      {trialLocked && <div className="pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl" />}
    </div>
  );

  return trialLocked ? (
    <div>{CardContent}</div>
  ) : (
    <Link href={`${CHAT_BASE}/lisa`} className="block h-full">
      {CardContent}
    </Link>
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
    <Link
      href="/dashboard/symptoms"
      className="group block h-full rounded-xl sm:rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="rounded-lg bg-primary/10 p-2.5 sm:p-3">
          <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">Symptom Tracker</h3>
        {isLoading ? (
          <div className="h-7 sm:h-8 w-16 sm:w-20 bg-foreground/10 rounded animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              {totalSymptoms}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {totalSymptoms === 1 ? "symptom" : "symptoms"} logged
            </span>
          </div>
        )}
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">View your tracker →</p>
      </div>
    </Link>
  );
}

// Recent Symptoms Card
function RecentSymptomsCard({
  symptoms,
  isLoading,
}: {
  symptoms: Symptom[];
  isLoading: boolean;
}) {
  const recentSymptoms = symptoms.slice(0, 5);

  const getSeverityIcon = (severity: number) => {
    if (severity <= 3) return <Smile className="h-4 w-4 text-green-600" />;
    if (severity <= 6) return <Meh className="h-4 w-4 text-yellow-600" />;
    return <Frown className="h-4 w-4 text-red-600" />;
  };

  const getSeverityLabel = (severity: number) => {
    if (severity <= 3) return "Low";
    if (severity <= 6) return "Medium";
    return "High";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="rounded-xl sm:rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Recent Symptoms</h3>
        <Link
          href="/dashboard/symptoms"
          className="text-xs sm:text-sm text-primary hover:underline flex items-center gap-1"
        >
          View all
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : recentSymptoms.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No symptoms logged yet</p>
          <Link
            href="/dashboard/symptoms"
            className="text-sm text-primary hover:underline mt-2 inline-block"
          >
            Start tracking →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recentSymptoms.map((symptom) => (
            <div
              key={symptom.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-foreground/5 hover:border-foreground/10 transition-colors"
            >
              <div className="shrink-0">{getSeverityIcon(symptom.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {symptom.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getSeverityLabel(symptom.severity)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(symptom.occurred_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
    <Link
      href="/dashboard/nutrition"
      className="group block h-full rounded-xl sm:rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="rounded-lg bg-primary/10 p-2.5 sm:p-3">
          <UtensilsCrossed className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">Nutrition Tracker</h3>
        {isLoading ? (
          <div className="h-7 sm:h-8 w-16 sm:w-20 bg-foreground/10 rounded animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              {totalNutrition}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {totalNutrition === 1 ? "entry" : "entries"} logged
            </span>
          </div>
        )}
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">View your tracker →</p>
      </div>
    </Link>
  );
}

// Recent Nutrition Card
function RecentNutritionCard({
  nutrition,
  isLoading,
}: {
  nutrition: Nutrition[];
  isLoading: boolean;
}) {
  const recentNutrition = nutrition.slice(0, 5);

  const getMealTypeColor = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case "breakfast":
        return "bg-orange-500/20 text-orange-700";
      case "lunch":
        return "bg-blue-500/20 text-blue-700";
      case "dinner":
        return "bg-purple-500/20 text-purple-700";
      case "snack":
        return "bg-green-500/20 text-green-700";
      default:
        return "bg-gray-500/20 text-gray-700";
    }
  };

  const formatMealType = (mealType: string) => {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="rounded-xl sm:rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Recent Meals</h3>
        <Link
          href="/dashboard/nutrition"
          className="text-xs sm:text-sm text-primary hover:underline flex items-center gap-1"
        >
          View all
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
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
          {recentNutrition.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-foreground/5 hover:border-foreground/10 transition-colors"
            >
              <div className="shrink-0">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {entry.food_item}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${getMealTypeColor(
                      entry.meal_type
                    )}`}
                  >
                    {formatMealType(entry.meal_type)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(entry.consumed_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
    <Link
      href="/dashboard/fitness"
      className="group block h-full rounded-xl sm:rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="rounded-lg bg-primary/10 p-2.5 sm:p-3">
          <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">Fitness Tracker</h3>
        {isLoading ? (
          <div className="h-7 sm:h-8 w-16 sm:w-20 bg-foreground/10 rounded animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              {totalFitness}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {totalFitness === 1 ? "workout" : "workouts"} logged
            </span>
          </div>
        )}
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">View your tracker →</p>
      </div>
    </Link>
  );
}

// Recent Fitness Card
function RecentFitnessCard({
  fitness,
  isLoading,
}: {
  fitness: Fitness[];
  isLoading: boolean;
}) {
  const recentFitness = fitness.slice(0, 5);

  const getExerciseTypeColor = (exerciseType: string) => {
    switch (exerciseType.toLowerCase()) {
      case "cardio":
        return "bg-red-500/20 text-red-700";
      case "strength":
        return "bg-blue-500/20 text-blue-700";
      case "flexibility":
        return "bg-purple-500/20 text-purple-700";
      case "sports":
        return "bg-green-500/20 text-green-700";
      case "other":
        return "bg-gray-500/20 text-gray-700";
      default:
        return "bg-gray-500/20 text-gray-700";
    }
  };

  const formatExerciseType = (exerciseType: string) => {
    return exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="rounded-xl sm:rounded-2xl border border-foreground/10 bg-background/60 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Recent Workouts</h3>
        <Link
          href="/dashboard/fitness"
          className="text-xs sm:text-sm text-primary hover:underline flex items-center gap-1"
        >
          View all
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
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
          {recentFitness.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-foreground/5 hover:border-foreground/10 transition-colors"
            >
              <div className="shrink-0">
                <Dumbbell className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {entry.exercise_name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${getExerciseTypeColor(
                      entry.exercise_type
                    )}`}
                  >
                    {formatExerciseType(entry.exercise_type)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(entry.performed_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------
// Page
// ---------------------------
export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [symptomsLoading, setSymptomsLoading] = useState(true);
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

  // Ticker for live countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), MS.SECOND);
    return () => clearInterval(id);
  }, []);

  // Fetch symptoms data
  const fetchSymptoms = useCallback(async () => {
    try {
      setSymptomsLoading(true);
      const response = await fetch("/api/symptoms", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
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
  }, []);

  // Fetch nutrition data
  const fetchNutrition = useCallback(async () => {
    try {
      setNutritionLoading(true);
      const response = await fetch("/api/nutrition", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
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
  }, []);

  // Fetch fitness data
  const fetchFitness = useCallback(async () => {
    try {
      setFitnessLoading(true);
      const response = await fetch("/api/fitness", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
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
  }, []);

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
    });
    return () => sub.subscription.unsubscribe();
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

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        const u = data.user;
        if (!u) {
          router.replace("/login?redirectedFrom=/dashboard");
          return;
        }

        if (mounted) setUser(u);

        // Fetch user trial info
        const trial = await fetchUserTrial(u.id);
        if (mounted) setUserTrial(trial);
      } catch (e) {
        if (mounted) setErr(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, fetchUserTrial]);

  // Fetch symptoms, nutrition, and fitness when user is loaded
  useEffect(() => {
    if (user) {
      fetchSymptoms();
      fetchNutrition();
      fetchFitness();
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
        <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4">
          <div className="font-semibold text-rose-300 text-lg">Error</div>
          <p className="mt-1 text-base text-rose-200/90">{err}</p>
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
    <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
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
        {/* Trial Status Card - 2 columns on desktop */}
        <div className="lg:col-span-2">
          <TrialStatusCard trial={trial} />
        </div>

        {/* Quick Chat Card - 1 column */}
        <div>
          <QuickChatCard trial={trial} />
        </div>

        {/* Symptoms Overview Card - 1 column */}
        <div>
          <SymptomsOverviewCard
            totalSymptoms={symptoms.length}
            isLoading={symptomsLoading}
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
          <RecentSymptomsCard symptoms={symptoms} isLoading={symptomsLoading} />
        </div>

        {/* Recent Nutrition Card - Full width on desktop (3 columns) */}
        <div className="lg:col-span-3">
          <RecentNutritionCard nutrition={nutrition} isLoading={nutritionLoading} />
        </div>

        {/* Recent Fitness Card - Full width on desktop (3 columns) */}
        <div className="lg:col-span-3">
          <RecentFitnessCard fitness={fitness} isLoading={fitnessLoading} />
        </div>
      </div>
    </main>
  );
}
