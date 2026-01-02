-- Daily Mood Migration
-- Creates daily_mood table to replace Good Day symptom

-- Create daily_mood table
CREATE TABLE IF NOT EXISTS daily_mood (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  mood INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS daily_mood_user_id_idx ON daily_mood(user_id, date DESC);
CREATE INDEX IF NOT EXISTS daily_mood_date_idx ON daily_mood(date DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE daily_mood ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_mood table
DROP POLICY IF EXISTS "Users can view own daily mood" ON daily_mood;
DROP POLICY IF EXISTS "Users can insert own daily mood" ON daily_mood;
DROP POLICY IF EXISTS "Users can update own daily mood" ON daily_mood;
DROP POLICY IF EXISTS "Users can delete own daily mood" ON daily_mood;

CREATE POLICY "Users can view own daily mood"
ON daily_mood FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily mood"
ON daily_mood FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily mood"
ON daily_mood FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily mood"
ON daily_mood FOR DELETE
USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_mood_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_daily_mood_updated_at ON daily_mood;

CREATE TRIGGER update_daily_mood_updated_at
BEFORE UPDATE ON daily_mood
FOR EACH ROW
EXECUTE FUNCTION update_daily_mood_updated_at();
