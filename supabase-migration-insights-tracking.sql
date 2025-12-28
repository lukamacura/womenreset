-- Add columns to user_preferences for tracking seen insights
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS last_seen_insights JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS insights_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_pattern_detected_at TIMESTAMP;

-- Add comment to explain the structure
COMMENT ON COLUMN user_preferences.last_seen_insights IS 'Array of insight objects that user has seen. Format: [{"type": "trigger_found", "symptom": "hot_flashes", "trigger": "coffee", "seen_at": "2025-12-28T10:00:00Z"}, ...]';
COMMENT ON COLUMN user_preferences.insights_generated_at IS 'Timestamp when insights were last generated/analyzed';
COMMENT ON COLUMN user_preferences.last_pattern_detected_at IS 'Timestamp when a new pattern was last detected';

