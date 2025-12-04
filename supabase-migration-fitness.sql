-- Fitness Tracker Migration: Create fitness table with RLS
-- Run this SQL in your Supabase SQL Editor

-- Create fitness table
CREATE TABLE IF NOT EXISTS fitness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  exercise_type TEXT NOT NULL CHECK (exercise_type IN ('cardio', 'strength', 'flexibility', 'sports', 'other')),
  duration_minutes NUMERIC,
  calories_burned NUMERIC,
  intensity TEXT CHECK (intensity IN ('low', 'medium', 'high')),
  notes TEXT,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS fitness_user_id_idx 
ON fitness(user_id, performed_at DESC);

CREATE INDEX IF NOT EXISTS fitness_performed_at_idx 
ON fitness(performed_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE fitness ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own fitness" ON fitness;
DROP POLICY IF EXISTS "Users can insert own fitness" ON fitness;
DROP POLICY IF EXISTS "Users can update own fitness" ON fitness;
DROP POLICY IF EXISTS "Users can delete own fitness" ON fitness;

-- Policy: Users can only view their own fitness entries
CREATE POLICY "Users can view own fitness"
ON fitness FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own fitness entries
CREATE POLICY "Users can insert own fitness"
ON fitness FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own fitness entries
CREATE POLICY "Users can update own fitness"
ON fitness FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own fitness entries
CREATE POLICY "Users can delete own fitness"
ON fitness FOR DELETE
USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp (if not exists)
-- Note: This function might already exist from other migrations, so we use CREATE OR REPLACE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_fitness_updated_at ON fitness;

CREATE TRIGGER update_fitness_updated_at
BEFORE UPDATE ON fitness
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

