"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { Activity, ArrowRight, Trash2 } from "lucide-react";
import type { SymptomLog } from "@/lib/symptom-tracker-constants";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import RecentLogs from "@/components/symptom-tracker/RecentLogs";
import { TrialCard, getTrialState, type TrialState } from "@/components/TrialCard";
import { Skeleton } from "@/components/ui/AnimatedComponents";

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
        className="group relative overflow-hidden block h-full rounded-2xl border border-border/30 bg-card backdrop-blur-lg p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
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

// Recent Symptoms Card - Uses shared RecentLogs component
function RecentSymptomsCard({
  logs,
  isLoading,
  onLogClick,
  onDelete,
}: {
  logs: SymptomLog[];
  isLoading: boolean;
  onLogClick?: (log: SymptomLog) => void;
  onDelete?: (log: SymptomLog) => void;
}) {
  const recentLogs = logs.slice(0, 5);

  return (
    <AnimatedCard index={4} delay={300}>
      <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-card backdrop-blur-lg p-6 shadow-xl transition-all duration-300 hover:shadow-2xl">
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
          <RecentLogs 
            logs={recentLogs} 
            loading={isLoading} 
            onLogClick={onLogClick}
            onDelete={onDelete}
          />
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
  const [userName, setUserName] = useState<string | null>(null);
  const [loading] = useState(false); // Start as false - don't block rendering
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const lastNotifiedStateRef = useRef<TrialState | null>(null);
  const { logs: symptomLogs, loading: symptomLogsLoading } = useSymptomLogs(30);
  const [userTrial, setUserTrial] = useState<{
    trial_start: string | null;
    trial_end: string | null;
    trial_days: number;
    account_status: string;
  } | null>(null);
  const [patternCount, setPatternCount] = useState<number>(0);
  const [, setPatternCountLoading] = useState(true);
  
  // Delete confirmation states
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: null;
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
  const [deleteLogDialog, setDeleteLogDialog] = useState<{
    isOpen: boolean;
    log: SymptomLog | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    log: null,
    isLoading: false,
  });

  // Ticker for live countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), MS.SECOND);
    return () => clearInterval(id);
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
          
          // Fetch user's name from profile
          try {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("name")
              .eq("user_id", sessionData.session.user.id)
              .single();
            
            if (profile?.name && mounted) {
              // Extract first name from full name
              const firstName = profile.name.split(' ')[0];
              setUserName(firstName);
            }
          } catch (error) {
            console.error("Error fetching user name:", error);
          }
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

  // Fetch pattern count for expired state
  const fetchPatternCount = useCallback(async () => {
    if (!user) {
      setPatternCountLoading(false);
      return;
    }

    try {
      setPatternCountLoading(true);
      const response = await fetch("/api/tracker-insights?days=30", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401) {
          setPatternCount(0);
          setPatternCountLoading(false);
          return;
        }
        throw new Error("Failed to fetch pattern count");
      }

      const { data } = await response.json();
      // Count patterns from plainLanguageInsights
      const patterns = data?.plainLanguageInsights?.filter(
        (insight: { type: string }) => insight.type === "pattern"
      ) || [];
      setPatternCount(patterns.length);
    } catch (err) {
      console.error("Error fetching pattern count:", err);
      setPatternCount(0);
    } finally {
      setPatternCountLoading(false);
    }
  }, [user]);

  // Fetch pattern count when user is loaded
  useEffect(() => {
    if (user) {
      fetchPatternCount();
    } else {
      // User not authenticated - stop loading states
      setPatternCountLoading(false);
    }
  }, [user, fetchPatternCount]);

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

  // Send trial phase notifications
  useEffect(() => {
    if (!user || !trial.end || trial.expired === true) {
      lastNotifiedStateRef.current = null;
      return;
    }

    const currentState = getTrialState(!!trial.expired, trial.daysLeft, trial.remaining);
    
    // Only send notifications for warning and urgent states
    if (currentState !== "warning" && currentState !== "urgent") {
      // Reset ref when not in notification states
      if (currentState === "calm") {
        lastNotifiedStateRef.current = null;
      }
      return;
    }

    // Don't send duplicate notification for the same state
    if (lastNotifiedStateRef.current === currentState) {
      return;
    }

    const sendNotification = async () => {
      try {
        let title: string;
        let message: string;
        let priority: "high" | "medium" = "medium";

        if (currentState === "warning") {
          title = "Trial Ending Soon";
          message = `Your trial ends in ${trial.daysLeft} ${trial.daysLeft === 1 ? "day" : "days"}. Upgrade now to keep your progress and access Lisa's insights.`;
          priority = "medium";
        } else if (currentState === "urgent") {
          title = "Trial Ending Today";
          message = `Your trial ends in ${trial.remaining.h}h ${trial.remaining.m}m. Upgrade now to save your progress and unlock Lisa's patterns.`;
          priority = "high";
        } else {
          return;
        }

        const response = await fetch("/api/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "trial",
            title,
            message,
            priority,
            showOnce: true, // Prevent duplicate notifications
            metadata: {
              primaryAction: {
                label: "Upgrade Now",
                route: "/dashboard",
                actionType: "open_pricing",
              },
            },
          }),
        });

        if (response.ok) {
          // Mark this state as notified
          lastNotifiedStateRef.current = currentState;
        } else {
          console.error("Failed to create trial notification");
        }
      } catch (error) {
        console.error("Error creating trial notification:", error);
      }
    };

    // Send notification when entering warning or urgent state
    sendNotification();
  }, [user, trial.expired, trial.daysLeft, trial.remaining, trial.end]);

  // ---------------------------
  // Event handlers
  // ---------------------------
  

  // Handle symptom log delete click
  const handleSymptomLogDeleteClick = useCallback((log: SymptomLog) => {
    setDeleteLogDialog({
      isOpen: true,
      log,
      isLoading: false,
    });
  }, []);

  // Handle symptom log delete confirm
  const handleSymptomLogDeleteConfirm = useCallback(async () => {
    if (!deleteLogDialog.log) return;

    setDeleteLogDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`/api/symptom-logs?id=${deleteLogDialog.log.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete symptom log");
      }

      // Refetch symptom logs to update the list
      // Note: useSymptomLogs hook will automatically refetch when we refresh
      setDeleteLogDialog({ isOpen: false, log: null, isLoading: false });
      // Refresh the page to ensure all data is up to date
      router.refresh();
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('symptom-log-updated'));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete symptom log");
      setDeleteLogDialog((prev) => ({ ...prev, isLoading: false }));
    }
  }, [deleteLogDialog.log, router]);

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
    <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 min-h-screen bg-background">
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-2 sm:mb-3">
          {userName ? `Welcome back, ${userName}!` : "Welcome back!"}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Ready to take control of your health today?
        </p>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Trial Status Card - Full width on desktop (3 columns) */}
        <div className="lg:col-span-3">
          <AnimatedCard index={0} delay={0}>
            <TrialCard
              trial={{
                ...trial,
                expired: !!trial.expired, // Ensure 'expired' is always boolean
              }}
              symptomCount={symptomLogs.length}
              patternCount={patternCount}
            />
          </AnimatedCard>
        </div>


        {/* Symptoms Overview Card - 1 column */}
        <div>
          <SymptomsOverviewCard
            totalSymptoms={new Set(symptomLogs.map(log => log.symptom_id)).size}
            isLoading={symptomLogsLoading}
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
            onDelete={handleSymptomLogDeleteClick}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, type: null, id: null, name: "", isLoading: false })}
        onConfirm={() => {
          // No nutrition or fitness handlers needed
        }}
        title="Delete Item?"
        message="Are you sure you want to delete this item? This action cannot be undone."
        itemName={deleteDialog.name}
        isLoading={deleteDialog.isLoading}
      />

      {/* Delete Symptom Log Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteLogDialog.isOpen}
        onClose={() => setDeleteLogDialog({ isOpen: false, log: null, isLoading: false })}
        onConfirm={handleSymptomLogDeleteConfirm}
        title="Delete Symptom Log?"
        message="Are you sure you want to delete this symptom log? This action cannot be undone."
        itemName={deleteLogDialog.log?.symptoms?.name}
        isLoading={deleteLogDialog.isLoading}
      />
    </main>
  );
}
