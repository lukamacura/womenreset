/**
 * Retrieval Module - Vector search with persona filtering and hybrid re-ranking
 */

import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import type { Document } from "@langchain/core/documents";
import type { KBEntry, Persona, RetrievalResult } from "./types";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small",
});

/**
 * Extract keywords from user query for hybrid search
 */
function extractQueryKeywords(query: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'the', 'this', 'i', 'you',
    'how', 'why', 'what', 'when', 'where', 'can', 'could', 'should',
    'would', 'do', 'does', 'did', 'am', 'my', 'me', 'we', 'our'
  ]);

  const words = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  return [...new Set(words)];
}

/**
 * Calculate intent pattern match score
 */
function calculateIntentPatternScore(
  docIntentPatterns: string[],
  userQuery: string
): number {
  if (docIntentPatterns.length === 0) return 0;

  const queryLower = userQuery.toLowerCase();
  let maxScore = 0;
  let primaryIntentMatches = 0;

  for (const pattern of docIntentPatterns) {
    const patternLower = pattern.toLowerCase();
    
    if (queryLower.includes(patternLower) || patternLower.includes(queryLower)) {
      maxScore = Math.max(maxScore, 1.0);
      if (pattern.includes('PRIMARY') || !pattern.includes('SECONDARY')) {
        primaryIntentMatches++;
      }
      continue;
    }

    const patternWords = patternLower
      .split(/\s+/)
      .filter(w => w.length > 3 && !['why', 'what', 'how', 'when', 'where', 'can', 'does', 'is', 'are'].includes(w));
    
    const matchingWords = patternWords.filter(word => queryLower.includes(word));
    if (matchingWords.length > 0) {
      const wordMatchScore = matchingWords.length / patternWords.length;
      maxScore = Math.max(maxScore, wordMatchScore * 0.7);
      
      if (pattern.includes('PRIMARY') || !pattern.includes('SECONDARY')) {
        primaryIntentMatches++;
      }
    }
  }

  if (primaryIntentMatches > 0) {
    maxScore = Math.min(1.0, maxScore * 1.2);
  }

  return maxScore;
}

/**
 * Calculate keyword match score
 */
function calculateKeywordMatchScore(
  docKeywords: string[],
  queryKeywords: string[],
  userQuery: string
): number {
  if (queryKeywords.length === 0 || docKeywords.length === 0) return 0;

  const queryLower = userQuery.toLowerCase();
  let exactMatches = 0;
  let partialMatches = 0;

  for (const queryKeyword of queryKeywords) {
    for (const docKeyword of docKeywords) {
      const docKwLower = docKeyword.toLowerCase();
      const queryKwLower = queryKeyword.toLowerCase();

      if (docKwLower === queryKwLower || 
          queryLower.includes(docKwLower) || 
          docKwLower.includes(queryKwLower)) {
        exactMatches++;
        break;
      }
      
      if (docKwLower.includes(queryKwLower) || queryKwLower.includes(docKwLower)) {
        partialMatches++;
        break;
      }
    }
  }

  const exactScore = (exactMatches / queryKeywords.length) * 0.8;
  const partialScore = (partialMatches / queryKeywords.length) * 0.4;
  
  return Math.min(1.0, exactScore + partialScore);
}

/**
 * Calculate content section relevance score
 */
