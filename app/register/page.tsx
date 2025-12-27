/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { getRedirectBaseUrl, AUTH_CALLBACK_PATH } from "@/lib/constants";
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
  Goal,
  BarChart3,
  AlertTriangle,
  Clock,
  Calendar,
  CalendarClock,
  CalendarRange,
  Circle,
  Pill,
  UtensilsCrossed,
  Dumbbell,
  MessageSquare,
  Smartphone,
  Stethoscope,
  UserCheck,
  HeartPulse,
  UserX,
  UserCircle,
  Check,
  Sparkles,
  Info,
  Users,
  X,
} from "lucide-react";
import {
  SYMPTOM_LABELS,
} from "@/lib/quiz-results-helpers";

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
  { id: "mild", label: "Mild - Annoying but manageable", icon: Goal },
  { id: "moderate", label: "Moderate - Affecting my work/relationships", icon: BarChart3 },
  { id: "severe", label: "Severe - I'm struggling every day", icon: AlertTriangle },
];

const TIMING_OPTIONS = [
  { id: "just_started", label: "Just started (0-6 months)", icon: Clock },
  { id: "been_while", label: "Been a while (6-12 months)", icon: Calendar },
  { id: "over_year", label: "Over a year", icon: CalendarClock },
  { id: "several_years", label: "Several years", icon: CalendarRange },
];

const TRIED_OPTIONS = [
  { id: "nothing", label: "Nothing yet", icon: Circle },
  { id: "supplements", label: "Supplements / Vitamins", icon: Pill },
  { id: "diet", label: "Diet changes", icon: UtensilsCrossed },
  { id: "exercise", label: "Exercise", icon: Dumbbell },
  { id: "hrt", label: "HRT / Medication", icon: Pill },
  { id: "doctor_talk", label: "Talked to doctor", icon: MessageSquare },
  { id: "apps", label: "Apps / Tracking", icon: Smartphone },
];

const DOCTOR_OPTIONS = [
  { id: "yes_actively", label: "Yes, actively", icon: Stethoscope },
  { id: "yes_not_helpful", label: "Yes, but they're not helpful", icon: UserX },
  { id: "no_planning", label: "No, planning to", icon: HeartPulse },
  { id: "no_natural", label: "No, prefer natural approaches", icon: UserCheck },
];

const GOAL_OPTIONS = [
  { id: "sleep_through_night", label: "Sleep through the night", icon: Moon },
  { id: "think_clearly", label: "Think clearly again", icon: Brain },
  { id: "feel_like_myself", label: "Feel like myself", icon: Heart },
  { id: "understand_patterns", label: "Understand my patterns", icon: Scale },
  { id: "data_for_doctor", label: "Have data for my doctor", icon: CheckCircle2 },
  { id: "get_body_back", label: "Get my body back", icon: Battery },
];

type Phase = "quiz" | "results" | "email" | "email-sent";

// Quality of Life Score calculation
const calculateQualityScore = (
  symptoms: string[],
  severity: string,
  timing: string,
  triedOptions: string[]
): number => {
  // Start at 100, subtract based on answers
  let score = 100;

  // Subtract for each symptom (5-8 points each)
  score -= symptoms.length * 7;

  // Subtract for severity
  const severityPenalty: Record<string, number> = {
    mild: 5,
    moderate: 15,
    severe: 25,
  };
  score -= severityPenalty[severity] || 10;

  // Subtract for duration (longer = worse)
  const durationPenalty: Record<string, number> = {
    just_started: 0, // 0-6 months
    been_while: 5, // 6-12 months
    over_year: 10, // over a year
    several_years: 15, // several years
  };
  score -= durationPenalty[timing] || 5;

  // Small bonus if they've tried things (shows effort)
  if (triedOptions.length > 0 && !triedOptions.includes("nothing")) {
    score += 3;
  }

  // Clamp between 31-52 (warning zone, not too comfortable, not hopeless)
  return Math.max(31, Math.min(52, Math.round(score)));
};

const getScoreColor = (score: number): string => {
  if (score < 40) return "text-red-500";
  return "text-orange-500";
};

