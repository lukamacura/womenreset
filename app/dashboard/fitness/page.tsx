"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";
import AddFitnessModal from "@/components/fitness/AddFitnessModal";
import FitnessList, { type Fitness } from "@/components/fitness/FitnessList";
import FitnessStats from "@/components/fitness/FitnessStats";
import FitnessCharts from "@/components/fitness/FitnessCharts";
import { useTrialStatus } from "@/lib/useTrialStatus";

export const dynamic = "force-dynamic";

type DateRange = 7 | 30 | 90;

export default function FitnessPage() {
  const router = useRouter();
  const trialStatus = useTrialStatus();
  const [fitness, setFitness] = useState<Fitness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Fitness | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(30);

  // Redirect to dashboard if trial is expired
  useEffect(() => {
    if (!trialStatus.loading && trialStatus.expired) {
      router.replace("/dashboard");
    }
  }, [trialStatus.expired, trialStatus.loading, router]);

  // Fetch fitness entries
  const fetchFitness = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/fitness", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch fitness entries");
      }

      const { data } = await response.json();
      setFitness(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchFitness();
  }, [fetchFitness]);

  // Handle new fitness entry added
  const handleFitnessAdded = (newEntry: Fitness) => {
    setFitness((prev) => [newEntry, ...prev]);
  };

  // Handle fitness entry updated
  const handleFitnessUpdated = (updatedEntry: Fitness) => {
    setFitness((prev) =>
      prev.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry))
    );
  };

  // Handle fitness entry deleted
  const handleFitnessDeleted = async (id: string) => {
    try {
      const response = await fetch(`/api/fitness?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete fitness entry");
      }

      setFitness((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete fitness entry");
    }
  };

  // Handle edit fitness entry
  const handleEditFitness = (entry: Fitness) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  // Handle modal success
  const handleModalSuccess = (entry: Fitness) => {
    if (editingEntry) {
      handleFitnessUpdated(entry);
    } else {
      handleFitnessAdded(entry);
    }
    handleModalClose();
  };

  // Filter fitness entries by date range for display
  const getFilteredFitness = () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - dateRange);
    startDate.setHours(0, 0, 0, 0);

    return fitness.filter((f) => {
      const performedAt = new Date(f.performed_at);
      return performedAt >= startDate;
    });
  };

  const filteredFitness = getFilteredFitness();

  // Get recent fitness entries for list (last 30 days, max 50)
  const getRecentFitness = () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    return fitness
      .filter((f) => {
        const performedAt = new Date(f.performed_at);
        return performedAt >= startDate;
      })
      .slice(0, 50);
  };

  const recentFitness = getRecentFitness();

  // Show loading state while checking trial status
  if (trialStatus.loading) {
    return (
      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
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
            Fitness Tracker
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            Track your workouts and exercise over time.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary inline-flex items-center gap-2 cursor-pointer px-5 py-2.5 text-lg justify-center font-bold shadow-md hover:translate-y-px"
        >
          <Dumbbell className="h-5 w-5" />
          Add workout
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
            onClick={fetchFitness}
            className="mt-4 inline-flex items-center rounded-lg bg-foreground/10 px-3 py-2 text-base hover:bg-foreground/15"
          >
            Try again
          </button>
        </div>
      )}

      {/* Stats Section */}
      <section>
        <FitnessStats
          fitness={fitness}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </section>

      {/* Charts Section */}
      <section>
        <FitnessCharts fitness={filteredFitness} dateRange={dateRange} />
      </section>

      {/* Log/List Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Entries</h2>
          <span className="text-sm text-muted-foreground">
            Showing last 30 days
          </span>
        </div>
        <FitnessList
          fitness={recentFitness}
          onDelete={handleFitnessDeleted}
          onEdit={handleEditFitness}
          isLoading={isLoading}
        />
      </section>

      {/* Add/Edit Fitness Modal */}
      <AddFitnessModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingEntry={editingEntry}
      />
    </div>
  );
}

