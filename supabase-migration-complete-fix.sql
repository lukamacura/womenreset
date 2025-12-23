-- Complete Fix for User Profiles Signup Error
-- This migration fixes the "Database error saving new user" issue
-- Run this SQL in your Supabase SQL Editor
-- Run this AFTER running supabase-migration-user-memory-questions.sql

-- Step 1: Fix CHECK constraints to allow NULL values
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

-- Step 2: Ensure all new columns allow NULL (remove NOT NULL if it exists)
DO $$
BEGIN
  -- Check and alter each column to allow NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'top_problems' AND is_nullable = 'NO') THEN
    ALTER TABLE user_profiles ALTER COLUMN top_problems DROP NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'severity' AND is_nullable = 'NO') THEN
    ALTER TABLE user_profiles ALTER COLUMN severity DROP NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'timing' AND is_nullable = 'NO') THEN
    ALTER TABLE user_profiles ALTER COLUMN timing DROP NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'tried_options' AND is_nullable = 'NO') THEN
    ALTER TABLE user_profiles ALTER COLUMN tried_options DROP NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'doctor_status' AND is_nullable = 'NO') THEN
    ALTER TABLE user_profiles ALTER COLUMN doctor_status DROP NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'goal' AND is_nullable = 'NO') THEN
    ALTER TABLE user_profiles ALTER COLUMN goal DROP NOT NULL;
  END IF;
END $$;

-- Step 3: Remove ALL triggers that might create user_profiles entries
-- We don't want to create user_profiles automatically - it will be created when quiz is completed
-- This prevents "Database error saving new user" errors from triggers
DROP TRIGGER IF EXISTS on_auth_user_created_user_profiles ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile_on_signup();
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 3b: Check for any other triggers that reference user_profiles
-- This will help identify if there are other triggers causing issues
DO $$
DECLARE
    trigger_record RECORD;
    func_record RECORD;
BEGIN
    -- Check for triggers
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table, event_object_schema, action_statement
        FROM information_schema.triggers
        WHERE (action_statement LIKE '%user_profiles%' OR action_statement LIKE '%user_profile%')
        AND event_object_schema = 'auth'
        AND event_object_table = 'users'
    LOOP
        RAISE NOTICE 'Found trigger on auth.users: % - Statement: %', 
            trigger_record.trigger_name, 
            trigger_record.action_statement;
    END LOOP;
    
    -- Check for functions that might be called
    FOR func_record IN
        SELECT routine_name, routine_definition
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND (routine_definition LIKE '%user_profiles%' OR routine_definition LIKE '%user_profile%')
    LOOP
        RAISE NOTICE 'Found function: %', func_record.routine_name;
    END LOOP;
END $$;

-- Step 5: Ensure user_id is the primary key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_pkey' 
    AND conrelid = 'user_profiles'::regclass
  ) THEN
    -- Check if user_id column exists first
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      AND column_name = 'user_id'
    ) THEN
      ALTER TABLE user_profiles ADD PRIMARY KEY (user_id);
    END IF;
  END IF;
END $$;

-- Step 6: Ensure user_id is UUID type and references auth.users
DO $$
BEGIN
  -- Check if user_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'user_id'
  ) THEN
    -- Check the current data type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      AND column_name = 'user_id'
      AND data_type = 'text'
    ) THEN
      -- Convert text to UUID (drop foreign key first if exists)
      IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname LIKE '%user_profiles_user_id%' 
        AND contype = 'f'
        AND conrelid = 'user_profiles'::regclass
      ) THEN
        ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
      END IF;
      
      -- Drop primary key if it exists (will recreate after type change)
      IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_profiles_pkey' 
        AND conrelid = 'user_profiles'::regclass
      ) THEN
        ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_pkey;
      END IF;
      
      -- Convert column type from text to uuid
      ALTER TABLE user_profiles ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
    END IF;
    
    -- Now add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname LIKE '%user_profiles_user_id%' 
      AND contype = 'f'
      AND conrelid = 'user_profiles'::regclass
    ) THEN
      ALTER TABLE user_profiles 
      ADD CONSTRAINT user_profiles_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  ELSE
    -- Column doesn't exist, create it as UUID
    ALTER TABLE user_profiles 
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

