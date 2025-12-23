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

// GET: Fetch symptom logs with symptom details
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = searchParams.get("days");
    const daysNum = days ? parseInt(days, 10) : 30;

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: queryError } = await supabaseAdmin
      .from("symptom_logs")
      .select(`
        *,
        symptoms (name, icon)
      `)
      .eq("user_id", user.id)
      .gte("logged_at", startDate.toISOString())
      .order("logged_at", { ascending: false });

    if (queryError) {
      console.error("Supabase query error:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch symptom logs" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (e) {
    console.error("GET /api/symptom-logs error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create new symptom log entry
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
    const { symptomId, severity, triggers, notes } = body;

    // Validation
    if (!symptomId || typeof symptomId !== "string") {
      return NextResponse.json(
        { error: "Symptom ID is required" },
        { status: 400 }
      );
    }

    if (
      typeof severity !== "number" ||
      severity < 1 ||
      severity > 10 ||
      !Number.isInteger(severity)
    ) {
      return NextResponse.json(
        { error: "Severity must be an integer between 1 and 10" },
        { status: 400 }
      );
    }

    // Validate triggers array
    if (triggers !== undefined && !Array.isArray(triggers)) {
      return NextResponse.json(
        { error: "Triggers must be an array" },
        { status: 400 }
      );
    }

    // Insert symptom log
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: insertError } = await supabaseAdmin
      .from("symptom_logs")
      .insert([
        {
          user_id: user.id,
          symptom_id: symptomId,
          severity,
          triggers: triggers || [],
          notes: notes?.trim() || null,
        },
      ])
      .select(`
        *,
        symptoms (name, icon)
      `)
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save symptom log" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/symptom-logs error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update existing symptom log
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, severity, triggers, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Log ID is required" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (severity !== undefined) {
      if (
        typeof severity !== "number" ||
        severity < 1 ||
        severity > 10 ||
        !Number.isInteger(severity)
      ) {
        return NextResponse.json(
          { error: "Severity must be an integer between 1 and 10" },
          { status: 400 }
        );
      }
      updateData.severity = severity;
    }
    if (triggers !== undefined) {
      if (!Array.isArray(triggers)) {
        return NextResponse.json(
          { error: "Triggers must be an array" },
          { status: 400 }
        );
      }
      updateData.triggers = triggers;
    }
    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null;
    }

    // Update symptom log
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: updateError } = await supabaseAdmin
      .from("symptom_logs")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select(`
        *,
        symptoms (name, icon)
      `)
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update symptom log" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Symptom log not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error("PUT /api/symptom-logs error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete symptom log
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Log ID is required" },
        { status: 400 }
      );
    }

    // Delete symptom log
    const supabaseAdmin = getSupabaseAdmin();
    const { error: deleteError } = await supabaseAdmin
      .from("symptom_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Supabase delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete symptom log" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/symptom-logs error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

