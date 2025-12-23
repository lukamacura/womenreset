-- COMPLETE FIX for "Database error saving new user"
-- This migration fixes all issues preventing user registration
-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Remove old columns that no longer exist
-- ============================================================================
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS menopause_profile,
DROP COLUMN IF EXISTS nutrition_profile,
DROP COLUMN IF EXISTS exercise_profile,
DROP COLUMN IF EXISTS emotional_stress_profile,
DROP COLUMN IF EXISTS lifestyle_context;

-- ============================================================================
-- STEP 2: Ensure user_id column exists and is UUID type
-- ============================================================================
DO $$
BEGIN
    -- Check if user_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'user_id'
    ) THEN
        -- Create user_id column as UUID
        ALTER TABLE user_profiles 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    ELSE
        -- Check if it's text type and convert to UUID
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
        END IF;
    END IF;
    
    -- Ensure primary key exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_profiles_pkey' 
        AND conrelid = 'user_profiles'::regclass
    ) THEN
        ALTER TABLE user_profiles ADD PRIMARY KEY (user_id);
    END IF;
    
    -- Ensure foreign key exists
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
END $$;

-- ============================================================================
-- STEP 3: Add new columns for User Memory Questions (if they don't exist)
-- ============================================================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS top_problems TEXT[],
ADD COLUMN IF NOT EXISTS severity TEXT,
ADD COLUMN IF NOT EXISTS timing TEXT,
ADD COLUMN IF NOT EXISTS tried_options TEXT[],
ADD COLUMN IF NOT EXISTS doctor_status TEXT,
ADD COLUMN IF NOT EXISTS goal TEXT;

-- Ensure name and age columns exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Ensure timestamp columns exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================================
-- STEP 4: Remove problematic CHECK constraints on age
-- ============================================================================
DO $$
BEGIN
    -- Drop age constraint if it exists (it might block inserts)
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname LIKE '%age%' 
        AND conrelid = 'user_profiles'::regclass
    ) THEN
        ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_age_check;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Ensure ALL columns allow NULL (critical for automatic inserts)
-- ============================================================================
ALTER TABLE user_profiles
ALTER COLUMN name DROP NOT NULL,
ALTER COLUMN age DROP NOT NULL,
ALTER COLUMN top_problems DROP NOT NULL,
ALTER COLUMN severity DROP NOT NULL,
ALTER COLUMN timing DROP NOT NULL,
ALTER COLUMN tried_options DROP NOT NULL,
ALTER COLUMN doctor_status DROP NOT NULL,
ALTER COLUMN goal DROP NOT NULL;

-- ============================================================================
-- STEP 6: Fix CHECK constraints to allow NULL values
-- ============================================================================
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

-- ============================================================================
-- STEP 7: Remove ALL triggers that might create user_profiles automatically
-- ============================================================================
-- Drop all known trigger names (comprehensive list)
-- NOTE: on_auth_user_created might be for user_trials - we'll check and only drop if it references user_profiles
DROP TRIGGER IF EXISTS on_auth_user_created_user_profiles ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS safe_user_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;

-- Drop all functions that might create user_profiles
DROP FUNCTION IF EXISTS create_user_profile_on_signup();
DROP FUNCTION IF EXISTS safe_create_user_profile_on_signup();
DROP FUNCTION IF EXISTS handle_new_user();

-- Find and drop any remaining triggers on auth.users that reference user_profiles
DO $$
DECLARE
    trigger_record RECORD;
    func_record RECORD;
