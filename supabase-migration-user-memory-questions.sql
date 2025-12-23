-- User Memory Questions Migration
-- Replace old profile text fields with structured question responses
-- Run this SQL in your Supabase SQL Editor

-- Remove old profile columns
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS menopause_profile,
DROP COLUMN IF EXISTS nutrition_profile,
DROP COLUMN IF EXISTS exercise_profile,
DROP COLUMN IF EXISTS emotional_stress_profile,
DROP COLUMN IF EXISTS lifestyle_context;

-- Add new columns for User Memory Questions (all nullable to allow webhook/trigger inserts)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS top_problems TEXT[],
ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IS NULL OR severity IN ('mild', 'moderate', 'severe')),
ADD COLUMN IF NOT EXISTS timing TEXT CHECK (timing IS NULL OR timing IN ('just_started', 'been_while', 'over_year', 'several_years')),
ADD COLUMN IF NOT EXISTS tried_options TEXT[],
ADD COLUMN IF NOT EXISTS doctor_status TEXT CHECK (doctor_status IS NULL OR doctor_status IN ('yes_actively', 'yes_not_helpful', 'no_planning', 'no_natural')),
ADD COLUMN IF NOT EXISTS goal TEXT CHECK (goal IS NULL OR goal IN ('sleep_through_night', 'think_clearly', 'feel_like_myself', 'understand_patterns', 'data_for_doctor', 'get_body_back'));

-- Create indexes for faster queries on new columns
CREATE INDEX IF NOT EXISTS user_profiles_severity_idx ON user_profiles(severity);
CREATE INDEX IF NOT EXISTS user_profiles_goal_idx ON user_profiles(goal);
CREATE INDEX IF NOT EXISTS user_profiles_doctor_status_idx ON user_profiles(doctor_status);

-- Note: Existing columns (user_id, name, age, created_at, updated_at) remain unchanged

