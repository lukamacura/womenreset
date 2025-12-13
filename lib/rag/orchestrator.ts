/**
 * RAG Orchestrator - Main orchestration logic for persona-based RAG
 */

import type { Persona, RetrievalMode, OrchestrationResult } from "./types";
import { classifyPersona } from "./persona-classifier";
import { validateMenopauseQuery, generateRefusalResponse } from "./safety-validator";
import { retrieveFromKB } from "./retrieval";
import { formatVerbatimResponse, formatKBContextForLLM } from "./response-formatter";

// Note: LLM calls are handled in the route to support tools (log_symptom, etc.)
// The orchestrator only handles KB retrieval and persona classification

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
 */
export async function orchestrateRAG(
  userQuery: string,
  userId: string,
  userProfile?: unknown,
  trackerContext?: string,
  conversationHistory?: Array<["user" | "assistant", string]>
): Promise<OrchestrationResult> {
  try {
    // Step 1: Classify persona
    const persona = await classifyPersona(userQuery);
    
    // Step 2: Determine retrieval mode
    const retrievalMode = getRetrievalMode(persona);

    console.log(`[RAG Orchestrator] Query: "${userQuery}"`);
    console.log(`[RAG Orchestrator] Classified persona: ${persona}`);
    console.log(`[RAG Orchestrator] Retrieval mode: ${retrievalMode}`);

    // Step 3: Handle based on retrieval mode
    if (retrievalMode === "kb_strict") {
      return await handleKBStrictMode(userQuery, persona, userProfile, trackerContext, conversationHistory);
    } else if (retrievalMode === "hybrid") {
      return await handleHybridMode(userQuery, persona, userProfile, trackerContext, conversationHistory);
    } else {
      // llm_reasoning mode
      return await handleLLMReasoningMode(userQuery, persona, userProfile, trackerContext, conversationHistory);
    }
  } catch (error) {
    console.error("Error in RAG orchestration:", error);
    // Fallback to basic LLM response
    return {
      response: "I apologize, but I encountered an error processing your request. Could you please try rephrasing your question?",
      persona: "menopause_specialist",
      retrievalMode: "llm_reasoning",
      usedKB: false,
    };
  }
}

/**
 * Handle kb_strict mode (Menopause Specialist)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleKBStrictMode(
  userQuery: string,
  persona: Persona,
  _userProfile?: unknown,
  _trackerContext?: string,
  _conversationHistory?: Array<["user" | "assistant", string]>
): Promise<OrchestrationResult> {
  console.log(`[KB Strict Mode] Active for query: "${userQuery}"`);
  
  // Try KB retrieval first with threshold for strict mode
  // Lowered to 0.55 to catch relevant documents that score 0.55-0.60 (e.g., "Why do i pee so often?" with 0.580)
  const similarityThreshold = 0.55;
  console.log(`[KB Strict Mode] Retrieving with threshold: ${similarityThreshold}`);
  
  const retrievalResult = await retrieveFromKB(userQuery, persona, 3, similarityThreshold);

  // Log retrieval results
  console.log(`[KB Strict Mode] Retrieval results:`);
  console.log(`  - Has match: ${retrievalResult.hasMatch}`);
  console.log(`  - KB entries found: ${retrievalResult.kbEntries.length}`);
  if (retrievalResult.topScore !== undefined) {
    console.log(`  - Top score: ${retrievalResult.topScore.toFixed(3)}`);
  }
  if (retrievalResult.kbEntries.length > 0) {
    console.log(`  - Entry scores: ${retrievalResult.kbEntries.map(e => (e.similarity ?? 0).toFixed(3)).join(', ')}`);
    retrievalResult.kbEntries.forEach((entry, idx) => {
      console.log(`    [${idx + 1}] Score: ${(entry.similarity ?? 0).toFixed(3)}, Topic: ${entry.metadata.topic}, Subtopic: ${entry.metadata.subtopic}`);
    });
  }

  if (retrievalResult.hasMatch && retrievalResult.kbEntries.length > 0) {
    // KB match found - return verbatim
    console.log(`[KB Strict Mode] ✅ VERBATIM RESPONSE triggered (score >= ${similarityThreshold})`);
    const verbatimResponse = formatVerbatimResponse(retrievalResult.kbEntries);
    
    return {
      response: verbatimResponse,
      persona,
      retrievalMode: "kb_strict",
      usedKB: true,
      kbEntries: retrievalResult.kbEntries,
      isVerbatim: true,
    };
  }

  // No KB match - log why
  if (retrievalResult.topScore !== undefined) {
    console.log(`[KB Strict Mode] ❌ No verbatim response (top score ${retrievalResult.topScore.toFixed(3)} < threshold ${similarityThreshold})`);
  } else {
    console.log(`[KB Strict Mode] ❌ No verbatim response (no KB entries found)`);
  }

  // No KB match - check if query is allowed/refused
  const validation = validateMenopauseQuery(userQuery);

  if (validation === "refused") {
    console.log(`[KB Strict Mode] Query refused, returning refusal response`);
    // Return polite refusal
    return {
      response: generateRefusalResponse(userQuery),
      persona,
      retrievalMode: "kb_strict",
      usedKB: false,
    };
  }

  // Allowed - return empty response, route will handle LLM with tools
  // For refused queries, we already returned the refusal response above
  // This case is for allowed queries that need LLM generation
  console.log(`[KB Strict Mode] Query allowed, falling back to LLM generation`);
  return {
    persona,
    retrievalMode: "kb_strict",
    usedKB: false,
  };
}

/**
 * Handle hybrid mode (Nutrition Coach, Exercise Trainer)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleHybridMode(
  userQuery: string,
  persona: Persona,
  _userProfile?: unknown,
  _trackerContext?: string,
  _conversationHistory?: Array<["user" | "assistant", string]>
): Promise<OrchestrationResult> {
  console.log(`[Hybrid Mode] Active for query: "${userQuery}"`);
  
  // Retrieve KB entries with lower threshold for hybrid mode
  const similarityThreshold = 0.5;
  const retrievalResult = await retrieveFromKB(userQuery, persona, 5, similarityThreshold);

  console.log(`[Hybrid Mode] Retrieval results:`);
  console.log(`  - Has match: ${retrievalResult.hasMatch}`);
  console.log(`  - KB entries found: ${retrievalResult.kbEntries.length}`);
  if (retrievalResult.topScore !== undefined) {
    console.log(`  - Top score: ${retrievalResult.topScore.toFixed(3)}`);
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
    retrievalMode: "hybrid",
    usedKB: retrievalResult.hasMatch,
    kbEntries: retrievalResult.kbEntries,
    kbContext,
  };
}

/**
 * Handle llm_reasoning mode (Empathy Companion)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleLLMReasoningMode(
  _userQuery: string,
  persona: Persona,
  _userProfile?: unknown,
  _trackerContext?: string,
  _conversationHistory?: Array<["user" | "assistant", string]>
): Promise<OrchestrationResult> {
  // For llm_reasoning mode, return empty response, route will handle LLM with tools
  return {
    persona,
    retrievalMode: "llm_reasoning",
    usedKB: false,
  };
}

