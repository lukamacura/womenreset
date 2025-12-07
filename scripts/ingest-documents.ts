/**
 * Document Ingestion Script for LangChain RAG
 * 
 * This script loads knowledge base documents and ingests them into Supabase
 * for vector search with section-based chunking and structured metadata.
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
  modelName: "text-embedding-3-small",
});

import fs from 'fs';
import path from 'path';

interface SectionMetadata {
  persona: string;
  topic: string;
  subtopic: string;
}

interface ContentSections {
  has_content: boolean;
  has_action_tips: boolean;
  has_motivation: boolean;
  has_followup: boolean;
  has_habit_strategy: boolean;
}

interface ParsedSection {
  metadata: SectionMetadata;
  content: string;
  intent_patterns: string[];
  keywords: string[];
  content_sections: ContentSections;
}

/**
 * Parse markdown file into sections based on ## headings
 */
function parseMarkdownSections(content: string): string[] {
  // Split by ## headings (major topic sections)
  // Handle both Windows (\r\n) and Unix (\n) line endings
  const sections: string[] = [];
  const lines = content.split(/\r?\n/);
  let currentSection: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this is a new major section (## Topic)
    if (line.match(/^##\s+/)) {
      // Save previous section if it exists
      if (currentSection.length > 0) {
        sections.push(currentSection.join('\n'));
      }
      // Start new section
      currentSection = [line];
    } else if (currentSection.length > 0 || line.trim()) {
      // Continue current section or start collecting if we haven't started yet
      currentSection.push(line);
    }
  }
  
  // Don't forget the last section
  if (currentSection.length > 0) {
    sections.push(currentSection.join('\n'));
  }
  
  return sections.filter(s => s.trim().length > 0);
}

/**
 * Extract metadata (Persona, Topic, Subtopic) from section
 */
function extractMetadata(section: string): SectionMetadata | null {
  // Match metadata lines - handle Windows (\r\n) and Unix (\n) line endings
  // Match everything after the colon until end of line (including trailing spaces)
  const personaMatch = section.match(/\*\*Persona:\*\*\s*([^\r\n]+?)(?:\s*[\r\n]|$)/);
  const topicMatch = section.match(/\*\*Topic:\*\*\s*([^\r\n]+?)(?:\s*[\r\n]|$)/);
  const subtopicMatch = section.match(/\*\*Subtopic:\*\*\s*([^\r\n]+?)(?:\s*[\r\n]|$)/);
  
  if (!personaMatch || !topicMatch || !subtopicMatch) {
    return null;
  }
  
  return {
    persona: personaMatch[1].trim(),
    topic: topicMatch[1].trim(),
    subtopic: subtopicMatch[1].trim(),
  };
}

/**
 * Parse Intent Patterns section into array
 */
function parseIntentPatterns(section: string): string[] {
  const patterns: string[] = [];
  const intentPatternsMatch = section.match(/###\s*\*\*Intent Patterns?\*\*\s*\n([\s\S]*?)(?=###|$)/);
  
  if (!intentPatternsMatch) {
    return patterns;
  }
  
  const patternsText = intentPatternsMatch[1];
  const lines = patternsText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Match bullet points (- or •)
    if (trimmed.match(/^[-•]\s+/)) {
      const pattern = trimmed.replace(/^[-•]\s+/, '').trim();
      if (pattern) {
        patterns.push(pattern);
      }
    }
  }
  
  return patterns;
}

/**
 * Parse Keywords section into flat array
 */
function parseKeywords(section: string): string[] {
  const keywords: string[] = [];
  const keywordsMatch = section.match(/###\s*\*\*Keywords?\*\*\s*\n([\s\S]*?)(?=###|---\s*$|$)/);
  
  if (!keywordsMatch) {
    return keywords;
  }
  
  const keywordsText = keywordsMatch[1];
  const lines = keywordsText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip subcategory headers (like **Scientific & Hormonal**)
    if (trimmed.match(/^\*\*/)) {
      continue;
    }
    // Match bullet points (- or •)
    if (trimmed.match(/^[-•]\s+/)) {
      const keyword = trimmed.replace(/^[-•]\s+/, '').trim();
      if (keyword) {
        keywords.push(keyword);
      }
    }
  }
  
  return keywords;
}

/**
 * Clean content by removing metadata, Intent Patterns, and Keywords sections
 */
function cleanContent(section: string): { content: string; contentSections: ContentSections } {
  let content = section;
  
  // Track which content sections exist
  const contentSections: ContentSections = {
    has_content: false,
    has_action_tips: false,
    has_motivation: false,
    has_followup: false,
    has_habit_strategy: false,
  };
  
  // Remove metadata block (Persona, Topic, Subtopic lines)
  content = content.replace(/\*\*Persona:\*\*.*?\n/g, '');
  content = content.replace(/\*\*Topic:\*\*.*?\n/g, '');
  content = content.replace(/\*\*Subtopic:\*\*.*?\n/g, '');
  
  // Check for and mark content sections
  contentSections.has_content = /###\s*\*\*Content\*\*/i.test(content);
  contentSections.has_action_tips = /###\s*\*\*Action Tips?\*\*/i.test(content);
  contentSections.has_motivation = /###\s*\*\*Motivation Nudge\*\*/i.test(content);
  contentSections.has_followup = /###\s*\*\*Follow-Up (Question|Questions)\*\*/i.test(content);
  contentSections.has_habit_strategy = /###\s*\*\*Habit Strategy/i.test(content);
  
  // Remove Intent Patterns section
  content = content.replace(/###\s*\*\*Intent Patterns?\*\*\s*\n[\s\S]*?(?=###|---\s*$|$)/, '');
  
  // Remove Keywords section
  content = content.replace(/###\s*\*\*Keywords?\*\*\s*\n[\s\S]*?(?=###|---\s*$|$)/, '');
  
  // Clean up extra whitespace and separators
  content = content.replace(/^---\s*$/gm, ''); // Remove standalone --- lines
  content = content.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines
  content = content.trim();
  
  return { content, contentSections };
}

/**
 * Estimate token count (rough approximation: ~4 characters per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split content into chunks if it exceeds token limit
 */
function chunkContentIfNeeded(content: string, maxTokens: number = 6000): string[] {
  const estimatedTokens = estimateTokens(content);
  
  if (estimatedTokens <= maxTokens) {
    return [content];
  }
  
  // Split by paragraphs (double newlines) first
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const testChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
    
    if (estimateTokens(testChunk) <= maxTokens) {
      currentChunk = testChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      // If single paragraph is too large, split by sentences
      if (estimateTokens(paragraph) > maxTokens) {
        const sentences = paragraph.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          const testSentenceChunk = sentenceChunk ? `${sentenceChunk}. ${sentence}` : sentence;
          
          if (estimateTokens(testSentenceChunk) <= maxTokens) {
            sentenceChunk = testSentenceChunk;
          } else {
            if (sentenceChunk) {
              chunks.push(sentenceChunk + '.');
            }
            sentenceChunk = sentence;
          }
        }
        
        if (sentenceChunk) {
          currentChunk = sentenceChunk + '.';
        } else {
          currentChunk = '';
        }
      } else {
        currentChunk = paragraph;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks.length > 0 ? chunks : [content];
}

/**
 * Parse a single section into structured format
 * May return multiple documents if content needs to be chunked
 */
function parseSection(section: string, source: string, sectionIndex: number): ParsedSection[] {
  const metadata = extractMetadata(section);
  if (!metadata) {
    // Skip sections without proper metadata
    return [];
  }
  
  const { content, contentSections } = cleanContent(section);
  const intent_patterns = parseIntentPatterns(section);
  const keywords = parseKeywords(section);
  
  // Split content into chunks if it's too large (6000 tokens leaves buffer for 8192 max)
  const contentChunks = chunkContentIfNeeded(content, 6000);
  
  return contentChunks.map((chunk, chunkIndex) => ({
    metadata,
    content: chunk,
    intent_patterns: chunkIndex === 0 ? intent_patterns : [], // Only include patterns in first chunk
    keywords, // Include keywords in all chunks
    content_sections: contentSections,
  }));
}

/**
 * Load knowledge base documents from markdown files in the knowledge-base folder
 * Returns section-based documents with structured metadata
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
  
  // Process each markdown file
  for (const file of files) {
    try {
      const filePath = path.join(kbDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Parse into sections
      const sections = parseMarkdownSections(content);
      console.log(`   📑 ${file}: Found ${sections.length} section(s)`);
      
      let sectionIndex = 0;
      for (const section of sections) {
        const parsedSections = parseSection(section, file, sectionIndex);
        
        for (const parsed of parsedSections) {
          if (parsed && parsed.content.trim().length > 0) {
            // Build metadata object for Supabase
            const metadata = {
              persona: parsed.metadata.persona,
              topic: parsed.metadata.topic,
              subtopic: parsed.metadata.subtopic,
              source: file,
              section_index: sectionIndex,
              intent_patterns: parsed.intent_patterns,
              keywords: parsed.keywords,
              content_sections: parsed.content_sections,
            };
            
            documents.push(new Document({
              pageContent: parsed.content,
              metadata: metadata,
            }));
          }
        }
        
        if (parsedSections.length > 0) {
          sectionIndex++;
        }
      }
      
      console.log(`   ✓ Loaded ${sectionIndex} section(s) from ${file}`);
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
    console.log("🔄 Loading documents...");
    const documents = await loadDocuments();
    console.log(`📚 Loaded ${documents.length} document sections`);

    if (documents.length === 0) {
      console.warn("⚠️  No documents to ingest. Please add documents to the knowledge-base folder.");
      return;
    }

    // Validate documents and filter out those that are too large
    const MAX_TOKENS = 8000; // Hard limit with safety buffer (model max is 8192)
    const validDocuments: Document[] = [];
    let skippedDocuments = 0;

    console.log("🔍 Validating documents...");
    for (const doc of documents) {
      const tokens = estimateTokens(doc.pageContent);
      if (tokens > MAX_TOKENS) {
        console.warn(`   ⚠️  Skipping document (${tokens} tokens > ${MAX_TOKENS}): "${doc.metadata.subtopic?.substring(0, 60)}..."`);
        skippedDocuments++;
      } else {
        validDocuments.push(doc);
      }
    }

    console.log(`✅ ${validDocuments.length} documents passed validation (${skippedDocuments} skipped due to size)`);

    if (validDocuments.length === 0) {
      console.error("❌ No valid documents to ingest after validation.");
      return;
    }

    console.log("⚙️  Generating embeddings and storing in Supabase...");
    console.log("   Processing documents in batches...");
    
    // Initialize vector store
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabase,
      tableName: "documents",
      queryName: "match_documents",
    });

    // Process documents in smaller batches to avoid complete failure
    const BATCH_SIZE = 10;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validDocuments.length; i += BATCH_SIZE) {
      const batch = validDocuments.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(validDocuments.length / BATCH_SIZE);
      
      try {
        console.log(`   Processing batch ${batchNum}/${totalBatches} (${batch.length} documents)...`);
        
        // Add documents to vector store in batches
        await vectorStore.addDocuments(batch);
        successCount += batch.length;
        console.log(`   ✓ Batch ${batchNum} completed`);
      } catch (batchError: unknown) {
        const errorMessage = batchError instanceof Error ? batchError.message : String(batchError);
        console.error(`   ✗ Batch ${batchNum} failed: ${errorMessage}`);
        
        // Try processing individually if batch fails
        console.log(`   Retrying batch ${batchNum} individually...`);
        for (const doc of batch) {
          try {
            const tokens = estimateTokens(doc.pageContent);
            if (tokens > MAX_TOKENS) {
              console.warn(`     ⚠️  Skipping document (${tokens} tokens): "${doc.metadata.subtopic?.substring(0, 50)}..."`);
              failCount++;
              continue;
            }
            
            await vectorStore.addDocuments([doc]);
            successCount++;
            console.log(`     ✓ Ingested: "${doc.metadata.subtopic?.substring(0, 50)}..."`);
          } catch (docError: unknown) {
            const docErrorMessage = docError instanceof Error ? docError.message : String(docError);
            failCount++;
            console.error(`     ✗ Failed: "${doc.metadata.subtopic?.substring(0, 50)}..." - ${docErrorMessage}`);
          }
        }
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < validDocuments.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log("\n✅ Document ingestion complete!");
    console.log(`   📊 Successfully ingested: ${successCount} documents`);
    if (failCount > 0 || skippedDocuments > 0) {
      console.log(`   ⚠️  Skipped/Failed: ${failCount + skippedDocuments} documents`);
    }
    console.log(`   🔍 Vector store ready for queries.`);
    
    // Print summary statistics
    if (successCount > 0) {
      const topics = new Set(validDocuments.slice(0, successCount).map(d => d.metadata.topic));
      console.log(`   📖 Unique topics: ${topics.size}`);
      const totalKeywords = validDocuments.slice(0, successCount).reduce((sum, d) => sum + (d.metadata.keywords?.length || 0), 0);
      const totalPatterns = validDocuments.slice(0, successCount).reduce((sum, d) => sum + (d.metadata.intent_patterns?.length || 0), 0);
      console.log(`   🏷️  Total keywords: ${totalKeywords}`);
      console.log(`   💬 Total intent patterns: ${totalPatterns}`);
    }
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
