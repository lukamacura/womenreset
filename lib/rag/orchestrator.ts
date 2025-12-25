/**
 * RAG Orchestrator - Main orchestration logic for persona-based RAG
 */

import type { Persona, RetrievalMode, OrchestrationResult, FollowUpLink, KBEntry } from "./types";
import { classifyPersona } from "./persona-classifier";
import { validateMenopauseQuery, generateRefusalResponse } from "./safety-validator";
import { retrieveFromKB, retrieveFromKBByIntentOnly, normalizeTextForIntentMatching } from "./retrieval";
import { formatVerbatimResponse, formatKBContextForLLM } from "./response-formatter";
import { getConversationHistory } from "./conversation-memory";
import { shouldRouteWhyToMenopause, isWhyHormoneQuestion } from "./classifier/whyRouter";
import type { RetrievalResult } from "./types";

// Note: LLM calls are handled in the route to support tools (log_symptom, etc.)
// The orchestrator only handles KB retrieval and persona classification

/**
 * Detect if a query is a follow-up question that needs context enhancement
 */
function isFollowUpQuestion(
  query: string,
  conversationHistory: Array<["user" | "assistant", string]>
): boolean {
  // Must have conversation history to be a follow-up
  if (!conversationHistory || conversationHistory.length === 0) {
    return false;
  }
  
  const normalized = query.toLowerCase().trim();
  
  // Short ambiguous queries that likely reference previous conversation
  const followUpPatterns = [
    /^(what|how|why|when|where|which|who)\s+(about|is|are|was|were|do|does|did|can|could|should|will|would)\s+(that|this|it|them|those|these)/i,
    /^(tell me more|more about|what else|anything else|how about|what about)/i,
    /^(and|also|plus|what|how|why)\s+(about|is|are)/i,
    /^(can you|could you|will you|would you)\s+(tell|explain|give|show|help)/i,
    /^(what|how|why)\s+(is|are|was|were|do|does|did)\s+(that|this|it)/i,
  ];
  
  // Check if query matches follow-up patterns
  const matchesPattern = followUpPatterns.some(pattern => pattern.test(normalized));
  
  // Also check if query is very short (< 20 chars) and has history
  const isShort = normalized.length < 20;
  
  return matchesPattern || (isShort && conversationHistory.length > 0);
}

/**
 * Enhance a follow-up query with conversation context for better KB matching
 */
function enhanceQueryWithContext(
  query: string,
  conversationHistory: Array<["user" | "assistant", string]>
): string {
  if (!conversationHistory || conversationHistory.length === 0) {
    return query;
  }
  
  // Get the last few turns of conversation (last 4 messages = 2 user + 2 assistant)
  const recentHistory = conversationHistory.slice(-4);
  
  // Extract key topics/entities from recent conversation
  const contextParts: string[] = [];
  
  for (let i = recentHistory.length - 1; i >= 0; i--) {
    const [role, content] = recentHistory[i];
    
    // Extract nouns and key phrases from assistant responses
    if (role === "assistant" && content) {
      // Look for topic mentions (menopause-related terms)
      const topicMatch = content.match(/\b(sleep|insomnia|hot flash|night sweat|hormone|estrogen|progesterone|menopause|perimenopause|symptom|weight|exercise|nutrition|diet|workout)\b/gi);
      if (topicMatch) {
        contextParts.push(...topicMatch.map(t => t.toLowerCase()));
      }
    }
    
    // Extract key terms from user questions
    if (role === "user" && content) {
      // Remove question words and extract meaningful terms
      const cleaned = content.replace(/\b(what|how|why|when|where|which|who|can|could|should|will|would|do|does|did|is|are|was|were|tell|me|more|about|that|this|it)\b/gi, '');
      const terms = cleaned.split(/\s+/).filter(w => w.length > 3);
      if (terms.length > 0) {
        contextParts.push(...terms.slice(0, 3)); // Take first 3 meaningful terms
      }
    }
  }
  
  // Combine original query with context
  const uniqueContext = [...new Set(contextParts)].slice(0, 5); // Max 5 context terms
  if (uniqueContext.length > 0) {
    return `${query} ${uniqueContext.join(' ')}`.trim();
  }
  
  return query;
}

