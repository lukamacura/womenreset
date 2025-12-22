/**
 * RAG Orchestrator - Main orchestration logic for persona-based RAG
 */

import type { Persona, RetrievalMode, OrchestrationResult } from "./types";
import { classifyPersona } from "./persona-classifier";
import { validateMenopauseQuery, generateRefusalResponse } from "./safety-validator";
import { retrieveFromKB } from "./retrieval";
import { formatVerbatimResponse, formatKBContextForLLM } from "./response-formatter";
import { getConversationHistory } from "./conversation-memory";
import { shouldRouteWhyToMenopause, isWhyHormoneQuestion } from "./classifier/whyRouter";

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
    
    if (isFollowUp) {
      console.log(`[RAG Orchestrator] Follow-up question detected, enhancing with conversation context`);
      queryForKB = enhanceQueryWithContext(userQuery, allHistory);
      console.log(`[RAG Orchestrator] Enhanced query: "${queryForKB}" (original: "${userQuery}")`);
    }

    // Step 2: Classify persona (use original query, not enhanced)
    let persona = classifyPersona(userQuery);
    
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
  
  // IMPROVED: Dual threshold system - semantic similarity as primary gate
  // Semantic threshold: 0.35 (primary gate - lower to catch paraphrases)
  // Hybrid threshold: 0.45 (secondary filter - ensures good overall relevance)
  // This prevents good semantic matches from being rejected due to metadata scoring
  const semanticThreshold = 0.35;  // Lower to catch paraphrases
  const hybridThreshold = 0.45;
  console.log(`[KB Strict Mode] Retrieving with dual thresholds:`);
  console.log(`  - Semantic threshold: ${semanticThreshold} (primary gate)`);
  console.log(`  - Hybrid threshold: ${hybridThreshold} (secondary filter)`);
  
  const retrievalResult = await retrieveFromKB(userQuery, persona, 3, hybridThreshold);

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

  // IMPROVED: Check both semantic and hybrid thresholds
  // Allow verbatim mode if EITHER:
  // 1. Both thresholds are met (strict match)
  // 2. Hybrid score is high enough (>= 0.50) - indicates strong keyword/intent matching
  //    even if semantic is slightly below threshold (paraphrases, etc.)
  const hasSemanticMatch = retrievalResult.topSemanticScore !== undefined && retrievalResult.topSemanticScore >= semanticThreshold;
  const hasHybridMatch = retrievalResult.topScore !== undefined && retrievalResult.topScore >= hybridThreshold;
  const hasStrongHybridMatch = retrievalResult.topScore !== undefined && retrievalResult.topScore >= 0.50;
  
  // Trigger verbatim if: (both thresholds met) OR (strong hybrid match with reasonable semantic)
  const shouldUseVerbatim = retrievalResult.hasMatch && retrievalResult.kbEntries.length > 0 && 
    ((hasSemanticMatch && hasHybridMatch) || 
     (hasStrongHybridMatch && retrievalResult.topSemanticScore !== undefined && retrievalResult.topSemanticScore >= 0.40));
  
  if (shouldUseVerbatim) {
    // KB match found - return verbatim
    console.log(`[KB Strict Mode] ✅ VERBATIM RESPONSE triggered`);
    if (hasSemanticMatch && hasHybridMatch) {
      console.log(`  - Semantic: ${retrievalResult.topSemanticScore!.toFixed(3)} >= ${semanticThreshold} ✓`);
      console.log(`  - Hybrid: ${retrievalResult.topScore!.toFixed(3)} >= ${hybridThreshold} ✓`);
    } else if (hasStrongHybridMatch) {
      console.log(`  - Strong hybrid match: ${retrievalResult.topScore!.toFixed(3)} >= 0.50 ✓`);
      console.log(`  - Semantic: ${retrievalResult.topSemanticScore!.toFixed(3)} >= 0.40 ✓ (lenient for high hybrid)`);
    }
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

  // No KB match - detailed logging of why
  if (retrievalResult.topSemanticScore !== undefined || retrievalResult.topScore !== undefined) {
    const semanticStatus = hasSemanticMatch ? '✓' : '✗';
    const hybridStatus = hasHybridMatch ? '✓' : '✗';
    const strongHybridStatus = hasStrongHybridMatch ? '✓' : '✗';
    console.log(`[KB Strict Mode] ❌ No verbatim response:`);
    if (retrievalResult.topSemanticScore !== undefined) {
      console.log(`  - Semantic: ${retrievalResult.topSemanticScore.toFixed(3)} ${semanticStatus} (threshold: ${semanticThreshold}, lenient: 0.40)`);
    }
    if (retrievalResult.topScore !== undefined) {
      console.log(`  - Hybrid: ${retrievalResult.topScore.toFixed(3)} ${hybridStatus} (threshold: ${hybridThreshold}, strong: 0.50 ${strongHybridStatus})`);
    }
  } else {
    console.log(`[KB Strict Mode] ❌ No verbatim response (no KB entries found)`);
  }

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
  
  console.log(`[LLM Reasoning Mode] Active - skipping KB, using LLM only`);
  // For llm_reasoning mode, return empty response, route will handle LLM with tools
  return {
    persona,
    retrievalMode: mode,
    usedKB: false,
    source: "llm",
  };
}
