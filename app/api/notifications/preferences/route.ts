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

// GET: Get notification preferences
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: queryError } = await supabaseAdmin
      .from("user_preferences")
      .select("notification_enabled, weekly_insights_enabled")
      .eq("user_id", user.id)
      .single();

    if (queryError) {
      // If no preferences exist, return defaults
      if (queryError.code === 'PGRST116') {
        return NextResponse.json({
          data: {
            notification_enabled: true,
            weekly_insights_enabled: true,
          }
        });
      }
      console.error("Supabase query error:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch notification preferences" },
        { status: 500 }
      );
    }

    // Return defaults if no preferences found
    if (!data) {
      return NextResponse.json({
        data: {
          notification_enabled: true,
          weekly_insights_enabled: true,
        }
      });
    }

    return NextResponse.json({ 
      data: {
        notification_enabled: data.notification_enabled ?? true,
        weekly_insights_enabled: data.weekly_insights_enabled ?? true,
      }
    });
  } catch (e) {
    console.error("GET /api/notifications/preferences error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update notification preferences
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { notification_enabled, weekly_insights_enabled } = body;

    const supabaseAdmin = getSupabaseAdmin();
    const updateData: Record<string, boolean> = {};

    if (notification_enabled !== undefined) {
      updateData.notification_enabled = notification_enabled;
    }
    if (weekly_insights_enabled !== undefined) {
      updateData.weekly_insights_enabled = weekly_insights_enabled;
    }

    // Ensure we have at least one field to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error: updateError } = await supabaseAdmin
      .from("user_preferences")
      .update(updateData)
      .eq("user_id", user.id)
      .select("notification_enabled, weekly_insights_enabled")
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      // If no preferences exist, create them
      if (updateError.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabaseAdmin
          .from("user_preferences")
          .insert([{ 
            user_id: user.id, 
            notification_enabled: notification_enabled ?? true,
            weekly_insights_enabled: weekly_insights_enabled ?? true,
            ...updateData 
          }])
          .select("notification_enabled, weekly_insights_enabled")
          .single();

        if (insertError) {
          return NextResponse.json(
            { error: "Failed to create notification preferences" },
            { status: 500 }
          );
        }

        return NextResponse.json({ data: newData });
      }

      return NextResponse.json(
        { error: "Failed to update notification preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error("PUT /api/notifications/preferences error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