const getScoreLabel = (score: number): string => {
  if (score < 40) return "Needs attention - symptoms are controlling your daily life";
  if (score < 50) return "Below average - symptoms are significantly impacting daily life";
  return "Room to improve - symptoms are affecting your quality of life";
};

const getSeverityHeadline = (severity: string, name: string): string => {
  const displayName = name || "you";
  switch (severity) {
    case "severe":
      return `${displayName}, this can't continue.`;
    case "moderate":
      return `${displayName}, I need to be honest with you.`;
    case "mild":
    default:
      return `${displayName}, let's talk about what's really going on.`;
  }
};

const getSeverityPainText = (
  severity: string,
  symptomCount: number,
  name: string
): string => {
  const displayName = name || "you";
  switch (severity) {
    case "severe":
      return `${symptomCount} symptoms controlling your life. You've probably tried to explain it to people who don't get it. You've probably wondered if this is just your new normal. It's not. And ${displayName}, you don't have to keep living like this.`;
    case "moderate":
      return `${symptomCount} symptoms. Affecting your work. Your mood. Your relationships. ${displayName}, you're spending so much energy just trying to function normally - energy you shouldn't have to spend.`;
    case "mild":
    default:
      return `${displayName}, these ${symptomCount} symptoms might feel manageable now. But without understanding what's causing them, they often get worse. Let's figure this out before they do.`;
  }
};

const NOTIFICATION_MESSAGES = [
  "142 women are taking this quiz with you right now.",
  "92% of women feel more in control of their symptoms after receiving their personalized plan.",
  "'Brain Fog' is the most reported symptom by our community this week.",
  "Over 20,000 women have used their MenoLisa results to have more productive conversations with their doctors.",
  "Elena just completed the quiz and unlocked her strategy for better sleep.",
  "9 out of 10 women recommend this quiz to friends navigating perimenopause.",
];

