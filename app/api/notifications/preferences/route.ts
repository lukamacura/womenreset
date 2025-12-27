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
      .select("notification_enabled, morning_checkin_time, evening_checkin_enabled, evening_checkin_time, weekly_summary_day, insight_notifications, streak_reminders")
      .eq("user_id", user.id)
      .single();

    if (queryError) {
      console.error("Supabase query error:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch notification preferences" },
        { status: 500 }
      );
    }

    // Return defaults if no preferences found
    if (!data) {
      return NextResponse.json({
        notification_enabled: true,
        morning_checkin_time: "08:00",
        evening_checkin_enabled: false,
        evening_checkin_time: "20:00",
        weekly_summary_day: 0,
        insight_notifications: true,
        streak_reminders: true,
      });
    }

    return NextResponse.json({ data });
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
    const {
      notification_enabled,
      morning_checkin_time,
      evening_checkin_enabled,
      evening_checkin_time,
      weekly_summary_day,
      insight_notifications,
      streak_reminders,
    } = body;

    // Validate time format (HH:MM)
    if (morning_checkin_time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(morning_checkin_time)) {
      return NextResponse.json(
        { error: "Invalid morning_checkin_time format. Use HH:MM" },
        { status: 400 }
      );
    }

    if (evening_checkin_time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(evening_checkin_time)) {
      return NextResponse.json(
        { error: "Invalid evening_checkin_time format. Use HH:MM" },
        { status: 400 }
      );
    }

    // Validate weekly_summary_day (0-6, where 0=Sunday)
    if (weekly_summary_day !== undefined && (weekly_summary_day < 0 || weekly_summary_day > 6)) {
      return NextResponse.json(
        { error: "weekly_summary_day must be between 0 (Sunday) and 6 (Saturday)" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const updateData: any = {};

    if (notification_enabled !== undefined) updateData.notification_enabled = notification_enabled;
    if (morning_checkin_time !== undefined) updateData.morning_checkin_time = morning_checkin_time;
    if (evening_checkin_enabled !== undefined) updateData.evening_checkin_enabled = evening_checkin_enabled;
    if (evening_checkin_time !== undefined) updateData.evening_checkin_time = evening_checkin_time;
    if (weekly_summary_day !== undefined) updateData.weekly_summary_day = weekly_summary_day;
    if (insight_notifications !== undefined) updateData.insight_notifications = insight_notifications;
    if (streak_reminders !== undefined) updateData.streak_reminders = streak_reminders;

    const { data, error: updateError } = await supabaseAdmin
      .from("user_preferences")
      .update(updateData)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      // If no preferences exist, create them
      if (updateError.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabaseAdmin
          .from("user_preferences")
          .insert([{ user_id: user.id, ...updateData }])
          .select()
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

