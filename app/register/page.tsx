"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type YesNo = "yes" | "no" | "";
type Step =
  | "name"
  | "age"
  | "irregularPeriods"
  | "hotFlashes"
  | "sleepTrouble"
  | "moodChanges"
  | "nightSweats"
  | "weightChanges"
  | "vaginalDryness"
  | "familyHistory"
  | "done";

const STEPS: Step[] = [
  "name",
  "age",
  "irregularPeriods",
  "hotFlashes",
  "sleepTrouble",
  "moodChanges",
  "nightSweats",
  "weightChanges",
  "vaginalDryness",
  "familyHistory",
  "done",
];

export default function RegisterPage() {
  const router = useRouter();

  // phase: register first, then quiz
  const [phase, setPhase] = useState<"register" | "quiz">("register");
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];

  // auth inputs
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  // store supabase user id here
  const [userId, setUserId] = useState<string | null>(null);

  // quiz inputs
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<string>("");

  const [irregularPeriods, setIrregularPeriods] = useState<YesNo>("");
  const [hotFlashes, setHotFlashes] = useState<YesNo>("");
  const [sleepTrouble, setSleepTrouble] = useState<YesNo>("");
  const [moodChanges, setMoodChanges] = useState<YesNo>("");
  const [nightSweats, setNightSweats] = useState<YesNo>("");
  const [weightChanges, setWeightChanges] = useState<YesNo>("");
  const [vaginalDryness, setVaginalDryness] = useState<YesNo>("");
  const [familyHistory, setFamilyHistory] = useState<YesNo>("");

  // general UI
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sessionExistsAfterSignup, setSessionExistsAfterSignup] =
    useState(false);

  // validation
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
      case "irregularPeriods":
        return irregularPeriods !== "";
      case "hotFlashes":
        return hotFlashes !== "";
      case "sleepTrouble":
        return sleepTrouble !== "";
      case "moodChanges":
        return moodChanges !== "";
      case "nightSweats":
        return nightSweats !== "";
      case "weightChanges":
        return weightChanges !== "";
      case "vaginalDryness":
        return vaginalDryness !== "";
      case "familyHistory":
        return familyHistory !== "";
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

  function YesNoButtons({
    value,
    onChange,
  }: {
    value: YesNo;
    onChange: (v: YesNo) => void;
  }) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange("yes")}
          className={`px-4 py-2 rounded-xl text-sm border transition ${
            value === "yes"
              ? "bg-primary text-primary-foreground border-primary/50"
              : "border-foreground/15 hover:bg-foreground/5"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange("no")}
          className={`px-4 py-2 rounded-xl text-sm border transition ${
            value === "no"
              ? "bg-primary text-primary-foreground border-primary/50"
              : "border-foreground/15 hover:bg-foreground/5"
          }`}
        >
          No
        </button>
      </div>
    );
  }

  async function onRegisterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canRegister) return;

    setErr(null);
    setInfo(null);
    setLoading(true);

    try {
      const nowIso = new Date().toISOString();

      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: { trial_start: nowIso } },
      });

      if (error) {
        const friendly =
          error.message.includes("email")
            ? "That email looks unavailable or invalid."
            : error.message.includes("rate limit")
            ? "Too many attempts — please wait a moment and try again."
            : error.message;
        setErr(friendly);
        return;
      }

      // ✅ capture user id even if confirmation is enabled
      setUserId(data?.user?.id ?? null);

      const { data: sessionData } = await supabase.auth.getSession();
      setSessionExistsAfterSignup(!!sessionData.session);

      // move to quiz
      setPhase("quiz");
      setStepIndex(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function finishQuiz() {
    setErr(null);
    setInfo(null);
    setLoading(true);

    try {
      // fallback in case userId wasn't set for any reason
        let finalUserId = userId;
        if (!finalUserId) {
          const { data } = await supabase.auth.getUser();
          finalUserId = data.user?.id ?? null;
        }

      const intakePayload = {
        user_id: finalUserId, // ✅ required for your VS table
        name: fullName.trim(),
        age: ageNum,

        irregular_periods: irregularPeriods,
        hot_flashes: hotFlashes,
        sleep_trouble: sleepTrouble,
        mood_changes: moodChanges,
        night_sweats: nightSweats,
        weight_changes: weightChanges,
        vaginal_dryness: vaginalDryness,
        family_history: familyHistory,
      };

      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intakePayload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to save intake.");
      }

      if (sessionExistsAfterSignup) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setInfo("Check your inbox to confirm your email, then log in.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unknown error");
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
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight mb-6 text-balance">
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
            <h1 className="text-2xl font-bold">Quick menopause quiz</h1>
            <p className="text-xs text-muted-foreground">
              Question {progress + 1} of {progressTotal}
            </p>

            {/* progress bar */}
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

            {currentStep === "irregularPeriods" && (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Are your periods irregular at the moment?
                </p>
                <YesNoButtons
                  value={irregularPeriods}
                  onChange={setIrregularPeriods}
                />
              </div>
            )}

            {currentStep === "hotFlashes" && (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Do you experience hot flashes?
                </p>
                <YesNoButtons value={hotFlashes} onChange={setHotFlashes} />
              </div>
            )}

            {currentStep === "sleepTrouble" && (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Do you have trouble sleeping?
                </p>
                <YesNoButtons value={sleepTrouble} onChange={setSleepTrouble} />
              </div>
            )}

            {currentStep === "moodChanges" && (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Have you noticed mood changes or irritability?
                </p>
                <YesNoButtons value={moodChanges} onChange={setMoodChanges} />
              </div>
            )}

            {currentStep === "nightSweats" && (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Do you experience night sweats?
                </p>
                <YesNoButtons value={nightSweats} onChange={setNightSweats} />
              </div>
            )}

            {currentStep === "weightChanges" && (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Have you noticed weight or metabolism changes?
                </p>
                <YesNoButtons value={weightChanges} onChange={setWeightChanges} />
              </div>
            )}

            {currentStep === "vaginalDryness" && (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Do you have vaginal dryness or discomfort?
                </p>
                <YesNoButtons
                  value={vaginalDryness}
                  onChange={setVaginalDryness}
                />
              </div>
            )}

            {currentStep === "familyHistory" && (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Is there family history of early menopause or hormonal issues?
                </p>
                <YesNoButtons value={familyHistory} onChange={setFamilyHistory} />
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
