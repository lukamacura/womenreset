"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity } from "lucide-react";
import AddSymptomModal from "@/components/symptoms/AddSymptomModal";
import SymptomList, { type Symptom } from "@/components/symptoms/SymptomList";
import SymptomStats from "@/components/symptoms/SymptomStats";
import SymptomCharts from "@/components/symptoms/SymptomCharts";

export const dynamic = "force-dynamic";

type DateRange = 7 | 30 | 90;

export default function SymptomsPage() {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(30);

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

  // Handle new symptom added
  const handleSymptomAdded = (newSymptom: Symptom) => {
    setSymptoms((prev) => [newSymptom, ...prev]);
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
          className="inline-flex justify-center items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-lg font-bold text-white shadow-md transition-all hover:bg-primary/90 hover:translate-y-px"
        >
          <Activity className="h-5 w-5" />
          Add symptom
        </button>
      </header>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4"
        >
          <div className="font-semibold text-rose-300 text-lg">Error</div>
          <p className="mt-1 text-base text-rose-200/90">{error}</p>
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
          isLoading={isLoading}
        />
      </section>

      {/* Add Symptom Modal */}
      <AddSymptomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSymptomAdded}
      />
    </div>
  );
}

