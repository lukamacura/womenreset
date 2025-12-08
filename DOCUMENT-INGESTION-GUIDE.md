# Document Ingestion Guide

This guide explains how to ingest documents into the vector database for the RAG (Retrieval-Augmented Generation) system.

## Overview

The ingestion process:
1. Loads markdown files from the `knowledge-base/` folder
2. Parses them into sections with metadata
3. Chunks large content to stay under 10,000 characters (to avoid Supabase UI display issues)
4. Generates embeddings using OpenAI
5. Stores documents in Supabase vector database

## Prerequisites

1. **Environment Variables**: Make sure you have these in your `.env.local` or `.env` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   ```

2. **Knowledge Base Files**: Place your markdown files in the `knowledge-base/` folder. Files should:
   - Have `.md` extension
   - Follow the section format with metadata:
     ```markdown
     ## Section Title
     
     **Persona:** [persona name]
     **Topic:** [topic name]
     **Subtopic:** [subtopic name]
     
     ### **Content**
     [Your content here...]
     
     ### **Intent Patterns**
     - Pattern 1
     - Pattern 2
     
     ### **Keywords**
     - Keyword 1
     - Keyword 2
     ```

## Step 1: Clean Up Existing Oversized Documents (Optional)

If you have existing documents that are too large (>10,000 characters), clean them up first:

```bash
npm run cleanup-docs
```

Or directly:
```bash
npx tsx scripts/cleanup-oversized-documents.ts
```

This will:
- Find all documents exceeding 10,000 characters
- Delete them (you can re-ingest them with proper chunking)

## Step 2: Ingest Documents

Run the ingestion script:

```bash
npm run ingest
```

Or directly:
```bash
npx tsx scripts/ingest-documents.ts
```

### What the Script Does

1. **Loads Documents**: Reads all `.md` files from `knowledge-base/` folder
2. **Parses Sections**: Splits files by `##` headings (major sections)
3. **Extracts Metadata**: Gets Persona, Topic, Subtopic, Intent Patterns, Keywords
4. **Chunks Content**: 
   - Splits content if it exceeds 2,000 tokens (~8,000 characters)
   - Ensures no chunk exceeds 10,000 characters
   - Uses paragraph → sentence → word splitting strategy
5. **Validates**: Checks that all chunks are within limits
6. **Generates Embeddings**: Creates vector embeddings using OpenAI
7. **Stores in Supabase**: Saves documents to the `documents` table

### Output

The script will show:
- Number of files processed
- Number of sections found per file
- Number of documents created (after chunking)
- Validation results
- Batch processing progress
- Success/failure counts
- Summary statistics (topics, keywords, intent patterns)

Example output:
```
📄 Found 5 markdown file(s) to process
   📑 Sleep Disturbances.md: Found 12 section(s)
   ✓ Loaded 12 section(s) from Sleep Disturbances.md
📚 Loaded 45 document sections
🔍 Validating documents...
✅ 45 documents passed validation (0 skipped due to size)
⚙️  Generating embeddings and storing in Supabase...
   Processing batch 1/5 (10 documents)...
   ✓ Batch 1 completed
...
✅ Document ingestion complete!
   📊 Successfully ingested: 45 documents
   📖 Unique topics: 8
   🏷️  Total keywords: 234
   💬 Total intent patterns: 67
```

## Step 3: Verify in Supabase

1. Go to your Supabase dashboard
2. Navigate to **Table Editor** → **documents**
3. Check that:
   - Documents are present
   - Content column shows values (not "Value is larger than 10,240 characters")
   - Metadata column contains structured JSON
   - Embedding column has vector data

## Troubleshooting

### Error: "Missing environment variables"
- Check that `.env.local` or `.env` file exists
- Verify all required variables are set

### Error: "Knowledge base directory not found"
- Create a `knowledge-base/` folder in the project root
- Add `.md` files to it

### Error: "No documents to ingest"
- Check that you have `.md` files in `knowledge-base/` folder
- Verify files have proper section format with metadata

### Documents still showing "Value is larger than 10,240 characters"
1. Run cleanup script: `npm run cleanup-docs`
2. Re-run ingestion: `npm run ingest`
3. The new chunking logic will ensure all documents are under 10,000 characters

### Batch processing fails
- The script will retry individual documents if a batch fails
- Check console output for specific error messages
- Verify your OpenAI API key has sufficient credits
- Check Supabase connection and permissions

## Chunking Details

The ingestion script uses intelligent chunking:

1. **Primary Limit**: 2,000 tokens (~8,000 characters)
2. **Hard Character Limit**: 10,000 characters (to stay under Supabase UI limit of 10,240)
3. **Chunking Strategy**:
   - First: Split by paragraphs (double newlines)
   - Second: Split by sentences (if paragraph too large)
   - Third: Split by words (if sentence too large - rare)

This ensures:
- No document exceeds display limits
- Content remains semantically coherent
- RAG retrieval works effectively

## Re-ingesting Documents

If you update your knowledge base files:

1. **Option 1: Delete and Re-ingest** (Recommended)
   ```sql
   -- In Supabase SQL Editor
   TRUNCATE TABLE documents;
   ```
   Then run: `npm run ingest`

2. **Option 2: Manual Cleanup**
   - Use cleanup script: `npm run cleanup-docs`
   - Re-run ingestion: `npm run ingest`

## Best Practices

1. **Keep sections focused**: Each section should cover one topic/subtopic
2. **Use proper metadata**: Always include Persona, Topic, Subtopic
3. **Add intent patterns**: Help the RAG system match user queries
4. **Include keywords**: Improve search accuracy
5. **Test after ingestion**: Query the RAG system to verify documents are retrievable

## File Structure

```
project-root/
├── knowledge-base/          # Your markdown files go here
│   ├── Sleep Disturbances.md
│   ├── Hot Flashes.md
│   └── ...
├── scripts/
│   ├── ingest-documents.ts  # Main ingestion script
│   └── cleanup-oversized-documents.ts  # Cleanup script
└── ...
```

## Next Steps

After successful ingestion:
1. Test the RAG endpoint with queries
2. Monitor retrieval quality
3. Adjust chunking if needed (edit `scripts/ingest-documents.ts`)
4. Add more documents as needed

