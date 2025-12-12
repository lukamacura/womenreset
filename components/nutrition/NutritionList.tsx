"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Trash2, Sunrise, Sun, Moon, Cookie } from "lucide-react";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";

export type Nutrition = {
  id: string;
  food_item: string;
  meal_type: string;
  calories: number | null;
  notes: string | null;
  consumed_at: string;
  created_at: string;
  updated_at: string;
};

type NutritionListProps = {
  nutrition: Nutrition[];
  onDelete?: (id: string) => void;
  onEdit?: (nutrition: Nutrition) => void;
  isLoading?: boolean;
};

export default function NutritionList({
  nutrition,
  onDelete,
  onEdit,
  isLoading = false,
}: NutritionListProps) {
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    id: string | null;
    name: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    id: null,
    name: "",
    isLoading: false,
  });

  const handleDeleteClick = (entry: Nutrition) => {
    setDeleteDialog({
      isOpen: true,
      id: entry.id,
      name: entry.food_item,
      isLoading: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id || !onDelete) return;

    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      await onDelete(deleteDialog.id);
      setDeleteDialog({ isOpen: false, id: null, name: "", isLoading: false });
    } catch {
      setDeleteDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

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

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case "breakfast":
        return <Sunrise className="h-4 w-4 text-orange-600" />;
      case "lunch":
        return <Sun className="h-4 w-4 text-blue-600" />;
      case "dinner":
        return <Moon className="h-4 w-4 text-purple-600" />;
      case "snack":
        return <Cookie className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  // Global map to track which items have animated (persists across re-renders)
  const animatedItemsMap = useRef<Set<string>>(new Set());

  // Animated List Item Component - memoized to prevent unnecessary re-renders
  const AnimatedListItem = memo(function AnimatedListItem({
    children,
    index,
    itemId,
  }: {
    children: React.ReactNode;
    index: number;
    itemId: string;
  }) {
    const [isVisible, setIsVisible] = useState(() => animatedItemsMap.current.has(itemId));
    const itemRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasSetupRef = useRef(false);

    useEffect(() => {
      // If already animated, skip setup
      if (animatedItemsMap.current.has(itemId) || hasSetupRef.current) {
        return;
      }

      const currentRef = itemRef.current;
      if (!currentRef) return;

      hasSetupRef.current = true;

      // Check if element is already in viewport on mount
      const checkViewport = () => {
        const rect = currentRef.getBoundingClientRect();
        return rect.top < window.innerHeight + 50 && rect.bottom > -50;
      };

      const triggerAnimation = () => {
        if (animatedItemsMap.current.has(itemId)) return;
        
        animatedItemsMap.current.add(itemId);
        setIsVisible(true);
        
        // Clean up will-change after animation completes
        const delay = 500 + index * 80;
        cleanupTimeoutRef.current = setTimeout(() => {
          if (itemRef.current) {
            itemRef.current.style.willChange = "auto";
          }
        }, delay);
      };

      if (checkViewport()) {
        // Animate immediately if already in view
        triggerAnimation();
        return;
      }

      // Create observer only once
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !animatedItemsMap.current.has(itemId)) {
              triggerAnimation();
              // Immediately disconnect observer to prevent retriggering
              if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
              }
            }
          });
        },
        {
          threshold: 0.01,
          rootMargin: "50px 0px 50px 0px",
        }
      );

      observerRef.current.observe(currentRef);

      return () => {
        if (cleanupTimeoutRef.current) {
          clearTimeout(cleanupTimeoutRef.current);
        }
        if (observerRef.current && currentRef) {
          observerRef.current.unobserve(currentRef);
          observerRef.current = null;
        }
        hasSetupRef.current = false;
      };
    }, [itemId, index]); // Include itemId and index in deps

    const delay = isVisible ? index * 80 : 0;

    return (
      <div
        ref={itemRef}
        className={`transition-all duration-500 ease-out ${!isVisible ? "will-change-transform" : ""}`}
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translate3d(0, 0, 0)" : "translate3d(0, 24px, 0)",
          transitionDelay: `${delay}ms`,
        }}
      >
        {children}
      </div>
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-foreground/10 bg-background/60 p-4"
          >
            <div className="h-5 w-48 bg-foreground/10 rounded mb-3" />
            <div className="h-4 w-32 bg-foreground/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (nutrition.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-background/60 p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-foreground/5">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          No nutrition entries logged yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Start tracking your meals to see patterns over time.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {nutrition.map((entry, index) => {
          const { date, time } = formatDateTime(entry.consumed_at);
          const mealTypeColor = getMealTypeColor(entry.meal_type);
          const mealTypeLabel = formatMealType(entry.meal_type);

          return (
            <AnimatedListItem key={entry.id} index={index} itemId={entry.id}>
              <div
                className="group rounded-xl border border-foreground/10 bg-background/60 p-4 transition-colors hover:border-foreground/20"
              >
            <div className="flex items-start justify-between gap-4">
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onEdit?.(entry)}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="text-base font-semibold text-foreground truncate">
                    {entry.food_item}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${mealTypeColor}`}
                    >
                      {getMealTypeIcon(entry.meal_type)}
                      {mealTypeLabel}
                    </span>
                    {entry.calories !== null && (
                      <span className="text-xs text-muted-foreground font-medium">
                        {entry.calories} cal
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{date}</span>
                  <span>•</span>
                  <span>{time}</span>
                </div>
                {entry.notes && (
                  <p className="mt-2 text-sm text-foreground/80 line-clamp-2">
                    {entry.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              {onDelete && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(entry);
                    }}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary-light/50 hover:text-primary-dark"
                    aria-label="Delete nutrition entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
              </div>
            </AnimatedListItem>
          );
        })}
      </div>

      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, id: null, name: "", isLoading: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Nutrition Entry?"
        message="Are you sure you want to delete this nutrition entry? This action cannot be undone."
        itemName={deleteDialog.name}
        isLoading={deleteDialog.isLoading}
      />
    </>
  );
}

