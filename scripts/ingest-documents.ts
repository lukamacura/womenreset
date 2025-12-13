/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Document Ingestion Script for LangChain RAG
 * 
 * This script loads knowledge base documents and ingests them into Supabase
 * for vector search with section-based chunking and structured metadata.
 * 
 * Supports both YAML frontmatter and Markdown formats.
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

type FileFormat = 'yaml' | 'markdown';

/**
 * Detect file format based on content
 */
function detectFormat(content: string): FileFormat {
  // YAML format starts with --- and has key: value pairs
  if (content.trim().startsWith('---') && content.includes('persona:') && content.includes('content_text:')) {
    return 'yaml';
  }
  // Markdown format has ## headings and **Persona:** format
  if (content.includes('##') && content.includes('**Persona:**')) {
    return 'markdown';
  }
  // Default to markdown for backward compatibility
  return 'markdown';
}

/**
 * Parse YAML frontmatter sections
 */
function parseYAMLSections(content: string): string[] {
  const sections: string[] = [];
  // Split by --- separators (YAML frontmatter delimiters)
  const parts = content.split(/^---$/gm).filter(p => p.trim().length > 0);
  
  for (const part of parts) {
    const trimmed = part.trim();
    // Only process sections that have persona, topic, and subtopic
    if (trimmed.includes('persona:') && trimmed.includes('topic:') && trimmed.includes('subtopic:')) {
      sections.push(trimmed);
    }
  }
  
  return sections;
}

/**
 * Parse markdown file into sections based on ## headings
 */
