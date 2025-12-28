-- Fix User Profiles Quiz Data Migration
-- Ensures quiz columns exist and age column is optional
-- Run this SQL in your Supabase SQL Editor

-- Add quiz answer columns if they don't exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS top_problems TEXT[],
ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IS NULL OR severity IN ('mild', 'moderate', 'severe')),
ADD COLUMN IF NOT EXISTS timing TEXT CHECK (timing IS NULL OR timing IN ('just_started', 'been_while', 'over_year', 'several_years')),
ADD COLUMN IF NOT EXISTS tried_options TEXT[],
ADD COLUMN IF NOT EXISTS doctor_status TEXT CHECK (doctor_status IS NULL OR doctor_status IN ('yes_actively', 'yes_not_helpful', 'no_planning', 'no_natural')),
ADD COLUMN IF NOT EXISTS goal TEXT CHECK (goal IS NULL OR goal IN ('sleep_through_night', 'think_clearly', 'feel_like_myself', 'understand_patterns', 'data_for_doctor', 'get_body_back'));

-- Ensure age column is nullable (remove any constraints if they exist)
-- Note: If you want to completely remove the age column, uncomment the line below
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS age;

-- Create indexes for faster queries on quiz fields
CREATE INDEX IF NOT EXISTS user_profiles_severity_idx ON user_profiles(severity) WHERE severity IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_profiles_timing_idx ON user_profiles(timing) WHERE timing IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_profiles_doctor_status_idx ON user_profiles(doctor_status) WHERE doctor_status IS NOT NULL;

-- Ensure RLS policies allow service role to insert/update
-- (These should already exist, but ensuring they're correct)
DROP POLICY IF EXISTS "Service role can manage all profiles" ON user_profiles;
CREATE POLICY "Service role can manage all profiles"
ON user_profiles FOR ALL
USING (true)
WITH CHECK (true);

