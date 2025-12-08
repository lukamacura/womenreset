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

// POST: Create new fitness entry
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
    const { exercise_name, exercise_type, duration_minutes, calories_burned, intensity, notes, performed_at } = body;

    // Validation
    if (!exercise_name || typeof exercise_name !== "string" || exercise_name.trim().length === 0) {
      return NextResponse.json(
        { error: "Exercise name is required" },
        { status: 400 }
      );
    }

    const validExerciseTypes = ["cardio", "strength", "flexibility", "sports", "other"];
    if (!exercise_type || !validExerciseTypes.includes(exercise_type)) {
      return NextResponse.json(
        { error: "Exercise type must be one of: cardio, strength, flexibility, sports, other" },
        { status: 400 }
      );
    }

    if (duration_minutes !== undefined && duration_minutes !== null) {
      if (typeof duration_minutes !== "number" || duration_minutes < 0) {
        return NextResponse.json(
          { error: "Duration must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    if (calories_burned !== undefined && calories_burned !== null) {
      if (typeof calories_burned !== "number" || calories_burned < 0) {
        return NextResponse.json(
          { error: "Calories burned must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    const validIntensities = ["low", "medium", "high"];
    if (intensity !== undefined && intensity !== null && !validIntensities.includes(intensity)) {
      return NextResponse.json(
        { error: "Intensity must be one of: low, medium, high" },
        { status: 400 }
      );
    }

    if (!performed_at) {
      return NextResponse.json(
        { error: "performed_at timestamp is required" },
        { status: 400 }
      );
    }

    // Insert fitness entry (RLS will ensure user_id matches)
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: insertError } = await supabaseAdmin
      .from("fitness")
      .insert([
        {
          user_id: user.id,
          exercise_name: exercise_name.trim(),
          exercise_type,
          duration_minutes: duration_minutes !== undefined && duration_minutes !== null ? duration_minutes : null,
          calories_burned: calories_burned !== undefined && calories_burned !== null ? calories_burned : null,
          intensity: intensity || null,
          notes: notes?.trim() || null,
          performed_at,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save fitness entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/fitness error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: List fitness entries with optional date range filtering
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
      .from("fitness")
      .select("*")
      .eq("user_id", user.id)
      .order("performed_at", { ascending: false });

    // Apply date range filters if provided
    if (startDate) {
      query = query.gte("performed_at", startDate);
    }
    if (endDate) {
      query = query.lte("performed_at", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch fitness entries" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (e) {
    console.error("GET /api/fitness error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update existing fitness entry
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, exercise_name, exercise_type, duration_minutes, calories_burned, intensity, notes, performed_at } = body;

    if (!id) {
      return NextResponse.json({ error: "Fitness entry ID is required" }, { status: 400 });
    }

    // Validation
    if (exercise_name !== undefined && (typeof exercise_name !== "string" || exercise_name.trim().length === 0)) {
      return NextResponse.json(
        { error: "Exercise name must be a non-empty string" },
        { status: 400 }
      );
    }

    const validExerciseTypes = ["cardio", "strength", "flexibility", "sports", "other"];
    if (exercise_type !== undefined && !validExerciseTypes.includes(exercise_type)) {
      return NextResponse.json(
        { error: "Exercise type must be one of: cardio, strength, flexibility, sports, other" },
        { status: 400 }
      );
    }

    if (duration_minutes !== undefined && duration_minutes !== null) {
      if (typeof duration_minutes !== "number" || duration_minutes < 0) {
        return NextResponse.json(
          { error: "Duration must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    if (calories_burned !== undefined && calories_burned !== null) {
      if (typeof calories_burned !== "number" || calories_burned < 0) {
        return NextResponse.json(
          { error: "Calories burned must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    const validIntensities = ["low", "medium", "high"];
    if (intensity !== undefined && intensity !== null && !validIntensities.includes(intensity)) {
      return NextResponse.json(
        { error: "Intensity must be one of: low, medium, high" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: {
      exercise_name?: string;
      exercise_type?: string;
      duration_minutes?: number | null;
      calories_burned?: number | null;
      intensity?: string | null;
      notes?: string | null;
      performed_at?: string;
    } = {};
    if (exercise_name !== undefined) updateData.exercise_name = exercise_name.trim();
    if (exercise_type !== undefined) updateData.exercise_type = exercise_type;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes !== null ? duration_minutes : null;
    if (calories_burned !== undefined) updateData.calories_burned = calories_burned !== null ? calories_burned : null;
    if (intensity !== undefined) updateData.intensity = intensity || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (performed_at !== undefined) updateData.performed_at = performed_at;

    // Update fitness entry (RLS will ensure user owns it)
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: updateError } = await supabaseAdmin
      .from("fitness")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id) // Extra safety check
      .select()
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update fitness entry" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Fitness entry not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error("PUT /api/fitness error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete fitness entry
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Fitness entry ID is required" }, { status: 400 });
    }

    // Delete fitness entry (RLS will ensure user owns it)
    const supabaseAdmin = getSupabaseAdmin();
    const { error: deleteError } = await supabaseAdmin
      .from("fitness")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Extra safety check

    if (deleteError) {
      console.error("Supabase delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete fitness entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/fitness error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

