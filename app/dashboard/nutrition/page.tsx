"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ForkKnifeCrossed, Zap } from "lucide-react";
import AddNutritionModal from "@/components/nutrition/AddNutritionModal";
import QuickAddModal from "@/components/nutrition/QuickAddModal";
import NutritionList, { type Nutrition } from "@/components/nutrition/NutritionList";
import NutritionStats from "@/components/nutrition/NutritionStats";
import NutritionCharts from "@/components/nutrition/NutritionCharts";
import WeekSummary from "@/components/nutrition/WeekSummary";
import AnalyticsSection from "@/components/nutrition/AnalyticsSection";
import HydrationCounter from "@/components/nutrition/HydrationCounter";
import { useTrialStatus } from "@/lib/useTrialStatus";
import { AnimatedSection, Skeleton } from "@/components/ui/AnimatedComponents";

export const dynamic = "force-dynamic";

type DateRange = 7 | 30 | 90;

export default function NutritionPage() {
  const router = useRouter();
  const trialStatus = useTrialStatus();
  const [nutrition, setNutrition] = useState<Nutrition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
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
    // Dispatch custom event for components that listen
    window.dispatchEvent(new CustomEvent('nutrition-log-updated'));
  };

  // Handle quick modal success
  const handleQuickModalSuccess = () => {
    fetchNutrition();
    // Dispatch custom event for components that listen
    window.dispatchEvent(new CustomEvent('nutrition-log-updated'));
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
      <div className="mx-auto max-w-7xl p-6 sm:p-8 space-y-8 min-h-screen" style={{ background: 'linear-gradient(to bottom, #DBEAFE 0%, #FEF3C7 50%, #FCE7F3 100%)' }}>
        <div className="space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton
                key={i}
                className="h-20"
                style={{
                  animationDelay: `${i * 100}ms`
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
    <div className="mx-auto max-w-7xl p-6 sm:p-8 space-y-8 text-[17px] sm:text-[18px] min-h-screen" style={{ background: 'linear-gradient(to bottom, #DBEAFE 0%, #FEF3C7 50%, #FCE7F3 100%)' }}>
      {/* Header */}
      <AnimatedSection delay={0} duration={500}>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Fuel Check
            </h1>
            <p className="text-base text-muted-foreground mt-1">
              See how food fuels (or drains) your body
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsQuickModalOpen(true)}
              className="btn-primary inline-flex font-bold text-lg justify-center items-center gap-2 cursor-pointer px-5 py-2.5 shadow-md hover:translate-y-px transition-all duration-200"
            >
              <Zap className="h-5 w-5" />
              Quick Add
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary inline-flex font-bold text-lg justify-center items-center gap-2 cursor-pointer px-5 py-2.5 shadow-md hover:translate-y-px transition-all duration-200"
            >
              <ForkKnifeCrossed className="h-5 w-5" />
              Log food
            </button>
          </div>
        </header>
      </AnimatedSection>

      {/* Error State */}
      {error && (
        <AnimatedSection delay={100} duration={400}>
          <div
            role="alert"
            className="rounded-xl border border-error/30 bg-error/10 p-4"
          >
            <div className="font-semibold text-error text-lg">Error</div>
            <p className="mt-1 text-base text-error/90">{error}</p>
            <button
              onClick={fetchNutrition}
              className="mt-4 inline-flex items-center rounded-lg bg-foreground/10 px-3 py-2 text-base hover:bg-foreground/15 transition-colors duration-200"
            >
              Try again
            </button>
          </div>
        </AnimatedSection>
      )}

      {/* Week Summary & Hydration Counter */}
      <AnimatedSection delay={100} duration={500}>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WeekSummary />
          <HydrationCounter />
        </section>
      </AnimatedSection>

      {/* Analytics Section */}
      <AnimatedSection delay={150} duration={500}>
        <section>
          <AnalyticsSection />
        </section>
      </AnimatedSection>

      {/* Stats Section */}
      <AnimatedSection delay={0} duration={500}>
        <section>
          <NutritionStats
            nutrition={nutrition}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </section>
      </AnimatedSection>

      {/* Charts Section */}
      <AnimatedSection delay={0} duration={500}>
        <section>
          <NutritionCharts nutrition={filteredNutrition} dateRange={dateRange} />
        </section>
      </AnimatedSection>

      {/* Log/List Section */}
      <AnimatedSection delay={0} duration={500}>
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
      </AnimatedSection>

      {/* Bottom padding for scroll animations */}
      <div className="h-32" />

      {/* Add/Edit Nutrition Modal */}
      <AddNutritionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingEntry={editingEntry}
      />

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
        onSuccess={handleQuickModalSuccess}
      />
    </div>
  );
}

