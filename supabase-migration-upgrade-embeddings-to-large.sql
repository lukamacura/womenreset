-- Migration: Upgrade Embeddings from text-embedding-3-small (1536) to text-embedding-3-large (3072)
-- Run this SQL in your Supabase SQL Editor AFTER updating the code to use text-embedding-3-large
-- 
-- IMPORTANT: This migration will:
-- 1. Update the embedding column dimension from 1536 to 3072
-- 2. Update the match_documents function to accept 3072-dimensional vectors
-- 3. Recreate the vector index
-- 4. Delete existing embeddings (they need to be re-generated with the new model)
--
-- WARNING: This will DELETE all existing embeddings. You MUST re-run the ingestion script
-- after applying this migration to regenerate embeddings with text-embedding-3-large.

-- Step 1: Drop the existing index (required before altering column)
DROP INDEX IF EXISTS documents_embedding_idx;

-- Step 2: Drop the existing match_documents function (required before altering column)
DROP FUNCTION IF EXISTS match_documents(vector(1536), INT, JSONB);

-- Step 3: Delete all existing embeddings (they're incompatible with new dimension)
-- This is necessary because we can't convert 1536-dim vectors to 3072-dim
-- You'll need to re-run the ingestion script after this migration
DELETE FROM documents;

-- Step 4: Alter the embedding column to use 3072 dimensions
ALTER TABLE documents 
ALTER COLUMN embedding TYPE vector(3072);

-- Step 5: Recreate the index with new dimension
-- Using ivfflat for faster approximate nearest neighbor search
-- Adjusted lists parameter for larger dimension (100 is still good for 3072)
CREATE INDEX documents_embedding_idx 
ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Step 6: Recreate the match_documents function with 3072 dimensions
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(3072),
  match_count INT DEFAULT 5,
  filter JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Migration complete!
-- Next steps:
-- 1. Run the ingestion script to regenerate all embeddings with text-embedding-3-large
-- 2. Verify the new embeddings are working correctly
-- 3. Monitor retrieval accuracy improvements
