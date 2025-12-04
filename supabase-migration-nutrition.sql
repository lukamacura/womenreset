-- Nutrition Tracker Migration: Create nutrition table with RLS
-- Run this SQL in your Supabase SQL Editor

-- Create nutrition table
CREATE TABLE IF NOT EXISTS nutrition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_item TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  calories NUMERIC,
  notes TEXT,
  consumed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS nutrition_user_id_idx 
ON nutrition(user_id, consumed_at DESC);

CREATE INDEX IF NOT EXISTS nutrition_consumed_at_idx 
ON nutrition(consumed_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE nutrition ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own nutrition" ON nutrition;
DROP POLICY IF EXISTS "Users can insert own nutrition" ON nutrition;
DROP POLICY IF EXISTS "Users can update own nutrition" ON nutrition;
DROP POLICY IF EXISTS "Users can delete own nutrition" ON nutrition;

-- Policy: Users can only view their own nutrition entries
CREATE POLICY "Users can view own nutrition"
ON nutrition FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own nutrition entries
CREATE POLICY "Users can insert own nutrition"
ON nutrition FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own nutrition entries
CREATE POLICY "Users can update own nutrition"
ON nutrition FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own nutrition entries
CREATE POLICY "Users can delete own nutrition"
ON nutrition FOR DELETE
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
DROP TRIGGER IF EXISTS update_nutrition_updated_at ON nutrition;

CREATE TRIGGER update_nutrition_updated_at
BEFORE UPDATE ON nutrition
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

