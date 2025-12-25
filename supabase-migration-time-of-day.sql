-- Migration: Add time-of-day tracking to symptom_logs
-- This migration adds a time_of_day column and populates it from logged_at

-- Step 1: Add time_of_day column
ALTER TABLE symptom_logs 
ADD COLUMN IF NOT EXISTS time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night'));

-- Step 2: Populate from logged_at for existing records
UPDATE symptom_logs
SET time_of_day = CASE
  WHEN EXTRACT(HOUR FROM logged_at) >= 6 AND EXTRACT(HOUR FROM logged_at) < 12 THEN 'morning'
  WHEN EXTRACT(HOUR FROM logged_at) >= 12 AND EXTRACT(HOUR FROM logged_at) < 18 THEN 'afternoon'
  WHEN EXTRACT(HOUR FROM logged_at) >= 18 AND EXTRACT(HOUR FROM logged_at) < 22 THEN 'evening'
  ELSE 'night'
END
WHERE time_of_day IS NULL;

-- Step 3: Create function to auto-set time_of_day on insert/update
CREATE OR REPLACE FUNCTION set_time_of_day()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.time_of_day IS NULL THEN
    NEW.time_of_day := CASE
      WHEN EXTRACT(HOUR FROM NEW.logged_at) >= 6 AND EXTRACT(HOUR FROM NEW.logged_at) < 12 THEN 'morning'
      WHEN EXTRACT(HOUR FROM NEW.logged_at) >= 12 AND EXTRACT(HOUR FROM NEW.logged_at) < 18 THEN 'afternoon'
      WHEN EXTRACT(HOUR FROM NEW.logged_at) >= 18 AND EXTRACT(HOUR FROM NEW.logged_at) < 22 THEN 'evening'
      ELSE 'night'
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to auto-set time_of_day
DROP TRIGGER IF EXISTS set_time_of_day_trigger ON symptom_logs;
CREATE TRIGGER set_time_of_day_trigger
  BEFORE INSERT OR UPDATE ON symptom_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_time_of_day();

