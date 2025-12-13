/**
 * Document Ingestion Script for LangChain RAG
 * 
 * This script loads knowledge base documents and ingests them into Supabase
 * for vector search. Each section becomes ONE document (one complete answer).
 * 
 * Optimizations:
 * - Intents and keywords are included in content column for better vector search
 * - Each section = 1 document (no chunking unless extremely large)
 * - Metadata preserved for re-ranking (intents, keywords, content_sections)
 * 
 * Supports both YAML frontmatter and Markdown formats.
 * 
 * Usage:
 *   npx tsx scripts/ingest-documents.ts [--clear]
 * 
 * Use --clear flag to delete existing documents before re-ingestion.
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
  
  // Extract action_tips - include ALL bullet points
  // Process section line by line to find action_tips block and capture ALL tips
  const lines = section.split('\n');
  let inActionTips = false;
  const tipLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if we've reached the action_tips field
    if (trimmed === 'action_tips:' || trimmed.startsWith('action_tips:')) {
      inActionTips = true;
      continue;
    }
    
    // If we're in the action_tips block
    if (inActionTips) {
      // Check if we've hit the next YAML field (starts with lowercase/underscore + colon, not indented)
      // A field is at the start of a line (no or minimal indentation - 0-2 spaces)
      if (trimmed && /^[a-z_]+:/.test(trimmed)) {
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1].length : 0;
        // If indent is 0-2, it's a new top-level field, so we're done
        if (indent <= 2) {
          break;
        }
      }
      
      // Capture ALL lines that are bullet points (start with - or •)
      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        tipLines.push(trimmed);
      }
    }
  }
  
  if (tipLines.length > 0) {
    contentSections.has_action_tips = true;
    // Remove bullet marker and quotes, keep the content
    const cleanedTips = tipLines.map(line => {
      let cleaned = line.trim();
      // Remove bullet marker (- or •) and any following whitespace
      cleaned = cleaned.replace(/^[-•]\s+/, '');
      // Remove surrounding quotes (single or double)
      cleaned = cleaned.replace(/^["']|["']$/g, '');
      return cleaned.trim();
    }).filter(tip => tip.length > 0); // Remove any empty strings
    
    if (cleanedTips.length > 0) {
      contentParts.push(cleanedTips.join('\n'));
    }
  }
  
  // Extract motivation_nudge - content only, no label
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
  
  // Extract habit_strategy - content only, no labels like "Principle:", "Explanation:"
  const habitStrategyMatch = section.match(/^habit_strategy:\s*\n([\s\S]*?)(?=^[a-z_]+:|$)/m);
  if (habitStrategyMatch) {
    const strategy = habitStrategyMatch[1].trim();
    // Extract the principle, explanation, example, and habit_tip WITHOUT labels
    const strategyParts: string[] = [];
    const principleMatch = strategy.match(/^\s*principle:\s*["']?([^"'\n]+)["']?/m);
    const explanationMatch = strategy.match(/^\s*explanation:\s*["']?([^"'\n]+)["']?/m);
    const exampleMatch = strategy.match(/^\s*example:\s*["']?([^"'\n]+)["']?/m);
    const tipMatch = strategy.match(/^\s*habit_tip:\s*["']?([^"'\n]+)["']?/m);
    
    // Add content without labels
    if (principleMatch) strategyParts.push(principleMatch[1].trim());
    if (explanationMatch) strategyParts.push(explanationMatch[1].trim());
    if (exampleMatch) strategyParts.push(exampleMatch[1].trim());
    if (tipMatch) strategyParts.push(tipMatch[1].trim());
    
    if (strategyParts.length > 0) {
      contentSections.has_habit_strategy = true;
      contentParts.push(strategyParts.join('\n'));
    }
  }
  
  // Extract follow_up_question - include it in content
  const followUpMatch = section.match(/^follow_up_question:\s*(?:\|\s*\n)?([\s\S]*?)(?=^[a-z_]+:|$)/m);
  if (followUpMatch) {
    let followUp = followUpMatch[1].trim();
    // Handle both single-line and multi-line YAML
    if (followUp.includes('\n')) {
      followUp = followUp.split('\n').map(line => line.replace(/^\s{2,}/, '')).join('\n').trim();
    }
    followUp = followUp.replace(/^["']|["']$/g, '').trim();
    if (followUp) {
      contentSections.has_followup = true;
      contentParts.push(followUp);
    }
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
  
  // Define the content sections we want to extract (without section headers/labels)
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
  
  // Extract each content section (content only, no headers/labels)
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
        
        // For Habit Strategy, remove labels like "**Strategy:**", "**Principle:**", etc.
        if (key === 'has_habit_strategy') {
          cleaned = cleaned.replace(/\*\*Strategy:\*\*\s*/gi, '');
          cleaned = cleaned.replace(/\*\*Principle:\*\*\s*/gi, '');
          cleaned = cleaned.replace(/\*\*Explanation:\*\*\s*/gi, '');
          cleaned = cleaned.replace(/\*\*Example:\*\*\s*/gi, '');
          cleaned = cleaned.replace(/\*\*Habit Tip:\*\*\s*/gi, '');
          cleaned = cleaned.replace(/\*\*Tip:\*\*\s*/gi, '');
        }
        
        if (cleaned) {
          contentParts.push(cleaned);
        }
      }
    }
  }
  
  // Extract follow_up_question - include it in content
  const followUpMatch = section.match(/###\s*\*\*Follow-Up (Question|Questions)\*\*\s*\n([\s\S]*?)(?=###|---\s*$|$)/i);
  if (followUpMatch) {
    let followUp = followUpMatch[2].trim();
    // Remove any trailing separators
    followUp = followUp.replace(/\n*---\s*$/g, '');
    // Remove excessive whitespace
    followUp = followUp.replace(/\n{3,}/g, '\n\n');
    if (followUp) {
      contentSections.has_followup = true;
      contentParts.push(followUp);
    }
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
  const intentPatternsMatch = section.match(/^intent_patterns:\s*\n([\s\S]*?)(?=^[a-z_]+:|^---$|$)/m);
  
  if (!intentPatternsMatch) {
    return patterns;
  }
  
  const patternsText = intentPatternsMatch[1];
  const lines = patternsText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and headers
    if (!trimmed || trimmed.match(/^(PRIMARY|SECONDARY)\s+INTENTS?/i)) {
      continue;
    }
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
  const intentPatternsMatch = section.match(/###\s*\*\*Intent Patterns?\*\*\s*\n([\s\S]*?)(?=###|---\s*$|$)/i);
  
  if (!intentPatternsMatch) {
    return patterns;
  }
  
  const patternsText = intentPatternsMatch[1];
  const lines = patternsText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines
    if (!trimmed) {
      continue;
    }
    // Skip headers like "PRIMARY INTENTS (educational/overview queries):" or "SECONDARY INTENTS"
    if (trimmed.match(/^(PRIMARY|SECONDARY)\s+INTENTS?/i)) {
      continue;
    }
    // Match bullet points (- or •)
    if (trimmed.match(/^[-•]\s+/)) {
      const pattern = trimmed.replace(/^[-•]\s+/, '').trim();
      // Remove any trailing notes like "[+ route based on follow-up]"
      const cleanPattern = pattern.replace(/\s*\[\+.*?\]\s*$/, '').trim();
      if (cleanPattern) {
        patterns.push(cleanPattern);
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
  const keywordsMatch = section.match(/^keywords:\s*\n([\s\S]*?)(?=^[a-z_]+:|^---$|$)/m);
  
  if (!keywordsMatch) {
    return keywords;
  }
  
  const keywordsText = keywordsMatch[1];
  const lines = keywordsText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip subcategory headers (like "Exercise Physiology:" or **Scientific & Hormonal**)
    if (trimmed.match(/^\*\*/) || trimmed.match(/^[A-Z][a-zA-Z\s&]+:\s*$/)) {
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
    // Skip subcategory headers (like **Scientific & Hormonal** or "Exercise Physiology:")
    if (trimmed.match(/^\*\*/) || trimmed.match(/^[A-Z][a-zA-Z\s&]+:\s*$/)) {
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
 * Enhance content with intents and keywords for better vector search
 * Prepends intents and keywords naturally to the content for optimal semantic matching
 * This makes intents and keywords part of the vector search, not just re-ranking
 */
function enhanceContentWithMetadata(
  content: string,
  intent_patterns: string[],
  keywords: string[]
): string {
  const enhancementParts: string[] = [];
  
  // Add intent patterns as natural language context (most important for matching)
  if (intent_patterns.length > 0) {
    // Clean intent patterns (remove PRIMARY/SECONDARY markers, trim quotes)
    const cleanedIntents = intent_patterns
      .map(ip => ip.replace(/\s*(PRIMARY|SECONDARY)\s*/gi, '').replace(/^["']|["']$/g, '').trim())
      .filter(ip => ip.length > 0);
    
    if (cleanedIntents.length > 0) {
      // Include all intents (they're designed to match user queries)
      // Format as natural language questions/statements
      if (cleanedIntents.length === 1) {
        enhancementParts.push(`This section answers questions about: ${cleanedIntents[0]}.`);
      } else if (cleanedIntents.length <= 5) {
        // For 2-5 intents, list them all
        const lastIntent = cleanedIntents[cleanedIntents.length - 1];
        const others = cleanedIntents.slice(0, -1);
        enhancementParts.push(`This section answers questions about: ${others.join(', ')}, and ${lastIntent}.`);
      } else {
        // For many intents, include top 5 and indicate more
        enhancementParts.push(`This section answers questions about: ${cleanedIntents.slice(0, 5).join(', ')}, and related topics.`);
      }
    }
  }
  
  // Add keywords as topic context (supplements intents)
  if (keywords.length > 0) {
    const uniqueKeywords = [...new Set(keywords)].filter(k => k.length > 0);
    if (uniqueKeywords.length > 0) {
      // Include top 15 keywords for better semantic coverage
      const displayKeywords = uniqueKeywords.slice(0, 15);
      if (displayKeywords.length === 1) {
        enhancementParts.push(`Key topic: ${displayKeywords[0]}.`);
      } else if (displayKeywords.length <= 10) {
        enhancementParts.push(`Key topics: ${displayKeywords.join(', ')}.`);
      } else {
        enhancementParts.push(`Key topics: ${displayKeywords.slice(0, 10).join(', ')}, and more.`);
      }
    }
  }
  
  // Combine enhancements with original content
  if (enhancementParts.length > 0) {
    return `${enhancementParts.join(' ')}\n\n${content}`;
  }
  
  return content;
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
  
  // Enhance content with intents and keywords for better vector search
  // This makes intents and keywords part of the semantic search, not just re-ranking
  const enhancedContent = enhanceContentWithMetadata(content, intent_patterns, keywords);
  
  // CRITICAL: Each section = 1 complete answer, so NO chunking
  // Only chunk if content is extremely large (exceeds embedding model limits)
  // Using very high limits to preserve section integrity
  const MAX_TOKENS_PER_SECTION = 6000; // High limit to avoid chunking (model max is 8192)
  const MAX_CHARS_PER_SECTION = 24000; // High limit for Supabase (well below 10,240 UI limit)
  
  const contentChunks = chunkContentIfNeeded(enhancedContent, MAX_TOKENS_PER_SECTION, MAX_CHARS_PER_SECTION);
  
  // Return one document per section (chunking only as last resort for extremely large sections)
  return contentChunks.map((chunk, chunkIndex) => {
    // Only first chunk gets full intent patterns (subsequent chunks are rare edge cases)
    const chunkIntentPatterns = chunkIndex === 0 ? intent_patterns : [];
    
    return {
      metadata,
      content: chunk,
      intent_patterns: chunkIntentPatterns,
      keywords, // Keywords included in all chunks for context
      content_sections: contentSections,
    };
  });
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
 * Clear all existing documents from the database
 * Use this before re-ingestion to ensure clean state
 */
async function clearExistingDocuments(): Promise<void> {
  try {
    console.log("🗑️  Clearing existing documents from database...");
    
    // Get count first
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });
    
    if (count === 0) {
      console.log("   No existing documents to clear");
      return;
    }
    
    console.log(`   Found ${count} existing document(s)`);
    
    // Delete all documents - using a condition that always matches
    // Using .neq with a value that will never match ensures all rows are deleted
    const { error } = await supabase
      .from('documents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000001'); // This matches all UUIDs (none will equal this)
    
    if (error) {
      throw error;
    }
    
    console.log("✅ Existing documents cleared");
  } catch (error) {
    console.error("❌ Error clearing documents:", error);
    throw error;
  }
}

/**
 * Ingest documents into Supabase vector store
 * @param clearFirst - If true, clears existing documents before ingestion (default: false)
 */
async function ingestDocuments(clearFirst: boolean = false) {
  try {
    // Clear existing documents if requested
    if (clearFirst) {
      await clearExistingDocuments();
    }
    
    console.log("🔄 Loading documents...");
    const documents = await loadDocuments();
    console.log(`📚 Loaded ${documents.length} document sections`);

    if (documents.length === 0) {
      console.warn("⚠️  No documents to ingest. Please add documents to the knowledge-base folder.");
      return;
    }

    // Validate documents and filter out those that are too large
    // Using high limits to preserve section integrity (each section = 1 answer)
    const MAX_TOKENS = 8000; // Hard limit with safety buffer (model max is 8192)
    const MAX_CHARS = 24000; // High limit - sections should stay intact (Supabase text limit is much higher)
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

  // Check for --clear flag to clear existing documents first
  const clearFirst = process.argv.includes('--clear') || process.argv.includes('-c');
  
  if (clearFirst) {
    console.log("⚠️  --clear flag detected: Will delete all existing documents before ingestion\n");
  }

  ingestDocuments(clearFirst)
    .then(() => {
      console.log("\n✨ Ingestion complete!");
      console.log("\n💡 Tip: Use --clear flag to clear existing documents before re-ingestion");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export { ingestDocuments, loadDocuments };
