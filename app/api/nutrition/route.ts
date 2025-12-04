import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
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

// POST: Create new nutrition entry
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { food_item, meal_type, calories, notes, consumed_at } = body;

    // Validation
    if (!food_item || typeof food_item !== "string" || food_item.trim().length === 0) {
      return NextResponse.json(
        { error: "Food item is required" },
        { status: 400 }
      );
    }

    const validMealTypes = ["breakfast", "lunch", "dinner", "snack"];
    if (!meal_type || !validMealTypes.includes(meal_type)) {
      return NextResponse.json(
        { error: "Meal type must be one of: breakfast, lunch, dinner, snack" },
        { status: 400 }
      );
    }

    if (calories !== undefined && calories !== null) {
      if (typeof calories !== "number" || calories < 0) {
        return NextResponse.json(
          { error: "Calories must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    if (!consumed_at) {
      return NextResponse.json(
        { error: "consumed_at timestamp is required" },
        { status: 400 }
      );
    }

    // Insert nutrition entry (RLS will ensure user_id matches)
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: insertError } = await supabaseAdmin
      .from("nutrition")
      .insert([
        {
          user_id: user.id,
          food_item: food_item.trim(),
          meal_type,
          calories: calories !== undefined && calories !== null ? calories : null,
          notes: notes?.trim() || null,
          consumed_at,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save nutrition entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/nutrition error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: List nutrition entries with optional date range filtering
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
      .from("nutrition")
      .select("*")
      .eq("user_id", user.id)
      .order("consumed_at", { ascending: false });

    // Apply date range filters if provided
    if (startDate) {
      query = query.gte("consumed_at", startDate);
    }
    if (endDate) {
      query = query.lte("consumed_at", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch nutrition entries" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (e) {
    console.error("GET /api/nutrition error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update existing nutrition entry
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, food_item, meal_type, calories, notes, consumed_at } = body;

    if (!id) {
      return NextResponse.json({ error: "Nutrition entry ID is required" }, { status: 400 });
    }

    // Validation
    if (food_item !== undefined && (typeof food_item !== "string" || food_item.trim().length === 0)) {
      return NextResponse.json(
        { error: "Food item must be a non-empty string" },
        { status: 400 }
      );
    }

    const validMealTypes = ["breakfast", "lunch", "dinner", "snack"];
    if (meal_type !== undefined && !validMealTypes.includes(meal_type)) {
      return NextResponse.json(
        { error: "Meal type must be one of: breakfast, lunch, dinner, snack" },
        { status: 400 }
      );
    }

    if (calories !== undefined && calories !== null) {
      if (typeof calories !== "number" || calories < 0) {
        return NextResponse.json(
          { error: "Calories must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: any = {};
    if (food_item !== undefined) updateData.food_item = food_item.trim();
    if (meal_type !== undefined) updateData.meal_type = meal_type;
    if (calories !== undefined) updateData.calories = calories !== null ? calories : null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (consumed_at !== undefined) updateData.consumed_at = consumed_at;

    // Update nutrition entry (RLS will ensure user owns it)
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: updateError } = await supabaseAdmin
      .from("nutrition")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id) // Extra safety check
      .select()
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update nutrition entry" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Nutrition entry not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error("PUT /api/nutrition error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete nutrition entry
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Nutrition entry ID is required" }, { status: 400 });
    }

    // Delete nutrition entry (RLS will ensure user owns it)
    const supabaseAdmin = getSupabaseAdmin();
    const { error: deleteError } = await supabaseAdmin
      .from("nutrition")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Extra safety check

    if (deleteError) {
      console.error("Supabase delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete nutrition entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/nutrition error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

