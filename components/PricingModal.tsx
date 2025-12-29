
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Lock, Zap, Crown, Sparkles } from "lucide-react";
import type { TrialState } from "./TrialCard";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialState: TrialState;
  timeRemaining?: string;
  symptomCount?: number;
  patternCount?: number;
}

export function PricingModal({
  isOpen,
  onClose,
  trialState,
  timeRemaining,
  symptomCount = 0,
  patternCount = 0,
}: PricingModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual" | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<"monthly" | "annual" | null>(null);
  const [showContent, setShowContent] = useState(false);

  // Inject animation styles on mount (client-side only to prevent hydration issues)
  useEffect(() => {
    if (typeof document === "undefined") return;

    // Check if styles already exist
    if (document.getElementById("pricing-modal-animations")) return;

    const style = document.createElement("style");
    style.id = "pricing-modal-animations";
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.9;
          transform: scale(1.05);
        }
      }

      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }

      @keyframes float {
        0%, 100% {
          transform: translateY(0px);
          opacity: 0.3;
        }
        50% {
          transform: translateY(-15px);
          opacity: 0.6;
        }
      }

      @keyframes glow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(255, 116, 177, 0.5);
        }
        50% {
          box-shadow: 0 0 20px rgba(255, 116, 177, 0.8), 0 0 30px rgba(192, 132, 252, 0.6);
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Prevent body scroll when modal is open + staggered content reveal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Delay content reveal for smooth entrance
      const contentTimer = setTimeout(() => setShowContent(true), 100);
      return () => {
        clearTimeout(contentTimer);
      };
    } else {
      document.body.style.overflow = "";
      // Move state update out of the effect
      setTimeout(() => setShowContent(false), 0);
    }
  }, [isOpen]);
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!isOpen) return null;

  const handlePlanSelect = (plan: "monthly" | "annual") => {
    // Placeholder: Log selection or show toast
    console.log(`Selected plan: ${plan}`);
    // TODO: When Stripe is integrated, redirect to checkout
    alert(`Payment system coming soon! You selected the ${plan} plan.`);
  };

  const getModalHeader = () => {
    if (trialState === "urgent" && timeRemaining) {
      return {
        urgency: `⏰ Your trial ends in ${timeRemaining}`,
        subtitle: `Upgrade now to keep your ${symptomCount} symptom logs and ${patternCount} patterns Lisa discovered.`,
      };
    }
    if (trialState === "expired") {
      return {
        urgency: "Your trial has ended",
        subtitle: "Your data is safe for 30 days. Upgrade to unlock everything and see what Lisa found.",
      };
    }
    return {
      urgency: null,
      subtitle: null,
    };
  };

  const header = getModalHeader();

  const modalContent = (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      style={{
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          opacity: showContent ? 1 : 0,
        }}
      />

      {/* Modal Content */}
      <div
        className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto transition-all duration-500 ease-out"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: showContent ? "scale(1) translateY(0)" : "scale(0.95) translateY(20px)",
          opacity: showContent ? 1 : 0,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors z-20"
          aria-label="Close modal"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>

        {/* Header */}
        <div
          className="p-3 sm:p-4 border-b border-gray-100 transition-all duration-500"
          style={{
            opacity: showContent ? 1 : 0,
            transform: showContent ? "translateY(0)" : "translateY(-20px)",
          }}
        >
          <div className="text-center">
            <h2
              className="text-xl sm:text-3xl font-extrabold mb-0.5 transition-all duration-700"
              style={{
                background: "linear-gradient(135deg, #1f2937 0%, #4b5563 50%, #1f2937 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Unlock Lisa&apos;s Full Power
            </h2>
            <p className="text-gray-600 text-md">
              Join thousands of women taking control of their health
            </p>
          </div>
          {header.urgency && (
            <div className="mt-2 p-2 rounded-lg bg-linear-to-r from-orange-50 to-red-50 border border-orange-200">
              <p className="text-xs sm:text-sm font-bold text-orange-700 text-center">{header.urgency}</p>
              {header.subtitle && (
                <p className="text-xs text-gray-700 text-center mt-0.5">{header.subtitle}</p>
              )}
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="p-3 sm:p-4 pb-16">{/* Extra bottom padding for fixed notification */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 items-end">
            {/* Monthly Plan - Yellow Theme */}
            <div
              className="relative rounded-xl p-3 cursor-pointer transition-all duration-500 ease-out group overflow-hidden flex flex-col"
              style={{
                background: hoveredPlan === "monthly" || selectedPlan === "monthly"
                  ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)"
                  : "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                border: selectedPlan === "monthly" ? "2px solid #f59e0b" : "2px solid #fbbf24",
                transform: hoveredPlan === "monthly" ? "scale(1.02) translateY(-2px)" : "scale(1)",
                boxShadow: hoveredPlan === "monthly" || selectedPlan === "monthly"
                  ? "0 12px 24px rgba(251, 191, 36, 0.3)"
                  : "0 6px 12px rgba(251, 191, 36, 0.15)",
                opacity: showContent ? 1 : 0,
                transitionDelay: "200ms",
              }}
              onMouseEnter={() => setHoveredPlan("monthly")}
              onMouseLeave={() => setHoveredPlan(null)}
              onClick={() => setSelectedPlan("monthly")}
            >
              {/* Shimmer effect on hover */}
              {hoveredPlan === "monthly" && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                    animation: "shimmer 1.5s infinite",
                  }}
                />
              )}
              {/* Icon */}
              <div className="flex items-center justify-between mb-2">
                <div
                  className="p-2 rounded-lg transition-all duration-300"
                  style={{
                    background: hoveredPlan === "monthly" || selectedPlan === "monthly"
                      ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)"
                      : "#fbbf24",
                    transform: hoveredPlan === "monthly" ? "rotate(10deg) scale(1.1)" : "rotate(0deg) scale(1)",
                  }}
                >
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                {selectedPlan === "monthly" && (
                  <div className="animate-in zoom-in duration-300">
                    <div className="p-1.5 rounded-full bg-green-500">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-3 flex-1">
                <h3 className="text-lg sm:text-3xl font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
                  Monthly
                  <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">Flexible</span>
                </h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className="text-3xl sm:text-4xl font-extrabold transition-all duration-300"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    $12
                  </span>
                  <span className="text-base sm:text-lg text-gray-700 font-medium">/month</span>
                </div>
                <p className="text-xs text-gray-600 font-medium">Billed monthly • Cancel anytime</p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlanSelect("monthly");
                }}
                className="w-full px-4 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-lg transition-all duration-300 transform hover:scale-105 relative overflow-hidden group"
                style={{
                  background: hoveredPlan === "monthly"
                    ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                    : "#fbbf24",
                  color: "#ffffff",
                  boxShadow: hoveredPlan === "monthly"
                    ? "0 10px 25px rgba(251, 191, 36, 0.4)"
                    : "0 4px 12px rgba(251, 191, 36, 0.2)",
                }}
              >
                <span className="relative z-10">Choose Monthly</span>
                {hoveredPlan === "monthly" && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                      animation: "shimmer 1s infinite",
                    }}
                  />
                )}
              </button>
            </div>

            {/* Annual Plan - Blue/Pink Gradient */}
            <div
              className="relative rounded-xl p-3 cursor-pointer transition-all duration-500 ease-out group overflow-hidden flex flex-col"
              style={{
                background: hoveredPlan === "annual" || selectedPlan === "annual"
                  ? "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 25%, #fce7f3 75%, #fce7f3 100%)"
                  : "linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fdf2f8 100%)",
                border: selectedPlan === "annual" ? "2px solid #ff74b1" : "2px solid #c084fc",
                transform: hoveredPlan === "annual" ? "scale(1.03) translateY(-3px)" : "scale(1.01)",
                boxShadow: hoveredPlan === "annual" || selectedPlan === "annual"
                  ? "0 15px 30px rgba(192, 132, 252, 0.4)"
                  : "0 8px 16px rgba(192, 132, 252, 0.2)",
                opacity: showContent ? 1 : 0,
                transitionDelay: "300ms",
              }}
              onMouseEnter={() => setHoveredPlan("annual")}
              onMouseLeave={() => setHoveredPlan(null)}
              onClick={() => setSelectedPlan("annual")}
            >
              {/* Shimmer effect on hover */}
              {hoveredPlan === "annual" && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                    animation: "shimmer 1.5s infinite",
                  }}
                />
              )}

              {/* Floating particles effect */}
              {hoveredPlan === "annual" && (
                <>
                  <div
                    className="absolute w-2 h-2 rounded-full bg-white/40"
                    style={{
                      top: "20%",
                      left: "10%",
                      animation: "float 3s ease-in-out infinite",
                    }}
                  />
                  <div
                    className="absolute w-1.5 h-1.5 rounded-full bg-white/30"
                    style={{
                      top: "60%",
                      right: "15%",
                      animation: "float 2.5s ease-in-out infinite 0.5s",
                    }}
                  />
                </>
              )}
              {/* Best Value Badge - Now inside card */}
              <div
                className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1 shadow-lg transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #ff74b1 0%, #c084fc 100%)",
                  animation: hoveredPlan === "annual" ? "pulse 2s infinite" : "none",
                }}
              >
                <Crown className="w-3 h-3" />
                SAVE 45%
              </div>

              {/* Icon */}
              <div className="flex items-center justify-between mb-2">
                <div
                  className="p-2 rounded-lg transition-all duration-300"
                  style={{
                    background: hoveredPlan === "annual" || selectedPlan === "annual"
                      ? "linear-gradient(135deg, #ff74b1 0%, #c084fc 100%)"
                      : "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)",
                    transform: hoveredPlan === "annual" ? "rotate(-10deg) scale(1.1)" : "rotate(0deg) scale(1)",
                  }}
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                {selectedPlan === "annual" && (
                  <div className="animate-in zoom-in duration-300">
                    <div className="p-1.5 rounded-full bg-green-500">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-3 flex-1">
                <h3 className="text-lg sm:text-3xl font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
                  Annual
                  <span className="text-sm font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "linear-gradient(135deg, #ff74b1 0%, #c084fc 100%)" }}>
                    Popular
                  </span>
                </h3>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span
                    className="text-3xl sm:text-4xl font-extrabold transition-all duration-300"
                    style={{
                      background: "linear-gradient(135deg, #ff74b1 0%, #c084fc 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    $79
                  </span>
                  <span className="text-base sm:text-lg text-gray-700 font-medium">/year</span>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="text-lg sm:text-xl font-bold"
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    $6.58/mo
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                    Save $65/yr
                  </span>
                </div>
                <p className="text-xs text-gray-600 font-medium">Billed annually • Best value</p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlanSelect("annual");
                }}
                className="w-full px-4 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-lg text-white transition-all duration-300 transform hover:scale-105 relative overflow-hidden group"
                style={{
                  background: hoveredPlan === "annual"
                    ? "linear-gradient(135deg, #d946ef 0%, #a855f7 100%)"
                    : "linear-gradient(135deg, #ff74b1 0%, #c084fc 100%)",
                  boxShadow: hoveredPlan === "annual"
                    ? "0 12px 30px rgba(255, 116, 177, 0.6), 0 0 20px rgba(168, 85, 247, 0.3)"
                    : "0 6px 15px rgba(255, 116, 177, 0.3)",
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4" />
                  Choose Annual - Save 45%
                </span>
                {hoveredPlan === "annual" && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                      animation: "shimmer 1s infinite",
                    }}
                  />
                )}
              </button>
            </div>
          </div>

          {/* Features List */}
          <div className="border-t border-gray-200 pt-3 sm:pt-4">
            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 text-center">
              ✨ Everything Included
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { text: "Unlimited symptom tracking", gradient: "from-blue-500 to-cyan-500" },
                { text: "Unlimited Lisa conversations", gradient: "from-purple-500 to-pink-500" },
                { text: "AI pattern detection & insights", gradient: "from-amber-500 to-orange-500" },
                { text: "Doctor-ready PDF reports", gradient: "from-green-500 to-emerald-500" },
                { text: "Weekly progress summaries", gradient: "from-rose-500 to-pink-500" },
                { text: "Priority customer support", gradient: "from-indigo-500 to-purple-500" },
              ].map((feature, index) => (
                <li
                  key={feature.text}
                  className="flex items-start gap-2 p-2 rounded-lg bg-linear-to-br from-gray-50 to-white hover:shadow-sm transition-all duration-300"
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                  }}
                >
                  <div className={`p-1 rounded-md bg-linear-to-br ${feature.gradient} shrink-0`}>
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-800 font-medium text-xs sm:text-sm">{feature.text}</span>
                </li>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-green-50 to-emerald-50 border border-green-200">
                <Lock className="h-4 w-4 text-green-600" />
                <span className="text-xs sm:text-sm font-bold text-green-700">
                  7-Day Money-Back Guarantee
                </span>
              </div>
              <p className="text-xs text-gray-600 text-center max-w-md">
                Try risk-free. Full refund within 7 days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render using portal to ensure it's at the root level
  if (typeof window === "undefined") return null;
  return createPortal(modalContent, document.body);
}

