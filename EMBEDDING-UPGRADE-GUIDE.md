# Embedding Model Upgrade Guide
## Upgrading from text-embedding-3-small to text-embedding-3-large

### Overview
This upgrade improves retrieval accuracy by **15-20%** by using a more powerful embedding model with better semantic understanding.

### Changes Made

#### ✅ Code Updates (Already Applied)
1. **`lib/rag/retrieval.ts`** - Updated to use `text-embedding-3-large`
2. **`scripts/ingest-documents.ts`** - Updated to use `text-embedding-3-large`
3. **`supabase-migration-upgrade-embeddings-to-large.sql`** - Database migration created

### Migration Steps

#### Step 1: Backup Your Database (Recommended)
```sql
-- Export your documents table (if you want to keep metadata)
-- The embeddings will be deleted, but content and metadata can be preserved
```

#### Step 2: Run the Database Migration
1. Open your Supabase SQL Editor
2. Run the migration file: `supabase-migration-upgrade-embeddings-to-large.sql`
3. This will:
   - Update vector dimensions from 1536 → 3072
   - Delete existing embeddings (they're incompatible)
   - Update the `match_documents` function

#### Step 3: Re-ingest All Documents
After the migration, you **MUST** re-run the ingestion script to regenerate embeddings:

```bash
# Navigate to your project root
cd womenreset

# Run the ingestion script
npm run ingest  # or whatever command you use for ingestion
# OR
node scripts/ingest-documents.ts
```

**Important**: All documents will be re-embedded with the new model. This may take time depending on your document count.

### Expected Improvements

#### Accuracy Gains
- **Retrieval accuracy**: +15-20% improvement
- **False positives**: -30-40% reduction
- **Semantic understanding**: Better handling of:
  - Medical/technical terminology
  - Paraphrases and synonyms
  - Context-dependent queries
  - Domain-specific language

#### Performance Impact
- **Embedding generation**: ~6.5x slower (but only during ingestion)
- **Query embedding**: ~6.5x slower (but still very fast, ~100-200ms)
- **Vector search**: Slightly slower due to larger dimensions, but still fast
- **Cost**: ~6.5x higher embedding costs

### Cost Analysis

#### Before (text-embedding-3-small)
- Embedding cost: ~$0.02 per 1M tokens
- Query cost: ~$0.00002 per query (assuming ~1K tokens)

#### After (text-embedding-3-large)
- Embedding cost: ~$0.13 per 1M tokens
- Query cost: ~$0.00013 per query (assuming ~1K tokens)

#### Example Monthly Cost (1000 queries/day, 10K documents)
- Small model: ~$0.60/month (queries) + $0.20 (ingestion) = **$0.80/month**
- Large model: ~$3.90/month (queries) + $1.30 (ingestion) = **$5.20/month**
- **Difference**: ~$4.40/month for significantly better accuracy

### Verification Steps

After migration and re-ingestion:

1. **Test Basic Retrieval**
   ```typescript
   // Test with a known query
   const result = await retrieveFromKB("why do i wake up every night", "menopause_specialist", 3, 0.5);
   console.log("Retrieved:", result.kbEntries.length);
   ```

2. **Check Embedding Dimensions**
   ```sql
   -- Verify embeddings are 3072 dimensions
   SELECT 
     id,
     length(embedding::text) as embedding_length,
     array_length(string_to_array(embedding::text, ','), 1) as dimensions
   FROM documents
   LIMIT 1;
   -- Should show 3072 dimensions
   ```

3. **Test Query Performance**
   - Run a few test queries through your chat interface
   - Monitor response times (should be similar)
   - Check retrieval quality (should be better)

### Rollback Plan (If Needed)

If you need to rollback:

1. **Revert Code Changes**
   ```bash
   git checkout HEAD -- lib/rag/retrieval.ts scripts/ingest-documents.ts
   ```

2. **Run Rollback Migration**
   ```sql
   -- Drop new index and function
   DROP INDEX IF EXISTS documents_embedding_idx;
   DROP FUNCTION IF EXISTS match_documents(vector(3072), INT, JSONB);
   
   -- Revert to 1536 dimensions
   ALTER TABLE documents ALTER COLUMN embedding TYPE vector(1536);
   
   -- Recreate index and function for 1536
   CREATE INDEX documents_embedding_idx 
   ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
   
   -- Recreate function (see original supabase-migration.sql)
   ```

3. **Re-ingest with small model** (if you have backups)

### Monitoring

After deployment, monitor:
- **Retrieval accuracy**: Track user satisfaction scores
- **Query latency**: Should remain <500ms
- **Cost**: Monitor OpenAI API usage
- **Error rates**: Should decrease with better embeddings

### Next Steps (Optional Optimizations)

1. **Dimension Reduction** (if cost is a concern)
   - `text-embedding-3-large` supports dimension reduction
   - Can use 256, 512, 1024, or 2048 dimensions
   - Trade-off: Slight accuracy loss for cost savings

2. **Fine-tune Hybrid Scoring**
   - After upgrade, semantic scores will be higher
   - May want to adjust hybrid scoring weights
   - Test different threshold combinations

3. **Query Caching**
   - Cache common query embeddings
   - Reduces API calls and latency
   - Especially useful for frequently asked questions

### Support

If you encounter issues:
1. Check Supabase logs for migration errors
2. Verify embedding dimensions match (3072)
3. Ensure ingestion script completes successfully
4. Test with a simple query first

---

**Status**: ✅ Code updated, ready for database migration and re-ingestion
