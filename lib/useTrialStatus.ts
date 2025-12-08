import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

const MS = {
  SECOND: 1000,
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
};

export type TrialStatus = {
  expired: boolean;
  start: Date | null;
  end: Date | null;
  daysLeft: number;
  elapsedDays: number;
  progressPct: number;
  remaining: { d: number; h: number; m: number; s: number };
  trialDays?: number;
  loading: boolean;
  error: string | null;
};

export function useTrialStatus() {
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    expired: false,
    start: null,
    end: null,
    daysLeft: 3,
    elapsedDays: 0,
    progressPct: 0,
    remaining: { d: 3, h: 0, m: 0, s: 0 },
    loading: true,
    error: null,
  });
  const [now, setNow] = useState<Date>(new Date());

  // Ticker for live countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), MS.SECOND);
    return () => clearInterval(id);
  }, []);

  const fetchUserTrial = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_trials")
        .select("trial_start, trial_end, trial_days, account_status")
        .eq("user_id", userId)
        .single();

      if (error) {
        // Check if table doesn't exist
        const errorMsg = error.message?.toLowerCase() || "";
        const isTableMissing = errorMsg.includes("does not exist") || 
                               errorMsg.includes("relation") ||
                               error.code === "42P01";
        
        if (isTableMissing) {
          // Table doesn't exist yet - return defaults silently
          return {
            trial_start: new Date().toISOString(),
            trial_end: null,
            trial_days: 3,
            account_status: "trial",
          };
        }
        
        // If row doesn't exist (PGRST116), try to create it
        if (error.code === "PGRST116") {
          const nowIso = new Date().toISOString();
          const { data: newTrial, error: insertError } = await supabase
            .from("user_trials")
            .insert([
              {
                user_id: userId,
                trial_start: nowIso,
                trial_days: 3,
                account_status: "trial",
              },
            ])
            .select("trial_start, trial_end, trial_days, account_status")
            .single();

          if (insertError) {
            // If insert fails, return defaults
            return {
              trial_start: nowIso,
              trial_end: null,
              trial_days: 3,
              account_status: "trial",
            };
          }
          return newTrial;
        }
        
        // Any other error - return defaults silently
        return {
          trial_start: new Date().toISOString(),
          trial_end: null,
          trial_days: 3,
          account_status: "trial",
        };
      }

      // If trial_start is null, initialize it
      if (!data.trial_start) {
        const nowIso = new Date().toISOString();
        const { data: updated, error: updateError } = await supabase
          .from("user_trials")
          .update({
            trial_start: nowIso,
            trial_days: data.trial_days || 3,
            account_status: "trial",
          })
          .eq("user_id", userId)
          .select("trial_start, trial_end, trial_days, account_status")
          .single();

        if (updateError) {
          return {
            trial_start: nowIso,
            trial_end: null,
            trial_days: data.trial_days || 3,
            account_status: "trial",
          };
        }
        return updated;
      }

      return data;
    } catch {
      // Silently return defaults on any error
      return {
        trial_start: new Date().toISOString(),
        trial_end: null,
        trial_days: 3,
        account_status: "trial",
      };
    }
  }, []);

  // Store the raw trial data separately from calculated values
  const [trialData, setTrialData] = useState<{
    trialDays: number;
    start: Date | null;
    end: Date | null;
    accountStatus: string;
  } | null>(null);

  // Fetch trial data once on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setTrialStatus((prev) => ({ ...prev, loading: true, error: null }));

        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        const userId = data.user?.id;
        if (!userId) {
          if (mounted) {
            setTrialStatus({
              expired: false,
              start: null,
              end: null,
              daysLeft: 3,
              elapsedDays: 0,
              progressPct: 0,
              remaining: { d: 3, h: 0, m: 0, s: 0 },
              loading: false,
              error: "User not authenticated",
            });
          }
          return;
        }

        const userTrial = await fetchUserTrial(userId);
        if (!mounted) return;

        const trialDays = userTrial.trial_days || 3;
        const start = userTrial.trial_start ? new Date(userTrial.trial_start) : null;
        const end = userTrial.trial_end ? new Date(userTrial.trial_end) : null;

        // Store the raw data
        setTrialData({
          trialDays,
          start,
          end,
          accountStatus: userTrial.account_status || "trial",
        });

        setTrialStatus((prev) => ({ ...prev, loading: false }));
      } catch (e) {
        if (mounted) {
          setTrialStatus((prev) => ({
            ...prev,
            loading: false,
            error: e instanceof Error ? e.message : "Unknown error",
          }));
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fetchUserTrial]);

  // Update calculations based on current time (runs every second but doesn't re-fetch)
  useEffect(() => {
    if (!trialData || trialStatus.loading) return;

    const { trialDays, start, end, accountStatus } = trialData;

    if (!start) {
      setTrialStatus({
        expired: false,
        start: null,
        end: null,
        daysLeft: trialDays,
        elapsedDays: 0,
        progressPct: 0,
        remaining: { d: trialDays, h: 0, m: 0, s: 0 },
        trialDays,
        loading: false,
        error: null,
      });
      return;
    }

    // Use trial_end from database if available, otherwise calculate
    const endTs = end ? end.getTime() : start.getTime() + trialDays * MS.DAY;
    const startTs = start.getTime();
    const nowTs = now.getTime();

    const remainingMs = Math.max(0, endTs - nowTs);
    const expired: boolean =
      accountStatus === "expired" ||
      remainingMs === 0 ||
      (end !== null && end.getTime() < nowTs);

    const elapsedDays = Math.floor((nowTs - startTs) / MS.DAY);
    const daysLeft = Math.max(0, Math.ceil(remainingMs / MS.DAY));
    const progressPct = Math.min(100, (elapsedDays / trialDays) * 100);

    const d = Math.floor(remainingMs / MS.DAY);
    const h = Math.floor((remainingMs % MS.DAY) / MS.HOUR);
    const m = Math.floor((remainingMs % MS.HOUR) / MS.MINUTE);
    const s = Math.floor((remainingMs % MS.MINUTE) / MS.SECOND);

    setTrialStatus({
      expired,
      start,
      end: new Date(endTs),
      daysLeft,
      elapsedDays,
      progressPct,
      remaining: { d, h, m, s },
      trialDays,
      loading: false,
      error: null,
    });
  }, [trialData, now, trialStatus.loading]);

  return trialStatus;
}

