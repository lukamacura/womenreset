"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import AddSymptomModal from "@/components/symptoms/AddSymptomModal";
import SymptomList, { type Symptom } from "@/components/symptoms/SymptomList";
import SymptomStats from "@/components/symptoms/SymptomStats";
import SymptomCharts from "@/components/symptoms/SymptomCharts";
import { useTrialStatus } from "@/lib/useTrialStatus";

export const dynamic = "force-dynamic";

type DateRange = 7 | 30 | 90;

export default function SymptomsPage() {
  const router = useRouter();
  const trialStatus = useTrialStatus();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSymptom, setEditingSymptom] = useState<Symptom | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(30);

  // Redirect to dashboard if trial is expired
  useEffect(() => {
    if (!trialStatus.loading && trialStatus.expired) {
      router.replace("/dashboard");
    }
  }, [trialStatus.expired, trialStatus.loading, router]);

  // Fetch symptoms
  const fetchSymptoms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/symptoms", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch symptoms");
      }

      const { data } = await response.json();
      setSymptoms(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSymptoms();
  }, [fetchSymptoms]);

  // Handle new symptom added/updated
  const handleSymptomAdded = (symptom: Symptom) => {
    if (editingSymptom) {
      setSymptoms((prev) => prev.map((s) => (s.id === symptom.id ? symptom : s)));
      setEditingSymptom(null);
    } else {
      setSymptoms((prev) => [symptom, ...prev]);
    }
    setIsModalOpen(false);
  };

  // Handle symptom edit
  const handleSymptomEdit = (symptom: Symptom) => {
    setEditingSymptom(symptom);
    setIsModalOpen(true);
  };

  // Handle symptom deleted
  const handleSymptomDeleted = async (id: string) => {
    try {
      const response = await fetch(`/api/symptoms?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete symptom");
      }

      setSymptoms((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete symptom");
    }
  };

  // Filter symptoms by date range for display
  const getFilteredSymptoms = () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - dateRange);
    startDate.setHours(0, 0, 0, 0);

    return symptoms.filter((s) => {
      const occurredAt = new Date(s.occurred_at);
      return occurredAt >= startDate;
    });
  };

  const filteredSymptoms = getFilteredSymptoms();

  // Get recent symptoms for list (last 30 days, max 50)
  const getRecentSymptoms = () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    return symptoms
      .filter((s) => {
        const occurredAt = new Date(s.occurred_at);
        return occurredAt >= startDate;
      })
      .slice(0, 50);
  };

  const recentSymptoms = getRecentSymptoms();

  // Show loading state while checking trial status
  if (trialStatus.loading) {
    return (
      <div className="mx-auto max-w-7xl p-6 sm:p-8 space-y-8">
        <div className="animate-pulse">
          <div className="h-10 w-64 bg-foreground/10 rounded mb-4" />
          <div className="h-6 w-96 bg-foreground/10 rounded mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-foreground/10 rounded-xl" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-foreground/10 rounded-xl" />
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
    <div className="mx-auto max-w-7xl p-6 sm:p-8 space-y-8 text-[17px] sm:text-[18px]">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Symptom Tracker
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            Track how you are feeling over time.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary inline-flex justify-center items-center gap-2 cursor-pointer px-5 py-2.5 text-lg shadow-md hover:translate-y-px"
        >
          <Activity className="h-5 w-5" />
          Add symptom
        </button>
      </header>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-error/30 bg-error/10 p-4"
        >
          <div className="font-semibold text-error text-lg">Error</div>
          <p className="mt-1 text-base text-error/90">{error}</p>
          <button
            onClick={fetchSymptoms}
            className="mt-4 inline-flex items-center rounded-lg bg-foreground/10 px-3 py-2 text-base hover:bg-foreground/15"
          >
            Try again
          </button>
        </div>
      )}

      {/* Stats Section */}
      <section>
        <SymptomStats
          symptoms={symptoms}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </section>

      {/* Charts Section */}
      <section>
        <SymptomCharts symptoms={filteredSymptoms} dateRange={dateRange} />
      </section>

      {/* Log/List Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Entries</h2>
          <span className="text-sm text-muted-foreground">
            Showing last 30 days
          </span>
        </div>
        <SymptomList
          symptoms={recentSymptoms}
          onDelete={handleSymptomDeleted}
          onEdit={handleSymptomEdit}
          isLoading={isLoading}
        />
      </section>

      {/* Bottom padding for scroll animations */}
      <div className="h-32" />

      {/* Add/Edit Symptom Modal */}
      <AddSymptomModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSymptom(null);
        }}
        onSuccess={handleSymptomAdded}
        editingEntry={editingSymptom}
      />
    </div>
  );
}