function parseMarkdownSections(content: string): string[] {
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
 * Extract metadata from YAML format
 */
function extractYAMLMetadata(section: string): SectionMetadata | null {
  const personaMatch = section.match(/^persona:\s*["']?([^"'\n]+)["']?/m);
  const topicMatch = section.match(/^topic:\s*["']?([^"'\n]+)["']?/m);
  const subtopicMatch = section.match(/^subtopic:\s*["']?([^"'\n]+)["']?/m);
  
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
 * Extract metadata from Markdown format
 */
function extractMarkdownMetadata(section: string): SectionMetadata | null {
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
 * Extract content from YAML format
 */
function extractYAMLContent(section: string): { content: string; contentSections: ContentSections } {
  const contentSections: ContentSections = {
    has_content: false,
    has_action_tips: false,
    has_motivation: false,
    has_followup: false,
    has_habit_strategy: false,
  };
  
  const contentParts: string[] = [];
  
  // Extract content_text (main content)
  const contentTextMatch = section.match(/^content_text:\s*\|\s*\n([\s\S]*?)(?=^[a-z_]+:|$)/m);
  if (contentTextMatch) {
    let content = contentTextMatch[1].trim();
    // Remove leading indentation (YAML block scalar)
    content = content.split('\n').map(line => line.replace(/^\s{2,}/, '')).join('\n').trim();
    if (content) {
      contentSections.has_content = true;
      contentParts.push(content);
    }
  }
  
  // Extract action_tips
  const actionTipsMatch = section.match(/^action_tips:\s*\n([\s\S]*?)(?=^[a-z_]+:|$)/m);
  if (actionTipsMatch) {
    const tips = actionTipsMatch[1].trim();
    // Extract bullet points
    const tipLines = tips.split('\n').filter(line => line.trim().startsWith('-'));
    if (tipLines.length > 0) {
      contentSections.has_action_tips = true;
      contentParts.push(tipLines.map(line => line.trim().replace(/^-\s*["']?/, '').replace(/["']?$/, '')).join('\n'));
    }
  }
  
  // Extract motivation_nudge
  const motivationMatch = section.match(/^motivation_nudge:\s*(?:\|\s*\n)?([\s\S]*?)(?=^[a-z_]+:|$)/m);
  if (motivationMatch) {
    let motivation = motivationMatch[1].trim();
    // Handle both single-line and multi-line YAML
    if (motivation.includes('\n')) {
      motivation = motivation.split('\n').map(line => line.replace(/^\s{2,}/, '')).join('\n').trim();
    }
    motivation = motivation.replace(/^["']|["']$/g, '').trim();
    if (motivation) {
      contentSections.has_motivation = true;
      contentParts.push(motivation);
    }
  }
  
  // Extract habit_strategy
  const habitStrategyMatch = section.match(/^habit_strategy:\s*\n([\s\S]*?)(?=^[a-z_]+:|$)/m);
  if (habitStrategyMatch) {
    const strategy = habitStrategyMatch[1].trim();
    // Extract the principle, explanation, example, and habit_tip
    const strategyParts: string[] = [];
    const principleMatch = strategy.match(/^\s*principle:\s*["']?([^"'\n]+)["']?/m);
    const explanationMatch = strategy.match(/^\s*explanation:\s*["']?([^"'\n]+)["']?/m);
    const exampleMatch = strategy.match(/^\s*example:\s*["']?([^"'\n]+)["']?/m);
    const tipMatch = strategy.match(/^\s*habit_tip:\s*["']?([^"'\n]+)["']?/m);
    
    if (principleMatch) strategyParts.push(`Principle: ${principleMatch[1].trim()}`);
    if (explanationMatch) strategyParts.push(`Explanation: ${explanationMatch[1].trim()}`);
    if (exampleMatch) strategyParts.push(`Example: ${exampleMatch[1].trim()}`);
    if (tipMatch) strategyParts.push(`Tip: ${tipMatch[1].trim()}`);
    
    if (strategyParts.length > 0) {
      contentSections.has_habit_strategy = true;
      contentParts.push(strategyParts.join('\n'));
    }
  }
  
  // Track follow_up_question but DO NOT include it in content
  const followUpMatch = section.match(/^follow_up_question:\s*(?:\|\s*\n)?([\s\S]*?)(?=^[a-z_]+:|$)/m);
  if (followUpMatch) {
    contentSections.has_followup = true;
    // Explicitly NOT adding to contentParts - this should not be in the content
  }
  
  const content = contentParts.join('\n\n').trim();
  
  return { content, contentSections };
}

/**
 * Extract content from Markdown format
 */
function extractMarkdownContent(section: string): { content: string; contentSections: ContentSections } {
  const contentSections: ContentSections = {
    has_content: false,
    has_action_tips: false,
    has_motivation: false,
    has_followup: false,
    has_habit_strategy: false,
  };
  
  const contentParts: string[] = [];
  
  // Define the content sections we want to extract
  const contentSectionPatterns = [
    { 
      pattern: /###\s*\*\*Content\*\*\s*\n([\s\S]*?)(?=###|---\s*$|$)/i, 
      key: 'has_content' as keyof ContentSections 
    },
    { 
      pattern: /###\s*\*\*Action Tips?\*\*\s*\n([\s\S]*?)(?=###|---\s*$|$)/i, 
      key: 'has_action_tips' as keyof ContentSections 
    },
    { 
      pattern: /###\s*\*\*Motivation Nudge\*\*\s*\n([\s\S]*?)(?=###|---\s*$|$)/i, 
      key: 'has_motivation' as keyof ContentSections 
    },
    { 
      pattern: /###\s*\*\*Habit Strategy[\s\S]*?\*\*\s*\n([\s\S]*?)(?=###|---\s*$|$)/i, 
      key: 'has_habit_strategy' as keyof ContentSections 
    },
  ];
  
  // Extract each content section
  for (const { pattern, key } of contentSectionPatterns) {
    const match = section.match(pattern);
    if (match) {
      const extractedContent = match[1];
      if (extractedContent && extractedContent.trim()) {
        contentSections[key] = true;
        let cleaned = extractedContent.trim();
        // Remove any trailing separators
        cleaned = cleaned.replace(/\n*---\s*$/g, '');
        // Remove excessive whitespace
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        if (cleaned) {
          contentParts.push(cleaned);
        }
      }
    }
  }
  
  // Track follow_up_question but DO NOT include it in content
  const followUpMatch = section.match(/###\s*\*\*Follow-Up (Question|Questions)\*\*\s*\n([\s\S]*?)(?=###|---\s*$|$)/i);
  if (followUpMatch) {
    contentSections.has_followup = true;
    // Explicitly NOT adding to contentParts - this should not be in the content
  }
  
  // Combine all content parts
  let content = contentParts.join('\n\n').trim();
  
  // If no content sections were found, try to extract any text after removing metadata
  if (!content) {
    // Remove section header (##)
    content = section.replace(/^##\s+.*?\n/g, '');
    // Remove metadata lines
    content = content.replace(/\*\*Persona:\*\*.*?\n/g, '');
    content = content.replace(/\*\*Topic:\*\*.*?\n/g, '');
    content = content.replace(/\*\*Subtopic:\*\*.*?\n/g, '');
    // Remove Intent Patterns section
    content = content.replace(/###\s*\*\*Intent Patterns?\*\*\s*\n[\s\S]*?(?=###|---\s*$|$)/i, '');
    // Remove Keywords section
    content = content.replace(/###\s*\*\*Keywords?\*\*\s*\n[\s\S]*?(?=###|---\s*$|$)/i, '');
    // Remove section headers (###)
    content = content.replace(/^###\s+.*?\n/gm, '');
    // Clean up
    content = content.replace(/^---\s*$/gm, '');
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.trim();
  }
  
  return { content, contentSections };
}

/**
 * Parse Intent Patterns from YAML format
 */
function parseYAMLIntentPatterns(section: string): string[] {
  const patterns: string[] = [];
  const intentPatternsMatch = section.match(/^intent_patterns:\s*\n([\s\S]*?)(?=^[a-z_]+:|$)/m);
  
  if (!intentPatternsMatch) {
    return patterns;
  }
  
  const patternsText = intentPatternsMatch[1];
  const lines = patternsText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Match bullet points (- or •)
    if (trimmed.match(/^[-•]\s+/)) {
      const pattern = trimmed.replace(/^[-•]\s+/, '').replace(/^["']|["']$/g, '').trim();
      if (pattern) {
        patterns.push(pattern);
      }
    }
  }
  
  return patterns;
}

/**
 * Parse Intent Patterns from Markdown format
 */
function parseMarkdownIntentPatterns(section: string): string[] {
  const patterns: string[] = [];
  const intentPatternsMatch = section.match(/###\s*\*\*Intent Patterns?\*\*\s*\n([\s\S]*?)(?=###|---\s*$|$)/);
  
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
 * Parse Keywords from YAML format
 */
function parseYAMLKeywords(section: string): string[] {
  const keywords: string[] = [];
  const keywordsMatch = section.match(/^keywords:\s*\n([\s\S]*?)(?=^[a-z_]+:|$)/m);
  
  if (!keywordsMatch) {
    return keywords;
  }
  
  const keywordsText = keywordsMatch[1];
  const lines = keywordsText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip subcategory headers (like **Scientific & Hormonal** or just category names)
    if (trimmed.match(/^\*\*/) || trimmed.match(/^[A-Z][a-z]+:/)) {
      continue;
    }
    // Match bullet points (- or •)
    if (trimmed.match(/^[-•]\s+/)) {
      const keyword = trimmed.replace(/^[-•]\s+/, '').replace(/^["']|["']$/g, '').trim();
      if (keyword) {
        keywords.push(keyword);
      }
    }
  }
  
  return keywords;
}

/**
 * Parse Keywords from Markdown format
 */
function parseMarkdownKeywords(section: string): string[] {
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
 * Estimate token count (rough approximation: ~4 characters per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split content into chunks if it exceeds token or character limit
 * Enforces both token limit (for model) and character limit (for Supabase UI display)
 */
function chunkContentIfNeeded(content: string, maxTokens: number = 2000, maxChars: number = 10000): string[] {
  // Check both token and character limits
  const estimatedTokens = estimateTokens(content);
  const charLength = content.length;
  
  if (estimatedTokens <= maxTokens && charLength <= maxChars) {
    return [content];
  }
  
  // Split by paragraphs (double newlines) first
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const testChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
    const testTokens = estimateTokens(testChunk);
    const testChars = testChunk.length;
    
    // Check both limits
    if (testTokens <= maxTokens && testChars <= maxChars) {
      currentChunk = testChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      // If single paragraph is too large, split by sentences
      const paraTokens = estimateTokens(paragraph);
      const paraChars = paragraph.length;
      
      if (paraTokens > maxTokens || paraChars > maxChars) {
        const sentences = paragraph.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          const testSentenceChunk = sentenceChunk ? `${sentenceChunk}. ${sentence}` : sentence;
          const testSentenceTokens = estimateTokens(testSentenceChunk);
          const testSentenceChars = testSentenceChunk.length;
          
          if (testSentenceTokens <= maxTokens && testSentenceChars <= maxChars) {
            sentenceChunk = testSentenceChunk;
          } else {
            if (sentenceChunk) {
              chunks.push(sentenceChunk + '.');
            }
            // If even a single sentence is too large, split by words (last resort)
            if (sentence.length > maxChars) {
              // Split very long sentences by words
              const words = sentence.split(/\s+/);
              let wordChunk = '';
              
              for (const word of words) {
                const testWordChunk = wordChunk ? `${wordChunk} ${word}` : word;
                if (testWordChunk.length <= maxChars) {
                  wordChunk = testWordChunk;
                } else {
                  if (wordChunk) {
                    chunks.push(wordChunk);
                  }
                  wordChunk = word;
                }
              }
              
              if (wordChunk) {
                sentenceChunk = wordChunk;
              } else {
                sentenceChunk = '';
              }
            } else {
              sentenceChunk = sentence;
            }
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
function parseSection(section: string, format: FileFormat, _source: string, _sectionIndex: number): ParsedSection[] {
  let metadata: SectionMetadata | null;
  let content: string;
  let contentSections: ContentSections;
  let intent_patterns: string[];
  let keywords: string[];
  
  if (format === 'yaml') {
    metadata = extractYAMLMetadata(section);
    if (!metadata) {
      return [];
    }
    const contentResult = extractYAMLContent(section);
    content = contentResult.content;
    contentSections = contentResult.contentSections;
    intent_patterns = parseYAMLIntentPatterns(section);
    keywords = parseYAMLKeywords(section);
  } else {
    metadata = extractMarkdownMetadata(section);
    if (!metadata) {
      return [];
    }
    const contentResult = extractMarkdownContent(section);
    content = contentResult.content;
    contentSections = contentResult.contentSections;
    intent_patterns = parseMarkdownIntentPatterns(section);
    keywords = parseMarkdownKeywords(section);
  }
  
  // Split content into chunks if it's too large
  const contentChunks = chunkContentIfNeeded(content, 2000, 10000);
  
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
  
  // Get all .md and .txt files from the knowledge-base directory
  const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
  
  if (files.length === 0) {
    console.warn(`⚠️  No markdown or text files found in ${kbDir}`);
    return documents;
  }
  
  console.log(`📄 Found ${files.length} file(s) to process`);
  
  // Process each file
  for (const file of files) {
    try {
      const filePath = path.join(kbDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Detect file format
      const format = detectFormat(content);
      console.log(`   📑 ${file}: Format detected: ${format.toUpperCase()}`);
      
      // Parse into sections based on format
      const sections = format === 'yaml' ? parseYAMLSections(content) : parseMarkdownSections(content);
      console.log(`   📑 ${file}: Found ${sections.length} section(s)`);
      
      let sectionIndex = 0;
      for (const section of sections) {
        const parsedSections = parseSection(section, format, file, sectionIndex);
        
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
    const MAX_CHARS = 10000; // Character limit to prevent Supabase UI display issues (10,240 is the limit)
    const validDocuments: Document[] = [];
    let skippedDocuments = 0;

    console.log("🔍 Validating documents...");
    for (const doc of documents) {
      const tokens = estimateTokens(doc.pageContent);
      const chars = doc.pageContent.length;
      
      if (tokens > MAX_TOKENS || chars > MAX_CHARS) {
        console.warn(`   ⚠️  Skipping document (${tokens} tokens, ${chars} chars): "${doc.metadata.subtopic?.substring(0, 60)}..."`);
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
            const chars = doc.pageContent.length;
            if (tokens > MAX_TOKENS || chars > MAX_CHARS) {
              console.warn(`     ⚠️  Skipping document (${tokens} tokens, ${chars} chars): "${doc.metadata.subtopic?.substring(0, 50)}..."`);
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