/**
 * Check if retrieval result has exact intent match
 * Returns the entry with exact intent match if found, null otherwise
 */
function findExactIntentMatch(retrievalResult: RetrievalResult, query: string): { entry: import("./types").KBEntry; intentScore: number } | null {
  if (!retrievalResult.hasMatch || retrievalResult.kbEntries.length === 0) {
    return null;
  }
  
  // Use consistent normalization from retrieval.ts
  const queryNormalized = normalizeTextForIntentMatching(query);
  
  // Check each entry for exact intent match
  for (const entry of retrievalResult.kbEntries) {
    const intentPatterns = entry.metadata.intent_patterns || [];
    
    for (const pattern of intentPatterns) {
      const patternNormalized = normalizeTextForIntentMatching(pattern);
      
      // Exact match after normalization
      if (queryNormalized === patternNormalized) {
        console.log(`[Exact Intent Match] ✅ Found exact match: "${query}" === "${pattern}"`);
        console.log(`[Exact Intent Match] Topic: ${entry.metadata.topic} | Subtopic: ${entry.metadata.subtopic}`);
        return { entry, intentScore: 1.0 };
      }
    }
  }
  
  return null;
}

/**
 * Determine retrieval mode based on persona
 */
function getRetrievalMode(persona: Persona): RetrievalMode {
  switch (persona) {
    case "menopause_specialist":
      return "kb_strict";
    case "nutrition_coach":
    case "exercise_trainer":
      return "hybrid";
    case "empathy_companion":
      return "llm_reasoning";
    default:
      return "kb_strict"; // Default fallback
  }
}

/**
 * Extract follow-up question from KB entry content
 */
function extractFollowUpQuestion(content: string): string | null {
  const match = content.match(/###\s*\*\*Follow-Up (?:Question|Questions)?\*\*\s*\n([\s\S]*?)(?=###|$)/i);
  return match ? match[1].trim() : null;
}

/**
 * Find matching follow-up link for an option text
 */
function findMatchingLink(
  optionText: string,
  followUpLinks: FollowUpLink[]
): FollowUpLink | null {
  const normalized = optionText.toLowerCase();
  
  // Try exact label match first
  for (const link of followUpLinks) {
    if (link.label.toLowerCase() === normalized) {
      return link;
    }
  }
  
  // Try partial match (contains key terms)
  for (const link of followUpLinks) {
    const linkLabel = link.label.toLowerCase();
    const linkTopic = link.topic.toLowerCase();
    const linkSubtopic = link.subtopic.toLowerCase();
    
    // Check if option text contains key terms from link
    const linkTerms = [...linkLabel.split(' '), ...linkTopic.split(' '), ...linkSubtopic.split(' ')]
      .filter(term => term.length > 3);
    
    const hasMatch = linkTerms.some(term => normalized.includes(term));
    if (hasMatch) {
      return link;
    }
  }
  
  return null;
}

/**
 * Parse follow-up question to extract options and match to follow-up links
 */
function parseFollowUpOptions(
  followUpQuestion: string,
  followUpLinks: FollowUpLink[]
): Array<{ option: string; link: FollowUpLink | null }> {
  const options: Array<{ option: string; link: FollowUpLink | null }> = [];
  
  // Pattern 1: Square brackets [option A], [option B]
  const bracketPattern = /\[([^\]]+)\]/g;
  let match;
  while ((match = bracketPattern.exec(followUpQuestion)) !== null) {
    const optionText = match[1].trim();
    const link = findMatchingLink(optionText, followUpLinks);
    options.push({ option: optionText, link });
  }
  
  // Pattern 2: Comma-separated options (if no brackets found)
  if (options.length === 0) {
    // Split by "or" and comma patterns, extract meaningful phrases
    // Look for patterns like: "Would you like to [X], [Y], or [Z]?"
    const orPattern = /(?:^|,|\s+or\s+)([^,]+?)(?=,|\s+or\s+|$)/gi;
    while ((match = orPattern.exec(followUpQuestion)) !== null) {
      const optionText = match[1].trim();
      // Filter out question starters and short phrases
      if (optionText.length > 10 && !/^(would|like|to|learn|understand|explore|or)$/i.test(optionText)) {
        const link = findMatchingLink(optionText, followUpLinks);
        options.push({ option: optionText, link });
      }
    }
  }
  
  return options;
}

