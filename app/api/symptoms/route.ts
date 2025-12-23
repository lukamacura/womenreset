/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { checkTrialExpired } from "@/lib/checkTrialStatus";

export const runtime = "nodejs";

// Helper: Get authenticated user from request
async function getAuthenticatedUser(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

// GET: Fetch user's symptom definitions
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: queryError } = await supabaseAdmin
      .from("symptoms")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (queryError) {
      console.error("Supabase query error:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch symptoms" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (e) {
    console.error("GET /api/symptoms error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create custom symptom (optional - users can add their own)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if trial is expired
    const isExpired = await checkTrialExpired(user.id);
    if (isExpired) {
      return NextResponse.json(
        { error: "Trial expired. Please upgrade to continue using the tracker." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, icon } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Symptom name is required" },
        { status: 400 }
      );
    }

    // Insert custom symptom (not default)
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: insertError } = await supabaseAdmin
      .from("symptoms")
      .insert([
        {
          user_id: user.id,
          name: name.trim(),
          icon: icon?.trim() || "🔴",
          is_default: false,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create symptom" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/symptoms error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
