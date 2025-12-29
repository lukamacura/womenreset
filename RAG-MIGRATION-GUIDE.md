# RAG Knowledge Base Migration Guide

This guide walks you through migrating to the new section-based RAG system with hybrid search.

## Overview of Changes

1. **Section-Based Chunking**: Documents are now split by sections (## headings) instead of entire files
2. **Structured Metadata**: Metadata is extracted to JSONB fields for efficient filtering
3. **Hybrid Search**: Combines semantic similarity with keyword matching from Intent Patterns
4. **Early Exit**: System checks if documents exist before initializing vector store
5. **Performance Indexes**: GIN indexes added for faster metadata queries

## Migration Steps

### 1. Run Database Migration

Execute the new migration file to add performance indexes:

```sql
-- Run in Supabase SQL Editor
-- File: supabase-migration-rag-indexes.sql
```

This adds:
- GIN index on metadata JSONB
- B-tree indexes on topic and persona fields
- GIN index on keywords array

### 2. Clear Existing Documents (Clean Re-ingestion)

Since we're changing the document structure, we need to clear existing documents:

```sql
-- Run in Supabase SQL Editor
TRUNCATE TABLE documents;
```

**Note**: If you have important documents you want to keep, export them first:
```sql
-- Export existing documents (optional backup)
SELECT * FROM documents;
```

### 3. Run Updated Ingestion Script

Execute the refactored ingestion script:

```bash
npx tsx scripts/ingest-documents.ts
```

Expected output:
- Parses markdown files by sections
- Extracts metadata (Persona, Topic, Subtopic)
- Parses Intent Patterns and Keywords into arrays
- Creates one document per section
- Reports total sections, topics, keywords, and intent patterns

### 4. Verify Document Structure

Check that documents were ingested correctly:

```sql
-- Count total documents
SELECT COUNT(*) FROM documents;

-- Check metadata structure
SELECT 
  metadata->>'topic' as topic,
  metadata->>'subtopic' as subtopic,
  jsonb_array_length(metadata->'keywords') as keyword_count,
  jsonb_array_length(metadata->'intent_patterns') as pattern_count
FROM documents
LIMIT 10;

-- Check specific topic
SELECT COUNT(*) 
FROM documents 
WHERE metadata->>'topic' = 'Sleep Disturbances in Menopause';
```

### 5. Test RAG Endpoint

Test the RAG endpoint with various queries:

```bash
# Test with a query that should match keywords
curl -X POST http://localhost:3000/api/langchain-rag \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "Why can'\''t I sleep during menopause?",
    "user_id": "your-user-id"
  }'

# Test with empty documents table (should skip RAG)
# Clear table first: TRUNCATE TABLE documents;
# Then test again - should work without errors
```

## Expected Results

### Document Count
- **Before**: ~2 documents (one per file)
- **After**: ~20-25 documents (one per section)

### Metadata Structure
Each document should have:
```json
{
  "persona": "menopause",
  "topic": "Metabolic Changes & Weight Gain",
  "subtopic": "Common Myths – Calorie Deficit & Menopause Weight",
  "source": "Metabolic Changes & Weight Gain.md",
  "section_index": 0,
  "intent_patterns": ["Why am I not losing weight...", ...],
  "keywords": ["slow metabolism", "insulin resistance", ...],
  "content_sections": {
    "has_content": true,
    "has_action_tips": true,
    "has_motivation": true,
    "has_followup": true,
    "has_habit_strategy": false
  }
}
```

### Performance Improvements
- **Query Speed**: 2-3x faster with metadata indexes
- **Retrieval Precision**: Better matching with section-based chunks
- **Hybrid Search**: Keyword matches boost relevant results

## Troubleshooting

### Issue: No documents ingested
- Check that knowledge-base folder exists
- Verify markdown files are in the folder
- Check console output for parsing errors

### Issue: Metadata not extracted correctly
- Verify markdown structure matches expected format
- Check that sections have Persona, Topic, Subtopic fields
- Review console logs for skipped sections

### Issue: RAG still uses old documents
- Ensure you ran `TRUNCATE TABLE documents;`
- Verify new ingestion completed successfully
- Check document count matches expected sections

### Issue: Hybrid search not working
- Verify keywords and intent_patterns arrays exist in metadata
- Check that user queries contain meaningful keywords
- Review hybrid search scoring in logs (if added)

## Testing Checklist

- [ ] Database migration completed (indexes created)
- [ ] Old documents cleared (table truncated)
- [ ] Ingestion script runs without errors
- [ ] Document count matches expected sections (~20-25)
- [ ] Metadata structure verified in database
- [ ] Keywords and Intent Patterns arrays populated
- [ ] RAG endpoint works with queries
- [ ] Early exit works when documents table is empty
- [ ] Hybrid search boosts keyword-matching results

## Rollback Plan

If you need to rollback:

1. Restore old ingestion script from git
2. Re-run old ingestion (if you backed up documents)
3. Remove new indexes (optional):
   ```sql
   DROP INDEX IF EXISTS documents_metadata_idx;
   DROP INDEX IF EXISTS documents_topic_idx;
   DROP INDEX IF EXISTS documents_persona_idx;
   DROP INDEX IF EXISTS documents_keywords_idx;
   ```

## Next Steps

After successful migration:
1. Monitor query performance
2. Analyze which sections are retrieved most often
3. Consider topic-based filtering for specific queries
4. Fine-tune hybrid search keyword boost weight if needed





















































