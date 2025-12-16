-- RAG Performance Optimization: Add indexes for metadata filtering
-- Run this SQL in your Supabase SQL Editor after the base migration
-- This migration adds GIN indexes for faster metadata filtering

-- GIN index on entire metadata JSONB for fast containment queries (@>)
CREATE INDEX IF NOT EXISTS documents_metadata_idx 
ON documents USING GIN (metadata);

-- B-tree index on topic field for topic-based filtering
CREATE INDEX IF NOT EXISTS documents_topic_idx 
ON documents ((metadata->>'topic'));

-- B-tree index on persona field for persona-based filtering
CREATE INDEX IF NOT EXISTS documents_persona_idx 
ON documents ((metadata->>'persona'));

-- GIN index on keywords array for keyword matching
-- Note: This assumes keywords is stored as a JSONB array
CREATE INDEX IF NOT EXISTS documents_keywords_idx 
ON documents USING GIN ((metadata->'keywords'));

-- These indexes enable:
-- 1. Fast metadata filtering: WHERE metadata @> '{"topic": "Sleep Disturbances"}'
-- 2. Fast topic queries: WHERE metadata->>'topic' = 'Sleep Disturbances'
-- 3. Fast keyword searches: WHERE metadata->'keywords' @> '["insomnia"]'
-- 4. Improved query performance for hybrid search implementations





















