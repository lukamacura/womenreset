/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const runtime = "nodejs";

// In-memory cache for insights (1 hour TTL)
const insightCache = new Map<string, { insight: string; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

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

// Initialize LLM
const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Format symptom logs for prompt
function formatSymptomLogs(logs: any[]): string {
  if (logs.length === 0) return "None";
  
  return logs
    .map((log) => {
      const date = new Date(log.logged_at).toLocaleDateString();
      const severityLabel = log.severity === 1 ? "Mild" : log.severity === 2 ? "Moderate" : "Severe";
      const triggers = log.triggers && log.triggers.length > 0 ? ` (triggers: ${log.triggers.join(", ")})` : "";
      return `${log.symptoms?.name || "Unknown"}: ${severityLabel}${triggers} on ${date}`;
    })
    .join("\n");
}

// Format daily moods for prompt
function formatDailyMoods(moods: any[]): string {
  if (moods.length === 0) return "None";
  
  const moodLabels: Record<number, string> = {
    1: "Rough",
    2: "Okay",
    3: "Good",
    4: "Great",
  };
  
  return moods
    .map((mood) => {
      const date = new Date(mood.date).toLocaleDateString();
      return `${moodLabels[mood.mood] || "Unknown"} on ${date}`;
    })
    .join("\n");
}

// Format user profile for prompt
function formatUserProfile(profile: any): string {
  const parts: string[] = [];
  
  if (profile.name) {
    parts.push(`- Name: ${profile.name}`);
  }
  
  if (profile.top_problems && Array.isArray(profile.top_problems) && profile.top_problems.length > 0) {
    const problemLabels: Record<string, string> = {
      hot_flashes: "Hot flashes / Night sweats",
      sleep_issues: "Can't sleep well",
      brain_fog: "Brain fog / Memory issues",
      mood_swings: "Mood swings / Irritability",
      weight_changes: "Weight changes",
      low_energy: "Low energy / Fatigue",
      anxiety: "Anxiety",
      joint_pain: "Joint pain",
    };
    const problems = profile.top_problems.map((p: string) => problemLabels[p] || p).join(", ");
    parts.push(`- Top Problems: ${problems}`);
  }
  
  if (profile.severity) {
    const severityLabels: Record<string, string> = {
      mild: "Mild",
      moderate: "Moderate",
      severe: "Severe",
    };
    parts.push(`- Overall Severity: ${severityLabels[profile.severity] || profile.severity}`);
  }
  
  if (profile.timing) {
    const timingLabels: Record<string, string> = {
      just_started: "Just started (0-6 months)",
      been_while: "Been a while (6-12 months)",
      over_year: "Over a year",
      several_years: "Several years",
    };
    parts.push(`- Timing/Stage: ${timingLabels[profile.timing] || profile.timing}`);
  }
  
  if (profile.tried_options && Array.isArray(profile.tried_options) && profile.tried_options.length > 0) {
    const triedLabels: Record<string, string> = {
      nothing: "Nothing yet",
      supplements: "Supplements / Vitamins",
      diet: "Diet changes",
      exercise: "Exercise",
      hrt: "HRT / Medication",
      doctor_talk: "Talked to doctor",
      apps: "Apps / Tracking",
    };
    const tried = profile.tried_options.map((t: string) => triedLabels[t] || t).join(", ");
    parts.push(`- Already Tried: ${tried}`);
  }
  
  if (profile.goal) {
    const goalLabels: Record<string, string> = {
      sleep_through_night: "Sleep through the night",
      think_clearly: "Think clearly again",
      feel_like_myself: "Feel like myself",
      understand_patterns: "Understand my patterns",
      data_for_doctor: "Have data for my doctor",
      get_body_back: "Get my body back",
    };
    parts.push(`- Goal: ${goalLabels[profile.goal] || profile.goal}`);
  }
  
  return parts.join("\n");
}

// GET: Fetch AI-generated insight
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const refresh = searchParams.get("refresh") === "true";

    // Check cache first (unless refresh requested)
    if (!refresh) {
      const cached = insightCache.get(user.id);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({
          insight: cached.insight,
          cached: true,
        });
      }
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch user profile (excluding doctor_status)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("name, top_problems, severity, timing, tried_options, goal")
      .eq("user_id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error fetching user profile:", profileError);
    }

    const profile = profileData || {};

    // Calculate date range (last 7 days)
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    // Fetch symptom logs for last 7 days
    const { data: symptomLogs, error: logsError } = await supabaseAdmin
      .from("symptom_logs")
      .select(`
        *,
        symptoms (name, icon)
      `)
      .eq("user_id", user.id)
      .gte("logged_at", startDate.toISOString())
      .lte("logged_at", endDate.toISOString())
      .order("logged_at", { ascending: false });

    if (logsError) {
      console.error("Error fetching symptom logs:", logsError);
    }

    // Fetch daily moods for last 7 days
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    const { data: dailyMoods, error: moodsError } = await supabaseAdmin
      .from("daily_mood")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: false });

    if (moodsError) {
      console.error("Error fetching daily moods:", moodsError);
    }

    // Build prompt
    const userProfileText = formatUserProfile(profile);
    const symptomLogsText = formatSymptomLogs(symptomLogs || []);
    const dailyMoodsText = formatDailyMoods(dailyMoods || []);

    const userPrompt = `USER PROFILE:
${userProfileText || "No profile data available"}

SYMPTOM LOGS (Last 7 days):
${symptomLogsText}

DAILY MOODS (Last 7 days):
${dailyMoodsText}`;

    const systemPrompt = `You are Lisa, a knowledgeable and empathetic menopause health advisor. Generate a personalized, actionable insight based on the user's profile and recent symptom/mood tracking data.

FORMAT YOUR RESPONSE AS EXACTLY 2 SECTIONS:

1. **Pattern:** [Connect their symptoms + brief why (1 sentence max), bold symptom names using **symptom name**]
   - Keep to 1 sentence max
   - Remove filler phrases like "which can disrupt your sleep and increase discomfort" or "This pattern may also contribute to"
   - Example: "Filipina, your hot flashes and insomnia are linked - night sweats wake you, then fatigue and anxiety follow."

2. **Try this:** [One specific lifestyle tip under 20 words, bold the key action using **action**]
   - MUST be specific, actionable, and tonight-focused
   - Include exact details: exact temperature, exact time, exact action
   - Something they can do TODAY or TONIGHT
   - NOT generic advice like "sleep better", "reduce stress", "stay hydrated", "try relaxation techniques"
   - GOOD examples: "Keep bedroom at 65°F and stop screens after 9pm tonight", "Put a cold washcloth on your neck when a hot flash starts", "Keep ice water on your nightstand tonight"
   - BAD examples: "setting a regular sleep schedule", "try relaxation techniques", "stay hydrated"

Keep each section to 1 sentence max (Pattern), under 20 words (Try this). No paragraphs. No medical advice.

UNDERSTAND TIME CONTEXT:
- Multiple symptoms on ONE day = a bad day, not necessarily a pattern
- Same symptom across MULTIPLE days = a pattern
- Always consider if data is from one day vs spread across week
- If 8 symptoms on Dec 29 only → acknowledge it was a tough day
- If insomnia on Dec 27, 28, 29 → recognize it as a consistent pattern

RULES:
- Always give insights, even with just 1-2 logs
- Use the user's name ONCE naturally in your response (in Pattern or Try this section)
- Reference their goal when giving tips (if goal is "sleep better" focus sleep advice)
- Acknowledge what they've already tried - DO NOT suggest things from their "Already Tried" list
- Connect related symptoms (e.g., hot flashes + insomnia often linked)
- Briefly explain WHY symptoms happen during menopause (in Pattern section - 1 sentence only)
- Include ONE specific, actionable lifestyle tip they can do TODAY/TONIGHT (in Try this section)
- Distinguish between bad days (many symptoms on one day) vs patterns (same symptom across days)
- Warm, friendly tone - like a knowledgeable friend

NEVER mention:
- Doctors, physicians, medical professionals
- Medications, supplements, prescriptions
- Medical treatments or therapies
- Diagnoses

ONLY suggest:
- Lifestyle changes (sleep, temperature, routine)
- Relaxation techniques (breathing, stretching)
- Environmental adjustments (bedroom temp, lighting)
- Daily habits (hydration, movement, journaling)

Generate a helpful, personalized insight now.`;

    // Generate insight using LLM
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];

    const response = await llm.invoke(messages);
    const insight = response.content as string;

    // Cache the insight
    insightCache.set(user.id, {
      insight,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      insight,
      cached: false,
    });
  } catch (e) {
    console.error("GET /api/insights error:", e);
    return NextResponse.json(
      { error: "Failed to generate insight" },
      { status: 500 }
    );
  }
}
