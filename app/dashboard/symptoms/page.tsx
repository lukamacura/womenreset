/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useSymptoms } from "@/hooks/useSymptoms";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useTrialStatus } from "@/lib/useTrialStatus";
import SymptomCard from "@/components/symptom-tracker/SymptomCard";
import SymptomSelectorModal from "@/components/symptom-tracker/SymptomSelectorModal";
import LogSymptomModal from "@/components/symptom-tracker/LogSymptomModal";
import AnalyticsSection from "@/components/symptom-tracker/AnalyticsSection";
import WeekSummary from "@/components/symptom-tracker/WeekSummary";
import RecentLogs from "@/components/symptom-tracker/RecentLogs";
import PersonalizedGreeting from "@/components/symptom-tracker/PersonalizedGreeting";
import BadDaySupport from "@/components/symptom-tracker/BadDaySupport";
import EmptyState from "@/components/symptom-tracker/EmptyState";
import MilestoneCelebration from "@/components/symptom-tracker/MilestoneCelebration";
import ProgressComparison from "@/components/symptom-tracker/ProgressComparison";
import DoctorReportButton from "@/components/symptom-tracker/DoctorReportButton";
import type { Symptom, LogSymptomData, SymptomLog } from "@/lib/symptom-tracker-constants";

export const dynamic = "force-dynamic";

export default function SymptomsPage() {
  const router = useRouter();
  const trialStatus = useTrialStatus();
  const { symptoms, loading: symptomsLoading, refetch: refetchSymptoms } =
    useSymptoms();
  const { logs, loading: logsLoading, refetch: refetchLogs } =
    useSymptomLogs(30);
  const [selectedSymptom, setSelectedSymptom] = useState<Symptom | null>(null);
  const [editingLog, setEditingLog] = useState<SymptomLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Redirect to dashboard if trial is expired
  if (!trialStatus.loading && trialStatus.expired) {
    router.replace("/dashboard");
    return null;
  }

  // Get top 6 symptoms (favorites first, then defaults, then others)
  const getTopSymptoms = () => {
    const defaultSymptoms = symptoms.filter((s) => s.is_default);
    return defaultSymptoms.slice(0, 6);
  };

  const topSymptoms = getTopSymptoms();

  // Get last logged time for each symptom
  const getLastLoggedTime = (symptomId: string): string | null => {
    const symptomLogs = logs.filter((log) => log.symptom_id === symptomId);
    if (symptomLogs.length === 0) return null;
    // Sort by logged_at descending and get the most recent
    const sorted = [...symptomLogs].sort((a, b) => 
      new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
    );
    return sorted[0].logged_at;
  };

  // Quick log handler - auto-log as moderate (severity 2)
  const handleQuickLog = useCallback(
    async (symptom: Symptom) => {
      try {
        const response = await fetch("/api/symptom-logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symptomId: symptom.id,
            severity: 2, // Moderate
            triggers: [],
            notes: "",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to quick log symptom");
        }

        // Refetch logs and symptoms
        await Promise.all([refetchLogs(), refetchSymptoms()]);
        
        // Dispatch custom event to notify AnalyticsSection to refresh
        window.dispatchEvent(new CustomEvent('symptom-log-updated'));
      } catch (error) {
        console.error("Quick log error:", error);
        // On error, fall back to opening modal
        handleSymptomClick(symptom);
      }
    },
    [refetchLogs, refetchSymptoms]
  );

  // Handle symptom card click
  const handleSymptomClick = (symptom: Symptom) => {
    setSelectedSymptom(symptom);
    setIsModalOpen(true);
  };

  // Handle modal close
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
          throw new Error(errorData.error || `Failed to ${isEditing ? "update" : "save"} symptom log`);
        }

        // Refetch logs and symptoms
        await Promise.all([refetchLogs(), refetchSymptoms()]);
        
        // Dispatch custom event to notify AnalyticsSection to refresh
        window.dispatchEvent(new CustomEvent('symptom-log-updated'));
      } catch (error) {
        throw error;
      }
    },
    [refetchLogs, refetchSymptoms]
  );

  // Show loading state while checking trial status
  if (trialStatus.loading) {
    return (
      <div className="mx-auto max-w-7xl p-6 sm:p-8 space-y-8">
        <div className="animate-pulse">
          <div className="h-10 w-64 bg-[#333333] rounded mb-4" />
          <div className="h-6 w-96 bg-[#333333] rounded mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-[#242424] rounded-2xl" />
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
    <div className="mx-auto max-w-7xl p-6 sm:p-8 space-y-8 min-h-screen bg-[#FDF8F6]">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#D4A5A5]">
            Daily Check-in
          </h1>
        </div>
        <div className="flex gap-3">
          <DoctorReportButton />
          <button
            onClick={() => {
              setIsSelectorOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-dark text-white font-semibold rounded-xl transition-colors shadow-md cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            Add Symptom
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Personalized Greeting */}
        <PersonalizedGreeting />

        {/* Bad Day Support */}
        <BadDaySupport />

        {/* Empty State */}
        <EmptyState />

        {/* Title */}
        <div>
          <h2 className="text-2xl font-semibold text-[#8B7E74] mb-2">
            How are you feeling?
          </h2>
        </div>

        {/* Quick Log Grid */}
        {symptomsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-2xl h-20 border border-[#E8E0DB]"
              />
            ))}
          </div>
        ) : topSymptoms.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {topSymptoms.map((symptom) => (
                <SymptomCard
                  key={symptom.id}
                  symptom={symptom}
                  onClick={() => handleSymptomClick(symptom)}
                  lastLoggedAt={getLastLoggedTime(symptom.id)}
                  onQuickLog={() => handleQuickLog(symptom)}
                />
              ))}
            </div>
            {symptoms.length > 6 && (
              <div className="text-center">
                <button
                  onClick={() => {
                    // Could navigate to full list page or show all in modal
                    // For now, just show a message
                    alert("View all symptoms feature coming soon!");
                  }}
                  className="text-[#D4A5A5] hover:text-[#C49494] text-sm font-medium transition-colors cursor-pointer"
                >
                  View All Symptoms
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-[#E8E0DB] bg-white p-12 text-center">
            <p className="text-[#6B6B6B]">No symptoms available</p>
            <p className="text-sm text-[#9A9A9A] mt-2">
              Default symptoms will be created when you first log in.
            </p>
          </div>
        )}

        {/* Analytics Section */}
        <section>
          <AnalyticsSection />
        </section>

        {/* Progress Comparison */}
        <section>
          <ProgressComparison />
        </section>

        {/* Week Summary */}
        <section>
          <WeekSummary />
        </section>

        {/* Recent Logs */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[#8B7E74]">Recent</h2>
          </div>
          <RecentLogs logs={logs} loading={logsLoading} onLogClick={handleLogClick} />
        </section>
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

      {/* Log Symptom Modal */}
      {selectedSymptom && (
        <LogSymptomModal
          symptom={selectedSymptom}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleSaveLog}
          editingLog={editingLog}
        />
      )}

      {/* Milestone Celebrations */}
      <MilestoneCelebration />
    </div>
  );
}
