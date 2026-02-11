import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  if (process.env.NEXT_PUBLIC_APP_URL) origins.push(process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""));
  if (process.env.NEXT_PUBLIC_SITE_URL) origins.push(process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""));
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  origins.push("https://menolisa.com", "https://www.menolisa.com");
  origins.push("https://womenreset.com", "https://www.womenreset.com");
  origins.push("http://localhost:3000", "http://127.0.0.1:3000");
  return [...new Set(origins)];
}

function getBaseUrl(originFromRequest?: string | null): string {
  if (originFromRequest) {
    const allowed = getAllowedOrigins();
    const normalized = originFromRequest.replace(/\/$/, "");
    if (allowed.includes(normalized)) return normalized;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const returnOrigin = req.headers.get("origin") || req.headers.get("referer");
    const baseUrl = getBaseUrl(
      typeof returnOrigin === "string" && returnOrigin.startsWith("http")
        ? new URL(returnOrigin).origin
        : returnOrigin
    );

    const supabaseAdmin = getSupabaseAdmin();
    const { data: row, error: fetchError } = await supabaseAdmin
      .from("user_trials")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (fetchError || !row?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No subscription found. You can upgrade from the dashboard." },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${baseUrl}/dashboard`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create portal session." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe create-portal error:", err);
    return NextResponse.json(
      { error: "Failed to open subscription management." },
      { status: 500 }
    );
  }
}
