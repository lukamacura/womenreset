"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SITE_URL, AUTH_CALLBACK_PATH } from "@/lib/constants";
import {
  Flame,
  Moon,
  Brain,
  Heart,
  Scale,
  Battery,
  AlertCircle,
  Bone,
  ArrowRight,
  ArrowLeft,
  Mail,
  CheckCircle2,
  Loader2,
} from "lucide-react";

type Step = "q1_problems" | "q2_severity" | "q3_timing" | "q4_tried" | "q5_doctor" | "q6_goal" | "q7_name";

const STEPS: Step[] = ["q1_problems", "q2_severity", "q3_timing", "q4_tried", "q5_doctor", "q6_goal", "q7_name"];

// Question options with Lucide icons
const PROBLEM_OPTIONS = [
  { id: "hot_flashes", label: "Hot flashes / Night sweats", icon: Flame },
  { id: "sleep_issues", label: "Can't sleep well", icon: Moon },
  { id: "brain_fog", label: "Brain fog / Memory issues", icon: Brain },
  { id: "mood_swings", label: "Mood swings / Irritability", icon: Heart },
  { id: "weight_changes", label: "Weight changes", icon: Scale },
  { id: "low_energy", label: "Low energy / Fatigue", icon: Battery },
  { id: "anxiety", label: "Anxiety", icon: AlertCircle },
  { id: "joint_pain", label: "Joint pain", icon: Bone },
];

const SEVERITY_OPTIONS = [
  { id: "mild", label: "Mild - Annoying but manageable" },
  { id: "moderate", label: "Moderate - Affecting my work/relationships" },
  { id: "severe", label: "Severe - I'm struggling every day" },
];

const TIMING_OPTIONS = [
  { id: "just_started", label: "Just started (0-6 months)" },
  { id: "been_while", label: "Been a while (6-12 months)" },
  { id: "over_year", label: "Over a year" },
  { id: "several_years", label: "Several years" },
];

const TRIED_OPTIONS = [
  { id: "nothing", label: "Nothing yet" },
  { id: "supplements", label: "Supplements / Vitamins" },
  { id: "diet", label: "Diet changes" },
  { id: "exercise", label: "Exercise" },
  { id: "hrt", label: "HRT / Medication" },
  { id: "doctor_talk", label: "Talked to doctor" },
  { id: "apps", label: "Apps / Tracking" },
];

const DOCTOR_OPTIONS = [
  { id: "yes_actively", label: "Yes, actively" },
  { id: "yes_not_helpful", label: "Yes, but they're not helpful" },
  { id: "no_planning", label: "No, planning to" },
  { id: "no_natural", label: "No, prefer natural approaches" },
];

const GOAL_OPTIONS = [
  { id: "sleep_through_night", label: "Sleep through the night", icon: Moon },
  { id: "think_clearly", label: "Think clearly again", icon: Brain },
  { id: "feel_like_myself", label: "Feel like myself", icon: Heart },
  { id: "understand_patterns", label: "Understand my patterns", icon: Scale },
  { id: "data_for_doctor", label: "Have data for my doctor", icon: CheckCircle2 },
  { id: "get_body_back", label: "Get my body back", icon: Battery },
];

type Phase = "quiz" | "email" | "email-sent";

