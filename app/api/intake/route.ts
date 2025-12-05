// app/api/intake/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    // Get admin client (bypasses RLS)
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    
    console.log("=== INTAKE API CALLED ===");
    console.log("User ID:", body.user_id);
    console.log("Name:", body.name);
    console.log("Age:", body.age);

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

    // Validate age range
    if (age < 18 || age > 120) {
      return NextResponse.json(
        { error: "Age must be between 18 and 120." },
        { status: 400 }
      );
    }

    // Verify user exists in auth.users first (using admin API)
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);
      if (authError || !authUser) {
        console.error("User not found in auth.users:", authError);
        return NextResponse.json(
          { 
            error: "User account not found. Please try registering again.",
            details: process.env.NODE_ENV === "development" ? authError?.message : undefined
          },
          { status: 400 }
        );
      }
    } catch (authCheckError) {
      // If admin API fails, log but continue (user might still exist)
      console.warn("Could not verify user via admin API:", authCheckError);
    }

    // Check if profile already exists (handle both found and not found cases)
    const { data: existingProfile, error: checkError } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", user_id)
      .maybeSingle();

    // If table doesn't exist, checkError will have code 42P01
    if (checkError && checkError.code === "42P01") {
      console.error("Table 'user_profiles' does not exist. Error:", checkError);
      return NextResponse.json(
        { 
          error: "Database table 'user_profiles' does not exist. Please run the migration SQL in Supabase.",
          details: process.env.NODE_ENV === "development" ? checkError.message : undefined
        },
        { status: 500 }
      );
    }

    // Log any check errors (but continue if it's just "not found")
    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing profile:", checkError);
    }

    if (existingProfile) {
      // Update existing profile instead of inserting
      const { error } = await supabase
        .from("user_profiles")
        .update({
          name,
          age,
          menopause_profile: menopause_profile || null,
          nutrition_profile: nutrition_profile || null,
          exercise_profile: exercise_profile || null,
          emotional_stress_profile: emotional_stress_profile || null,
          lifestyle_context: lifestyle_context || null,
        })
        .eq("user_id", user_id);

      if (error) {
        console.error("Supabase update error:", error);
        return NextResponse.json(
          { 
            error: "Database error while updating profile.",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, updated: true });
    }

    // Insert new user profile (trial info is handled by trigger on auth.users)
    // Only include columns that exist - don't include created_at/updated_at as they have defaults
    const { error } = await supabase.from("user_profiles").insert([
      {
        user_id,
        name,
        age,
        menopause_profile: menopause_profile || null,
        nutrition_profile: nutrition_profile || null,
        exercise_profile: exercise_profile || null,
        emotional_stress_profile: emotional_stress_profile || null,
        lifestyle_context: lifestyle_context || null,
        // Don't include created_at/updated_at - let database defaults handle them
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      console.error("Error hint:", error.hint);
      
      // Provide more helpful error messages
      let errorMessage = "Database error while saving profile.";
      if (error.code === "42P01") {
        errorMessage = "Database table 'user_profiles' does not exist. Please run the migration SQL in Supabase SQL Editor.";
      } else if (error.code === "23505") {
        errorMessage = "Profile already exists for this user.";
      } else if (error.code === "23503") {
        errorMessage = "Invalid user ID. The user account may not exist. Please try logging in again.";
      } else if (error.code === "42501") {
        errorMessage = "Permission denied. Check RLS policies on user_profiles table.";
      } else if (error.message) {
        // Always show detailed error in development, simplified in production
        if (process.env.NODE_ENV === "development") {
          errorMessage = `Database error: ${error.message}${error.hint ? ` (Hint: ${error.hint})` : ""}`;
        } else {
          errorMessage = "Database error while saving profile. Please contact support.";
        }
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          details: process.env.NODE_ENV === "development" ? JSON.stringify({
            code: error.code,
            message: error.message,
            hint: error.hint,
            details: error.details
          }, null, 2) : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Unexpected error in intake route:", e);
    return NextResponse.json(
      { 
        error: "Unexpected error while saving profile.",
        details: process.env.NODE_ENV === "development" && e instanceof Error ? e.message : undefined
      },
      { status: 500 }
    );
  }
}
