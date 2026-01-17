-- Migration: Add weekly insights notification preferences to user_preferences table

-- Add weekly insights preference columns
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS weekly_insights_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weekly_insights_day TEXT DEFAULT 'sunday' CHECK (weekly_insights_day IN ('sunday', 'monday')),
ADD COLUMN IF NOT EXISTS weekly_insights_time TIME DEFAULT '20:00';

-- Initialize defaults for existing users
UPDATE user_preferences
SET 
  weekly_insights_enabled = COALESCE(weekly_insights_enabled, true),
  weekly_insights_day = COALESCE(weekly_insights_day, 'sunday'),
  weekly_insights_time = COALESCE(weekly_insights_time, '20:00'::TIME)
WHERE weekly_insights_enabled IS NULL;
