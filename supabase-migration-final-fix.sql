-- Final Fix for "Database error saving new user"
-- This migration ensures user_profiles can be created safely
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Ensure user_profiles table exists and has correct structure
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN
        -- Create table if it doesn't exist
        CREATE TABLE user_profiles (
            user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT,
            age INTEGER,
            top_problems TEXT[],
            severity TEXT,
            timing TEXT,
            tried_options TEXT[],
            doctor_status TEXT,
            goal TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- Step 2: Ensure user_id column is UUID (convert if needed)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'user_id'
        AND data_type = 'text'
    ) THEN
        -- Drop constraints first
        ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_pkey;
        ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
        
        -- Convert to UUID
        ALTER TABLE user_profiles ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
        
        -- Recreate primary key
        ALTER TABLE user_profiles ADD PRIMARY KEY (user_id);
        
        -- Recreate foreign key
        ALTER TABLE user_profiles 
        ADD CONSTRAINT user_profiles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 3: Ensure all columns allow NULL
ALTER TABLE user_profiles
ALTER COLUMN name DROP NOT NULL,
ALTER COLUMN age DROP NOT NULL,
ALTER COLUMN top_problems DROP NOT NULL,
ALTER COLUMN severity DROP NOT NULL,
ALTER COLUMN timing DROP NOT NULL,
ALTER COLUMN tried_options DROP NOT NULL,
ALTER COLUMN doctor_status DROP NOT NULL,
ALTER COLUMN goal DROP NOT NULL;

-- Step 4: Fix CHECK constraints to allow NULL
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_severity_check,
DROP CONSTRAINT IF EXISTS user_profiles_timing_check,
DROP CONSTRAINT IF EXISTS user_profiles_doctor_status_check,
DROP CONSTRAINT IF EXISTS user_profiles_goal_check;

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

-- Step 5: Create a SAFE trigger function that won't fail signup
-- This function will create user_profiles if it doesn't exist, but won't fail if there's an error
CREATE OR REPLACE FUNCTION safe_create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to insert minimal user_profiles entry
    -- This is a safety net in case Supabase Auth tries to create one
    BEGIN
        INSERT INTO user_profiles (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        -- Log but don't fail - this ensures signup succeeds even if profile creation fails
        RAISE WARNING 'Could not create user_profiles for user %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger (but make it safe - won't block signup if it fails)
DROP TRIGGER IF EXISTS safe_user_profile_on_signup ON auth.users;
CREATE TRIGGER safe_user_profile_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION safe_create_user_profile_on_signup();

-- Step 7: Check for any other problematic triggers
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    RAISE NOTICE '=== Checking for triggers on auth.users ===';
    FOR trigger_record IN 
        SELECT trigger_name, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'users'
        AND event_object_schema = 'auth'
    LOOP
        RAISE NOTICE 'Trigger: % - Action: %', 
            trigger_record.trigger_name, 
            substring(trigger_record.action_statement from 1 for 100);
    END LOOP;
END $$;

