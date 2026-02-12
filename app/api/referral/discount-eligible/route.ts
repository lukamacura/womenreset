import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * GET /api/referral/discount-eligible
 * Returns whether the current user is eligible for the one-time 50% referral discount.
 * Eligible = has referred at least one user AND has not yet used the discount (referral_discount_used_at is null).
 * Auth: cookie (web) or Bearer (mobile).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const [refRes, trialRes] = await Promise.all([
      supabaseAdmin.from("referrals").select("id").eq("referrer_id", user.id).limit(1),
      supabaseAdmin.from("user_trials").select("referral_discount_used_at").eq("user_id", user.id).maybeSingle(),
    ]);

    const hasReferred = (refRes.data?.length ?? 0) > 0;
    const discountNotUsed = trialRes.data?.referral_discount_used_at == null;
    const eligible = hasReferred && discountNotUsed;

    return NextResponse.json({ eligible });
  } catch (e) {
    console.error("GET /api/referral/discount-eligible error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
