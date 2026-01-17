-- Migration: Add weekly_insights notification type to notifications table

-- Update the type check constraint to include 'weekly_insights'
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'lisa_insight', 
  'lisa_message', 
  'achievement', 
  'reminder', 
  'trial', 
  'welcome', 
  'success', 
  'error',
  'weekly_insights'
));
