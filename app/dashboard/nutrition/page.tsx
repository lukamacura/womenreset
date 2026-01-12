"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ForkKnifeCrossed, Zap } from "lucide-react";
import AddNutritionModal from "@/components/nutrition/AddNutritionModal";
import QuickAddModal from "@/components/nutrition/QuickAddModal";
import NutritionList, { type Nutrition } from "@/components/nutrition/NutritionList";
import NutritionStats from "@/components/nutrition/NutritionStats";
import NutritionCharts from "@/components/nutrition/NutritionCharts";
import MealTracker from "@/components/nutrition/MealTracker";
import AnalyticsSection from "@/components/nutrition/AnalyticsSection";
import HydrationCounter from "@/components/nutrition/HydrationCounter";
import NutritionGreeting from "@/components/nutrition/NutritionGreeting";
import { useTrialStatus } from "@/lib/useTrialStatus";
import { useNotification } from "@/hooks/useNotification";
import { AnimatedSection, Skeleton } from "@/components/ui/AnimatedComponents";

export const dynamic = "force-dynamic";

type DateRange = 7 | 30 | 90;

export default function NutritionPage() {
  const router = useRouter();
  const trialStatus = useTrialStatus();
  const { show: showNotification, showSuccess, showError: showErrorNotification } = useNotification();
  const [nutrition, setNutrition] = useState<Nutrition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Nutrition | null>(null);
  const [preselectedMealType, setPreselectedMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack" | null>(null);
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

  // Show welcome notification for first-time users
  useEffect(() => {
    if (isLoading || nutrition.length > 0) return;
    
    // Check if user has any nutrition logs (even from previous days)
    const hasAnyLogs = nutrition.length > 0;
    
    if (!hasAnyLogs) {
      // Delay notification slightly to let page settle
      const timer = setTimeout(() => {
        showNotification("welcome", "Welcome to Fuel Check!", {
          message: "Track how food fuels (or drains) your body. Log meals and see patterns Lisa finds.",
          showOnce: true,
          primaryAction: {
            label: "Got it",
            action: () => {},
          },
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, nutrition.length, showNotification]);

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
      showSuccess("Entry deleted");
      // Refresh the page to ensure all data is up to date
      router.refresh();
      // Also refetch nutrition data
      fetchNutrition();
      // Dispatch event for components that listen
      window.dispatchEvent(new CustomEvent('nutrition-log-updated'));
    } catch (err) {
      showErrorNotification("Couldn't delete", err instanceof Error ? err.message : "Failed to delete nutrition entry");
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
    setPreselectedMealType(null);
  };

  // Handle modal success
  const handleModalSuccess = (entry: Nutrition) => {
    if (editingEntry) {
      handleNutritionUpdated(entry);
      showSuccess("Entry updated");
    } else {
      handleNutritionAdded(entry);
      showSuccess("Food logged");
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
      <div className="mx-auto max-w-7xl p-6 sm:p-8 space-y-8 min-h-screen bg-background">
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
    <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 text-[17px] sm:text-[18px] min-h-screen" >
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between opacity-0 animate-[fadeInDown_0.6s_ease-out_forwards]">
        <div className="flex-1">
          {/* Personalized Greeting is now the header */}
          <NutritionGreeting />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
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

      {/* Meal Tracker & Hydration Counter */}
      <AnimatedSection delay={100} duration={500}>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MealTracker
            onMealClick={(mealType, existingEntry) => {
              if (existingEntry) {
                // If meal already logged, open for editing
                handleEditNutrition(existingEntry);
              } else {
                // Open modal with meal type pre-selected
                setEditingEntry(null);
                setPreselectedMealType(mealType);
                setIsModalOpen(true);
              }
            }}
          />
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
        initialMealType={preselectedMealType}
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

