/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
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

// GET: Get tracker insights and patterns
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    // Fetch and analyze tracker data
    const trackerData = await fetchTrackerData(user.id, days);
    const summary = analyzeTrackerData(
      trackerData.symptomLogs,
      trackerData.nutrition,
      trackerData.fitness,
      trackerData.hydration
    );

    return NextResponse.json(
      { 
        data: summary,
        period: `${days} days`,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (e: any) {
    console.error("GET /api/tracker-insights error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

