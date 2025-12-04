-- User Trials Management Migration
-- Create a dedicated table for trial management linked to auth.users
-- This allows admin to manage trial periods directly in Supabase UI
-- Run this SQL in your Supabase SQL Editor

-- Create user_trials table for trial management (one-to-one with auth.users)
CREATE TABLE IF NOT EXISTS user_trials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_end TIMESTAMP WITH TIME ZONE,
  trial_days INTEGER DEFAULT 3,
  account_status TEXT DEFAULT 'trial' CHECK (account_status IN ('trial', 'active', 'expired', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS user_trials_trial_end_idx ON user_trials(trial_end);
CREATE INDEX IF NOT EXISTS user_trials_account_status_idx ON user_trials(account_status);
CREATE INDEX IF NOT EXISTS user_trials_trial_start_idx ON user_trials(trial_start);

-- Enable RLS (Row Level Security)
ALTER TABLE user_trials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own trial info
CREATE POLICY "Users can view own trial"
ON user_trials FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Service role (admin) can manage all trials
-- This allows admin to edit trial info in Supabase UI
CREATE POLICY "Service role can manage all trials"
ON user_trials FOR ALL
USING (true)
WITH CHECK (true);

-- Function to automatically set trial_end when trial_start or trial_days changes
CREATE OR REPLACE FUNCTION update_trial_end()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_start IS NOT NULL AND NEW.trial_days IS NOT NULL THEN
    NEW.trial_end := NEW.trial_start + (NEW.trial_days || ' days')::INTERVAL;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update trial_end and updated_at
DROP TRIGGER IF EXISTS update_trial_end_trigger ON user_trials;
CREATE TRIGGER update_trial_end_trigger
BEFORE INSERT OR UPDATE OF trial_start, trial_days ON user_trials
FOR EACH ROW
EXECUTE FUNCTION update_trial_end();

-- Trigger to update updated_at on any update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_trials_updated_at ON user_trials;
CREATE TRIGGER update_user_trials_updated_at
BEFORE UPDATE ON user_trials
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user_trials entry when a user signs up
CREATE OR REPLACE FUNCTION create_user_trial_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_trials (user_id, trial_start, trial_days, account_status)
  VALUES (NEW.id, NOW(), 3, 'trial')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user_trials when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_trial_on_signup();

-- Migrate existing users: Create user_trials entries for users that don't have one
INSERT INTO user_trials (user_id, trial_start, trial_days, account_status)
SELECT 
  id,
  COALESCE(
    (raw_user_meta_data->>'trial_start')::TIMESTAMP WITH TIME ZONE,
    created_at
  ),
  3,
  'trial'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_trials)
ON CONFLICT (user_id) DO NOTHING;

-- Update account_status based on trial_end for existing records
UPDATE user_trials
SET account_status = CASE
  WHEN trial_end IS NULL THEN 'trial'
  WHEN trial_end < NOW() THEN 'expired'
  ELSE 'trial'
END
WHERE account_status IS NULL OR account_status = 'trial';

-- Comment: Admin can now update trial_days, trial_start, trial_end, and account_status
-- directly in Supabase Table Editor for the user_trials table
-- The table has a one-to-one relationship with auth.users via user_id (primary key)

