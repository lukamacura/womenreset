-- Migration: Add Period to default symptoms for existing users
-- This adds "Period" as a default symptom for all users who don't already have it

-- Migration: Add Period to default symptoms for existing users
-- This adds "Period" as a default symptom for all users who don't already have it

-- Add Period to default symptoms for users who don't have it
-- Using 'Circle' to match the Lucide icon name format used in DEFAULT_SYMPTOMS
INSERT INTO symptoms (user_id, name, icon, is_default)
SELECT DISTINCT u.id, 'Period', 'Circle', true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM symptoms s 
  WHERE s.user_id = u.id AND s.name = 'Period'
)
ON CONFLICT DO NOTHING;
