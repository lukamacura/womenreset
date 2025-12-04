/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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

// POST: Create new symptom
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, severity, notes, occurred_at } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Symptom name is required" },
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

    if (!occurred_at) {
      return NextResponse.json(
        { error: "occurred_at timestamp is required" },
        { status: 400 }
      );
    }

    // Insert symptom (RLS will ensure user_id matches)
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: insertError } = await supabaseAdmin
      .from("symptoms")
      .insert([
        {
          user_id: user.id,
          name: name.trim(),
          severity,
          notes: notes?.trim() || null,
          occurred_at,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save symptom" },
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

// GET: List symptoms with optional date range filtering
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from("symptoms")
      .select("*")
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false });

    // Apply date range filters if provided
    if (startDate) {
      query = query.gte("occurred_at", startDate);
    }
    if (endDate) {
      query = query.lte("occurred_at", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
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

// PUT: Update existing symptom
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, severity, notes, occurred_at } = body;

    if (!id) {
      return NextResponse.json({ error: "Symptom ID is required" }, { status: 400 });
    }

    // Validation
    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json(
        { error: "Symptom name must be a non-empty string" },
        { status: 400 }
      );
    }

    if (
      severity !== undefined &&
      (typeof severity !== "number" ||
        severity < 1 ||
        severity > 10 ||
        !Number.isInteger(severity))
    ) {
      return NextResponse.json(
        { error: "Severity must be an integer between 1 and 10" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (severity !== undefined) updateData.severity = severity;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (occurred_at !== undefined) updateData.occurred_at = occurred_at;

    // Update symptom (RLS will ensure user owns it)
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: updateError } = await supabaseAdmin
      .from("symptoms")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id) // Extra safety check
      .select()
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update symptom" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Symptom not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error("PUT /api/symptoms error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete symptom
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Symptom ID is required" }, { status: 400 });
    }

    // Delete symptom (RLS will ensure user owns it)
    const supabaseAdmin = getSupabaseAdmin();
    const { error: deleteError } = await supabaseAdmin
      .from("symptoms")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Extra safety check

    if (deleteError) {
      console.error("Supabase delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete symptom" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/symptoms error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

