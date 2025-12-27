-- Migration: Add streak tracking fields to user_preferences table
-- Run this SQL in your Supabase SQL Editor

-- Add streak tracking columns to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_log_date DATE,
ADD COLUMN IF NOT EXISTS total_logs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_good_days INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS user_preferences_last_log_date_idx ON user_preferences(last_log_date);

-- Initialize streaks for existing users based on their symptom_logs
-- This is a one-time migration
UPDATE user_preferences up
SET 
  current_streak = sub.current_streak,
  longest_streak = sub.longest_streak,
  last_log_date = sub.last_log_date,
  total_logs = sub.total_logs
FROM (
  SELECT 
    sl.user_id,
    COUNT(DISTINCT DATE(sl.logged_at)) as total_logs,
    MAX(DATE(sl.logged_at)) as last_log_date,
    (
      -- Calculate current streak (consecutive days from today backwards)
      SELECT COUNT(DISTINCT DATE(logged_at))
      FROM symptom_logs sl2
      WHERE sl2.user_id = sl.user_id
      AND DATE(sl2.logged_at) >= DATE(NOW()) - INTERVAL '30 days'
      AND DATE(sl2.logged_at) <= DATE(NOW())
      AND (
        SELECT COUNT(DISTINCT DATE(logged_at))
        FROM symptom_logs sl3
        WHERE sl3.user_id = sl.user_id
        AND DATE(sl3.logged_at) >= DATE(sl2.logged_at) - INTERVAL '30 days'
        AND DATE(sl3.logged_at) <= DATE(sl2.logged_at)
      ) = (
        SELECT COUNT(DISTINCT DATE(logged_at))
        FROM symptom_logs sl4
        WHERE sl4.user_id = sl.user_id
        AND DATE(sl4.logged_at) >= DATE(sl2.logged_at) - INTERVAL '30 days'
        AND DATE(sl4.logged_at) <= DATE(sl2.logged_at)
        AND EXISTS (
          SELECT 1 FROM symptom_logs sl5
          WHERE sl5.user_id = sl.user_id
          AND DATE(sl5.logged_at) = DATE(sl2.logged_at) - INTERVAL '1 day'
        )
      )
      ORDER BY DATE(sl2.logged_at) DESC
      LIMIT 1
    ) as current_streak,
    (
      -- Calculate longest streak (simplified - max consecutive days in last 365 days)
      SELECT MAX(streak_length)
      FROM (
        SELECT COUNT(*) as streak_length
        FROM (
          SELECT DATE(logged_at) as log_date,
                 DATE(logged_at) - ROW_NUMBER() OVER (ORDER BY DATE(logged_at))::INTEGER as streak_group
          FROM symptom_logs sl6
          WHERE sl6.user_id = sl.user_id
          AND DATE(sl6.logged_at) >= DATE(NOW()) - INTERVAL '365 days'
          GROUP BY DATE(logged_at)
        ) grouped
        GROUP BY streak_group
      ) streaks
    ) as longest_streak
  FROM symptom_logs sl
  GROUP BY sl.user_id
) sub
WHERE up.user_id = sub.user_id;

-- For users without logs, ensure defaults are set
UPDATE user_preferences
SET 
  current_streak = 0,
  longest_streak = 0,
  last_log_date = NULL,
  total_logs = 0,
  total_good_days = 0
WHERE current_streak IS NULL;

