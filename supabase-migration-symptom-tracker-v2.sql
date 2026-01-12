-- Symptom Tracker V2 Migration
-- Simplified 3-table structure with default symptom seeding

-- Drop old symptoms table (fresh start)
DROP TABLE IF EXISTS symptoms CASCADE;

-- Table 1: symptoms - Symptom definitions
CREATE TABLE symptoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🔴',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: symptom_logs - Actual log entries
CREATE TABLE symptom_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symptom_id UUID REFERENCES symptoms(id) ON DELETE CASCADE NOT NULL,
  severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 10),
  triggers TEXT[], -- Array of trigger names (simple strings, NOT a separate table)
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: user_preferences - User settings
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  favorite_symptoms UUID[], -- Array of symptom IDs for quick access
  check_in_time TIME DEFAULT '09:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS symptoms_user_id_idx ON symptoms(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS symptom_logs_user_id_idx ON symptom_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS symptom_logs_symptom_id_idx ON symptom_logs(symptom_id);
CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for symptoms table
DROP POLICY IF EXISTS "Users can view own symptoms" ON symptoms;
DROP POLICY IF EXISTS "Users can insert own symptoms" ON symptoms;
DROP POLICY IF EXISTS "Users can update own symptoms" ON symptoms;
DROP POLICY IF EXISTS "Users can delete own symptoms" ON symptoms;

CREATE POLICY "Users can view own symptoms"
ON symptoms FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own symptoms"
ON symptoms FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own symptoms"
ON symptoms FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own symptoms"
ON symptoms FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for symptom_logs table
DROP POLICY IF EXISTS "Users can view own symptom logs" ON symptom_logs;
DROP POLICY IF EXISTS "Users can insert own symptom logs" ON symptom_logs;
DROP POLICY IF EXISTS "Users can update own symptom logs" ON symptom_logs;
DROP POLICY IF EXISTS "Users can delete own symptom logs" ON symptom_logs;

CREATE POLICY "Users can view own symptom logs"
ON symptom_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own symptom logs"
ON symptom_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own symptom logs"
ON symptom_logs FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own symptom logs"
ON symptom_logs FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for user_preferences table
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences"
ON user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
ON user_preferences FOR DELETE
USING (auth.uid() = user_id);

-- Function to seed default symptoms for a new user
CREATE OR REPLACE FUNCTION seed_default_symptoms()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO symptoms (user_id, name, icon, is_default) VALUES
    (NEW.id, 'Hot flashes', '🔥', true),
    (NEW.id, 'Night sweats', '💧', true),
    (NEW.id, 'Fatigue', '😫', true),
    (NEW.id, 'Brain fog', '🌫️', true),
    (NEW.id, 'Mood swings', '🎭', true),
    (NEW.id, 'Anxiety', '😰', true),
    (NEW.id, 'Headaches', '🤕', true),
    (NEW.id, 'Joint pain', '🦴', true),
    (NEW.id, 'Bloating', '🎈', true),
    (NEW.id, 'Insomnia', '😵', true),
    (NEW.id, 'Weight gain', '⚖️', true),
    (NEW.id, 'Low libido', '💔', true),
    (NEW.id, 'Period', '⭕', true);
  
  -- Also create user_preferences entry
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to seed default symptoms when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created_seed_symptoms ON auth.users;
CREATE TRIGGER on_auth_user_created_seed_symptoms
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION seed_default_symptoms();

-- Migrate existing users: Seed default symptoms for users that don't have any
INSERT INTO symptoms (user_id, name, icon, is_default)
SELECT 
  u.id,
  symptom_data.name,
  symptom_data.icon,
  true
FROM auth.users u
CROSS JOIN (
  VALUES
    ('Hot flashes', '🔥'),
    ('Night sweats', '💧'),
    ('Fatigue', '😫'),
    ('Brain fog', '🌫️'),
    ('Mood swings', '🎭'),
    ('Anxiety', '😰'),
    ('Headaches', '🤕'),
    ('Joint pain', '🦴'),
    ('Bloating', '🎈'),
    ('Insomnia', '😵'),
    ('Weight gain', '⚖️'),
    ('Low libido', '💔'),
    ('Period', '⭕')
) AS symptom_data(name, icon)
WHERE NOT EXISTS (
  SELECT 1 FROM symptoms s WHERE s.user_id = u.id
)
ON CONFLICT DO NOTHING;

-- Create user_preferences for existing users that don't have one
INSERT INTO user_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_preferences)
ON CONFLICT (user_id) DO NOTHING;

