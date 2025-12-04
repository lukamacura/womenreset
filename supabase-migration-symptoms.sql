-- Symptom Tracker Migration: Create symptoms table with RLS
-- Run this SQL in your Supabase SQL Editor

-- Create symptoms table
CREATE TABLE IF NOT EXISTS symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 10),
  notes TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS symptoms_user_id_idx 
ON symptoms(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS symptoms_occurred_at_idx 
ON symptoms(occurred_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own symptoms" ON symptoms;
DROP POLICY IF EXISTS "Users can insert own symptoms" ON symptoms;
DROP POLICY IF EXISTS "Users can update own symptoms" ON symptoms;
DROP POLICY IF EXISTS "Users can delete own symptoms" ON symptoms;

-- Policy: Users can only view their own symptoms
CREATE POLICY "Users can view own symptoms"
ON symptoms FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own symptoms
CREATE POLICY "Users can insert own symptoms"
ON symptoms FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own symptoms
CREATE POLICY "Users can update own symptoms"
ON symptoms FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own symptoms
CREATE POLICY "Users can delete own symptoms"
ON symptoms FOR DELETE
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
DROP TRIGGER IF EXISTS update_symptoms_updated_at ON symptoms;

CREATE TRIGGER update_symptoms_updated_at
BEFORE UPDATE ON symptoms
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

