/**
 * RAG Orchestrator - Main orchestration logic for persona-based RAG
 */

import type { Persona, RetrievalMode, OrchestrationResult } from "./types";
import { classifyPersona } from "./persona-classifier";
import { validateMenopauseQuery, generateRefusalResponse } from "./safety-validator";
import { retrieveFromKB } from "./retrieval";
import { formatVerbatimResponse, formatKBContextForLLM } from "./response-formatter";
import { getPersonaSystemPrompt } from "./persona-prompts";

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
  userProfile?: any,
  trackerContext?: string,
  conversationHistory?: Array<["user" | "assistant", string]>
): Promise<OrchestrationResult> {
  try {
    // Step 1: Classify persona
    const persona = await classifyPersona(userQuery);
    
    // Step 2: Determine retrieval mode
    const retrievalMode = getRetrievalMode(persona);

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
async function handleKBStrictMode(
  userQuery: string,
  persona: Persona,
  userProfile?: any,
  trackerContext?: string,
  conversationHistory?: Array<["user" | "assistant", string]>
): Promise<OrchestrationResult> {
  // Try KB retrieval first with higher threshold for strict mode
  const retrievalResult = await retrieveFromKB(userQuery, persona, 3, 0.78);

  if (retrievalResult.hasMatch && retrievalResult.kbEntries.length > 0) {
    // KB match found - return verbatim
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

  // No KB match - check if query is allowed/refused
  const validation = validateMenopauseQuery(userQuery);

  if (validation === "refused") {
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
  return {
    persona,
    retrievalMode: "kb_strict",
    usedKB: false,
  };
}

/**
 * Handle hybrid mode (Nutrition Coach, Exercise Trainer)
 */
async function handleHybridMode(
  userQuery: string,
  persona: Persona,
  userProfile?: any,
  trackerContext?: string,
  conversationHistory?: Array<["user" | "assistant", string]>
): Promise<OrchestrationResult> {
  // Retrieve KB entries with lower threshold for hybrid mode
  const retrievalResult = await retrieveFromKB(userQuery, persona, 5, 0.5);

  // For hybrid mode, return KB context for route to use with LLM (with tools)
  let kbContext = "";
  if (retrievalResult.hasMatch && retrievalResult.kbEntries.length > 0) {
    kbContext = formatKBContextForLLM(retrievalResult.kbEntries);
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
async function handleLLMReasoningMode(
  userQuery: string,
  persona: Persona,
  userProfile?: any,
  trackerContext?: string,
  conversationHistory?: Array<["user" | "assistant", string]>
): Promise<OrchestrationResult> {
  // For llm_reasoning mode, return empty response, route will handle LLM with tools
  return {
    persona,
    retrievalMode: "llm_reasoning",
    usedKB: false,
  };
}


