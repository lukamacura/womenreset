-- Migration: Simplify notification preferences
-- Removes unused notification preference columns
-- Adds reminder_time column if it doesn't exist

-- Step 1: Add reminder_time column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' 
    AND column_name = 'reminder_time'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN reminder_time TIME DEFAULT '09:00:00';
  END IF;
END $$;

-- Step 2: Migrate existing morning_checkin_time to reminder_time if reminder_time is NULL
UPDATE user_preferences
SET reminder_time = COALESCE(
  reminder_time,
  CASE 
    WHEN morning_checkin_time IS NOT NULL THEN morning_checkin_time::TIME
    ELSE '09:00:00'::TIME
  END
)
WHERE reminder_time IS NULL;

-- Step 3: Set default reminder_time for users who have notification_enabled but no time set
UPDATE user_preferences
SET reminder_time = '09:00:00'::TIME
WHERE notification_enabled = true 
  AND reminder_time IS NULL;

-- Note: We're NOT dropping the old columns yet to avoid breaking existing code
-- The old columns (morning_checkin_time, evening_checkin_enabled, etc.) can be dropped later
-- once we confirm the new system is working

-- Optional: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_notification_enabled_reminder_time 
ON user_preferences(notification_enabled, reminder_time)
WHERE notification_enabled = true;
