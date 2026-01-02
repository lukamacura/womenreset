-- Notifications Cleanup Migration: Automatic cleanup of old notifications
-- Run this SQL in your Supabase SQL Editor

-- Create function to clean up old notifications based on retention policy:
-- - Delete read/dismissed notifications older than 7 days
-- - Keep unread notifications for 30 days
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  deleted_read_count INTEGER;
  deleted_dismissed_count INTEGER;
  total_deleted INTEGER;
BEGIN
  -- Delete dismissed notifications older than 7 days
  DELETE FROM notifications
  WHERE dismissed = true
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_dismissed_count = ROW_COUNT;

  -- Delete read (seen) notifications older than 7 days
  DELETE FROM notifications
  WHERE seen = true
    AND dismissed = false
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_read_count = ROW_COUNT;

  -- Delete unread notifications older than 30 days (even if not dismissed)
  DELETE FROM notifications
  WHERE seen = false
    AND dismissed = false
    AND created_at < NOW() - INTERVAL '30 days';

  total_deleted := deleted_dismissed_count + deleted_read_count;
  
  RETURN QUERY SELECT total_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for API calls)
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO authenticated;

-- Create a cron job function wrapper that can be called via pg_cron (if enabled)
-- Note: This requires pg_cron extension to be enabled in Supabase
-- To enable pg_cron, run: CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM UTC
-- Uncomment the following line if pg_cron is enabled:
-- SELECT cron.schedule('cleanup-old-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications();');

-- Alternative: Use Supabase Edge Function with cron trigger instead
-- See instructions in README for setting up cleanup via Supabase Dashboard cron jobs

