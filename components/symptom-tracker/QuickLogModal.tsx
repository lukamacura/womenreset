"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SEVERITY_LABELS, TRIGGER_OPTIONS } from "@/lib/symptom-tracker-constants";
import type { Symptom, LogSymptomData, SymptomLog } from "@/lib/symptom-tracker-constants";
import { getIconFromName } from "@/lib/symptomIconMapping";
import { getSuggestedTriggers, getRemainingTriggers } from "@/lib/triggerSuggestions";

interface QuickLogModalProps {
  symptom: Symptom;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LogSymptomData) => Promise<void>;
  allLogs?: SymptomLog[]; // Optional: all logs for trigger suggestions
}

export default function QuickLogModal({
  symptom,
  isOpen,
  onClose,
  onSave,
  allLogs = [],
}: QuickLogModalProps) {
  const [severity, setSeverity] = useState(2); // Default to Moderate
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1); // Step 1 = severity, 2 = time, 3 = triggers, 4 = notes
  
  // Details state
  const [timeSelection, setTimeSelection] = useState<'now' | 'earlier-today' | 'yesterday'>('now');
  const [customTime, setCustomTime] = useState<string>("");
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [customTrigger, setCustomTrigger] = useState("");
  const [showCustomTriggerInput, setShowCustomTriggerInput] = useState(false);

  // Ensure we're mounted before rendering portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSeverity(2);
      setCurrentStep(1);
      setTimeSelection('now');
      setCustomTime("");
      setSelectedTriggers([]);
      setNotes("");
      setCustomTrigger("");
      setShowCustomTriggerInput(false);
      setError(null);
    }
  }, [isOpen]);

  // Get icon component
  const SymptomIcon = useMemo(() => {
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
    };
    
    const iconName = iconMap[symptom.name];
    if (iconName) {
      return getIconFromName(iconName);
    }
    
    if (symptom.icon && symptom.icon.length > 1 && !symptom.icon.includes('🔥') && !symptom.icon.includes('💧')) {
      return getIconFromName(symptom.icon);
    }
    
    return getIconFromName('Activity');
  }, [symptom.icon, symptom.name]);

  // Get suggested triggers
  const suggestedTriggers = useMemo(() => {
    if (allLogs.length === 0) return [];
    return getSuggestedTriggers(symptom.id, allLogs, 3);
  }, [symptom.id, allLogs]);

  // Get remaining triggers
  const remainingTriggers = useMemo(() => {
    return getRemainingTriggers(suggestedTriggers);
  }, [suggestedTriggers]);

  if (!isOpen || !mounted) return null;

  // Handle backdrop click to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Calculate logged_at timestamp
  const getLoggedAtTimestamp = (): string | undefined => {
    const now = new Date();
    
    if (timeSelection === 'now') {
      return undefined; // API will use current time
    }
    
    if (timeSelection === 'earlier-today') {
      if (customTime) {
        const [hours, minutes] = customTime.split(':').map(Number);
        const logTime = new Date(now);
        logTime.setHours(hours, minutes, 0, 0);
        return logTime.toISOString();
      }
      const logTime = new Date(now);
      logTime.setHours(logTime.getHours() - 2);
      return logTime.toISOString();
    }
    
    if (timeSelection === 'yesterday') {
      const logTime = new Date(now);
      logTime.setDate(logTime.getDate() - 1);
      if (customTime) {
        const [hours, minutes] = customTime.split(':').map(Number);
        logTime.setHours(hours, minutes, 0, 0);
      } else {
        logTime.setHours(now.getHours(), now.getMinutes(), 0, 0);
      }
      return logTime.toISOString();
    }
    
    return undefined;
  };

  // Handle trigger click
  const handleTriggerClick = (trigger: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedTriggers((prev) => {
      if (prev.includes(trigger)) {
        return prev.filter((t) => t !== trigger);
      } else {
        return [...prev, trigger];
      }
    });
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  // Handle save (quick log or with details)
  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const loggedAt = currentStep > 1 ? getLoggedAtTimestamp() : undefined;

      await onSave({
        symptomId: symptom.id,
        severity: severity,
        triggers: currentStep >= 3 ? selectedTriggers : [],
        notes: currentStep === 4 ? notes : "",
        loggedAt,
      });

      // Reset form
      setSeverity(2);
      setCurrentStep(1);
      setTimeSelection('now');
      setCustomTime("");
      setSelectedTriggers([]);
      setNotes("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save symptom log");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Severity" },
    { number: 2, title: "When" },
    { number: 3, title: "Triggers" },
    { number: 4, title: "Notes" },
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer"
      onClick={handleBackdropClick}
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        style={{ background: 'linear-gradient(to bottom, #DBEAFE, #FEF3C7, #FCE7F3)' }}
      />
      
      <div
        className="relative bg-white/30 backdrop-blur-lg rounded-2xl w-full max-w-xl mx-4 shadow-xl border border-white/30 cursor-default overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-4 border-b border-white/30">
          <div className="flex items-center gap-3">
            <SymptomIcon className="h-6 w-6 text-[#3D3D3D]" />
            <h2 className="text-xl font-semibold text-[#3D3D3D]">
              {symptom.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#9A9A9A] hover:text-[#3D3D3D] transition-colors cursor-pointer"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step Indicator (only show when in details mode) */}
          {currentStep > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/30 -mx-6 -mt-6 mb-6">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all
                        ${
                          currentStep === step.number
                            ? "bg-[#ff74b1] text-white shadow-lg scale-110"
                            : currentStep > step.number
                            ? "bg-green-500 text-white"
                            : "bg-white/40 text-[#6B6B6B] border border-white/30"
                        }`}
                    >
                      {currentStep > step.number ? <Check className="h-4 w-4" /> : step.number}
                    </div>
                    <span className="text-xs mt-1 text-[#6B6B6B] hidden sm:block">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 transition-all
                        ${currentStep > step.number ? "bg-green-500" : "bg-white/30"}
                      `}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Severity (always shown) */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <label className="text-[#3D3D3D] text-lg mb-4 block font-semibold">
                    How bad?
                  </label>
            <div className="flex gap-3 justify-center">
              {[1, 2, 3].map((level) => {
                const severityInfo = SEVERITY_LABELS[level as keyof typeof SEVERITY_LABELS];
                const SeverityIconComponent = severityInfo.icon;
                const isSelected = severity === level;
                const borderColor = level === 1 
                  ? 'border-green-500' 
                  : level === 2 
                  ? 'border-yellow-500' 
                  : 'border-red-500';
                const bgColor = level === 1 
                  ? 'bg-green-50/50' 
                  : level === 2 
                  ? 'bg-yellow-50/50' 
                  : 'bg-red-50/50';
                const iconColor = level === 1 
                  ? 'text-green-600' 
                  : level === 2 
                  ? 'text-yellow-600' 
                  : 'text-red-600';
                
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSeverity(level);
                    }}
                    className={`flex flex-col items-center gap-2 px-5 py-4 rounded-xl transition-all cursor-pointer border-2
                      ${
                        isSelected
                          ? `${borderColor} ${bgColor} scale-[1.02] shadow-sm`
                          : "border-white/30 bg-white/60 hover:bg-white/80 hover:border-white/40"
                      }`}
                  >
                    <SeverityIconComponent className={`h-7 w-7 ${iconColor}`} />
                    <span className={`font-medium text-sm ${isSelected ? 'text-[#3D3D3D]' : 'text-[#6B6B6B]'}`}>
                      {severityInfo.label}
                    </span>
                  </button>
                );
              })}
            </div>
                </div>
              </motion.div>
            )}

          {/* Step 2: Time Selection */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <label className="text-[#3D3D3D] text-lg mb-4 block font-semibold">
                  When?
                </label>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTimeSelection('now');
                      setCustomTime("");
                    }}
                    className={`px-4 py-3 rounded-xl text-left transition-all cursor-pointer text-base
                      ${
                        timeSelection === 'now'
                          ? "bg-[#ff74b1] text-white shadow-md"
                          : "bg-white/60 text-[#3D3D3D] hover:bg-white/80 border border-white/30"
                      }`}
                  >
                    Just now {timeSelection === 'now' && '✓'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeSelection('earlier-today')}
                    className={`px-4 py-3 rounded-xl text-left transition-all cursor-pointer text-base
                      ${
                        timeSelection === 'earlier-today'
                          ? "bg-[#ff74b1] text-white shadow-md"
                          : "bg-white/60 text-[#3D3D3D] hover:bg-white/80 border border-white/30"
                      }`}
                  >
                    Earlier today {timeSelection === 'earlier-today' && '✓'}
                  </button>
                  {timeSelection === 'earlier-today' && (
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-4 px-4 py-2 rounded-xl border border-white/30 text-base bg-white/60 backdrop-blur-md
                               focus:outline-none focus:ring-2 focus:ring-[#ff74b1]"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setTimeSelection('yesterday')}
                    className={`px-4 py-3 rounded-xl text-left transition-all cursor-pointer text-base
                      ${
                        timeSelection === 'yesterday'
                          ? "bg-[#ff74b1] text-white shadow-md"
                          : "bg-white/60 text-[#3D3D3D] hover:bg-white/80 border border-white/30"
                      }`}
                  >
                    Yesterday {timeSelection === 'yesterday' && '✓'}
                  </button>
                  {timeSelection === 'yesterday' && (
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-4 px-4 py-2 rounded-xl border border-white/30 text-base bg-white/60 backdrop-blur-md
                               focus:outline-none focus:ring-2 focus:ring-[#ff74b1]"
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Triggers */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <label className="text-[#3D3D3D] text-lg mb-4 block font-semibold">
                  Triggers (optional):
                </label>
                
                {/* Suggested Triggers */}
                {suggestedTriggers.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-[#6B6B6B] mb-2">
                      Suggested (based on your patterns):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTriggers.map((trigger) => (
                        <button
                          key={trigger}
                          type="button"
                          onClick={(e) => handleTriggerClick(trigger, e)}
                          className={`px-4 py-2 rounded-full text-base font-medium transition-all cursor-pointer
                            ${
                              selectedTriggers.includes(trigger)
                                ? "bg-[#ff74b1] text-white shadow-md"
                                : "bg-white/60 text-[#3D3D3D] hover:bg-white/80 border border-white/30"
                            }`}
                        >
                          {trigger}
                          {selectedTriggers.includes(trigger) && " ✓"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Triggers */}
                {remainingTriggers.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-[#6B6B6B] mb-2">
                      Other:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {remainingTriggers.map((trigger) => (
                        <button
                          key={trigger}
                          type="button"
                          onClick={(e) => handleTriggerClick(trigger, e)}
                          className={`px-4 py-2 rounded-full text-base transition-all cursor-pointer
                            ${
                              selectedTriggers.includes(trigger)
                                ? "bg-[#ff74b1] text-white shadow-md"
                                : "bg-white/60 text-[#3D3D3D] hover:bg-white/80 border border-white/30"
                            }`}
                        >
                          {trigger}
                          {selectedTriggers.includes(trigger) && " ✓"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Trigger */}
                <div className="mt-4">
                  {!showCustomTriggerInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomTriggerInput(true)}
                      className="px-4 py-2 rounded-full text-base text-[#ff74b1] hover:text-primary-dark hover:bg-white/60 transition-colors cursor-pointer border border-[#ff74b1]/50 bg-white/40"
                    >
                      + Custom
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customTrigger}
                        onChange={(e) => setCustomTrigger(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customTrigger.trim()) {
                            e.preventDefault();
                            if (!selectedTriggers.includes(customTrigger.trim())) {
                              setSelectedTriggers([...selectedTriggers, customTrigger.trim()]);
                            }
                            setCustomTrigger("");
                            setShowCustomTriggerInput(false);
                          }
                        }}
                        placeholder="Enter custom trigger"
                        className="flex-1 px-4 py-2 rounded-xl border border-white/30 text-base bg-white/60 backdrop-blur-md
                                 focus:outline-none focus:ring-2 focus:ring-[#ff74b1]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customTrigger.trim() && !selectedTriggers.includes(customTrigger.trim())) {
                            setSelectedTriggers([...selectedTriggers, customTrigger.trim()]);
                          }
                          setCustomTrigger("");
                          setShowCustomTriggerInput(false);
                        }}
                        className="px-4 py-2 bg-[#ff74b1] text-white rounded-xl hover:bg-primary-dark transition-colors cursor-pointer text-base"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Notes */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <label className="text-[#3D3D3D] text-lg mb-4 block font-semibold">
                  Note (optional):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Was in a meeting when it hit..."
                  rows={4}
                  className="w-full bg-white/60 backdrop-blur-md text-[#3D3D3D] rounded-xl p-4 text-base 
                           placeholder-[#9A9A9A]
                           focus:outline-none focus:ring-2 focus:ring-[#ff74b1] border border-white/30 resize-none"
                />
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-lg border border-[#ff74b1]/30 bg-[#ff74b1]/10 p-3 text-sm text-[#ff74b1]">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {currentStep === 1 ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="w-full bg-[#ff74b1] hover:bg-primary-dark text-white 
                           font-semibold py-4 rounded-xl transition-colors cursor-pointer
                           disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg"
                >
                  {isSubmitting ? "Logging..." : "Log it"}
                </button>

                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-full text-[#ff74b1] hover:text-primary-dark 
                           font-medium py-3 rounded-xl transition-colors cursor-pointer text-base
                           bg-white/40 backdrop-blur-md border border-white/30 flex items-center justify-center gap-2"
                  type="button"
                >
                  <ChevronDown className="h-4 w-4" />
                  + Add details
                </button>
              </>
            ) : (
              <>
                <div className="flex gap-3">
                  <button
                    onClick={handlePrevious}
                    className="flex-1 bg-white/40 backdrop-blur-md border border-white/30 text-[#6B6B6B] 
                             hover:text-[#3D3D3D] font-medium py-3 rounded-xl transition-colors cursor-pointer 
                             flex items-center justify-center gap-2"
                    type="button"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                  {currentStep < 4 && (
                    <button
                      onClick={handleNext}
                      className="flex-1 bg-white/40 backdrop-blur-md border border-white/30 text-[#ff74b1] 
                               hover:text-primary-dark font-semibold py-3 rounded-xl transition-colors cursor-pointer
                               flex items-center justify-center gap-2"
                      type="button"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className={`${currentStep < 4 ? 'flex-1' : 'flex-1'} bg-[#ff74b1] hover:bg-primary-dark text-white 
                             font-semibold py-3 rounded-xl transition-colors cursor-pointer
                             disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSubmitting ? "Logging..." : "Log it"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render to document body using portal
  return createPortal(modalContent, document.body);
}