/**
 * Extract key phrases from text for reverse KB lookup
 */
function extractKeyPhrases(text: string): string[] {
  // Extract meaningful phrases (3+ words) that are likely KB-related
  const phrases: string[] = [];
  
  // Remove markdown and special characters
  const cleaned = text.replace(/[#*`\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Extract noun phrases (simplified - look for capitalized words and common terms)
  const words = cleaned.split(/\s+/);
  const menopauseTerms = ['hormone', 'menopause', 'estrogen', 'progesterone', 'hot flash', 'night sweat', 'sleep', 'nutrition', 'exercise', 'workout', 'diet', 'symptom'];
  
  // Find phrases containing menopause-related terms
  for (let i = 0; i < words.length - 2; i++) {
    const threeWords = words.slice(i, i + 3).join(' ').toLowerCase();
    if (menopauseTerms.some(term => threeWords.includes(term))) {
      phrases.push(threeWords);
    }
  }
  
  // Also extract capitalized phrases (likely proper nouns or topics)
  const capitalizedPhrases = cleaned.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g);
  if (capitalizedPhrases) {
    phrases.push(...capitalizedPhrases.map(p => p.toLowerCase()));
  }
  
  return [...new Set(phrases)].slice(0, 5); // Return unique phrases, max 5
}

/**
 * Retrieve KB entry by exact metadata match
 */
async function retrieveKBEntryByMetadata(
  persona: string,
  topic: string,
  subtopic: string
): Promise<KBEntry | null> {
  // Use retrieval with strict metadata filter
  const retrievalResult = await retrieveFromKB(
    `${topic} ${subtopic}`,
    persona as Persona,
    5, // Get more results to find exact match
    0.7 // Moderate threshold
  );
  
  // Filter by exact metadata match
  for (const entry of retrievalResult.kbEntries) {
    if (
      entry.metadata.persona === persona &&
      entry.metadata.topic === topic &&
      entry.metadata.subtopic === subtopic
    ) {
      return entry;
    }
  }
  
  return null;
}

/**
 * Handle follow-up question with link resolution
 */
async function handleFollowUpWithLinks(
  userQuery: string,
  currentKBEntry: KBEntry,
  persona: Persona,
  mode: RetrievalMode
): Promise<OrchestrationResult | null> {
  const followUpLinks = currentKBEntry.metadata.follow_up_links || [];
  
  // If no follow-up links, return null to use default flow
  if (followUpLinks.length === 0) {
    return null;
  }
  
  // Get the follow-up question from the current KB entry
  const followUpQuestion = extractFollowUpQuestion(currentKBEntry.content);
  if (!followUpQuestion) {
    return null;
  }
  
  // Parse options and match to links
  const options = parseFollowUpOptions(followUpQuestion, followUpLinks);
  
  if (options.length === 0) {
    return null;
  }
  
  // Check if user query matches any option with a link
  const normalizedQuery = userQuery.toLowerCase().trim();
  
  for (const { option, link } of options) {
    const normalizedOption = option.toLowerCase();
    
    // Check if user query matches this option (contains key terms)
    const optionTerms = normalizedOption.split(/\s+/).filter(term => term.length > 3);
    const matchesOption = optionTerms.some(term => normalizedQuery.includes(term));
    
    if (matchesOption && link) {
      // Found a match with a link - retrieve the linked KB entry
      console.log(`[Follow-up Link] Matched option "${option}" to KB entry: ${link.topic} > ${link.subtopic}`);
      
      // Retrieve the linked KB entry
      const linkedEntry = await retrieveKBEntryByMetadata(
        link.persona,
        link.topic,
        link.subtopic
      );
      
      if (linkedEntry) {
        const verbatimResponse = formatVerbatimResponse([linkedEntry], true);
        return {
          response: verbatimResponse,
          persona: link.persona as Persona,
          retrievalMode: mode,
          usedKB: true,
          source: "kb",
          kbEntries: [linkedEntry],
          isVerbatim: true,
        };
      }
    } else if (matchesOption && !link) {
      // Matched option but no link - route to LLM
      console.log(`[Follow-up Link] Matched option "${option}" but no link - routing to LLM`);
      return {
        persona,
        retrievalMode: mode,
        usedKB: false,
        source: "llm",
      };
    }
  }
  
  // No match found - return null to use default flow
  return null;
}

/**
 * Main RAG orchestration function
 * 
 * @param userQuery - User's query message
 * @param userId - User ID for tracking
 * @param sessionId - Session ID for conversation memory
 * @param mode - Optional retrieval mode (defaults based on persona)
 * @param userProfile - Optional user profile data
 * @param trackerContext - Optional tracker context
 * @param conversationHistory - Optional conversation history (legacy support)
 */
export async function orchestrateRAG(
  userQuery: string,
  userId: string,
  sessionId: string,
  mode?: RetrievalMode,
  userProfile?: unknown,
  trackerContext?: string,
  conversationHistory?: Array<["user" | "assistant", string]>
): Promise<OrchestrationResult> {
  try {
    // Step 1: Get conversation history from memory
    const memoryHistory = getConversationHistory(sessionId);
    const allHistory = conversationHistory || memoryHistory.map(msg => [msg.role, msg.content] as ["user" | "assistant", string]);

    // Step 1.5: Detect and enhance follow-up questions
    const isFollowUp = isFollowUpQuestion(userQuery, allHistory);
    let queryForKB = userQuery;
    
    // Step 2: Classify persona (use original query, not enhanced) - do this early for follow-up link resolution
    let persona = classifyPersona(userQuery);
    
    if (isFollowUp) {
      console.log(`[RAG Orchestrator] Follow-up question detected`);
      
      // Try to get the last KB entry from conversation history
      // Look for the last assistant message and try to find the KB entry it came from
      let lastKBEntry: KBEntry | null = null;
      
      // Get the last assistant message
      for (let i = allHistory.length - 1; i >= 0; i--) {
        const [role, content] = allHistory[i];
        if (role === "assistant" && content) {
          // Try to retrieve KB entry that matches this content
          // Use a reverse lookup: search for KB entries that contain key phrases from the response
          const keyPhrases = extractKeyPhrases(content);
          if (keyPhrases.length > 0) {
            const searchQuery = keyPhrases.slice(0, 3).join(' ');
            const reverseLookup = await retrieveFromKB(searchQuery, persona, 3, 0.6);
            
            // Check if any retrieved entry has follow_up_links
            for (const entry of reverseLookup.kbEntries) {
              if (entry.metadata.follow_up_links && entry.metadata.follow_up_links.length > 0) {
                // Check if this entry's content matches the assistant response (partial match)
                const entryContent = entry.content.toLowerCase();
                const responseContent = content.toLowerCase();
                const hasOverlap = keyPhrases.some(phrase => 
                  entryContent.includes(phrase.toLowerCase()) || 
                  responseContent.includes(phrase.toLowerCase())
                );
                
                if (hasOverlap) {
                  lastKBEntry = entry;
                  console.log(`[RAG Orchestrator] Found last KB entry with follow-up links: ${entry.metadata.topic} > ${entry.metadata.subtopic}`);
                  break;
                }
              }
            }
          }
          break; // Only check the last assistant message
        }
      }
      
      // If we found a KB entry with follow-up links, try to resolve the follow-up
      if (lastKBEntry && lastKBEntry.metadata.follow_up_links && lastKBEntry.metadata.follow_up_links.length > 0) {
        // Step 3: Determine retrieval mode (use provided mode or default based on persona)
        const retrievalModeForLink = mode || getRetrievalMode(persona);
        
        const linkResult = await handleFollowUpWithLinks(
          userQuery,
          lastKBEntry,
          persona,
          retrievalModeForLink
        );
        
        if (linkResult) {
          console.log(`[RAG Orchestrator] Follow-up link resolved, returning result`);
          return linkResult;
        }
        
        // If no link match but we have follow-up links, skip KB search and go to LLM
        console.log(`[RAG Orchestrator] Follow-up question with links but no match - routing to LLM (skipping KB search)`);
        return {
          persona,
          retrievalMode: retrievalModeForLink,
          usedKB: false,
          source: "llm",
        };
      }
      
      // No follow-up links found, use normal enhancement
      console.log(`[RAG Orchestrator] Follow-up question detected, enhancing with conversation context`);
      queryForKB = enhanceQueryWithContext(userQuery, allHistory);
      console.log(`[RAG Orchestrator] Enhanced query: "${queryForKB}" (original: "${userQuery}")`);
    }

    // Step 2.5: Check for WHY hormone questions and potentially route to menopause persona
    
    // Step 2.5: Check for WHY hormone questions and potentially route to menopause persona
    // If it's a pure WHY hormone question (not asking for a plan), route to menopause
    // If it's asking for a plan + why, keep the persona and let prompt builder handle redirect
    const isWhyHormone = isWhyHormoneQuestion(userQuery);
    const isAskingForPlan = /\b(plan|routine|workout|meal|diet|program|schedule)\b/i.test(userQuery);
    
    if (isWhyHormone && shouldRouteWhyToMenopause(persona, userQuery)) {
      // If user is asking for a plan + why, keep the persona (prompt builder will add redirect)
      // Otherwise, route to menopause specialist for pure WHY questions
      if (!isAskingForPlan) {
        console.log(`[RAG Orchestrator] WHY hormone question detected - routing to menopause specialist`);
        persona = "menopause_specialist";
      } else {
        console.log(`[RAG Orchestrator] WHY hormone question + plan request - keeping ${persona} persona with redirect instruction`);
      }
    }
    
    // Step 3: Determine retrieval mode (use provided mode or default based on persona)
    // Only set if not already set in follow-up link handling
    const retrievalMode = mode || getRetrievalMode(persona);

    console.log(`[RAG Orchestrator] Query: "${userQuery}"`);
    console.log(`[RAG Orchestrator] Classified persona: ${persona}`);
    console.log(`[RAG Orchestrator] Retrieval mode: ${retrievalMode}`);

    // Step 4: Handle based on retrieval mode - use queryForKB for retrieval
    if (retrievalMode === "kb_strict") {
      return await handleKBStrictMode(queryForKB, persona, retrievalMode, userProfile, trackerContext, allHistory);
    } else if (retrievalMode === "hybrid") {
      return await handleHybridMode(queryForKB, persona, retrievalMode, userProfile, trackerContext, allHistory);
    } else {
      // llm_reasoning mode - pass enhanced query and original for context
      return await handleLLMReasoningMode(queryForKB, persona, retrievalMode, userProfile, trackerContext, allHistory);
    }
  } catch (error) {
    console.error("Error in RAG orchestration:", error);
    // Fallback to basic LLM response
    return {
      response: "I apologize, but I encountered an error processing your request. Could you please try rephrasing your question?",
      persona: "menopause_specialist",
      retrievalMode: "llm_reasoning",
      usedKB: false,
      source: "llm",
    };
  }
}

/**
 * Handle kb_strict mode (Menopause Specialist)
 * Returns KB content if match found, null if no match
 */
async function handleKBStrictMode(
  userQuery: string,
  persona: Persona,
  mode: RetrievalMode,
  _userProfile?: unknown,
  _trackerContext?: string,
  _conversationHistory?: Array<["user" | "assistant", string]>
): Promise<OrchestrationResult> {
  console.log(`[KB Strict Mode] Active for query: "${userQuery}"`);
  console.log(`[KB Strict Mode] Using STRICT INTENT-BASED RETRIEVAL`);
  console.log(`[KB Strict Mode] Documents must have intent match score >= 0.9`);
  
  // Use strict intent-based retrieval (intent threshold = 0.9)
  // Falls back to semantic similarity if no intent matches found
  const retrievalResult = await retrieveFromKBByIntentOnly(userQuery, persona, 3, 0.9);

  // CRITICAL: Check for exact intent match first - always return verbatim if found
  const exactMatch = findExactIntentMatch(retrievalResult, userQuery);
  if (exactMatch) {
    console.log(`[KB Strict Mode] ✅ EXACT INTENT MATCH - VERBATIM RESPONSE triggered`);
    const verbatimResponse = formatVerbatimResponse([exactMatch.entry], true); // Pass excludeMetadata=true
    
    return {
      response: verbatimResponse,
      persona,
      retrievalMode: mode,
      usedKB: true,
      source: "kb",
      kbEntries: [exactMatch.entry],
      isVerbatim: true,
    };
  }

  // Enhanced logging with semantic and hybrid scores
  console.log(`[KB Strict Mode] Retrieval results:`);
  console.log(`  - Has match: ${retrievalResult.hasMatch}`);
  console.log(`  - KB entries found: ${retrievalResult.kbEntries.length}`);
  if (retrievalResult.topScore !== undefined) {
    console.log(`  - Top hybrid score: ${retrievalResult.topScore.toFixed(3)}`);
  }
  if (retrievalResult.topSemanticScore !== undefined) {
    console.log(`  - Top semantic score: ${retrievalResult.topSemanticScore.toFixed(3)}`);
  }
  if (retrievalResult.kbEntries.length > 0) {
    console.log(`  - Entry details:`);
    retrievalResult.kbEntries.forEach((entry, idx) => {
      const hybridScore = (entry.similarity ?? 0).toFixed(3);
      const semanticScore = (entry.semanticSimilarity ?? 0).toFixed(3);
      console.log(`    [${idx + 1}] Hybrid: ${hybridScore} | Semantic: ${semanticScore} | Topic: ${entry.metadata.topic} | Subtopic: ${entry.metadata.subtopic}`);
    });
  }

  // TRUST RETRIEVAL RESULTS: If retrieveFromKBByIntentOnly returned entries with hasMatch=true,
  // those entries already passed the 0.9 intent threshold, so return verbatim immediately
  // No need to recalculate intent scores - retrieval already did that
  if (retrievalResult.hasMatch && retrievalResult.kbEntries.length > 0) {
    console.log(`[KB Strict Mode] ✅ VERBATIM RESPONSE triggered (intent-matched entries from retrieval)`);
    if (retrievalResult.topSemanticScore !== undefined) {
      console.log(`  - Top semantic score: ${retrievalResult.topSemanticScore.toFixed(3)}`);
    }
    if (retrievalResult.topScore !== undefined) {
      console.log(`  - Top hybrid score: ${retrievalResult.topScore.toFixed(3)}`);
    }
    const verbatimResponse = formatVerbatimResponse(retrievalResult.kbEntries, true); // Pass excludeMetadata=true
    
    return {
      response: verbatimResponse,
      persona,
      retrievalMode: mode,
      usedKB: true,
      source: "kb",
      kbEntries: retrievalResult.kbEntries,
      isVerbatim: true,
    };
  }

  // No KB match
  console.log(`[KB Strict Mode] ❌ No verbatim response (no KB entries found)`);

  // No KB match - check safety (mode-aware)
  const hasKBAnswer = retrievalResult.hasMatch && retrievalResult.kbEntries.length > 0;
  const safetyCheck = validateMenopauseQuery(userQuery, mode, hasKBAnswer);

  if (safetyCheck.refused) {
    console.log(`[KB Strict Mode] Query refused, returning refusal response`);
    // Return polite refusal
    return {
      response: safetyCheck.reason || generateRefusalResponse(userQuery),
      persona,
      retrievalMode: mode,
      usedKB: false,
      source: "llm",
    };
  }

  // No KB match and query is allowed - return null response (route will handle LLM)
  console.log(`[KB Strict Mode] No KB match found, returning null for LLM fallback`);
  return {
    persona,
    retrievalMode: mode,
    usedKB: false,
    source: "llm",
  };
}

/**
 * Handle hybrid mode (Nutrition Coach, Exercise Trainer)
 * Tries KB first, falls back to LLM if no KB match
 */
async function handleHybridMode(
  userQuery: string,
  persona: Persona,
  mode: RetrievalMode,
  _userProfile?: unknown,
  _trackerContext?: string,
  _conversationHistory?: Array<["user" | "assistant", string]>
): Promise<OrchestrationResult> {
  console.log(`[Hybrid Mode] Active for query: "${userQuery}"`);
  
  // Retrieve KB entries with lower threshold for hybrid mode
  const similarityThreshold = 0.5;
  const retrievalResult = await retrieveFromKB(userQuery, persona, 5, similarityThreshold);

  // IMPROVED: Dual threshold system for hybrid mode verbatim responses
  // Slightly lower thresholds than kb_strict since hybrid mode is more flexible
  // Semantic threshold: 0.35 (primary gate - lower to catch paraphrases)
  // Hybrid threshold: adaptive (already applied in retrieval, typically 0.44-0.50)
  const semanticThreshold = 0.35;  // Lower to catch paraphrases
  
  console.log(`[Hybrid Mode] Retrieval results:`);
  console.log(`  - Has match: ${retrievalResult.hasMatch}`);
  console.log(`  - KB entries found: ${retrievalResult.kbEntries.length}`);
  if (retrievalResult.topScore !== undefined) {
    console.log(`  - Top hybrid score: ${retrievalResult.topScore.toFixed(3)}`);
  }
  if (retrievalResult.topSemanticScore !== undefined) {
    console.log(`  - Top semantic score: ${retrievalResult.topSemanticScore.toFixed(3)}`);
  }
  if (retrievalResult.kbEntries.length > 0) {
    console.log(`  - Entry details:`);
    retrievalResult.kbEntries.forEach((entry, idx) => {
      const hybridScore = (entry.similarity ?? 0).toFixed(3);
      const semanticScore = (entry.semanticSimilarity ?? 0).toFixed(3);
      console.log(`    [${idx + 1}] Hybrid: ${hybridScore} | Semantic: ${semanticScore} | Topic: ${entry.metadata.topic} | Subtopic: ${entry.metadata.subtopic}`);
    });
  }

  // CRITICAL: Check for exact intent match first - always return verbatim if found
  const exactMatch = findExactIntentMatch(retrievalResult, userQuery);
  if (exactMatch) {
    console.log(`[Hybrid Mode] ✅ EXACT INTENT MATCH - VERBATIM RESPONSE triggered`);
    const verbatimResponse = formatVerbatimResponse([exactMatch.entry], false);
    
    return {
      response: verbatimResponse,
      persona,
      retrievalMode: mode,
      usedKB: true,
      source: "kb",
      kbEntries: [exactMatch.entry],
      isVerbatim: true,
    };
  }

  // IMPROVED: Check for verbatim response opportunity (strong KB match)
  // For hybrid mode, we use adaptive threshold from retrieval (already applied)
  // So if entries passed retrieval filters, they're good candidates for verbatim
  const hasSemanticMatch = retrievalResult.topSemanticScore !== undefined && retrievalResult.topSemanticScore >= semanticThreshold;
  const hasGoodHybridMatch = retrievalResult.topScore !== undefined && retrievalResult.topScore >= 0.45; // Adaptive threshold already applied, just verify it's reasonable
  
  if (retrievalResult.hasMatch && retrievalResult.kbEntries.length > 0 && hasSemanticMatch && hasGoodHybridMatch) {
    // Strong KB match found - return verbatim response
    console.log(`[Hybrid Mode] ✅ VERBATIM RESPONSE triggered`);
    console.log(`  - Semantic: ${retrievalResult.topSemanticScore!.toFixed(3)} >= ${semanticThreshold} ✓`);
    console.log(`  - Hybrid: ${retrievalResult.topScore!.toFixed(3)} >= 0.45 ✓`);
    const verbatimResponse = formatVerbatimResponse(retrievalResult.kbEntries);
    
    return {
      response: verbatimResponse,
      persona,
      retrievalMode: mode,
      usedKB: true,
      source: "kb",
      kbEntries: retrievalResult.kbEntries,
      isVerbatim: true,
    };
  }

  // No strong match - use KB context with LLM (hybrid approach)
  if (retrievalResult.topSemanticScore !== undefined || retrievalResult.topScore !== undefined) {
    const semanticStatus = hasSemanticMatch ? '✓' : '✗';
    const hybridStatus = hasGoodHybridMatch ? '✓' : '✗';
    console.log(`[Hybrid Mode] No verbatim response (using hybrid LLM approach):`);
    if (retrievalResult.topSemanticScore !== undefined) {
      console.log(`  - Semantic: ${retrievalResult.topSemanticScore.toFixed(3)} ${semanticStatus} (threshold: ${semanticThreshold})`);
    }
    if (retrievalResult.topScore !== undefined) {
      console.log(`  - Hybrid: ${retrievalResult.topScore.toFixed(3)} ${hybridStatus} (threshold: 0.45)`);
    }
  }

  // For hybrid mode, return KB context for route to use with LLM (with tools)
  let kbContext = "";
  if (retrievalResult.hasMatch && retrievalResult.kbEntries.length > 0) {
    kbContext = formatKBContextForLLM(retrievalResult.kbEntries);
    console.log(`[Hybrid Mode] KB context provided to LLM (${retrievalResult.kbEntries.length} entries)`);
  } else {
    console.log(`[Hybrid Mode] No KB context (will use LLM only)`);
  }

  return {
    persona,
    retrievalMode: mode,
    usedKB: retrievalResult.hasMatch,
    source: retrievalResult.hasMatch ? "kb" : "llm",
    kbEntries: retrievalResult.kbEntries,
    kbContext,
  };
}

/**
 * Handle llm_reasoning mode (Empathy Companion)
 * For follow-up questions, tries KB first even in llm_reasoning mode
 */
async function handleLLMReasoningMode(
  userQuery: string, // This is already enhanced if it was a follow-up
  persona: Persona,
  mode: RetrievalMode,
  _userProfile?: unknown,
  _trackerContext?: string,
  conversationHistory?: Array<["user" | "assistant", string]>
): Promise<OrchestrationResult> {
  // For follow-up questions, try KB first even in llm_reasoning mode
  // If query is already enhanced (has extra context words) or we have history, try KB
  const history = conversationHistory || [];
  const hasHistory = history.length > 0;
  
  // Check if query looks like it might be a follow-up (short or has follow-up patterns)
  // Note: query might already be enhanced, so we check the original patterns
  const normalized = userQuery.toLowerCase().trim();
  const looksLikeFollowUp = hasHistory && (
    normalized.length < 30 || 
    /^(what|how|why|tell|more|about|that|this|it)\b/i.test(normalized)
  );
  
  if (looksLikeFollowUp) {
    console.log(`[LLM Reasoning Mode] Follow-up question detected - attempting KB search first`);
    // Query is already enhanced from orchestrateRAG, use it directly
    const retrievalResult = await retrieveFromKB(userQuery, persona, 3, 0.4);
    
    // CRITICAL: Check for exact intent match first - always return verbatim if found
    const exactMatch = findExactIntentMatch(retrievalResult, userQuery);
    if (exactMatch) {
      console.log(`[LLM Reasoning Mode] ✅ EXACT INTENT MATCH - VERBATIM RESPONSE triggered`);
      const verbatimResponse = formatVerbatimResponse([exactMatch.entry], false);
      
      return {
        response: verbatimResponse,
        persona,
        retrievalMode: mode,
        usedKB: true,
        source: "kb",
        kbEntries: [exactMatch.entry],
        isVerbatim: true,
      };
    }
    
    if (retrievalResult.hasMatch && retrievalResult.kbEntries.length > 0) {
      console.log(`[LLM Reasoning Mode] KB match found for follow-up, using KB context`);
      const kbContext = formatKBContextForLLM(retrievalResult.kbEntries);
      return {
        persona,
        retrievalMode: mode,
        usedKB: true,
        source: "kb",
        kbEntries: retrievalResult.kbEntries,
        kbContext,
      };
    }
  }
  
  // Also check for exact intent match even if not a follow-up
  // This ensures exact matches always trigger verbatim regardless of mode
  const regularRetrievalResult = await retrieveFromKB(userQuery, persona, 3, 0.3);
  const exactMatchRegular = findExactIntentMatch(regularRetrievalResult, userQuery);
  if (exactMatchRegular) {
    console.log(`[LLM Reasoning Mode] ✅ EXACT INTENT MATCH - VERBATIM RESPONSE triggered`);
    const verbatimResponse = formatVerbatimResponse([exactMatchRegular.entry], false);
    
    return {
      response: verbatimResponse,
      persona,
      retrievalMode: mode,
      usedKB: true,
      source: "kb",
      kbEntries: [exactMatchRegular.entry],
      isVerbatim: true,
    };
  }
  
  console.log(`[LLM Reasoning Mode] Active - skipping KB, using LLM only`);
  // For llm_reasoning mode, return empty response, route will handle LLM with tools
  return {
    persona,
    retrievalMode: mode,
    usedKB: false,
    source: "llm",
  };
}
