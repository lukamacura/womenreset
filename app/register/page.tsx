"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User, Calendar, FileText, UtensilsCrossed, Dumbbell, Heart, Home } from "lucide-react";

type Step = "name" | "age" | "profiles" | "summary" | "done";

const STEPS: Step[] = ["name", "age", "profiles", "summary", "done"];

export default function RegisterPage() {
  const router = useRouter();

  // faza: prvo register, pa onda kratki profil
  const [phase, setPhase] = useState<"register" | "quiz">("register");
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];

  // auth inputs
  const [email, setEmail] = useState("");

  // supabase user id
  const [userId, setUserId] = useState<string | null>(null);

  // osnovni podaci
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<string>("");

  // tekstualni profili (sve opciono)
  const [menopauseText, setMenopauseText] = useState("");
  const [nutritionText, setNutritionText] = useState("");
  const [exerciseText, setExerciseText] = useState("");
  const [emotionalText, setEmotionalText] = useState("");
  const [lifestyleText, setLifestyleText] = useState("");

  // UI
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sessionExistsAfterSignup, setSessionExistsAfterSignup] =
    useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // validacija
  const emailValid = useMemo(() => /.+@.+\..+/.test(email), [email]);
  const canRegister = emailValid && !loading;

  const ageNum = Number(age);

  const stepIsAnswered = useCallback((step: Step) => {
    switch (step) {
      case "name":
        return fullName.trim().length > 1;
      case "age":
        return Number.isFinite(ageNum) && ageNum >= 35 && ageNum <= 70;
      // ostali koraci nisu obavezni
      default:
        return true;
    }
  }, [fullName, ageNum]);

  const goNext = useCallback(() => {
    if (!stepIsAnswered(currentStep)) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, [currentStep, stepIsAnswered]);

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  // Define finishQuiz before useEffect that uses it
  const finishQuiz = useCallback(async () => {
    setErr(null);
    setInfo(null);
    setLoading(true);

    try {
      // Get user ID from current session (user clicked magic link)
      let finalUserId = userId;
      if (!finalUserId) {
        const { data } = await supabase.auth.getUser();
        finalUserId = data.user?.id ?? null;
      }

      if (!finalUserId) {
        throw new Error("User ID is missing. Please try registering again or log in if you already have an account.");
      }

      // Validate required fields
      if (!fullName.trim()) {
        throw new Error("Please enter your name.");
      }

      const ageNum = Number(age);
      if (!Number.isFinite(ageNum) || ageNum < 35 || ageNum > 70) {
        throw new Error("Please enter a valid age between 35 and 70.");
      }

      // tekst polja – trim + ako je prazno, šaljemo null (da se lepo upiše u DB)
      const intakePayload = {
        user_id: finalUserId,
        name: fullName.trim(),
        age: ageNum,

        menopause_profile: menopauseText.trim() || null,
        nutrition_profile: nutritionText.trim() || null,
        exercise_profile: exerciseText.trim() || null,
        emotional_stress_profile: emotionalText.trim() || null,
        lifestyle_context: lifestyleText.trim() || null,
      };

      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intakePayload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const errorMessage = body?.error || "Failed to save your profile. Please try again.";
        const details = body?.details;
        // Include details in error message if available (for debugging)
        throw new Error(details ? `${errorMessage} (${details})` : errorMessage);
      }

      // If user has a session, redirect to dashboard
      if (sessionExistsAfterSignup) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      // If no session, user needs to click magic link first
      setInfo("Profile saved! Please check your email and click the magic link to access your dashboard.");
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An error occurred while saving your profile.";
      setErr(errorMessage.includes("User ID is missing") 
        ? errorMessage 
        : "Failed to save your profile. Please try again or contact support if the problem persists.");
    } finally {
      setLoading(false);
    }
  }, [userId, fullName, age, menopauseText, nutritionText, exerciseText, emotionalText, lifestyleText, sessionExistsAfterSignup, router]);

  // Check if user has existing profile when component mounts (for users returning after magic link)
  useEffect(() => {
    let mounted = true;
    
    async function checkExistingProfile() {
      try {
        // Check if user has a session first
        const { data: sessionData } = await supabase.auth.getSession();
        const hasSession = !!sessionData.session;

        if (!hasSession) {
          // No session - user needs to click magic link first
          if (mounted) setCheckingProfile(false);
          return;
        }

        // Get user from session
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          if (mounted) setCheckingProfile(false);
          return;
        }

        // Check if profile exists
        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("user_id, name, age")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116" && error.code !== "42P01") {
          console.error("Error checking profile:", error);
          if (mounted) setCheckingProfile(false);
          return;
        }

        // If profile exists, redirect to dashboard
        if (profile) {
          router.replace("/dashboard");
          return;
        }

        // User has session but no profile - show quiz to complete registration
        if (mounted) {
          setUserId(user.id);
          setSessionExistsAfterSignup(true);
          setPhase("quiz");
          setStepIndex(0);
        }
      } catch (e) {
        console.error("Error in checkExistingProfile:", e);
      } finally {
        if (mounted) setCheckingProfile(false);
      }
    }

    checkExistingProfile();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function onRegisterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canRegister) return;

    setErr(null);
    setInfo(null);
    setLoading(true);

    try {
      const redirectTo = `https://www.womenreset.com/auth/callback?next=/register`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { 
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        console.error("Magic link error:", error);
        let friendly = "An error occurred. Please try again.";
        
        if (error.message.includes("email") || error.message.includes("invalid")) {
          friendly = "That email address is invalid. Please check and try again.";
        } else if (
          error.message.includes("rate limit") || 
          error.message.includes("too many") ||
          error.message.includes("security purposes") ||
          error.message.includes("only request this after") ||
          /48 seconds/i.test(error.message)
        ) {
          // Use the original error message if it contains specific rate limit info
          friendly = error.message.includes("48 seconds") || error.message.includes("security purposes")
            ? error.message
            : "Too many attempts — please wait a moment and try again.";
        } else if (error.status === 500) {
          friendly = "Server error. Please contact support or try again later.";
          console.error("500 error details:", error);
        } else if (error.message) {
          friendly = error.message;
        }
        
        setErr(friendly);
        setLoading(false);
        return;
      }

      // Magic link sent successfully
      setInfo("Check your email! We sent you a magic link. Click it to continue with registration.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unknown error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const progress = Math.min(stepIndex, STEPS.length - 2);
  const progressTotal = STEPS.length - 1;

  // Show loading state while checking profile
  if (checkingProfile) {
    return (
      <main className="relative mx-auto max-w-md p-6 sm:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
    <main className="relative overflow-hidden mx-auto max-w-md p-6 sm:p-8">
      {/* background accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-40">
        <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {phase === "register" && (
        <>
          <h1 className="text-3xl sm:text-5xl font-script font-extrabold tracking-tight mb-6 text-balance pt-16">
            Create your account
          </h1>

          <form onSubmit={onRegisterSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={email.length > 0 && !emailValid}
                required
              />
            </div>


            {/* Submit */}
            <button
              className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground shadow-sm ring-1 ring-inset ring-primary/20 transition hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
              type="submit"
              disabled={!canRegister}
            >
              {loading ? "Sending magic link…" : "Continue with email"}
            </button>

            <p className="my-0 text-emerald-600 font-bold text-sm text-muted-foreground">Only email is required.</p>


            <p className="text-sm text-muted-foreground">
              By signing up, you agree to our{" "}
              <Link
                href="/terms"
                className="underline underline-offset-4 hover:opacity-80"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-4 hover:opacity-80"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          {err && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error font-bold"
            >
              {err}
            </div>
          )}

          <p className="mt-6 text-md text-muted-foreground">
            Already have an account?{" "}
            <Link
              className="bg-primary-light text-primary-dark rounded-md px-2 py-1 font-bold underline-offset-4 hover:opacity-80"
              href="/login"
            >
              Log in
            </Link>
          </p>
        </>
      )}

      {phase === "quiz" && (
        <section className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Your menopause profile</h1>
            <p className="text-xs text-muted-foreground">
              Step {progress + 1} of {progressTotal}
            </p>

            <div className="mt-2 h-2 w-full rounded-full bg-foreground/10">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${(progress / progressTotal) * 100}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-card/40 p-6 sm:p-8 space-y-6 min-h-[240px] flex flex-col justify-between">
            {currentStep === "name" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-3">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <label className="text-xl sm:text-2xl font-semibold">
                    What is your name?
                  </label>
                </div>
                <input
                  className="w-full text-lg sm:text-xl rounded-xl border border-foreground/15 bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {currentStep === "age" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <label className="text-xl sm:text-2xl font-semibold">
                    How old are you?
                  </label>
                </div>
                <input
                  inputMode="numeric"
                  className="w-full text-lg sm:text-xl rounded-xl border border-foreground/15 bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="e.g. 47"
                  value={age}
                  onChange={(e) =>
                    setAge(e.target.value.replace(/[^\d]/g, ""))
                  }
                  autoFocus
                />
                <p className="text-sm sm:text-base text-muted-foreground">
                  Typical menopause ages are 35-70.
                </p>
              </div>
            )}

            {currentStep === "summary" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <label className="text-xl sm:text-2xl font-semibold">
                    Review your information
                  </label>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-foreground/10 bg-background/50">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-5 w-5 text-primary" />
                      <span className="text-sm font-semibold text-muted-foreground">Name</span>
                    </div>
                    <p className="text-base font-medium">{fullName || "Not provided"}</p>
                  </div>

                  <div className="p-4 rounded-xl border border-foreground/10 bg-background/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <span className="text-sm font-semibold text-muted-foreground">Age</span>
                    </div>
                    <p className="text-base font-medium">{age || "Not provided"}</p>
                  </div>

                  {menopauseText && (
                    <div className="p-4 rounded-xl border border-foreground/10 bg-background/50">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold text-muted-foreground">Menopause Profile</span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{menopauseText}</p>
                    </div>
                  )}

                  {nutritionText && (
                    <div className="p-4 rounded-xl border border-foreground/10 bg-background/50">
                      <div className="flex items-center gap-2 mb-2">
                        <UtensilsCrossed className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold text-muted-foreground">Nutrition Profile</span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{nutritionText}</p>
                    </div>
                  )}

                  {exerciseText && (
                    <div className="p-4 rounded-xl border border-foreground/10 bg-background/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Dumbbell className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold text-muted-foreground">Exercise Profile</span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{exerciseText}</p>
                    </div>
                  )}

                  {emotionalText && (
                    <div className="p-4 rounded-xl border border-foreground/10 bg-background/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold text-muted-foreground">Emotional / Stress Profile</span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{emotionalText}</p>
                    </div>
                  )}

                  {lifestyleText && (
                    <div className="p-4 rounded-xl border border-foreground/10 bg-background/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Home className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold text-muted-foreground">Lifestyle Context</span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{lifestyleText}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === "profiles" && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <label className="text-md sm:text-lg font-semibold">
                    Tell us more about yourself (recommended)
                  </label>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <label className="text-base sm:text-md font-medium">
                      Menopause profile (symptoms, stage...)
                    </label>
                  </div>
                  <textarea
                    className="w-full rounded-xl border border-foreground/15 bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
                    rows={3}
                    placeholder="Describe your main symptoms, sleep pattern, stage (perimenopause, post-menopause...)"
                    value={menopauseText}
                    onChange={(e) => setMenopauseText(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <UtensilsCrossed className="h-5 w-5 text-primary" />
                    <label className="text-base sm:text-md font-medium">
                      Nutrition profile (foods you like/avoid)
                    </label>
                  </div>
                  <textarea
                    className="w-full rounded-xl border border-foreground/15 bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
                    rows={2}
                    placeholder="Do you have something you can't eat? Any preferences?"
                    value={nutritionText}
                    onChange={(e) => setNutritionText(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Dumbbell className="h-5 w-5 text-primary" />
                    <label className="text-base sm:text-md font-medium">
                      Exercise profile
                    </label>
                  </div>
                  <textarea
                    className="w-full rounded-xl border border-foreground/15 bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
                    rows={2}
                    placeholder="What kind of movement do you prefer or avoid?"
                    value={exerciseText}
                    onChange={(e) => setExerciseText(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-5 w-5 text-primary" />
                    <label className="text-base sm:text-md font-medium">
                      Emotional / stress profile
                    </label>
                  </div>
                  <textarea
                    className="w-full rounded-xl border border-foreground/15 bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
                    rows={2}
                    placeholder="Anything important about stress, mood, anxiety..."
                    value={emotionalText}
                    onChange={(e) => setEmotionalText(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="h-5 w-5 text-primary" />
                    <label className="text-base sm:text-md font-medium">
                      Lifestyle context
                    </label>
                  </div>
                  <textarea
                    className="w-full rounded-xl border border-foreground/15 bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
                    rows={2}
                    placeholder="Job type, schedule, kids, night shifts, etc."
                    value={lifestyleText}
                    onChange={(e) => setLifestyleText(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0 || loading}
                className="text-sm px-3 py-2 rounded-xl border border-foreground/15 hover:bg-foreground/5 disabled:opacity-50"
              >
                Back
              </button>

              {currentStep === "summary" ? (
                <button
                  type="button"
                  onClick={finishQuiz}
                  disabled={loading}
                  className="text-sm px-4 py-2 rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Complete registration"}
                </button>
              ) : currentStep !== "done" ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!stepIsAnswered(currentStep) || loading}
                  className="text-sm px-4 py-2 rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-60"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishQuiz}
                  disabled={loading}
                  className="text-sm px-4 py-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Finish"}
                </button>
              )}
            </div>
          </div>

          {err && (
            <div
              role="alert"
              className="rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error font-bold"
            >
              {err}
            </div>
          )}
          {info && (
            <div
              role="status"
              className="rounded-xl border border-emerald-400/30 bg-emerald-100 p-3 text-sm text-emerald-500 font-bold"
            >
              {info}
            </div>
          )}
        </section>
      )}
    </main>

    {/* Register Illustration - 70-80% Width (outside main to break max-w-md constraint) */}
    {phase === "register" && (
      <div className="w-full flex justify-center">
        <div className="w-[75%] max-w-4xl">
          <Image
            src="/register.svg"
            alt="Registration illustration"
            width={1920}
            height={400}
            className="w-full h-auto"
            priority
          />
        </div>
      </div>
    )}
    </>
  );
}
