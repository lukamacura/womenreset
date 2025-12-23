-- Fix User Profiles Constraints for Automatic Inserts
-- This migration ensures that user_profiles can be created automatically by webhooks/triggers
-- Run this SQL in your Supabase SQL Editor AFTER running the user-memory-questions migration

-- Drop existing CHECK constraints if they don't allow NULL
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_severity_check,
DROP CONSTRAINT IF EXISTS user_profiles_timing_check,
DROP CONSTRAINT IF EXISTS user_profiles_doctor_status_check,
DROP CONSTRAINT IF EXISTS user_profiles_goal_check;

-- Recreate CHECK constraints that allow NULL values
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_severity_check 
  CHECK (severity IS NULL OR severity IN ('mild', 'moderate', 'severe'));

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_timing_check 
  CHECK (timing IS NULL OR timing IN ('just_started', 'been_while', 'over_year', 'several_years'));

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_doctor_status_check 
  CHECK (doctor_status IS NULL OR doctor_status IN ('yes_actively', 'yes_not_helpful', 'no_planning', 'no_natural'));

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_goal_check 
  CHECK (goal IS NULL OR goal IN ('sleep_through_night', 'think_clearly', 'feel_like_myself', 'understand_patterns', 'data_for_doctor', 'get_body_back'));

-- Ensure all new columns allow NULL
ALTER TABLE user_profiles
ALTER COLUMN top_problems DROP NOT NULL,
ALTER COLUMN severity DROP NOT NULL,
ALTER COLUMN timing DROP NOT NULL,
ALTER COLUMN tried_options DROP NOT NULL,
ALTER COLUMN doctor_status DROP NOT NULL,
ALTER COLUMN goal DROP NOT NULL;

