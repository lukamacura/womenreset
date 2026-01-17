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
      .select("notification_enabled, reminder_time, weekly_insights_enabled, weekly_insights_day, weekly_insights_time")
      .eq("user_id", user.id)
      .single();

    if (queryError) {
      // If no preferences exist, return defaults
      if (queryError.code === 'PGRST116') {
        return NextResponse.json({
          data: {
            notification_enabled: true,
            reminder_time: "08:00",
            weekly_insights_enabled: true,
            weekly_insights_day: "sunday",
            weekly_insights_time: "20:00",
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
          reminder_time: "08:00",
          weekly_insights_enabled: true,
          weekly_insights_day: "sunday",
          weekly_insights_time: "20:00",
        }
      });
    }

    // Ensure all fields exist with defaults
    return NextResponse.json({ 
      data: {
        notification_enabled: data.notification_enabled ?? true,
        reminder_time: data.reminder_time || "08:00",
        weekly_insights_enabled: data.weekly_insights_enabled ?? true,
        weekly_insights_day: data.weekly_insights_day || "sunday",
        weekly_insights_time: data.weekly_insights_time || "20:00",
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
    const {
      notification_enabled,
      reminder_time,
      weekly_insights_enabled,
      weekly_insights_day,
      weekly_insights_time,
    } = body;

    // Validate reminder_time format (HH:MM)
    if (reminder_time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(reminder_time)) {
      return NextResponse.json(
        { error: "Invalid reminder_time format. Use HH:MM (e.g., 08:00)" },
        { status: 400 }
      );
    }

    // Validate reminder_time is before 9:00 AM UTC (when cron runs)
    // Only allow times from 6:00 AM to 8:59 AM UTC
    if (reminder_time) {
      const [hours, minutes] = reminder_time.split(":").map(Number);
      const timeInMinutes = hours * 60 + minutes;
      const minTime = 6 * 60; // 6:00 AM
      const maxTime = 8 * 60 + 59; // 8:59 AM
      
      if (timeInMinutes < minTime || timeInMinutes > maxTime) {
        return NextResponse.json(
          { error: "Reminder time must be between 6:00 AM and 8:59 AM UTC" },
          { status: 400 }
        );
      }
    }

    const supabaseAdmin = getSupabaseAdmin();
    const updateData: any = {};

    if (notification_enabled !== undefined) {
      updateData.notification_enabled = notification_enabled;
    }
    if (reminder_time !== undefined) {
      updateData.reminder_time = reminder_time;
    }
    if (weekly_insights_enabled !== undefined) {
      updateData.weekly_insights_enabled = weekly_insights_enabled;
    }
    if (weekly_insights_day !== undefined) {
      if (!['sunday', 'monday'].includes(weekly_insights_day)) {
        return NextResponse.json(
          { error: "weekly_insights_day must be 'sunday' or 'monday'" },
          { status: 400 }
        );
      }
      updateData.weekly_insights_day = weekly_insights_day;
    }
    if (weekly_insights_time !== undefined) {
      // Validate time format (HH:MM)
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(weekly_insights_time)) {
        return NextResponse.json(
          { error: "Invalid weekly_insights_time format. Use HH:MM (e.g., 20:00)" },
          { status: 400 }
        );
      }
      updateData.weekly_insights_time = weekly_insights_time;
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
      .select("notification_enabled, reminder_time, weekly_insights_enabled, weekly_insights_day, weekly_insights_time")
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
            reminder_time: reminder_time || "08:00",
            weekly_insights_enabled: weekly_insights_enabled ?? true,
            weekly_insights_day: weekly_insights_day || "sunday",
            weekly_insights_time: weekly_insights_time || "20:00",
            ...updateData 
          }])
          .select("notification_enabled, reminder_time, weekly_insights_enabled, weekly_insights_day, weekly_insights_time")
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

