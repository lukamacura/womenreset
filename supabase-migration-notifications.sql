-- Notifications Migration: Create notifications table with RLS
-- Run this SQL in your Supabase SQL Editor

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lisa_insight', 'lisa_message', 'achievement', 'reminder', 'trial', 'welcome', 'success', 'error')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  auto_dismiss BOOLEAN DEFAULT false,
  auto_dismiss_seconds INTEGER,
  seen BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  show_once BOOLEAN DEFAULT false,
  show_on_pages JSONB DEFAULT '[]'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB, -- Store action data, icon, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dismissed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx 
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_seen_idx 
ON notifications(user_id, seen, dismissed, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_type_idx
ON notifications(type, created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Policy: Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own notifications
CREATE POLICY "Users can insert own notifications"
ON notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own notifications
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at_trigger ON notifications;
CREATE TRIGGER update_notifications_updated_at_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

