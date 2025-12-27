-- Migration: Add custom_triggers array to user_preferences table
-- Run this SQL in your Supabase SQL Editor

-- Add custom_triggers column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS custom_triggers TEXT[] DEFAULT '{}';

-- Create index for array operations (if needed for queries)
-- Note: PostgreSQL array columns don't typically need indexes for simple contains checks

-- Initialize empty array for existing users
UPDATE user_preferences
SET custom_triggers = COALESCE(custom_triggers, '{}'::TEXT[])
WHERE custom_triggers IS NULL;

