-- Fix Signup Trigger - Make it more robust
-- Run this SQL in your Supabase SQL Editor to fix the 500 error during signup

-- First, check if user_trials table exists, if not create it
CREATE TABLE IF NOT EXISTS user_trials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_end TIMESTAMP WITH TIME ZONE,
  trial_days INTEGER DEFAULT 3,
  account_status TEXT DEFAULT 'trial' CHECK (account_status IN ('trial', 'active', 'expired', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS user_trials_trial_end_idx ON user_trials(trial_end);
CREATE INDEX IF NOT EXISTS user_trials_account_status_idx ON user_trials(account_status);
CREATE INDEX IF NOT EXISTS user_trials_trial_start_idx ON user_trials(trial_start);

-- Enable RLS
ALTER TABLE user_trials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can view own trial" ON user_trials;
DROP POLICY IF EXISTS "Service role can manage all trials" ON user_trials;

CREATE POLICY "Users can view own trial"
ON user_trials FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all trials"
ON user_trials FOR ALL
USING (true)
WITH CHECK (true);

-- Make the trigger function more robust with error handling
CREATE OR REPLACE FUNCTION create_user_trial_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert, but don't fail if there's an error
  BEGIN
    INSERT INTO user_trials (user_id, trial_start, trial_days, account_status)
    VALUES (NEW.id, NOW(), 3, 'trial')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create user_trial for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_trial_on_signup();

-- Also create the function to update trial_end
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

-- Create trigger for updating trial_end
DROP TRIGGER IF EXISTS update_trial_end_trigger ON user_trials;
CREATE TRIGGER update_trial_end_trigger
BEFORE INSERT OR UPDATE OF trial_start, trial_days ON user_trials
FOR EACH ROW
EXECUTE FUNCTION update_trial_end();

































