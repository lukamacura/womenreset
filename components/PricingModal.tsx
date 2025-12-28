
"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, Lock } from "lucide-react";
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
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      />
      
      {/* Modal Content */}
      <div
        className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Header */}
        <div className="p-6 lg:p-8 border-b border-gray-200">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2">
            Unlock Lisa&apos;s Full Power
          </h2>
          {header.urgency && (
            <div className="mt-3">
              <p className="text-lg font-semibold text-orange-600 mb-1">{header.urgency}</p>
              {header.subtitle && (
                <p className="text-sm text-gray-600">{header.subtitle}</p>
              )}
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Monthly Plan */}
            <div className="relative rounded-xl border-2 border-gray-200 bg-white p-6 hover:border-gray-300 transition-colors">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Monthly</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-gray-900">$9</span>
                  <span className="text-lg text-gray-600">per month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Billed monthly</p>
              </div>
              <button
                onClick={() => handlePlanSelect("monthly")}
                className="w-full px-6 py-3 rounded-lg font-semibold text-sm border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Choose Monthly
              </button>
            </div>

            {/* Annual Plan - Highlighted */}
            <div className="relative rounded-xl border-2 border-[#ff74b1] bg-linear-to-br from-[#ff74b1]/5 to-[#ff74b1]/10 p-6 hover:border-primary-dark transition-colors scale-105 shadow-lg" style={{ borderWidth: '3px' }}>
              {/* Best Value Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-[#ff74b1] text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  ⭐ BEST VALUE
                </span>
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Annual</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-gray-900">$70</span>
                  <span className="text-lg text-gray-600">per year</span>
                </div>
                <div className="mt-2">
                  <p className="text-lg font-semibold text-gray-900">$5.83/mo</p>
                  <p className="text-sm font-semibold text-green-600 mt-1">Save 35%</p>
                </div>
              </div>
              <button
                onClick={() => handlePlanSelect("annual")}
                className="w-full px-6 py-3 rounded-lg font-semibold text-sm bg-[#ff74b1] text-white hover:bg-primary-dark transition-colors"
              >
                Choose Annual
              </button>
            </div>
          </div>

          {/* Features List */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Both plans include:
            </h4>
            <ul className="space-y-3">
              {[
                "Unlimited symptom tracking",
                "Unlimited Lisa conversations",
                "AI pattern detection & insights",
                "Doctor-ready PDF reports",
                "Weekly progress summaries",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
              <Lock className="h-4 w-4" />
              7-day money-back guarantee
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render using portal to ensure it's at the root level
  if (typeof window === "undefined") return null;
  return createPortal(modalContent, document.body);
}

