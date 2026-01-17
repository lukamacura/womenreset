-- Migration: Create weekly_insights table for data-based weekly insights
-- This replaces AI-generated insights with pure data calculations

-- Create weekly_insights table
CREATE TABLE IF NOT EXISTS weekly_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('frequency', 'comparison', 'consistency', 'trigger_pattern', 'time_pattern', 'good_days', 'severity')),
  content TEXT NOT NULL,
  data_json JSONB,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  sent_as_notification BOOLEAN DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS weekly_insights_user_id_idx ON weekly_insights(user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS weekly_insights_week_idx ON weekly_insights(user_id, week_start, week_end);
CREATE INDEX IF NOT EXISTS weekly_insights_unread_idx ON weekly_insights(user_id, read_at) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE weekly_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own weekly insights" ON weekly_insights;
DROP POLICY IF EXISTS "Users can insert own weekly insights" ON weekly_insights;
DROP POLICY IF EXISTS "Users can update own weekly insights" ON weekly_insights;
DROP POLICY IF EXISTS "Users can delete own weekly insights" ON weekly_insights;

CREATE POLICY "Users can view own weekly insights"
ON weekly_insights FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly insights"
ON weekly_insights FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly insights"
ON weekly_insights FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly insights"
ON weekly_insights FOR DELETE
USING (auth.uid() = user_id);
