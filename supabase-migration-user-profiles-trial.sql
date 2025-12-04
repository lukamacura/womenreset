-- User Profiles Trial Management Migration
-- Add trial management fields to user_profiles table
-- Run this SQL in your Supabase SQL Editor

-- Add trial management columns to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'trial' CHECK (account_status IN ('trial', 'active', 'expired', 'suspended'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS user_profiles_trial_end_idx ON user_profiles(trial_end);
CREATE INDEX IF NOT EXISTS user_profiles_account_status_idx ON user_profiles(account_status);

-- Function to automatically set trial_end when trial_start or trial_days changes
CREATE OR REPLACE FUNCTION update_trial_end()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_start IS NOT NULL AND NEW.trial_days IS NOT NULL THEN
    NEW.trial_end := NEW.trial_start + (NEW.trial_days || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update trial_end
DROP TRIGGER IF EXISTS update_trial_end_trigger ON user_profiles;
CREATE TRIGGER update_trial_end_trigger
BEFORE INSERT OR UPDATE OF trial_start, trial_days ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_trial_end();

-- Migrate existing data: Set trial_start from user_metadata if available
-- This is a one-time migration for existing users
-- Note: This requires access to auth.users.user_metadata, which may need to be done manually
-- or through a function with proper permissions

-- Update account_status based on trial_end for existing records
UPDATE user_profiles
SET account_status = CASE
  WHEN trial_end IS NULL THEN 'trial'
  WHEN trial_end < NOW() THEN 'expired'
  ELSE 'trial'
END
WHERE account_status IS NULL OR account_status = 'trial';

-- Comment: Admin can now update trial_days, trial_start, trial_end, and account_status
-- directly in Supabase to manage user trial periods