function calculateSectionRelevanceScore(
  contentSections: { has_content?: boolean; has_action_tips?: boolean; has_motivation?: boolean; has_followup?: boolean; has_habit_strategy?: boolean } | undefined,
  userQuery: string
): number {
  if (!contentSections) return 0.5;

  let score = 0.5;

  if (/^(how|what should|what can|tell me how|show me)/i.test(userQuery)) {
    if (contentSections.has_action_tips) score += 0.3;
    if (contentSections.has_habit_strategy) score += 0.2;
  }

  if (/^(why|what causes|what's happening|explain)/i.test(userQuery)) {
    if (contentSections.has_content) score += 0.3;
  }

  if (/(motivation|encouragement|support|feeling|discouraged|overwhelmed)/i.test(userQuery)) {
    if (contentSections.has_motivation) score += 0.3;
  }

  if (/(next|follow|more|additional|what else)/i.test(userQuery)) {
    if (contentSections.has_followup) score += 0.2;
  }

  return Math.min(1.0, score);
}

/**
 * Apply hybrid search re-ranking
 * Uses semantic similarity from vector search as base, then boosts with metadata matching
 */
function applyHybridSearch(
  documents: Document[],
  userQuery: string,
  semanticSimilarities?: number[]
): Array<{ doc: Document; score: number }> {
  const queryKeywords = extractQueryKeywords(userQuery);

  const scoredDocs = documents.map((doc, index) => {
    // Use actual semantic similarity if provided, otherwise use position-based approximation
    // Note: LangChain doesn't expose similarity scores directly, so we use position as proxy
    // The database already returns results sorted by similarity, so earlier = more similar
    const semanticScore = semanticSimilarities?.[index] ?? (1 - (index / Math.max(documents.length, 1)) * 0.3);

    const docKeywords = (doc.metadata?.keywords as string[]) || [];
    const docIntentPatterns = (doc.metadata?.intent_patterns as string[]) || [];
    const contentSections = doc.metadata?.content_sections as { has_content?: boolean; has_action_tips?: boolean; has_motivation?: boolean; has_followup?: boolean; has_habit_strategy?: boolean } | undefined;

    const intentScore = calculateIntentPatternScore(docIntentPatterns, userQuery);
    const keywordScore = queryKeywords.length > 0 
      ? calculateKeywordMatchScore(docKeywords, queryKeywords, userQuery)
      : 0.5;
    const sectionScore = calculateSectionRelevanceScore(contentSections, userQuery);

    // Weighted combination: semantic similarity is most important, then intent/keyword matching
    const finalScore = 
      (semanticScore * 0.5) +  // Increased weight for semantic similarity
      (intentScore * 0.25) +   // Intent patterns are strong signals
      (keywordScore * 0.15) +  // Keywords provide additional relevance
      (sectionScore * 0.1);    // Content sections fine-tune relevance

    return {
      doc,
      score: finalScore,
    };
  });

  scoredDocs.sort((a, b) => b.score - a.score);
  return scoredDocs;
}

/**
 * Map persona to metadata persona value
 * Current KB uses "menopause" but we classify as "menopause_specialist"
 */
function mapPersonaToMetadata(persona: Persona): string {
  if (persona === "menopause_specialist") {
    return "menopause"; // Current KB uses "menopause" in metadata
  }
  return persona; // Other personas match directly
}

/**
 * Retrieve KB entries with persona filtering and hybrid search
 * OPTIMIZED: Uses database-level filtering for better performance
 */
export async function retrieveFromKB(
  query: string,
  persona: Persona,
  topK: number = 5,
  similarityThreshold: number = 0.5
): Promise<RetrievalResult> {
  try {
    const supabaseClient = getSupabaseAdmin();
    
    // Check if documents exist (cached check for early exit)
    const { count } = await supabaseClient
      .from('documents')
      .select('*', { count: 'exact', head: true });

    if (!count || count === 0) {
      return {
        kbEntries: [],
        hasMatch: false,
      };
    }

    // Map persona to metadata value
    const metadataPersona = mapPersonaToMetadata(persona);

    // Initialize vector store
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabaseClient,
      tableName: "documents",
      queryName: "match_documents",
    });

    // OPTIMIZATION: Use database-level filtering via filter parameter
    // This uses the GIN index on metadata for fast filtering at DB level
    // Get slightly more than topK to allow for hybrid re-ranking
    const retrieveCount = Math.min(topK * 1.5, 20); // Cap at 20 to avoid over-fetching

    const retriever = vectorStore.asRetriever({
      k: Math.ceil(retrieveCount),
      searchType: "similarity",
      filter: { persona: metadataPersona }, // Database-level filtering
    });

    let relevantDocs = await retriever.getRelevantDocuments(query);

    // Fallback: If no persona match, try without filter (for personas without KB entries)
    if (relevantDocs.length === 0) {
      const fallbackRetriever = vectorStore.asRetriever({
        k: Math.ceil(retrieveCount),
        searchType: "similarity",
      });
      relevantDocs = await fallbackRetriever.getRelevantDocuments(query);
    }

    if (relevantDocs.length === 0) {
      return {
        kbEntries: [],
        hasMatch: false,
      };
    }

    // Apply hybrid search re-ranking
    const scoredDocs = applyHybridSearch(relevantDocs, query);

    // Filter by threshold
    const filteredDocs = scoredDocs.filter(item => item.score >= similarityThreshold);

    // Convert to KBEntry format
    const kbEntries: KBEntry[] = filteredDocs.map(({ doc, score }) => ({
      id: (doc.metadata?.id as string) || '',
      content: doc.pageContent,
      metadata: {
        persona: (doc.metadata?.persona as string) || '',
        topic: (doc.metadata?.topic as string) || '',
        subtopic: (doc.metadata?.subtopic as string) || '',
        keywords: (doc.metadata?.keywords as string[]) || [],
        intent_patterns: (doc.metadata?.intent_patterns as string[]) || [],
        content_sections: (doc.metadata?.content_sections as { has_content?: boolean; has_action_tips?: boolean; has_motivation?: boolean; has_followup?: boolean; has_habit_strategy?: boolean }) || {
          has_content: false,
          has_action_tips: false,
          has_motivation: false,
          has_followup: false,
          has_habit_strategy: false,
        },
        source: doc.metadata?.source as string,
        section_index: doc.metadata?.section_index as number,
      },
      similarity: score,
    }));

    // Use top K entries
    const topEntries = kbEntries.slice(0, topK);

    return {
      kbEntries: topEntries,
      hasMatch: topEntries.length > 0,
      topScore: topEntries[0]?.similarity,
    };
  } catch (error) {
    console.error("Error retrieving from KB:", error);
    return {
      kbEntries: [],
      hasMatch: false,
    };
  }
}
