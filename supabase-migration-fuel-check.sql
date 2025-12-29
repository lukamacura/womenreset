-- Fuel Check Upgrade Migration: Add food tags, feeling_after, and hydration tracking
-- Run this SQL in your Supabase SQL Editor

-- 1. Add food_tags and feeling_after columns to nutrition table
ALTER TABLE nutrition 
ADD COLUMN IF NOT EXISTS food_tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS feeling_after TEXT CHECK (feeling_after IN ('energized', 'no_change', 'sluggish', 'bloated') OR feeling_after IS NULL);

-- Create index for food_tags queries
CREATE INDEX IF NOT EXISTS nutrition_food_tags_idx ON nutrition USING GIN (food_tags);

-- 2. Create hydration_logs table
CREATE TABLE IF NOT EXISTS hydration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  glasses INTEGER NOT NULL CHECK (glasses > 0),
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for hydration_logs
CREATE INDEX IF NOT EXISTS hydration_logs_user_id_idx 
ON hydration_logs(user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS hydration_logs_logged_at_idx 
ON hydration_logs(logged_at DESC);

-- Enable RLS (Row Level Security) for hydration_logs
ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own hydration" ON hydration_logs;
DROP POLICY IF EXISTS "Users can insert own hydration" ON hydration_logs;
DROP POLICY IF EXISTS "Users can update own hydration" ON hydration_logs;
DROP POLICY IF EXISTS "Users can delete own hydration" ON hydration_logs;

-- Policy: Users can only view their own hydration logs
CREATE POLICY "Users can view own hydration"
ON hydration_logs FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own hydration logs
CREATE POLICY "Users can insert own hydration"
ON hydration_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own hydration logs
CREATE POLICY "Users can update own hydration"
ON hydration_logs FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own hydration logs
CREATE POLICY "Users can delete own hydration"
ON hydration_logs FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at timestamp for hydration_logs
DROP TRIGGER IF EXISTS update_hydration_logs_updated_at ON hydration_logs;

CREATE TRIGGER update_hydration_logs_updated_at
BEFORE UPDATE ON hydration_logs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

