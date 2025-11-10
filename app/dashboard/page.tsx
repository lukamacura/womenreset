"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

// Prevent static prerendering (safe)
export const dynamic = "force-dynamic";

const TRIAL_DAYS = 3;
// Internal chat route
const CHAT_BASE = "/chat";

// ---------------------------
// Small UI helpers
// ---------------------------
const MS = {
  SECOND: 1000,
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
};

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-background/60 px-4 py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-foreground/10">
      <div
        className="h-full bg-primary transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={classNames("animate-pulse rounded bg-foreground/10", className)} />;
}

// ---------------------------
// Types
// ---------------------------
type TrialMeta = { trial_start?: string };

// ---------------------------
// Page
// ---------------------------
export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  // Ticker for live countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), MS.SECOND);
    return () => clearInterval(id);
  }, []);

  // Keep session fresh and react to auth changes
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login?redirectedFrom=/dashboard");
      }
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        const { data } = await supabase.auth.getUser();
        setUser(data.user ?? null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        const u = data.user;
        if (!u) {
          router.replace("/login?redirectedFrom=/dashboard");
          return;
        }

        // Ensure trial_start exists for legacy accounts
        const meta = (u.user_metadata ?? {}) as TrialMeta;
        if (!meta.trial_start) {
          const nowIso = new Date().toISOString();
          const { data: upd, error: updErr } = await supabase.auth.updateUser({
            data: { trial_start: nowIso },
          });
          if (updErr) throw updErr;
          if (mounted) setUser(upd?.user ?? u);
        } else {
          if (mounted) setUser(u);
        }
      } catch (e) {
        if (mounted) setErr(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  // Trial computations (UTC-safe)
  const trial = useMemo(() => {
    const startIso = (user?.user_metadata as TrialMeta | undefined)?.trial_start;
    const start = startIso ? new Date(startIso) : null;
    if (!start) {
      return {
        start,
        end: null as Date | null,
        expired: false,
        daysLeft: TRIAL_DAYS,
        elapsedDays: 0,
        progressPct: 0,
        remaining: { d: TRIAL_DAYS, h: 0, m: 0, s: 0 },
      };
    }

    const startTs = start.getTime();
    const endTs = startTs + TRIAL_DAYS * MS.DAY;
    const nowTs = now.getTime();

    const remainingMs = Math.max(0, endTs - nowTs);
    const expired = remainingMs === 0;

    const elapsedDays = Math.floor((nowTs - startTs) / MS.DAY);
    const daysLeft = Math.max(0, TRIAL_DAYS - elapsedDays);
    const progressPct = Math.min(100, (elapsedDays / TRIAL_DAYS) * 100);

    const d = Math.floor(remainingMs / MS.DAY);
    const h = Math.floor((remainingMs % MS.DAY) / MS.HOUR);
    const m = Math.floor((remainingMs % MS.HOUR) / MS.MINUTE);
    const s = Math.floor((remainingMs % MS.MINUTE) / MS.SECOND);

    return {
      start,
      end: new Date(endTs),
      expired,
      daysLeft,
      elapsedDays,
      progressPct,
      remaining: { d, h, m, s },
    };
  }, [user, now]);

  // ---------------------------
  // Event handlers
  // ---------------------------
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unknown error");
    }
  }

  // ---------------------------
  // Render
  // ---------------------------
  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-6 sm:p-8 space-y-6 text-[17px] sm:text-[18px]">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-11 w-52" />
      </main>
    );
  }

  if (err) {
    return (
      <main className="mx-auto max-w-4xl p-6 sm:p-8 text-[17px] sm:text-[18px]">
        <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4">
          <div className="font-semibold text-rose-300 text-lg">Error</div>
          <p className="mt-1 text-base text-rose-200/90">{err}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => router.refresh()}
              className="inline-flex items-center rounded-lg bg-foreground/10 px-3 py-2 text-base hover:bg-foreground/15"
            >
              Try again
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center rounded-lg border border-foreground/15 px-3 py-2 text-base hover:bg-foreground/5"
            >
              Log out
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6 sm:p-8 space-y-8 text-[17px] sm:text-[18px]">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-base text-muted-foreground">
            Welcome{user?.email ? `, ${user.email}` : ""}.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleLogout}
            className="inline-flex items-center rounded-lg border border-foreground/15 px-4 py-2 text-base hover:bg-foreground/5"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Trial card */}
      <section className="rounded-2xl border border-foreground/10 bg-background/60 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            {!trial.expired ? (
              <>
                <h2 className="text-xl font-semibold">Your trial is active</h2>
                <p className="text-base text-muted-foreground">
                  {trial.start && (
                    <>
                      Started on {trial.start.toLocaleDateString()} · Ends{" "}
                      {trial.end?.toLocaleDateString()}
                    </>
                  )}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold">Your trial has expired</h2>
                <p className="text-base text-muted-foreground">Upgrade to continue using the chatbot.</p>
              </>
            )}
          </div>

          <div className="w-full sm:w-96">
            <Progress value={trial.progressPct} />
            <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {Math.min(TRIAL_DAYS, trial.elapsedDays)} / {TRIAL_DAYS} days used
              </span>
              <span>{trial.daysLeft} days left</span>
            </div>
          </div>
        </div>

        {/* Stats & countdown */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Status" value={trial.expired ? "Expired" : "Active"} />
          <Stat label="Days left" value={String(trial.daysLeft)} />
          <Stat
            label="Ends in"
            value={`${trial.remaining.d}d ${trial.remaining.h}h ${trial.remaining.m}m ${trial.remaining.s}s`}
          />
          <Stat label="Plan" value={trial.expired ? "-" : "Trial"} />
        </div>

        {/* Single bot: Lisa */}
        <div className="mt-6">
          <h3 className="mb-3 text-base font-semibold text-foreground/80">Your menopause expert</h3>

          <div className="grid grid-cols-1 gap-3 sm:max-w-lg">
            {(() => {
              const trialLocked = trial.expired;
              const CardInner = (
                <div
                  className={classNames(
                    "group relative h-full rounded-2xl p-4 shadow-sm",
                    "bg-linear-to-b from-red-50 to-[#CBA7E2]",
                    trialLocked && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <Image
                      src="/lisa.png" // zameni sa /lisa.png ako dodaš asset
                      alt="Lisa"
                      width={110}
                      height={110}
                      className="rounded-full h-32 w-auto"
                    />
                    <div>
                      <div className="text-xl font-semibold leading-tight">Lisa</div>
                      <div className="text-sm text-foreground/70">Expert for menopause</div>
                    </div>
                  </div>

                  <p className="mt-3 text-base text-foreground/80">
                    Chat with Lisa for tailored menopause guidance - symptoms, lifestyle, nutrition & more.
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-lg font-medium">
                    <span className="transition-transform group-hover:translate-x-0.5">
                      {trialLocked ? "Locked" : "Start chat"}
                    </span>
                    {!trialLocked && (
                      <svg
                        className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.293 3.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L13.586 10H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  {trialLocked && <div className="pointer-events-none absolute inset-0 rounded-2xl" />}
                </div>
              );

              return trialLocked ? (
                <div className="h-full">{CardInner}</div>
              ) : (
                <Link href={`${CHAT_BASE}/lisa`} className="h-full">
                  {CardInner}
                </Link>
              );
            })()}
          </div>

          {trial.expired && (
            <p className="mt-3 text-sm text-muted-foreground">
              Access is closed while on an expired trial. Choose a plan to continue.
            </p>
          )}
        </div>
      </section>

      {/* Helpful area */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-foreground/10 p-5">
          <h3 className="font-semibold mb-2 text-lg">Quick tips</h3>
          <ul className="list-disc pl-5 text-base text-muted-foreground space-y-1.5">
            <li>Ask targeted questions to get tailored recommendations.</li>
            <li>Track symptoms daily to see patterns during your trial.</li>
            <li>Review your plan before the trial ends.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-foreground/10 p-5">
          <h3 className="font-semibold mb-2 text-lg">Need help?</h3>
          <p className="text-base text-muted-foreground">
            Visit <Link className="underline underline-offset-4" href="/help">Help Center</Link>{" "}
            or <Link className="underline underline-offset-4" href="/contact">contact support</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
