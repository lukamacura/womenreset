"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Trash2, Edit2, Smile, Meh, Frown } from "lucide-react";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";

export type Symptom = {
  id: string;
  name: string;
  severity: number;
  notes: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
};

type SymptomListProps = {
  symptoms: Symptom[];
  onDelete?: (id: string) => void;
  onEdit?: (symptom: Symptom) => void;
  isLoading?: boolean;
};

export default function SymptomList({
  symptoms,
  onDelete,
  onEdit,
  isLoading = false,
}: SymptomListProps) {
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

  const handleDeleteClick = (symptom: Symptom) => {
    setDeleteDialog({
      isOpen: true,
      id: symptom.id,
      name: symptom.name,
      isLoading: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id || !onDelete) return;

    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      await onDelete(deleteDialog.id);
      setDeleteDialog({ isOpen: false, id: null, name: "", isLoading: false });
    } catch (err) {
      setDeleteDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity <= 3) return "bg-green-500/20 text-green-700";
    if (severity <= 6) return "bg-yellow-500/20 text-yellow-700";
    return "bg-red-500/20 text-red-700";
  };

  const getSeverityLabel = (severity: number) => {
    if (severity <= 3) return "Low";
    if (severity <= 6) return "Medium";
    return "High";
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

  if (symptoms.length === 0) {
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          No symptoms logged yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Start tracking your symptoms to see patterns over time.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {symptoms.map((symptom, index) => {
          const { date, time } = formatDateTime(symptom.occurred_at);
          const severityColor = getSeverityColor(symptom.severity);
          const severityLabel = getSeverityLabel(symptom.severity);

          return (
            <AnimatedListItem key={symptom.id} index={index} itemId={symptom.id}>
              <div
                className="group rounded-xl border border-foreground/10 bg-background/60 p-4 transition-colors hover:border-foreground/20"
              >
            <div className="flex items-start justify-between gap-4">
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onEdit?.(symptom)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-semibold text-foreground truncate">
                    {symptom.name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${severityColor}`}
                  >
                    {symptom.severity <= 3 && (
                      <Smile className="h-3.5 w-3.5" />
                    )}
                    {symptom.severity > 3 && symptom.severity <= 6 && (
                      <Meh className="h-3.5 w-3.5" />
                    )}
                    {symptom.severity > 6 && (
                      <Frown className="h-3.5 w-3.5" />
                    )}
                    {severityLabel}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{date}</span>
                  <span>•</span>
                  <span>{time}</span>
                </div>
                {symptom.notes && (
                  <p className="mt-2 text-sm text-foreground/80 line-clamp-2">
                    {symptom.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              {onDelete && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(symptom);
                    }}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary-light/50 hover:text-primary-dark"
                    aria-label="Delete symptom"
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
        title="Delete Symptom?"
        message="Are you sure you want to delete this symptom? This action cannot be undone."
        itemName={deleteDialog.name}
        isLoading={deleteDialog.isLoading}
      />
    </>
  );
}

