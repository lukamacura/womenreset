/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useSymptoms } from "@/hooks/useSymptoms";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useTrialStatus } from "@/lib/useTrialStatus";
import { useNotification } from "@/hooks/useNotification";
import { useUserProfile } from "@/hooks/useUserProfile";
import SymptomCard from "@/components/symptom-tracker/SymptomCard";
import SymptomSelectorModal from "@/components/symptom-tracker/SymptomSelectorModal";
import LogSymptomModal from "@/components/symptom-tracker/LogSymptomModal";
import QuickLogModal from "@/components/symptom-tracker/QuickLogModal";
import AnalyticsSection from "@/components/symptom-tracker/AnalyticsSection";
import WeekSummary from "@/components/symptom-tracker/WeekSummary";
import RecentLogs from "@/components/symptom-tracker/RecentLogs";
import PersonalizedGreeting from "@/components/symptom-tracker/PersonalizedGreeting";
import EmptyState from "@/components/symptom-tracker/EmptyState";
import MilestoneCelebration from "@/components/symptom-tracker/MilestoneCelebration";
import ProgressComparison from "@/components/symptom-tracker/ProgressComparison";
import WeekComparison from "@/components/symptom-tracker/WeekComparison";
import DoctorReportButton from "@/components/symptom-tracker/DoctorReportButton";
import GoodDayCard from "@/components/symptom-tracker/GoodDayCard";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import type { Symptom, LogSymptomData, SymptomLog } from "@/lib/symptom-tracker-constants";
import { orderSymptoms } from "@/lib/symptomOrdering";

export const dynamic = "force-dynamic";

