-- Migration: Add notification preference fields to user_preferences table
-- Run this SQL in your Supabase SQL Editor

-- Add notification preference columns to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS morning_checkin_time TIME DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS evening_checkin_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS evening_checkin_time TIME DEFAULT '20:00',
ADD COLUMN IF NOT EXISTS weekly_summary_day INTEGER DEFAULT 0, -- 0=Sunday
ADD COLUMN IF NOT EXISTS insight_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS streak_reminders BOOLEAN DEFAULT true;

-- Create indexes for faster queries (if needed)
-- Note: TIME columns don't typically need indexes unless doing range queries

-- Initialize defaults for existing users
UPDATE user_preferences
SET 
  notification_enabled = COALESCE(notification_enabled, true),
  morning_checkin_time = COALESCE(morning_checkin_time, '08:00'::TIME),
  evening_checkin_enabled = COALESCE(evening_checkin_enabled, false),
  evening_checkin_time = COALESCE(evening_checkin_time, '20:00'::TIME),
  weekly_summary_day = COALESCE(weekly_summary_day, 0),
  insight_notifications = COALESCE(insight_notifications, true),
  streak_reminders = COALESCE(streak_reminders, true)
WHERE notification_enabled IS NULL;

