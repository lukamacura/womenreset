"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Trash2 } from "lucide-react";
import type { SymptomLog } from "@/lib/symptom-tracker-constants";
import { SEVERITY_LABELS } from "@/lib/symptom-tracker-constants";
import { formatDateSimple } from "@/lib/dateUtils";
import { getIconFromName } from "@/lib/symptomIconMapping";

interface RecentLogsProps {
  logs: SymptomLog[];
  loading?: boolean;
  onLogClick?: (log: SymptomLog) => void;
  onDelete?: (log: SymptomLog) => void;
}

export default function RecentLogs({ logs, loading, onLogClick, onDelete }: RecentLogsProps) {
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

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-foreground/10 bg-white p-4"
          >
            <div className="h-5 w-48 bg-foreground/10 rounded mb-3" />
            <div className="h-4 w-32 bg-foreground/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-white p-12 text-center">
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
          No symptoms logged yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Start tracking your symptoms to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.slice(0, 10).map((log, index) => {
        const { dateStr, timeStr } = formatDateSimple(log.logged_at);
        const symptomName = log.symptoms?.name || "Unknown";
        const symptomIconName = log.symptoms?.icon || "Activity";

        // Map symptom names to icon names (prioritize name mapping for unique icons)
        const iconMap: Record<string, string> = {
          'Hot flashes': 'Flame',
          'Night sweats': 'Droplet',
          'Fatigue': 'Zap',
          'Brain fog': 'Brain',
          'Mood swings': 'Heart',
          'Anxiety': 'AlertCircle',
          'Headaches': 'AlertTriangle',
          'Joint pain': 'Activity',
          'Bloating': 'CircleDot',
          'Insomnia': 'Moon',
          'Weight gain': 'TrendingUp',
          'Low libido': 'HeartOff',
          'Good Day': 'Sun',
        };

        // Try to get icon by symptom name first (ensures unique icons)
        const iconName = iconMap[symptomName];
        let SymptomIcon;
        if (iconName) {
          SymptomIcon = getIconFromName(iconName);
        } else if (symptomIconName && symptomIconName.length > 1 && !symptomIconName.includes('🔥') && !symptomIconName.includes('💧')) {
          SymptomIcon = getIconFromName(symptomIconName);
        } else {
          SymptomIcon = getIconFromName('Activity');
        }

        return (
          <AnimatedListItem key={log.id} index={index} itemId={log.id}>
            <div
              className="group rounded-xl border border-white/30 bg-white/30 backdrop-blur-md p-4 transition-colors hover:border-white/50 hover:bg-white/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onLogClick?.(log)}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <SymptomIcon className="h-5 w-5 text-foreground shrink-0" />
                    <h3 className="text-base font-semibold text-foreground truncate">
                      {symptomName}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {(() => {
                        const severityInfo = SEVERITY_LABELS[log.severity as keyof typeof SEVERITY_LABELS];
                        const SeverityIcon = severityInfo?.icon;
                        if (!SeverityIcon) return null;
                        return (
                          <SeverityIcon 
                            className={`h-4 w-4 ${
                              log.severity === 1 
                                ? 'text-green-500' 
                                : log.severity === 2 
                                ? 'text-yellow-500' 
                                : 'text-red-500'
                            }`} 
                          />
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{dateStr}</span>
                    {dateStr === "Today" && <span>•</span>}
                    {dateStr === "Today" && <span>{timeStr}</span>}
                  </div>
                  {log.triggers && log.triggers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {log.triggers.map((trigger) => (
                        <span
                          key={trigger}
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200"
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>
                  )}
                  {log.notes && (
                    <p className="mt-2 text-sm text-foreground/80 line-clamp-2">
                      {log.notes}
                    </p>
                  )}
                </div>
                {onDelete && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(log);
                      }}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary-light/50 hover:text-primary-dark"
                      aria-label="Delete symptom log"
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
  );
}