// Animated Section Component with Intersection Observer
function AnimatedSection({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Clear any pending timeout
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }

            // Set visible with delay
            timeoutRef.current = setTimeout(() => {
              setIsVisible(true);
              timeoutRef.current = null;
            }, delay);

            // Unobserve after triggering
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(currentRef);

    return () => {
      // Cleanup timeout and observer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      } ${className}`}
      style={{
        willChange: isVisible ? "auto" : "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}

export default function SymptomsPage() {
  const router = useRouter();
  const trialStatus = useTrialStatus();
  const { showSuccess, showError, show } = useNotification();
  const { symptoms, loading: symptomsLoading, refetch: refetchSymptoms } =
    useSymptoms();
  const { logs, loading: logsLoading, refetch: refetchLogs } =
    useSymptomLogs(30);
  const { profile } = useUserProfile();
  const [selectedSymptom, setSelectedSymptom] = useState<Symptom | null>(null);
  const [editingLog, setEditingLog] = useState<SymptomLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [, setPageLoaded] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    symptom: Symptom | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    symptom: null,
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

  // Trigger page load animation
  useEffect(() => {
    setPageLoaded(true);
  }, []);

  // Check for bad day support notification
  useEffect(() => {
    const checkBadDaySupport = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayLogs = logs.filter((log: SymptomLog) => {
        const logDate = new Date(log.logged_at);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === today.getTime();
      });

      // Check if already shown today
      const todayKey = `badDaySupport_${today.toDateString()}`;
      const hasShownToday = sessionStorage.getItem(todayKey) === 'true';

      // Trigger conditions: 3+ symptoms in one day, OR any symptom logged as Severe
      const severeCount = todayLogs.filter((log: SymptomLog) => log.severity === 3).length;
      const hasSevere = severeCount > 0;
      const hasManySymptoms = todayLogs.length >= 3;

      if ((hasSevere || hasManySymptoms) && !hasShownToday && todayLogs.length > 0) {
        const displayName = profile?.name || '';
        const symptomCount = todayLogs.length;
        const symptomText = symptomCount === 1 ? 'symptom' : 'symptoms';
        
        show(
          "lisa_message",
          "Tough Day Support",
          {
            message: `${displayName ? `${displayName}, ` : ''}You've logged ${symptomCount} ${symptomText} today. That's hard, and we see you. Remember: Tracking the hard days helps Lisa find patterns that lead to better days. You're doing something important by being here.`,
            priority: "medium",
            autoDismiss: false,
            primaryAction: {
              label: "Talk to Lisa",
              action: () => {
                router.push("/chat/lisa");
              },
            },
            secondaryAction: {
              label: "I'm okay, just logging",
              action: () => {
                // Just dismiss
              },
            },
          }
        );

        // Mark as shown today
        sessionStorage.setItem(todayKey, 'true');
      }
    };

    // Listen for the custom event
    const handler = () => checkBadDaySupport();
    window.addEventListener('check-bad-day-support', handler);
    
    // Also check on logs change (with a small delay to avoid showing immediately on page load)
    const timeoutId = setTimeout(() => {
      if (logs.length > 0) {
        checkBadDaySupport();
      }
    }, 1000);

    return () => {
      window.removeEventListener('check-bad-day-support', handler);
      clearTimeout(timeoutId);
    };
  }, [logs, profile?.name, router, show]);

  // Redirect to dashboard if trial is expired
  if (!trialStatus.loading && trialStatus.expired) {
    router.replace("/dashboard");
    return null;
  }

  // Get smart-ordered symptoms
  const topSymptoms = useMemo(() => {
    if (symptoms.length === 0 || logs.length === 0) {
      // Fallback: return default symptoms if no logs yet
      return symptoms.filter((s) => s.is_default).slice(0, 6);
    }
    
    // Use smart ordering algorithm
    // Mobile: 6 cards, Desktop: 8 cards (we'll use 6 for now, can make responsive later)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const limit = isMobile ? 6 : 8;
    
    return orderSymptoms(symptoms, logs, limit);
  }, [symptoms, logs]);

  // Get last logged time and severity for each symptom
  const getLastLoggedInfo = (symptomId: string): { time: string | null; severity: number | null } => {
    const symptomLogs = logs.filter((log) => log.symptom_id === symptomId);
    if (symptomLogs.length === 0) return { time: null, severity: null };
    // Sort by logged_at descending and get the most recent
    const sorted = [...symptomLogs].sort((a, b) => 
      new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
    );
    return { time: sorted[0].logged_at, severity: sorted[0].severity };
  };

  // Quick log handler - opens quick modal
  const handleQuickLogClick = useCallback(
    (symptom: Symptom) => {
      setSelectedSymptom(symptom);
      setIsQuickModalOpen(true);
    },
    []
  );

  // Handle quick log save (from QuickLogModal)
  const handleQuickLogSave = useCallback(
    async (data: LogSymptomData) => {
      try {
        const response = await fetch("/api/symptom-logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symptomId: data.symptomId,
            severity: data.severity,
            triggers: data.triggers || [],
            notes: data.notes || "",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to quick log symptom";
          showError("Couldn't save", errorMessage);
          throw new Error(errorMessage);
        }

        // Refetch logs and symptoms
        await Promise.all([refetchLogs(), refetchSymptoms()]);
        
        // Dispatch custom event to notify AnalyticsSection to refresh
        window.dispatchEvent(new CustomEvent('symptom-log-updated'));
        
        // Show success notification
        showSuccess("Symptom logged");
      } catch (error) {
        throw error; // Let QuickLogModal handle error display
      }
    },
    [refetchLogs, refetchSymptoms, showSuccess, showError]
  );

  // Handle quick modal close
  const handleQuickModalClose = () => {
    setIsQuickModalOpen(false);
    setSelectedSymptom(null);
  };

  // Handle expand to full modal from quick modal
  const handleExpandToFullModal = () => {
    setIsQuickModalOpen(false);
    setIsModalOpen(true);
    // selectedSymptom is already set
  };

  // Get Good Day symptom (or null if doesn't exist yet - will be created on first log)
  const goodDaySymptom = useMemo(() => {
    return symptoms.find((s) => s.name === "Good Day") || null;
  }, [symptoms]);

  // Handle good day logging - uses standard symptom-logs API same as other symptoms
  // But ensures the Good Day symptom exists first
  const handleLogGoodDay = useCallback(
    async (data: LogSymptomData) => {
      try {
        // If symptom doesn't exist yet, create it first
        let symptomId = data.symptomId;
        if (data.symptomId === 'temp-good-day' || !goodDaySymptom) {
          // Create the Good Day symptom
          const createResponse = await fetch("/api/symptoms", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: "Good Day",
              icon: "Sun",
            }),
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || "Failed to create Good Day symptom");
          }

          const { data: newSymptom } = await createResponse.json();
          symptomId = newSymptom.id;
          
          // Refetch symptoms to update the list
          await refetchSymptoms();
        }

        // Now use standard symptom-logs API
        const response = await fetch("/api/symptom-logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symptomId: symptomId,
            severity: data.severity,
            triggers: data.triggers || [],
            notes: data.notes || "",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to log good day");
        }

        // Refetch logs and symptoms
        await Promise.all([refetchLogs(), refetchSymptoms()]);
        
        // Dispatch custom event to notify AnalyticsSection to refresh
        window.dispatchEvent(new CustomEvent('symptom-log-updated'));
      } catch (error) {
        throw error;
      }
    },
    [goodDaySymptom, refetchLogs, refetchSymptoms]
  );

  // Handle symptom card click
  const handleSymptomClick = (symptom: Symptom) => {
    setSelectedSymptom(symptom);
    setIsModalOpen(true);
  };

  // Handle symptom delete click
  const handleSymptomDeleteClick = useCallback((symptom: Symptom) => {
    setDeleteDialog({
      isOpen: true,
      symptom,
      isLoading: false,
    });
  }, []);

  // Handle symptom delete confirm
  const handleSymptomDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.symptom) return;

    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`/api/symptoms?id=${deleteDialog.symptom.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete symptom");
      }

      // Refetch symptoms to update the list
      await refetchSymptoms();
      setDeleteDialog({ isOpen: false, symptom: null, isLoading: false });
      showSuccess("Symptom deleted");
      // Refresh the page to ensure all data is up to date
      router.refresh();
    } catch (err) {
      showError("Couldn't delete", err instanceof Error ? err.message : "Failed to delete symptom");
      setDeleteDialog((prev) => ({ ...prev, isLoading: false }));
    }
  }, [deleteDialog.symptom, refetchSymptoms, router, showSuccess, showError]);

  // Handle full modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSymptom(null);
    setEditingLog(null);
  };

  // Handle log click from RecentLogs
  const handleLogClick = (log: SymptomLog) => {
    // Find the symptom definition for this log
    const symptom = symptoms.find((s) => s.id === log.symptom_id);
    if (symptom) {
      setSelectedSymptom(symptom);
      setEditingLog(log);
      setIsModalOpen(true);
    }
  };

  // Handle log delete click
  const handleLogDeleteClick = useCallback((log: SymptomLog) => {
    setDeleteLogDialog({
      isOpen: true,
      log,
      isLoading: false,
    });
  }, []);

  // Handle log delete confirm
  const handleLogDeleteConfirm = useCallback(async () => {
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

      // Refetch logs to update the list
      await refetchLogs();
      setDeleteLogDialog({ isOpen: false, log: null, isLoading: false });
      showSuccess("Log deleted");
      // Refresh the page to ensure all data is up to date
      router.refresh();
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('symptom-log-updated'));
    } catch (err) {
      showError("Couldn't delete", err instanceof Error ? err.message : "Failed to delete symptom log");
      setDeleteLogDialog((prev) => ({ ...prev, isLoading: false }));
    }
  }, [deleteLogDialog.log, refetchLogs, router, showSuccess, showError]);

  // Handle save symptom log (create or update)
  const handleSaveLog = useCallback(
    async (data: LogSymptomData) => {
      try {
        const isEditing = !!data.logId;
        const url = "/api/symptom-logs";
        const method = isEditing ? "PUT" : "POST";
        
        const body: {
          symptomId: string;
          severity: number;
          triggers: string[];
          notes: string;
          id?: string;
        } = {
          symptomId: data.symptomId,
          severity: data.severity,
          triggers: data.triggers,
          notes: data.notes,
        };

        // Add log ID if editing
        if (isEditing && data.logId) {
          body.id = data.logId;
        }

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || `Failed to ${isEditing ? "update" : "save"} symptom log`;
          showError("Couldn't save", errorMessage, () => handleSaveLog(data));
          throw new Error(errorMessage);
        }

        // Refetch logs and symptoms
        await Promise.all([refetchLogs(), refetchSymptoms()]);
        
        // Dispatch custom event to notify AnalyticsSection to refresh
        window.dispatchEvent(new CustomEvent('symptom-log-updated'));
        
        // Show success notification
        showSuccess(isEditing ? "Symptom updated" : "Symptom logged");

        // Trigger bad day support check (only on new logs, not edits)
        if (!isEditing) {
          // Refetch logs first, then trigger check after a short delay
          await refetchLogs();
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('check-bad-day-support'));
          }, 500);
        }
      } catch (error) {
        // Error already handled above, just rethrow
        throw error;
      }
    },
    [refetchLogs, refetchSymptoms, showSuccess, showError]
  );

  // Show loading state while checking trial status
  if (trialStatus.loading) {
    return (
      <div className="mx-auto max-w-7xl p-6 sm:p-8 space-y-8 min-h-screen" style={{ background: 'linear-gradient(to bottom, #DBEAFE 0%, #FEF3C7 50%, #FCE7F3 100%)' }}>
        <div className="space-y-8">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-64 bg-white/40 backdrop-blur-md rounded-xl" />
            <div className="h-6 w-96 bg-white/30 backdrop-blur-md rounded-lg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-24 bg-white/40 backdrop-blur-md rounded-2xl border border-white/30 animate-pulse"
                style={{
                  animationDelay: `${i * 50}ms`,
                  animationDuration: '1.5s',
                }}
              />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 bg-white/40 backdrop-blur-md rounded-2xl border border-white/30 animate-pulse"
                style={{
                  animationDelay: `${(i + 6) * 50}ms`,
                  animationDuration: '1.5s',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Don't render if trial is expired (will redirect)
  if (trialStatus.expired) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 min-h-screen">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between opacity-0 animate-[fadeInDown_0.6s_ease-out_forwards]">
        <div className="flex-1">
          {/* Personalized Greeting is now the header */}
          <PersonalizedGreeting />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <DoctorReportButton />
          <button
            onClick={() => {
              setIsSelectorOpen(true);
            }}
            className="btn-primary inline-flex font-bold text-lg justify-center items-center gap-2 cursor-pointer px-5 py-2.5 shadow-md hover:translate-y-px transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            Add Symptom
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="space-y-8">

        {/* Empty State */}
        <AnimatedSection delay={150}>
          <EmptyState />
        </AnimatedSection>

        {/* Title */}
        <AnimatedSection delay={200}>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-[#8B7E74] mb-2">
              How are you feeling?
            </h2>
          </div>
        </AnimatedSection>

        {/* Bento Grid for Symptom Cards */}
        {symptomsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 auto-rows-fr">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-white/30 backdrop-blur-md rounded-2xl h-20 border border-white/30"
                style={{
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </div>
        ) : topSymptoms.length > 0 ? (
          <>
            <AnimatedSection delay={250}>
              <div
                className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 auto-rows-fr"
                data-symptoms-grid
                style={{
                  gridAutoRows: 'minmax(80px, auto)'
                }}
              >
                {topSymptoms.map((symptom, index) => {
                  const lastLogged = getLastLoggedInfo(symptom.id);
                  const spanClass = index === 0 && topSymptoms.length > 3
                    ? 'md:col-span-2 md:row-span-1'
                    : index === 1 && topSymptoms.length > 5
                    ? 'md:col-span-2 md:row-span-1'
                    : '';
                  return (
                    <div
                      key={symptom.id}
                      className={`${spanClass}`}
                      style={{
                        animation: `fadeInUp 0.5s ease-out forwards`,
                        animationDelay: `${index * 70}ms`,
                        opacity: 0,
                      }}
                    >
                      <SymptomCard
                        symptom={symptom}
                        onClick={() => handleSymptomClick(symptom)}
                        lastLoggedAt={lastLogged.time}
                        lastLoggedSeverity={lastLogged.severity}
                        onQuickLog={() => handleQuickLogClick(symptom)}
                        onDelete={handleSymptomDeleteClick}
                      />
                    </div>
                  );
                })}
              </div>
            </AnimatedSection>
            {/* Good Day Card */}
            <AnimatedSection delay={300}>
              <GoodDayCard goodDaySymptom={goodDaySymptom} onSave={handleLogGoodDay} />
            </AnimatedSection>
          </>
        ) : (
          <AnimatedSection delay={250}>
            <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-lg p-12 text-center shadow-xl">
              <p className="text-[#6B6B6B]">No symptoms available</p>
              <p className="text-sm text-[#9A9A9A] mt-2">
                Default symptoms will be created when you first log in.
              </p>
            </div>
          </AnimatedSection>
        )}

        {/* Week Comparison */}
        <AnimatedSection delay={0}>
          <WeekComparison />
        </AnimatedSection>

        {/* Analytics Section */}
        <AnimatedSection delay={0}>
          <AnalyticsSection />
        </AnimatedSection>

        {/* Progress Comparison */}
        <AnimatedSection delay={0}>
          <ProgressComparison />
        </AnimatedSection>

        {/* Week Summary */}
        <AnimatedSection delay={0}>
          <WeekSummary />
        </AnimatedSection>

        {/* Recent Logs */}
        <AnimatedSection delay={0}>
          <section className="bg-white/30 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-white/30 shadow-xl transition-all duration-300 hover:shadow-2xl">
            <div className="mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-[#8B7E74]">Your Journal</h2>
            </div>
            <RecentLogs logs={logs} loading={logsLoading} onLogClick={handleLogClick} onDelete={handleLogDeleteClick} />
          </section>
        </AnimatedSection>
      </div>

      {/* Symptom Selector Modal */}
      <SymptomSelectorModal
        symptoms={symptoms}
        isOpen={isSelectorOpen}
        onClose={() => {
          setIsSelectorOpen(false);
        }}
        onSelect={(symptom) => {
          setSelectedSymptom(symptom);
          setIsModalOpen(true);
        }}
      />

      {/* Quick Log Modal */}
      {selectedSymptom && (
        <QuickLogModal
          symptom={selectedSymptom}
          isOpen={isQuickModalOpen}
          onClose={handleQuickModalClose}
          onSave={handleQuickLogSave}
          onExpand={handleExpandToFullModal}
        />
      )}

      {/* Full Log Symptom Modal */}
      {selectedSymptom && (
        <LogSymptomModal
          symptom={selectedSymptom}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleSaveLog}
          editingLog={editingLog}
          allLogs={logs}
        />
      )}

      {/* Milestone Celebrations */}
      <MilestoneCelebration />

      {/* Delete Symptom Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, symptom: null, isLoading: false })}
        onConfirm={handleSymptomDeleteConfirm}
        title="Delete Symptom?"
        message="Are you sure you want to delete this symptom? This action cannot be undone."
        itemName={deleteDialog.symptom?.name}
        isLoading={deleteDialog.isLoading}
      />

      {/* Delete Log Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteLogDialog.isOpen}
        onClose={() => setDeleteLogDialog({ isOpen: false, log: null, isLoading: false })}
        onConfirm={handleLogDeleteConfirm}
        title="Delete Symptom Log?"
        message="Are you sure you want to delete this symptom log? This action cannot be undone."
        itemName={deleteLogDialog.log?.symptoms?.name}
        isLoading={deleteLogDialog.isLoading}
      />
    </div>
  );
}