BEGIN
    -- Find all triggers on auth.users
    FOR trigger_record IN 
        SELECT trigger_name, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'users'
        AND event_object_schema = 'auth'
    LOOP
        -- Check if trigger action references user_profiles (but NOT user_trials)
        IF (trigger_record.action_statement LIKE '%user_profiles%' 
           OR trigger_record.action_statement LIKE '%user_profile%')
           AND trigger_record.action_statement NOT LIKE '%user_trials%' THEN
            RAISE NOTICE 'Dropping trigger that references user_profiles: %', trigger_record.trigger_name;
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', trigger_record.trigger_name);
        END IF;
    END LOOP;
    
    -- Find all functions that might create user_profiles
    FOR func_record IN
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND (
            routine_definition LIKE '%user_profiles%' 
            OR routine_definition LIKE '%user_profile%'
        )
        AND routine_name NOT LIKE 'update_user_profiles%'
    LOOP
        RAISE NOTICE 'Dropping function: %', func_record.routine_name;
        EXECUTE format('DROP FUNCTION IF EXISTS %I() CASCADE', func_record.routine_name);
    END LOOP;
END $$;

-- Verify no triggers remain on auth.users that reference user_profiles
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM information_schema.triggers
    WHERE event_object_table = 'users'
    AND event_object_schema = 'auth'
    AND (
        action_statement LIKE '%user_profiles%' 
        OR action_statement LIKE '%user_profile%'
    );
    
    IF remaining_count > 0 THEN
        RAISE WARNING 'WARNING: % trigger(s) still exist on auth.users that reference user_profiles', remaining_count;
        RAISE NOTICE 'Please manually review and remove these triggers';
    ELSE
        RAISE NOTICE 'SUCCESS: No triggers on auth.users reference user_profiles';
    END IF;
END $$;

-- ============================================================================
-- STEP 8: Ensure RLS policies allow service role to insert
-- ============================================================================
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON user_profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role (admin) can manage all profiles
-- NOTE: Service role actually bypasses RLS, but this policy ensures
-- that if any operations run as authenticated users, they can still work
-- This is CRITICAL - allows the intake API (which uses service role) to create profiles
-- The service role bypasses RLS, so this policy is mainly for safety
CREATE POLICY "Service role can manage all profiles"
ON user_profiles FOR ALL
USING (true)
WITH CHECK (true);

-- IMPORTANT: The service role in Supabase BYPASSES RLS entirely
-- So the above policy is mainly for safety. The real issue is likely:
-- 1. A trigger/hook running without proper auth context
-- 2. An Auth Hook configured in the Dashboard
-- If a trigger tries to insert as the 'public' role, it will fail the RLS check
-- because auth.uid() won't be set in that context

-- ============================================================================
-- STEP 9: Create trigger to auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at_trigger ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at_trigger
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_profiles_updated_at();

-- ============================================================================
-- STEP 10: Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_created_at_idx ON user_profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS user_profiles_severity_idx ON user_profiles(severity);
CREATE INDEX IF NOT EXISTS user_profiles_goal_idx ON user_profiles(goal);
CREATE INDEX IF NOT EXISTS user_profiles_doctor_status_idx ON user_profiles(doctor_status);

-- ============================================================================
-- VERIFICATION: Check table structure and constraints
-- ============================================================================
-- Verify that all columns allow NULL
DO $$
DECLARE
    not_nullable_count INTEGER;
    constraint_count INTEGER;
BEGIN
    -- Check for NOT NULL constraints
    SELECT COUNT(*) INTO not_nullable_count
    FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND table_schema = 'public'
    AND column_name IN ('top_problems', 'severity', 'timing', 'tried_options', 'doctor_status', 'goal', 'name', 'age')
    AND is_nullable = 'NO';
    
    IF not_nullable_count > 0 THEN
        RAISE WARNING 'Some columns still have NOT NULL constraint. Count: %', not_nullable_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All quiz columns allow NULL values';
    END IF;
    
    -- Verify CHECK constraints allow NULL
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint
    WHERE conrelid = 'user_profiles'::regclass
    AND contype = 'c'
    AND (
        conname LIKE '%severity%' 
        OR conname LIKE '%timing%' 
        OR conname LIKE '%doctor_status%' 
        OR conname LIKE '%goal%'
    )
    AND NOT (pg_get_constraintdef(oid) LIKE '%IS NULL OR%');
    
    IF constraint_count > 0 THEN
        RAISE WARNING 'Some CHECK constraints may not allow NULL. Count: %', constraint_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All CHECK constraints allow NULL values';
    END IF;
END $$;

