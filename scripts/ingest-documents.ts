/**
 * Document Ingestion Script for LangChain RAG
 * 
 * This script loads knowledge base documents and ingests them into Supabase
 * for vector search.
 * 
 * Usage:
 *   npx tsx scripts/ingest-documents.ts
 * 
 * Or with ts-node:
 *   ts-node scripts/ingest-documents.ts
 */

// Load environment variables from .env.local or .env
import { config } from 'dotenv';
import { resolve } from 'path';

// Try to load .env.local first, then .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { createClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { Document } from "@langchain/core/documents";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small", // or "text-embedding-ada-002"
});

import fs from 'fs';
import path from 'path';

/**
 * Load knowledge base documents from markdown files in the knowledge-base folder
 */
async function loadDocuments(): Promise<Document[]> {
  const documents: Document[] = [];
  const kbDir = path.join(process.cwd(), 'knowledge-base');
  
  // Check if knowledge-base directory exists
  if (!fs.existsSync(kbDir)) {
    console.warn(`⚠️  Knowledge base directory not found: ${kbDir}`);
    return documents;
  }
  
  // Get all .md files from the knowledge-base directory
  const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.md'));
  
  if (files.length === 0) {
    console.warn(`⚠️  No markdown files found in ${kbDir}`);
    return documents;
  }
  
  console.log(`📄 Found ${files.length} markdown file(s) to process`);
  
  // Load each markdown file
  for (const file of files) {
    try {
      const filePath = path.join(kbDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract title from first line (if it's a markdown heading)
      const firstLine = content.split('\n')[0];
      const title = firstLine.startsWith('#') 
        ? firstLine.replace(/^#+\s*/, '').trim()
        : file.replace('.md', '').replace(/-/g, ' ');
      
      // Determine category from filename
      let category = 'general';
      if (file.includes('hot') || file.includes('flash')) category = 'symptoms';
      else if (file.includes('sleep')) category = 'symptoms';
      else if (file.includes('hrt') || file.includes('hormone')) category = 'treatment';
      else if (file.includes('nutrition') || file.includes('diet')) category = 'lifestyle';
      else if (file.includes('exercise') || file.includes('fitness')) category = 'lifestyle';
      
      documents.push(new Document({
        pageContent: content,
        metadata: {
          source: file,
          category: category,
          title: title,
          type: 'markdown',
        },
      }));
      
      console.log(`   ✓ Loaded: ${file}`);
    } catch (error) {
      console.error(`   ✗ Error loading ${file}:`, error);
    }
  }
  
  return documents;
}

/**
 * Ingest documents into Supabase vector store
 */
async function ingestDocuments() {
  try {
    console.log("Loading documents...");
    const documents = await loadDocuments();
    console.log(`Loaded ${documents.length} documents`);

    if (documents.length === 0) {
      console.warn("No documents to ingest. Please add documents to the loadDocuments() function.");
      return;
    }

    console.log("Generating embeddings and storing in Supabase...");
    
    // Ingest documents into Supabase
    const vectorStore = await SupabaseVectorStore.fromDocuments(
      documents,
      embeddings,
      {
        client: supabase,
        tableName: "documents",
        queryName: "match_documents",
      }
    );

    console.log("✅ Documents ingested successfully!");
    console.log(`   Total documents: ${documents.length}`);
    console.log(`   Vector store initialized and ready for queries.`);
  } catch (error) {
    console.error("❌ Error ingesting documents:", error);
    process.exit(1);
  }
}

// Run the ingestion
if (require.main === module) {
  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
    process.exit(1);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Missing OPENAI_API_KEY environment variable");
    process.exit(1);
  }

  ingestDocuments()
    .then(() => {
      console.log("\n✨ Ingestion complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export { ingestDocuments, loadDocuments };

