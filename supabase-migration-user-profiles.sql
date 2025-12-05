-- User Profiles Table Migration
-- Add missing columns to existing user_profiles table
-- Run this SQL in your Supabase SQL Editor

-- Note: user_profiles table already exists for long-term memory
-- This migration adds the missing columns needed for registration

-- Add missing columns if they don't exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 18 AND age <= 120),
ADD COLUMN IF NOT EXISTS menopause_profile TEXT,
ADD COLUMN IF NOT EXISTS nutrition_profile TEXT,
ADD COLUMN IF NOT EXISTS exercise_profile TEXT,
ADD COLUMN IF NOT EXISTS emotional_stress_profile TEXT,
ADD COLUMN IF NOT EXISTS lifestyle_context TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_created_at_idx ON user_profiles(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
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
-- This allows the admin client to insert profiles during registration
CREATE POLICY "Service role can manage all profiles"
ON user_profiles FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at_trigger ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at_trigger
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_profiles_updated_at();

