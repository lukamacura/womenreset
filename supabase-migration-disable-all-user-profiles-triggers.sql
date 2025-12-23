-- Disable ALL triggers that might create user_profiles entries
-- This fixes the "Database error saving new user" issue
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Drop any triggers on auth.users that create user_profiles
DROP TRIGGER IF EXISTS on_auth_user_created_user_profiles ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop any functions that create user_profiles
DROP FUNCTION IF EXISTS create_user_profile_on_signup();
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 3: Check for any other triggers that might reference user_profiles
-- (This will show you what triggers exist - you may need to disable them manually)
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table, event_object_schema
        FROM information_schema.triggers
        WHERE action_statement LIKE '%user_profiles%'
        OR action_statement LIKE '%user_profile%'
    LOOP
        RAISE NOTICE 'Found trigger: % on %.%', 
            trigger_record.trigger_name, 
            trigger_record.event_object_schema, 
            trigger_record.event_object_table;
    END LOOP;
END $$;

-- Step 4: Ensure user_profiles table structure allows minimal inserts
-- Make sure all new columns allow NULL (they should from previous migration)
ALTER TABLE user_profiles
ALTER COLUMN top_problems DROP NOT NULL,
ALTER COLUMN severity DROP NOT NULL,
ALTER COLUMN timing DROP NOT NULL,
ALTER COLUMN tried_options DROP NOT NULL,
ALTER COLUMN doctor_status DROP NOT NULL,
ALTER COLUMN goal DROP NOT NULL;

-- Step 5: Verify constraints allow NULL
-- (These should already be set from previous migration, but double-check)
DO $$
BEGIN
    -- Drop and recreate constraints if they don't allow NULL
    ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_severity_check;
    ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_timing_check;
    ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_doctor_status_check;
    ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_goal_check;
    
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
END $$;

