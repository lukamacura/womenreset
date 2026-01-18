/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchTrackerData, analyzeTrackerData } from "@/lib/trackerAnalysis";

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

// GET: Generate doctor report data (returns JSON, frontend can convert to PDF)
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Fetch and analyze tracker data
    const trackerData = await fetchTrackerData(user.id, days);
    const summary = analyzeTrackerData(
      trackerData.symptomLogs,
      trackerData.dailyMood
    );

    // Get user profile for name
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("first_name, last_name")
      .eq("user_id", user.id)
      .single();

    const userName = profile
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Patient"
      : "Patient";

    // Format dates
    const reportStartDate = startDate
      ? new Date(startDate)
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const reportEndDate = endDate ? new Date(endDate) : new Date();

    // Generate report data
    const report = {
      patientName: userName,
      dateRange: {
        start: reportStartDate.toLocaleDateString(),
        end: reportEndDate.toLocaleDateString(),
      },
      summary: {
        totalSymptoms: summary.symptoms.total,
        averageSeverity: summary.symptoms.avgSeverity,
        mostFrequentSymptoms: Object.entries(summary.symptoms.byName)
          .sort(([, a], [, b]) => b.count - a.count)
          .slice(0, 5)
          .map(([name, stats]) => ({
            name,
            count: stats.count,
            avgSeverity: stats.avgSeverity,
            trend: stats.trend,
          })),
      },
      patterns: summary.plainLanguageInsights.map((insight) => insight.text),
      questions: [
        "Based on my symptom patterns, what treatment options should we consider?",
        "Are there lifestyle changes that could help manage my symptoms?",
        "Should I be concerned about any of these patterns?",
        "What follow-up testing or monitoring do you recommend?",
      ],
    };

    return NextResponse.json({ report });
  } catch (e: any) {
    console.error("GET /api/doctor-report error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

