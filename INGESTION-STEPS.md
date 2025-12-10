# Knowledge Base Ingestion Steps

## What We've Fixed

1. ✅ **Improved chunking**: Lowered max tokens from 7000 to 6000 for safety
2. ✅ **Token validation**: Filters out documents exceeding 8000 tokens before embedding
3. ✅ **Batch processing**: Processes documents in batches of 10 with error handling
4. ✅ **Individual retry**: If a batch fails, retries each document individually
5. ✅ **Progress tracking**: Shows detailed progress and success/failure counts

## Steps to Ingest Documents

### 1. Clear Existing Documents (if any)

```sql
-- Run in Supabase SQL Editor
TRUNCATE TABLE documents;
```

### 2. Run the Ingestion Script

```bash
npx tsx scripts/ingest-documents.ts
```

### 3. Expected Output

You should see:
- Loading documents from knowledge-base folder
- Section parsing progress
- Token validation results
- Batch processing progress
- Success/failure counts
- Summary statistics

### 4. Verify in Supabase

```sql
-- Check document count
SELECT COUNT(*) FROM documents;

-- View sample documents with metadata
SELECT 
  id,
  metadata->>'topic' as topic,
  metadata->>'subtopic' as subtopic,
  LENGTH(content) as content_length,
  jsonb_array_length(metadata->'keywords') as keyword_count
FROM documents
LIMIT 10;

-- Check for documents by topic
SELECT 
  metadata->>'topic' as topic,
  COUNT(*) as document_count
FROM documents
GROUP BY metadata->>'topic';
```

### 5. Test RAG Endpoint

The RAG endpoint should now automatically use these documents when answering questions.

## Troubleshooting

### If documents still fail to ingest:
1. Check the console output for specific error messages
2. Verify your `.env` or `.env.local` has:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
3. Check Supabase logs for any database errors

### If token limit errors persist:
- The script will automatically skip oversized documents
- Check which documents are being skipped in the console output
- You may need to manually split very large sections

## Success Criteria

✅ Documents appear in `documents` table
✅ Each document has proper metadata (persona, topic, subtopic, keywords, intent_patterns)
✅ RAG queries return relevant results
✅ Hybrid search works (semantic + keyword matching)








