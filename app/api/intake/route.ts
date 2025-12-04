// app/api/intake/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  try {
    const body = await req.json();

    const {
      user_id,
      name,
      age,
      menopause_profile,
      nutrition_profile,
      exercise_profile,
      emotional_stress_profile,
      lifestyle_context,
    } = body;

    if (!user_id || !name || typeof age !== "number") {
      return NextResponse.json(
        { error: "Missing required fields (user_id, name, age)." },
        { status: 400 }
      );
    }

    // Insert user profile (trial info is handled by trigger on auth.users)
    const { error } = await supabase.from("user_profiles").insert([
      {
        user_id,
        name,
        age,
        menopause_profile,
        nutrition_profile,
        exercise_profile,
        emotional_stress_profile,
        lifestyle_context,
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Database error while saving profile." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error while saving profile." },
      { status: 500 }
    );
  }
}
