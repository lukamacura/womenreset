"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ForkKnifeCrossed } from "lucide-react";
import AddNutritionModal from "@/components/nutrition/AddNutritionModal";
import NutritionList, { type Nutrition } from "@/components/nutrition/NutritionList";
import NutritionStats from "@/components/nutrition/NutritionStats";
import NutritionCharts from "@/components/nutrition/NutritionCharts";
import { useTrialStatus } from "@/lib/useTrialStatus";

export const dynamic = "force-dynamic";

type DateRange = 7 | 30 | 90;

export default function NutritionPage() {
  const router = useRouter();
  const trialStatus = useTrialStatus();
  const [nutrition, setNutrition] = useState<Nutrition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Nutrition | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(30);

  // Redirect to dashboard if trial is expired
  useEffect(() => {
    if (!trialStatus.loading && trialStatus.expired) {
      router.replace("/dashboard");
    }
  }, [trialStatus.expired, trialStatus.loading, router]);

  // Fetch nutrition entries
  const fetchNutrition = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/nutrition", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch nutrition entries");
      }

      const { data } = await response.json();
      setNutrition(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNutrition();
  }, [fetchNutrition]);

  // Handle new nutrition entry added
  const handleNutritionAdded = (newEntry: Nutrition) => {
    setNutrition((prev) => [newEntry, ...prev]);
  };

  // Handle nutrition entry updated
  const handleNutritionUpdated = (updatedEntry: Nutrition) => {
    setNutrition((prev) =>
      prev.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry))
    );
  };

  // Handle nutrition entry deleted
  const handleNutritionDeleted = async (id: string) => {
    try {
      const response = await fetch(`/api/nutrition?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete nutrition entry");
      }

      setNutrition((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete nutrition entry");
    }
  };

  // Handle edit nutrition entry
  const handleEditNutrition = (entry: Nutrition) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  // Handle modal success
  const handleModalSuccess = (entry: Nutrition) => {
    if (editingEntry) {
      handleNutritionUpdated(entry);
    } else {
      handleNutritionAdded(entry);
    }
    handleModalClose();
  };

  // Filter nutrition entries by date range for display
  const getFilteredNutrition = () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - dateRange);
    startDate.setHours(0, 0, 0, 0);

    return nutrition.filter((n) => {
      const consumedAt = new Date(n.consumed_at);
      return consumedAt >= startDate;
    });
  };

  const filteredNutrition = getFilteredNutrition();

  // Get recent nutrition entries for list (last 30 days, max 50)
  const getRecentNutrition = () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    return nutrition
      .filter((n) => {
        const consumedAt = new Date(n.consumed_at);
        return consumedAt >= startDate;
      })
      .slice(0, 50);
  };

  const recentNutrition = getRecentNutrition();

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
            Nutrition Tracker
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            Track your meals and nutrition over time.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex font-bold text-lg justify-center items-center gap-2 rounded-lg bg-linear-to-r from-orange-500 to-rose-500 cursor-pointer px-5 py-2.5 text-white shadow-md transition-all hover:bg-primary/90 hover:translate-y-px"
        >
          <ForkKnifeCrossed className="h-5 w-5" />
          Add meal
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
            onClick={fetchNutrition}
            className="mt-4 inline-flex items-center rounded-lg bg-foreground/10 px-3 py-2 text-base hover:bg-foreground/15"
          >
            Try again
          </button>
        </div>
      )}

      {/* Stats Section */}
      <section>
        <NutritionStats
          nutrition={nutrition}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </section>

      {/* Charts Section */}
      <section>
        <NutritionCharts nutrition={filteredNutrition} dateRange={dateRange} />
      </section>

      {/* Log/List Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Entries</h2>
          <span className="text-sm text-muted-foreground">
            Showing last 30 days
          </span>
        </div>
        <NutritionList
          nutrition={recentNutrition}
          onDelete={handleNutritionDeleted}
          onEdit={handleEditNutrition}
          isLoading={isLoading}
        />
      </section>

      {/* Add/Edit Nutrition Modal */}
      <AddNutritionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingEntry={editingEntry}
      />
    </div>
  );
}

