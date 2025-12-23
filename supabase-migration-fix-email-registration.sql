-- =====================================================================
-- FIX EMAIL REGISTRATION ISSUE
-- =====================================================================
-- This migration fixes the "Database error saving new user" issue
-- that prevents users from continuing with email registration.
--
-- PROBLEM:
-- When users try to register with email, Supabase tries to create a
-- user_profiles entry automatically (via trigger), but it fails because:
-- 1. Triggers are trying to insert with NULL values for required fields
-- 2. CHECK constraints don't allow NULL values
-- 3. The profile should be created AFTER the quiz, not during signup
--
-- SOLUTION:
-- 1. Remove ALL automatic user_profiles creation triggers
-- 2. Fix CHECK constraints to allow NULL values
-- 3. Make all quiz fields optional (NULL allowed)
-- 4. Profile will be created when user completes quiz via /api/intake
--
-- Run this SQL in your Supabase SQL Editor
-- =====================================================================

-- =====================================================================
-- STEP 1: Remove ALL triggers that create user_profiles automatically
-- =====================================================================
-- This is critical - we don't want ANY automatic profile creation
-- The profile should only be created when the user completes the quiz

DROP TRIGGER IF EXISTS on_auth_user_created_user_profiles ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS safe_user_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- Drop all related functions
DROP FUNCTION IF EXISTS create_user_profile_on_signup();
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS safe_create_user_profile_on_signup();

-- =====================================================================
-- STEP 2: Fix CHECK constraints to allow NULL values
-- =====================================================================
-- The quiz answers should be optional until the quiz is completed

ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_severity_check,
DROP CONSTRAINT IF EXISTS user_profiles_timing_check,
DROP CONSTRAINT IF EXISTS user_profiles_doctor_status_check,
DROP CONSTRAINT IF EXISTS user_profiles_goal_check;

-- Recreate CHECK constraints that allow NULL
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_severity_check
  CHECK (severity IS NULL OR severity IN ('mild', 'moderate', 'severe')),
ADD CONSTRAINT user_profiles_timing_check
  CHECK (timing IS NULL OR timing IN ('just_started', 'been_while', 'over_year', 'several_years')),
ADD CONSTRAINT user_profiles_doctor_status_check
  CHECK (doctor_status IS NULL OR doctor_status IN ('yes_actively', 'yes_not_helpful', 'no_planning', 'no_natural')),
ADD CONSTRAINT user_profiles_goal_check
  CHECK (goal IS NULL OR goal IN ('sleep_through_night', 'think_clearly', 'feel_like_myself', 'understand_patterns', 'data_for_doctor', 'get_body_back'));

-- =====================================================================
-- STEP 3: Ensure all quiz columns allow NULL
-- =====================================================================
-- These columns should only be filled when the quiz is completed

DO $$
BEGIN
  -- Drop NOT NULL constraints if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'name'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN name DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'age'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN age DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'top_problems'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN top_problems DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'severity'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN severity DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'timing'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN timing DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'tried_options'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN tried_options DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'doctor_status'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN doctor_status DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'goal'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN goal DROP NOT NULL;
  END IF;
END $$;

-- =====================================================================
-- STEP 4: Verify and report remaining triggers
-- =====================================================================
-- This will help identify if there are any other triggers that might cause issues

DO $$
DECLARE
    trigger_record RECORD;
    trigger_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE 'CHECKING FOR REMAINING TRIGGERS ON auth.users';
    RAISE NOTICE '=========================================================';

    FOR trigger_record IN
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'users'
        AND event_object_schema = 'auth'
    LOOP
        trigger_count := trigger_count + 1;
        RAISE NOTICE 'Trigger: % (Event: %)',
            trigger_record.trigger_name,
            trigger_record.event_manipulation;
        RAISE NOTICE 'Action: %',
            substring(trigger_record.action_statement from 1 for 150);
        RAISE NOTICE '---------------------------------------------------------';
    END LOOP;

    IF trigger_count = 0 THEN
        RAISE NOTICE '✓ No triggers found on auth.users - This is CORRECT!';
    ELSE
        RAISE NOTICE '⚠ Found % trigger(s) on auth.users', trigger_count;
        RAISE NOTICE '  These triggers might interfere with registration.';
        RAISE NOTICE '  Review them and remove any that create user_profiles.';
    END IF;
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '';
END $$;

-- =====================================================================
-- STEP 5: Verify table structure
-- =====================================================================
-- Confirm that the user_profiles table is correctly configured

DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE 'USER_PROFILES TABLE STRUCTURE';
    RAISE NOTICE '=========================================================';

    FOR col_record IN
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % | Type: % | Nullable: % | Default: %',
            col_record.column_name,
            col_record.data_type,
            col_record.is_nullable,
            COALESCE(col_record.column_default, 'NULL');
    END LOOP;
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '';
END $$;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- What happens now:
-- 1. User enters email on /register page
-- 2. Supabase sends magic link (NO user_profiles entry created)
-- 3. User clicks magic link → redirected to /register
-- 4. User completes quiz → data saved via /api/intake
-- 5. user_profiles entry created with all quiz answers
-- 6. User redirected to dashboard
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✓ Migration completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Check Supabase Dashboard → Authentication → Hooks';
    RAISE NOTICE '   - Remove any hooks that create user_profiles entries';
    RAISE NOTICE '2. Test registration with a new email address';
    RAISE NOTICE '3. Verify magic link works and quiz can be completed';
    RAISE NOTICE '';
END $$;
