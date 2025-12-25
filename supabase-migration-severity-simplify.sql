-- Migration: Simplify severity from 1-10 to 1-3 scale
-- This migration updates the severity constraint and migrates existing data

-- Step 1: Migrate existing data: map 1-10 to 1-3
-- 1-3 → 1 (Mild)
-- 4-7 → 2 (Moderate)
-- 8-10 → 3 (Severe)
UPDATE symptom_logs 
SET severity = CASE
  WHEN severity <= 3 THEN 1
  WHEN severity <= 7 THEN 2
  ELSE 3
END
WHERE severity > 3; -- Only update values that need changing

-- Step 2: Update severity constraint from 1-10 to 1-3
ALTER TABLE symptom_logs DROP CONSTRAINT IF EXISTS symptom_logs_severity_check;
ALTER TABLE symptom_logs ADD CONSTRAINT symptom_logs_severity_check 
  CHECK (severity >= 1 AND severity <= 3);

-- Verify: Check that all values are now 1, 2, or 3
-- SELECT DISTINCT severity FROM symptom_logs ORDER BY severity;

