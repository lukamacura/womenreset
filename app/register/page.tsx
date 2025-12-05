"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Step = "name" | "age" | "profiles" | "done";

const STEPS: Step[] = ["name", "age", "profiles", "done"];

export default function RegisterPage() {
  const router = useRouter();

  // faza: prvo register, pa onda kratki profil
  const [phase, setPhase] = useState<"register" | "quiz">("register");
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];

  // auth inputs
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);

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

  // validacija
  const emailValid = useMemo(() => /.+@.+\..+/.test(email), [email]);
  const passValid = useMemo(() => pass.length >= 8, [pass]);
  const canRegister = emailValid && passValid && !loading;

  const ageNum = Number(age);

  function stepIsAnswered(step: Step) {
    switch (step) {
      case "name":
        return fullName.trim().length > 1;
      case "age":
        return Number.isFinite(ageNum) && ageNum >= 35 && ageNum <= 70;
      // ostali koraci nisu obavezni
      default:
        return true;
    }
  }

  function goNext() {
    if (!stepIsAnswered(currentStep)) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function onRegisterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canRegister) return;

    setErr(null);
    setInfo(null);
    setLoading(true);

    try {
      const nowIso = new Date().toISOString();
      const redirectTo = typeof window !== "undefined" 
        ? `${window.location.origin}/auth/callback?next=/register`
        : undefined;

      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { 
          data: { trial_start: nowIso },
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        const friendly =
          error.message.includes("email")
            ? "That email looks unavailable or invalid."
            : error.message.includes("rate limit")
            ? "Too many attempts — please wait a moment and try again."
            : error.message.includes("already registered")
            ? "An account with this email already exists. Please log in instead."
            : error.message;
        setErr(friendly);
        setLoading(false);
        return;
      }

      // Check if user was created
      if (!data?.user) {
        setErr("Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      // sačuvaj user id
      setUserId(data.user.id);

      // Check if session exists (email confirmation might not be required)
      const { data: sessionData } = await supabase.auth.getSession();
      const hasSession = !!sessionData.session;
      setSessionExistsAfterSignup(hasSession);

      // If no session, user needs to confirm email first
      if (!hasSession) {
        setInfo("Please check your email to confirm your account, then you can complete your profile.");
        // Still allow them to proceed to quiz, but they'll need to confirm email to finish
      }

      setPhase("quiz");
      setStepIndex(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unknown error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function finishQuiz() {
    setErr(null);
    setInfo(null);
    setLoading(true);

    try {
      // fallback ako iz nekog razloga userId nije setovan iz signUp-a
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
        throw new Error(errorMessage);
      }

      // If user has a session, redirect to dashboard
      if (sessionExistsAfterSignup) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      // If no session, user needs to confirm email first
      setInfo("Profile saved! Please check your email to confirm your account, then log in to access your dashboard.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "An error occurred while saving your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const progress = Math.min(stepIndex, STEPS.length - 2);
  const progressTotal = STEPS.length - 1;

  return (
    <main className="relative mx-auto max-w-md p-6 sm:p-8">
      {/* background accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-40">
        <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {phase === "register" && (
        <>
          <h1 className="text-3xl sm:text-5xl font-script font-extrabold tracking-tight mb-6 text-balance">
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

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 pr-11 ring-offset-background placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  type={showPass ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  aria-invalid={pass.length > 0 && !passValid}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute inset-y-0 right-2 my-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {/* eye icon */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    {showPass ? (
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    ) : (
                      <>
                        <path d="M3 3l18 18" />
                        <path d="M10.58 10.58a3 3 0 0 0 4.24 4.24" />
                        <path d="M9.88 4.26A9.91 9.91 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.37 4.62" />
                        <path d="M6.61 6.61A17.77 17.77 0 0 0 2 12s3.5 7 10 7a9.73 9.73 0 0 0 4.39-1" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground shadow-sm ring-1 ring-inset ring-primary/20 transition hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
              type="submit"
              disabled={!canRegister}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>

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
              className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-300"
            >
              {err}
            </div>
          )}

          <p className="mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              className="underline underline-offset-4 hover:opacity-80"
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
              Question {progress + 1} of {progressTotal}
            </p>

            <div className="mt-2 h-2 w-full rounded-full bg-foreground/10">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${(progress / progressTotal) * 100}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-card/40 p-4 space-y-4 min-h-[180px] flex flex-col justify-between">
            {currentStep === "name" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  What is your name?
                </label>
                <input
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {currentStep === "age" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  How old are you?
                </label>
                <input
                  inputMode="numeric"
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="e.g. 47"
                  value={age}
                  onChange={(e) =>
                    setAge(e.target.value.replace(/[^\d]/g, ""))
                  }
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Typical menopause ages are 35–70.
                </p>
              </div>
            )}

            {currentStep === "profiles" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Menopause profile (symptoms, stage, etc.)
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    rows={3}
                    placeholder="Describe your main symptoms, sleep pattern, stage (perimenopause, post-menopause...)"
                    value={menopauseText}
                    onChange={(e) => setMenopauseText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Nutrition profile (foods you like/avoid)
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    rows={2}
                    placeholder="Do you have something you can't eat? Any preferences?"
                    value={nutritionText}
                    onChange={(e) => setNutritionText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Exercise profile
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    rows={2}
                    placeholder="What kind of movement do you prefer or avoid?"
                    value={exerciseText}
                    onChange={(e) => setExerciseText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Emotional / stress profile
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    rows={2}
                    placeholder="Anything important about stress, mood, anxiety..."
                    value={emotionalText}
                    onChange={(e) => setEmotionalText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Lifestyle context
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
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

              {currentStep !== "done" ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!stepIsAnswered(currentStep) || loading}
                  className="text-sm px-4 py-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-60"
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
              className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-300"
            >
              {err}
            </div>
          )}
          {info && (
            <div
              role="status"
              className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
            >
              {info}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