export default function RegisterPage() {
  const router = useRouter();

  // Always start with quiz
  const [phase, setPhase] = useState<Phase>("quiz");
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];

  // Random notification message
  const [notificationMessage] = useState(() => {
    return NOTIFICATION_MESSAGES[Math.floor(Math.random() * NOTIFICATION_MESSAGES.length)];
  });
  const [showNotification, setShowNotification] = useState(false);

  // Show notification after 3 seconds, auto-dismiss after 4 seconds of being visible
  useEffect(() => {
    if (phase !== "quiz") {
      setShowNotification(false);
      return;
    }

    let dismissTimer: NodeJS.Timeout | null = null;

    const showTimer = setTimeout(() => {
      setShowNotification(true);
      
      // Auto-dismiss after 4 seconds of being visible
      dismissTimer = setTimeout(() => {
        setShowNotification(false);
      }, 10000);
    }, 3000);
    
    return () => {
      clearTimeout(showTimer);
      if (dismissTimer) {
        clearTimeout(dismissTimer);
      }
    };
  }, [phase]);

  const handleCloseNotification = () => {
    setShowNotification(false);
  };

  // Quiz answers - stored in state
  const [topProblems, setTopProblems] = useState<string[]>([]);
  const [severity, setSeverity] = useState<string>("");
  const [timing, setTiming] = useState<string>("");
  const [triedOptions, setTriedOptions] = useState<string[]>([]);
  const [doctorStatus, setDoctorStatus] = useState<string>("");
  const [goal, setGoal] = useState<string[]>([]);
  const [firstName, setFirstName] = useState<string>("");

  // Email state
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results loading state
  const [isResultsLoading, setIsResultsLoading] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);

  // Loading messages for results screen
  const loadingMessages = [
    "Taking it all in...",
    "Connecting the dots...",
    "Doing the math...",
    "Designing your plan...",
    "Getting ready to launch...",
    "Launching your plan...",
  ];

  // Handle results loading animation
  useEffect(() => {
    if (phase === "results") {
      // Reset loading state when entering results phase
      setIsResultsLoading(true);
      setProgress(0);
      setMessageIndex(0);
      setDisplayScore(0);

      // Rotate messages every 600ms (faster rotation to show more messages)
      const messageInterval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 600);

      // Progress bar animation
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 1.5, 100));
      }, 60);

      // Hide loading after 5 seconds (longer duration to show more messages)
      const loadingTimer = setTimeout(() => {
        setIsResultsLoading(false);
        clearInterval(messageInterval);
        clearInterval(progressInterval);
      }, 5000);

      return () => {
        clearInterval(messageInterval);
        clearInterval(progressInterval);
        clearTimeout(loadingTimer);
      };
    }
  }, [phase, loadingMessages.length]);

  // Animate score counting up
  useEffect(() => {
    if (phase === "results" && !isResultsLoading) {
      const targetScore = calculateQualityScore(
        topProblems,
        severity,
        timing,
        triedOptions
      );
      
      const duration = 1500; // 1.5 seconds
      const steps = 30;
      const increment = targetScore / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= targetScore) {
          setDisplayScore(targetScore);
          clearInterval(timer);
        } else {
          setDisplayScore(Math.round(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [phase, isResultsLoading, topProblems, severity, timing, triedOptions]);

  // Validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = emailValid && !loading;

  // Check if current step is answered
  const stepIsAnswered = useCallback((step: Step) => {
    switch (step) {
      case "q1_problems":
        return topProblems.length === 3;
      case "q2_severity":
        return severity !== "";
      case "q3_timing":
        return timing !== "";
      case "q4_tried":
        return triedOptions.length > 0;
      case "q5_doctor":
        return doctorStatus !== "";
      case "q6_goal":
        return goal.length > 0;
      case "q7_name":
        return firstName.trim().length > 0;
      default:
        return false;
    }
  }, [topProblems, severity, timing, triedOptions, doctorStatus, goal, firstName]);

  // Save quiz answers to localStorage as backup
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

  const goNext = useCallback(() => {
    if (!stepIsAnswered(currentStep)) return;
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      // Quiz complete - move to results phase
      setPhase("results");
      // Save quiz answers to localStorage as backup
      saveQuizAnswers();
    }
  }, [currentStep, stepIndex, stepIsAnswered, saveQuizAnswers]);

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
      if (prev.length >= 3) {
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

  const toggleGoal = (goalId: string) => {
    setGoal((prev) => {
      if (prev.includes(goalId)) {
        return prev.filter((id) => id !== goalId);
      }
      return [...prev, goalId];
    });
  };

  // Handle email submission
  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setLoading(true);

    try {
      // Prepare quiz answers to pass through auth flow
      const quizAnswers = {
        top_problems: topProblems,
        severity: severity,
        timing: timing,
        tried_options: triedOptions,
        doctor_status: doctorStatus,
        goal: goal,
        name: firstName.trim() || null,
      };
      
      // Debug logging - verify all quiz answers are present
      console.log("Quiz answers to encode:", {
        top_problems: quizAnswers.top_problems,
        severity: quizAnswers.severity,
        timing: quizAnswers.timing,
        tried_options: quizAnswers.tried_options,
        doctor_status: quizAnswers.doctor_status,
        goal: quizAnswers.goal,
        name: quizAnswers.name,
      });
      
      // Encode quiz answers as base64 to pass through URL
      const encodedAnswers = btoa(JSON.stringify(quizAnswers));
      
      // Use the current origin for redirects (localhost in dev, production URL in prod)
      const redirectTo = `${getRedirectBaseUrl()}${AUTH_CALLBACK_PATH}?next=/register&quiz=${encodeURIComponent(encodedAnswers)}`;
      
      // Debug logging
      console.log("Registration attempt:", { email, redirectTo });

      const { error: signInError, data } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signInError) {
        // Log the full error for debugging
        console.error("Supabase auth error:", {
          message: signInError.message,
          status: signInError.status,
          name: signInError.name,
          fullError: signInError,
        });

        let friendly = "An error occurred. Please try again.";
        
        // Check for specific error types
        const errorMsg = signInError.message.toLowerCase();
        
        // Email validation errors (be more specific)
        if (
          errorMsg.includes("invalid email") ||
          errorMsg.includes("email format") ||
          errorMsg === "invalid email address" ||
          errorMsg.includes("email is not valid")
        ) {
          friendly = "That email address is invalid. Please check and try again.";
        }
        // Redirect URL errors
        else if (
          errorMsg.includes("redirect") ||
          errorMsg.includes("redirect_to") ||
          errorMsg.includes("redirect url") ||
          errorMsg.includes("url configuration")
        ) {
          friendly = "Redirect URL not configured. Please contact support or check Supabase settings.";
        }
        // Rate limiting errors
        else if (
          /rate/i.test(signInError.message) || 
          /too many/i.test(signInError.message) ||
          signInError.message.includes("security purposes") ||
          signInError.message.includes("only request this after") ||
          /48 seconds/i.test(signInError.message) ||
          /60 seconds/i.test(signInError.message)
        ) {
          friendly = signInError.message.includes("48 seconds") || 
                     signInError.message.includes("60 seconds") || 
                     signInError.message.includes("security purposes")
            ? signInError.message
            : "Too many attempts - please wait a moment and try again.";
        }
        // Email provider/SMTP errors
        else if (
          errorMsg.includes("email provider") ||
          errorMsg.includes("email not enabled") ||
          errorMsg.includes("smtp") ||
          errorMsg.includes("mail") ||
          errorMsg.includes("sending email") ||
          errorMsg.includes("email service") ||
          errorMsg.includes("email delivery")
        ) {
          friendly = "Email service is not configured. Please check Supabase email settings or contact support.";
        }
        // Network/connection errors
        else if (
          errorMsg.includes("network") ||
          errorMsg.includes("fetch") ||
          errorMsg.includes("connection")
        ) {
          friendly = "Network error. Please check your connection and try again.";
        }
        // Show the actual error message for other cases
        else if (signInError.message) {
          friendly = signInError.message;
        }
        
        setError(friendly);
        setLoading(false);
        return;
      }

      // Success - show email sent message
      console.log("Magic link sent successfully:", data);
      setPhase("email-sent");
      setLoading(false);
    } catch (e) {
      console.error("Unexpected error during registration:", e);
      setError(e instanceof Error ? e.message : "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Check for authenticated session and redirect if profile exists
  // Only check when NOT in email-sent or results phase (user should stay on those pages)
  useEffect(() => {
    // Don't check session if user is in email-sent or results phase - let them stay there
    if (phase === "email-sent" || phase === "results") {
      return;
    }

    let mounted = true;

    async function checkSessionAndRedirect() {
      if (!mounted) return;

      try {
        // Check for session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session check error:", sessionError);
          return;
        }

        if (!sessionData?.session?.user) {
          // No session - user hasn't clicked magic link yet
          return;
        }

        const user = sessionData.session.user;

        // Check if profile already exists
        const { data: existingProfile, error: profileError } = await supabase
          .from("user_profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Error checking profile:", profileError);
          return;
        }

        if (existingProfile) {
          // Profile already exists - redirect to dashboard
          if (mounted) {
            localStorage.removeItem("pending_quiz_answers");
            router.replace("/dashboard");
            router.refresh();
          }
          return;
        }

        // Profile doesn't exist - user might need to complete quiz
        // This should rarely happen now since profile is created in auth callback
        // But keep this as a fallback
        if (mounted) {
          // User has confirmed email but profile wasn't created
          // This might happen if quiz answers weren't passed correctly
          // Let them complete the quiz again
          setPhase("quiz");
          setStepIndex(0);
        }
      } catch (e) {
        if (!mounted) return;
        console.error("Error checking session:", e);
      }
    }

    // Check session on mount
    checkSessionAndRedirect();

    return () => {
      mounted = false;
    };
  }, [router, phase]);

  return (
    <main className="overflow-x-hidden relative mx-auto p-6 sm:p-8 h-full flex flex-col pt-16">
        {/* Random Notification Popup */}
        <AnimatePresence>
          {phase === "quiz" && showNotification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-3rem)] max-w-2xl px-3 sm:px-6 pointer-events-none"
            >
              <div className="bg-gray-900/95 backdrop-blur-xl border border-white/40 rounded-2xl p-5 shadow-2xl flex items-center gap-4 pointer-events-auto">
                <div className="p-2.5 rounded-xl bg-yellow-500/20 shrink-0">
                  <Info className="h-5 w-5 text-yellow-400" />
                </div>
                <p className="text-sm text-white font-semibold flex-1 leading-relaxed">
                  {notificationMessage}
                </p>
                <button
                  onClick={handleCloseNotification}
                  className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-all duration-200 cursor-pointer shrink-0"
                  aria-label="Close notification"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Background accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-40">
        <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Results Phase */}
      {phase === "results" && (
        <div className="flex-1 flex flex-col min-h-screen -mx-6 sm:-mx-8 px-6 sm:px-8">
          <AnimatePresence mode="wait">
            {isResultsLoading ? (
              // Loading Screen
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center px-4"
              >
                {/* Animated icon - pulse + rotate */}
                <div className="relative mb-8">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse" style={{ background: 'linear-gradient(135deg, #ff74b1 0%, #ffeb76 50%, #65dbff 100%)' }}>
                    <Sparkles className="w-10 h-10 text-white animate-spin-slow" />
                  </div>
                  {/* Rotating ring around icon */}
                  <div className="absolute inset-0 w-20 h-20 border-4 border-transparent rounded-full animate-spin" style={{ borderTopColor: 'rgba(255, 116, 177, 0.3)', borderRightColor: 'rgba(255, 235, 118, 0.3)', borderBottomColor: 'rgba(101, 219, 255, 0.3)', borderLeftColor: 'rgba(255, 180, 213, 0.3)' }} />
                </div>

                {/* Main text */}
                <h2 className="text-xl font-medium text-[#3D3D3D] mb-3">
                Getting to know you better...
                </h2>

                {/* Rotating message with fade */}
                <p className="text-[#5A5A5A] h-6 transition-opacity duration-300">
                  {loadingMessages[messageIndex]}
                </p>

                {/* Progress bar */}
                <div className="w-48 h-1.5 bg-[#E8DDD9] rounded-full mt-8 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-100 ease-out"
                    style={{ width: `${progress}%`, background: 'linear-gradient(to right, #ff74b1, #ffeb76, #65dbff)' }}
                  />
                </div>
              </motion.div>
            ) : (
              // Results Page
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-md mx-auto w-full pt-12"
              >
                {/* Lisa Icon */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex justify-center mb-6"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff74b1 0%, #ffb4d5 100%)' }}>
                    <HeartPulse className="w-8 h-8 text-white" />
                  </div>
                </motion.div>

                {/* Headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-semibold text-[#3D3D3D] text-center mb-4"
                >
                  {getSeverityHeadline(severity, firstName || "you")}
                </motion.h1>

                {/* Pain Paragraph */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-md text-[#5A5A5A] text-center leading-relaxed mb-8"
                >
                  {getSeverityPainText(
                    severity,
                    topProblems.length,
                    firstName || "you"
                  )}
                </motion.p>

                {/* Quality of Life Score */}
                {!isResultsLoading && (() => {
                  const score = calculateQualityScore(
                    topProblems,
                    severity,
                    timing,
                    triedOptions
                  );
                  
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="rounded-2xl p-5 border border-[#E8DDD9] mb-6"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-6 h-6 text-orange-500" />
                          <span className="text-lg font-bold font-large text-gray-900!">Your Menopause Score</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[#9A9A9A]">
                          <Info className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs font-medium text-gray-500!">Based on your answers</span>
                        </div>
                      </div>

                      {/* Score Display */}
                      <div className="flex items-end gap-2 mb-3">
                        <span className={`text-5xl font-bold ${getScoreColor(score)}`}>
                          {displayScore}
                        </span>
                        <span className="text-2xl text-gray-900! font-medium mb-1">/100</span>
                      </div>

                      {/* Score Label */}
                      <p className="text-sm text-orange-600 mb-4">
                        {getScoreLabel(score)}
                      </p>

                      {/* Progress Bar */}
                      <div className="relative h-3 bg-[#F0EDED] rounded-full mb-4 overflow-hidden">
                        {/* Current score */}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="absolute left-0 top-0 h-full bg-linear-to-r from-red-400 via-orange-400 to-orange-300 rounded-full"
                        />
                        {/* Target marker at 80% */}
                        <div
                          className="absolute top-0 h-full w-1 bg-green-500 rounded-full"
                          style={{ left: "80%" }}
                        />
                      </div>

                      {/* Target Text */}
                      <div className="flex items-center gap-2 text-sm">
                        <Goal className="w-6 h-6 text-green-600" />
                        <span className="text-[#5A5A5A] font-medium text-md">
                          Your target: <span className="font-bold">80+</span> (reachable in 8 weeks)
                        </span>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Symptom Pills - Smaller, muted, under score card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                  className="mb-4"
                >
                  <div className="flex flex-wrap gap-2 justify-center">
                    {topProblems.map((symptom, index) => (
                      <motion.span
                        key={symptom}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.2 + index * 0.1 }}
                        className="px-2 py-1 bg-red-100  text-red-500 text-sm rounded-full"
                      >
                        {SYMPTOM_LABELS[symptom] || symptom}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>

                {/* Outcomes Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="mb-8"
                >
                  <h2 className="text-lg font-medium text-[#3D3D3D] mb-4 text-center">
                    In 8 weeks, women like you:
                  </h2>
                  <div className="space-y-3">
                    {[
                      { text: "Sleep through the night again" },
                      { text: "Know exactly what triggers their symptoms" },
                      { text: "Feel in control of their body again" },
                    ].map((outcome, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-[#3D3D3D]">{outcome.text}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Social Proof */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4 }}
                  className="mb-8 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-sm text-[#5A5A5A]">
                    <Users className="w-4 h-4 text-info" />
                    <span>8,382 women joined this month</span>
                  </div>
                </motion.div>

                {/* Email CTA */}
                <motion.form
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4 }}
                  onSubmit={handleEmailSubmit}
                  className="space-y-3"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full px-4 py-4 rounded-xl border border-[#E8DDD9] bg-white text-[#3D3D3D] placeholder:text-[#9A9A9A] focus:outline-none focus:ring-2 focus:ring-[#ff74b1]/50 focus:border-[#ff74b1]"
                  />

                  <button
                    type="submit"
                    disabled={loading || !emailValid}
                    className="w-full py-4 font-bold text-gray-900! rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #ff74b1 0%, #ffeb76 50%, #65dbff 100%)', boxShadow: '0 4px 15px rgba(255, 116, 177, 0.4)' }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Start my free trial
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-sm text-[#5A5A5A]">
                    Free for 3 days • No credit card required
                  </p>

                  {error && (
                    <div className="rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error">
                      {error}
                    </div>
                  )}
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Quiz Phase */}
      {phase === "quiz" && (
        <div className="flex-1 flex flex-col pt-4 sm:pt-8">
          {/* Progress Bar */}
          <div className="mb-6 sm:mb-8 pt-4 sm:pt-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">
                Question {stepIndex + 1} of {STEPS.length}
              </span>
              <span className="text-sm font-semibold text-primary">
                {Math.round(((stepIndex + 1) / STEPS.length) * 100)}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-foreground/10 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full bg-linear-to-r from-primary to-primary/80 transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Content */}
          <div className="flex-1 flex flex-col">
            <div className="rounded-2xl border border-foreground/10 bg-card/50 backdrop-blur-sm p-6 sm:p-8 space-y-6 flex-1 shadow-lg shadow-primary/5">
              {/* Q1: Top Problems */}
              {currentStep === "q1_problems" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      What&apos;s making life hardest right now?
                    </h2>
                    <p className="text-muted-foreground">Pick your TOP 3:</p>
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
                          disabled={!isSelected && topProblems.length >= 3}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                              : "border-foreground/15 hover:border-primary/50 hover:bg-foreground/5"
                          } ${!isSelected && topProblems.length >= 3 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${
                              isSelected ? "bg-primary/20" : "bg-foreground/5 group-hover:bg-primary/10"
                            }`}>
                              <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <span className="font-medium flex-1">{option.label}</span>
                            {isSelected && (
                              <Check className="w-5 h-5 text-primary animate-in zoom-in duration-200" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {topProblems.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex-1 h-2 rounded-full bg-foreground/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${(topProblems.length / 3) * 100}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground font-medium min-w-[100px] text-right">
                        {topProblems.length} of 3 selected
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Q2: Severity */}
              {currentStep === "q2_severity" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      How much is this affecting your daily life?
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {SEVERITY_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = severity === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSeverity(option.id)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 group ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                              : "border-foreground/15 hover:border-primary/50 hover:bg-foreground/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${
                              isSelected ? "bg-primary/20" : "bg-foreground/5 group-hover:bg-primary/10"
                            }`}>
                              <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <span className="font-medium flex-1">{option.label}</span>
                            {isSelected && (
                              <Check className="w-5 h-5 text-primary animate-in zoom-in duration-200" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Q3: Timing */}
              {currentStep === "q3_timing" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      When did symptoms start?
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {TIMING_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = timing === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setTiming(option.id)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 group ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                              : "border-foreground/15 hover:border-primary/50 hover:bg-foreground/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${
                              isSelected ? "bg-primary/20" : "bg-foreground/5 group-hover:bg-primary/10"
                            }`}>
                              <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <span className="font-medium flex-1">{option.label}</span>
                            {isSelected && (
                              <Check className="w-5 h-5 text-primary animate-in zoom-in duration-200" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Q4: What They've Tried */}
              {currentStep === "q4_tried" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      What have you tried so far?
                    </h2>
                    <p className="text-muted-foreground">Pick any that apply:</p>
                  </div>
                  <div className="space-y-3">
                    {TRIED_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = triedOptions.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleTriedOption(option.id)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 group ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                              : "border-foreground/15 hover:border-primary/50 hover:bg-foreground/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${
                              isSelected ? "bg-primary/20" : "bg-foreground/5 group-hover:bg-primary/10"
                            }`}>
                              <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <span className="font-medium flex-1">{option.label}</span>
                            {isSelected && (
                              <Check className="w-5 h-5 text-primary animate-in zoom-in duration-200" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Q5: Doctor Status */}
              {currentStep === "q5_doctor" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      Are you working with a doctor on this?
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {DOCTOR_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = doctorStatus === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setDoctorStatus(option.id)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 group ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                              : "border-foreground/15 hover:border-primary/50 hover:bg-foreground/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${
                              isSelected ? "bg-primary/20" : "bg-foreground/5 group-hover:bg-primary/10"
                            }`}>
                              <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <span className="font-medium flex-1">{option.label}</span>
                            {isSelected && (
                              <Check className="w-5 h-5 text-primary animate-in zoom-in duration-200" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Q6: Goal */}
              {currentStep === "q6_goal" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      What would success look like for you?
                    </h2>
                    <p className="text-muted-foreground">Pick any that apply:</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {GOAL_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = goal.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleGoal(option.id)}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                              : "border-foreground/15 hover:border-primary/50 hover:bg-foreground/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${
                              isSelected ? "bg-primary/20" : "bg-foreground/5 group-hover:bg-primary/10"
                            }`}>
                              <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <span className="font-medium flex-1">{option.label}</span>
                            {isSelected && (
                              <Check className="w-5 h-5 text-primary animate-in zoom-in duration-200" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Q7: Name */}
              {currentStep === "q7_name" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      What should Lisa call you?
                    </h2>
                    <p className="text-muted-foreground">
                      Lisa will use this to personalize your experience
                    </p>
                  </div>
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-foreground/15 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200 text-lg"
                      autoFocus
                    />
                    {firstName.trim().length > 0 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <CheckCircle2 className="w-5 h-5 text-primary animate-in zoom-in duration-200" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 gap-4">
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-foreground/15 hover:bg-foreground/5 hover:border-foreground/25 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!stepIsAnswered(currentStep)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:brightness-110 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:shadow-none font-semibold"
              >
                {stepIndex === STEPS.length - 1 ? "Continue" : "Next"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
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
          {error && (
            <div className="rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error max-w-md">
              {error}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
