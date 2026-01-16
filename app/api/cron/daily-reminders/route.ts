import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { checkTrialExpired } from "@/lib/checkTrialStatus";

export const runtime = "nodejs";

// This endpoint should be called by a cron job (Vercel Cron, Supabase Edge Function, etc.)
// Schedule: Once per day at 9:00 AM UTC (due to Vercel Hobby plan limitations)
// The endpoint checks all users whose reminder_time has passed today and sends reminders

export async function GET(req: NextRequest) {
  try {
    // Optional: Add a secret header to prevent unauthorized access
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Get today's date in UTC (start of day)
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    const todayEnd = new Date(today);
    todayEnd.setUTCHours(23, 59, 59, 999);
    const todayEndStr = todayEnd.toISOString();

    // Fetch users who have notifications enabled
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from("user_preferences")
      .select("user_id, reminder_time")
      .eq("notification_enabled", true);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    if (!allUsers || allUsers.length === 0) {
      return NextResponse.json({ 
        message: "No users with notifications enabled",
        count: 0 
      });
    }

    // Filter users whose reminder_time has passed today
    // Since cron runs once per day at 9 AM, we check all users whose reminder time
    // was earlier today (before current time)
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    const users = allUsers.filter((userPref) => {
      if (!userPref.reminder_time) return false;
      // reminder_time might be "09:00:00" or "09:00", extract hour and minute
      const timeStr = userPref.reminder_time.toString();
      const parts = timeStr.split(":");
      const reminderHour = parseInt(parts[0], 10);
      const reminderMinute = parseInt(parts[1] || "0", 10);
      const reminderTimeMinutes = reminderHour * 60 + reminderMinute;
      
      // Include users whose reminder time has passed today
      return reminderTimeMinutes <= currentTimeMinutes;
    });

    if (!users || users.length === 0) {
      return NextResponse.json({ 
        message: "No users need reminders at this time",
        count: 0 
      });
    }

    let notificationsCreated = 0;
    let errors = 0;

    // For each user, check if they've tracked symptoms today
    for (const userPref of users) {
      try {
        // Check if user has tracked symptoms today
        const { data: symptomLogs, error: logsError } = await supabaseAdmin
          .from("symptom_logs")
          .select("id")
          .eq("user_id", userPref.user_id)
          .gte("logged_at", todayStart)
          .lte("logged_at", todayEndStr)
          .limit(1);

        if (logsError) {
          console.error(`Error checking symptoms for user ${userPref.user_id}:`, logsError);
          errors++;
          continue;
        }

        // If user has already tracked symptoms today, skip
        if (symptomLogs && symptomLogs.length > 0) {
          continue;
        }

        // Check if trial is expired (don't send reminders to expired trials)
        const isExpired = await checkTrialExpired(userPref.user_id);
        if (isExpired) {
          continue;
        }

        // Check if we already sent a reminder today (prevent duplicates)
        const { data: existingNotification } = await supabaseAdmin
          .from("notifications")
          .select("id")
          .eq("user_id", userPref.user_id)
          .eq("type", "reminder")
          .eq("title", "Time to check in")
          .gte("created_at", todayStart)
          .lte("created_at", todayEndStr)
          .limit(1)
          .maybeSingle();

        if (existingNotification) {
          // Already sent today, skip
          continue;
        }

        // Create notification
        const { error: notificationError } = await supabaseAdmin
          .from("notifications")
          .insert([
            {
              user_id: userPref.user_id,
              type: "reminder",
              title: "Time to check in",
              message: "How are you feeling today? Track your symptoms to see patterns.",
              priority: "medium",
              auto_dismiss: true,
              auto_dismiss_seconds: 30,
              show_once: false,
              show_on_pages: [],
              metadata: {
                primaryAction: {
                  label: "Track Now",
                  route: "/dashboard/symptoms",
                  actionType: "navigate",
                },
              },
              seen: false,
              dismissed: false,
            },
          ]);

        if (notificationError) {
          console.error(`Error creating notification for user ${userPref.user_id}:`, notificationError);
          errors++;
        } else {
          notificationsCreated++;
        }
      } catch (error) {
        console.error(`Error processing user ${userPref.user_id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${users.length} users`,
      notificationsCreated,
      errors,
      timestamp: now.toISOString(),
    });
  } catch (e) {
    console.error("GET /api/cron/daily-reminders error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
