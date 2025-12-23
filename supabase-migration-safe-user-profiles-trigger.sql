-- Safe User Profiles Trigger Migration
-- Creates a trigger function that safely creates user_profiles entries on signup
-- This prevents "Database error saving new user" errors
-- Run this SQL in your Supabase SQL Editor

-- Drop existing trigger if it exists (might be causing issues)
DROP TRIGGER IF EXISTS on_auth_user_created_user_profiles ON auth.users;

-- Create a safe function to create user_profiles entry on signup
-- This function only creates a minimal entry with user_id, allowing quiz data to be added later
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a minimal user_profiles entry with only user_id
  -- All other fields (top_problems, severity, etc.) are NULL and will be filled in later via quiz
  INSERT INTO user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    -- This ensures signup doesn't fail even if user_profiles insert fails
    RAISE WARNING 'Failed to create user_profiles for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user_profiles when a new user signs up
CREATE TRIGGER on_auth_user_created_user_profiles
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_profile_on_signup();

-- Ensure user_profiles table has user_id as primary key (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_pkey' 
    AND conrelid = 'user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles ADD PRIMARY KEY (user_id);
  END IF;
END $$;

-- Ensure user_id column exists and references auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

