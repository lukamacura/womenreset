import { getSupabaseAdmin } from "./supabaseAdmin";

export async function checkTrialExpired(userId: string): Promise<boolean> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("user_trials")
      .select("trial_start, trial_end, trial_days, account_status")
      .eq("user_id", userId)
      .single();

    if (error) {
      // If table doesn't exist or row doesn't exist, assume trial is active
      if (error.code === "PGRST116" || error.message?.toLowerCase().includes("does not exist")) {
        return false;
      }
      // For other errors, assume trial is active to avoid blocking users
      return false;
    }

    // Check if account status is expired
    if (data.account_status === "expired") {
      return true;
    }

    // Check if trial_end has passed
    if (data.trial_end) {
      const trialEnd = new Date(data.trial_end);
      const now = new Date();
      if (trialEnd < now) {
        return true;
      }
    } else if (data.trial_start) {
      // Calculate trial end if not set
      const trialDays = data.trial_days || 3;
      const trialStart = new Date(data.trial_start);
      const trialEnd = new Date(trialStart);
      trialEnd.setDate(trialEnd.getDate() + trialDays);
      const now = new Date();
      if (trialEnd < now) {
        return true;
      }
    }

    return false;
  } catch {
    // On error, assume trial is active to avoid blocking users
    return false;
  }
}