export default function RegisterPage() {
  const router = useRouter();

  // Always start with quiz
  const [phase, setPhase] = useState<Phase>("quiz");
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];

  // Quiz answers - stored in state
  const [topProblems, setTopProblems] = useState<string[]>([]);
  const [severity, setSeverity] = useState<string>("");
  const [timing, setTiming] = useState<string>("");
  const [triedOptions, setTriedOptions] = useState<string[]>([]);
  const [doctorStatus, setDoctorStatus] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");

  // Email state
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = emailValid && !loading;

  // Check if current step is answered
  const stepIsAnswered = useCallback((step: Step) => {
    switch (step) {
      case "q1_problems":
        return topProblems.length === 2;
      case "q2_severity":
        return severity !== "";
      case "q3_timing":
        return timing !== "";
      case "q4_tried":
        return triedOptions.length > 0;
      case "q5_doctor":
        return doctorStatus !== "";
      case "q6_goal":
        return goal !== "";
      case "q7_name":
        return firstName.trim().length > 0;
      default:
        return false;
    }
  }, [topProblems, severity, timing, triedOptions, doctorStatus, goal, firstName]);

  const goNext = useCallback(() => {
    if (!stepIsAnswered(currentStep)) return;
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      // Quiz complete - move to email phase
      setPhase("email");
    }
  }, [currentStep, stepIndex, stepIsAnswered]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  }, [stepIndex]);

  const toggleProblem = (problemId: string) => {
    setTopProblems((prev) => {
      if (prev.includes(problemId)) {
        return prev.filter((id) => id !== problemId);
      }
      if (prev.length >= 2) {
        return prev;
      }
      return [...prev, problemId];
    });
  };

  const toggleTriedOption = (optionId: string) => {
    setTriedOptions((prev) => {
      if (prev.includes(optionId)) {
        return prev.filter((id) => id !== optionId);
      }
      return [...prev, optionId];
    });
  };

  // Save quiz answers to localStorage when moving to email phase
  const saveQuizAnswers = useCallback(() => {
    const quizAnswers = {
      top_problems: topProblems,
      severity: severity,
      timing: timing,
      tried_options: triedOptions,
      doctor_status: doctorStatus,
      goal: goal,
      name: firstName.trim() || null,
    };
    localStorage.setItem("pending_quiz_answers", JSON.stringify(quizAnswers));
  }, [topProblems, severity, timing, triedOptions, doctorStatus, goal, firstName]);

  // When quiz is complete, save and move to email
  useEffect(() => {
    if (phase === "email" && stepIndex === STEPS.length - 1) {
      saveQuizAnswers();
    }
  }, [phase, stepIndex, saveQuizAnswers]);

  // Handle email submission
  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setLoading(true);

    try {
      const redirectTo = `${SITE_URL}${AUTH_CALLBACK_PATH}?next=/register`;
      
      console.log("Register: SITE_URL:", SITE_URL);
      console.log("Register: AUTH_CALLBACK_PATH:", AUTH_CALLBACK_PATH);
      console.log("Register: Attempting signInWithOtp with redirectTo:", redirectTo);
      console.log("Register: Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      // Validate redirect URL format
      try {
        new URL(redirectTo);
        console.log("Register: Redirect URL is valid");
      } catch (urlError) {
        console.error("Register: Invalid redirect URL format:", urlError);
        setError("Configuration error: Invalid redirect URL format. Please contact support.");
        setLoading(false);
        return;
      }
      
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signInError) {
        console.error("Register: Supabase error:", signInError);
        console.error("Register: Error message:", signInError.message);
        console.error("Register: Error status:", signInError.status);
        console.error("Register: Full error object:", JSON.stringify(signInError, null, 2));
        
        // Default to showing the actual error message
        let friendly = signInError.message || "An error occurred. Please try again.";
        
        // Check for redirect URL errors FIRST (most common issue)
        const lowerMessage = signInError.message.toLowerCase();
        if (
          lowerMessage.includes("redirect") || 
          lowerMessage.includes("redirect_to") ||
          lowerMessage.includes("redirect url") ||
          lowerMessage.includes("allowed values") ||
          lowerMessage.includes("not allowed") ||
          lowerMessage.includes("invalid redirect") ||
          lowerMessage.includes("redirect_to must") ||
          signInError.status === 400 ||
          signInError.status === 422
        ) {
          friendly = `Redirect URL configuration error: ${signInError.message}. Please verify Supabase redirect URLs include: ${redirectTo}`;
        } else if (signInError.message.includes("rate limit") || signInError.message.includes("too many")) {
          friendly = "Too many attempts - please wait a moment and try again.";
        } else if (
          // Only show invalid email if it's explicitly about email format validation
          (lowerMessage.includes("email") && 
           (lowerMessage.includes("format") || 
            lowerMessage.includes("malformed") || 
            lowerMessage.includes("invalid email") ||
            lowerMessage.includes("email address"))) &&
          !lowerMessage.includes("redirect")
        ) {
          friendly = "That email address is invalid. Please check and try again.";
        }
        // Otherwise, show the actual error message
        
        setError(friendly);
        setLoading(false);
        return;
      }

      console.log("Register: Magic link sent successfully");
      // Success - show email sent message
      setPhase("email-sent");
      setLoading(false);
    } catch (e) {
      console.error("Register: Exception:", e);
      setError(e instanceof Error ? e.message : "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Auto-save profile when user returns from magic link
  useEffect(() => {
    let mounted = true;

    async function checkAndSaveProfile() {
      // Wait a bit for session to be available
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!mounted) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingProfile) {
        // Profile exists - redirect to dashboard
        router.replace("/dashboard");
        return;
      }

      // No profile - check for quiz answers
      const storedAnswers = localStorage.getItem("pending_quiz_answers");
      if (!storedAnswers) return;

      // Save profile
      try {
        const quizAnswers = JSON.parse(storedAnswers);
        const res = await fetch("/api/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            name: quizAnswers.name || null,
            top_problems: quizAnswers.top_problems || [],
            severity: quizAnswers.severity || null,
            timing: quizAnswers.timing || null,
            tried_options: quizAnswers.tried_options || [],
            doctor_status: quizAnswers.doctor_status || null,
            goal: quizAnswers.goal || null,
          }),
        });

        if (res.ok) {
          localStorage.removeItem("pending_quiz_answers");
          router.replace("/dashboard");
          router.refresh();
        }
      } catch (e) {
        console.error("Error saving profile:", e);
      }
    }

    checkAndSaveProfile();

    return () => {
      mounted = false;
    };
  }, [router]);



  return (
    <main className="relative mx-auto max-w-2xl p-6 sm:p-8 min-h-screen flex flex-col">
      {/* Background accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-40">
        <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Quiz Phase */}
      {phase === "quiz" && (
        <div className="flex-1 flex flex-col pt-8 ">
          {/* Progress Bar */}
          <div className="mb-8 pt-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Question {stepIndex + 1} of {STEPS.length}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {Math.round(((stepIndex + 1) / STEPS.length) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Content */}
          <div className="flex-1 flex flex-col">
            <div className="rounded-2xl border border-foreground/10 bg-card/40 p-6 sm:p-8 space-y-6 flex-1">
              {/* Q1: Top Problems */}
              {currentStep === "q1_problems" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      What&apos;s making life hardest right now?
                    </h2>
                    <p className="text-muted-foreground">Pick your TOP 2:</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PROBLEM_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = topProblems.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleProblem(option.id)}
                          disabled={!isSelected && topProblems.length >= 2}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-foreground/15 hover:border-primary/50"
                          } ${!isSelected && topProblems.length >= 2 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="font-medium">{option.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {topProblems.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {topProblems.length} of 2 selected
                    </p>
                  )}
                </div>
              )}

              {/* Q2: Severity */}
              {currentStep === "q2_severity" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      How much is this affecting your daily life?
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {SEVERITY_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSeverity(option.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          severity === option.id
                            ? "border-primary bg-primary/10"
                            : "border-foreground/15 hover:border-primary/50"
                        }`}
                      >
                        <span className="font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Q3: Timing */}
              {currentStep === "q3_timing" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      When did symptoms start?
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {TIMING_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setTiming(option.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          timing === option.id
                            ? "border-primary bg-primary/10"
                            : "border-foreground/15 hover:border-primary/50"
                        }`}
                      >
                        <span className="font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Q4: What They've Tried */}
              {currentStep === "q4_tried" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      What have you tried so far?
                    </h2>
                    <p className="text-muted-foreground">Pick any that apply:</p>
                  </div>
                  <div className="space-y-3">
                    {TRIED_OPTIONS.map((option) => {
                      const isSelected = triedOptions.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleTriedOption(option.id)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-foreground/15 hover:border-primary/50"
                          }`}
                        >
                          <span className="font-medium">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Q5: Doctor Status */}
              {currentStep === "q5_doctor" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      Are you working with a doctor on this?
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {DOCTOR_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setDoctorStatus(option.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          doctorStatus === option.id
                            ? "border-primary bg-primary/10"
                            : "border-foreground/15 hover:border-primary/50"
                        }`}
                      >
                        <span className="font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Q6: Goal */}
              {currentStep === "q6_goal" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      What would success look like for you?
                    </h2>
                    <p className="text-muted-foreground">Pick ONE:</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {GOAL_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = goal === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setGoal(option.id)}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-foreground/15 hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="font-medium">{option.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Q7: Name */}
              {currentStep === "q7_name" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      What should Lisa call you?
                    </h2>
                    <p className="text-muted-foreground">
                      Lisa will use this to personalize your experience
                    </p>
                  </div>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full p-4 rounded-xl border-2 border-foreground/15 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6 gap-4">
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-foreground/15 hover:bg-foreground/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!stepIsAnswered(currentStep)}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-primary-foreground hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {stepIndex === STEPS.length - 1 ? "Continue" : "Next"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Phase */}
      {phase === "email" && (
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                Almost there!
              </h1>
              <p className="text-muted-foreground">
                Enter your email to create your account and save your progress.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-foreground/15 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send magic link
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-xs text-center text-muted-foreground">
                By continuing, you agree to our{" "}
                <Link href="/terms" className="underline hover:opacity-80">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline hover:opacity-80">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Email Sent Phase */}
      {phase === "email-sent" && (
        <div className="flex-1 flex flex-col justify-center items-center max-w-md mx-auto w-full text-center space-y-6">
          <div className="rounded-full bg-primary/10 p-6">
            <Mail className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Check your email
            </h1>
            <p className="text-lg text-muted-foreground">
              We sent you a magic link at <strong>{email}</strong>
            </p>
            <p className="text-muted-foreground mt-2">
              Click the link in your email to continue with registration.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>Your quiz answers are saved</span>
          </div>
        </div>
      )}
    </main>
  );
}
