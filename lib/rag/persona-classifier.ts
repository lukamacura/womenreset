/**
 * Persona Classifier - Routes user queries to appropriate persona
 * Uses fast keyword-based classification as primary method
 * IMPROVED: Checks KB intent patterns for menopause persona before keyword matching
 */

import type { Persona } from "./types";
import { normalizeTextForIntentMatching } from "./retrieval";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Check if query matches intent patterns in menopause persona KB entries
 * This allows accurate routing when queries match menopause KB content
 * even if they contain emotional keywords
 */
async function hasMenopauseKBIntentMatch(query: string): Promise<boolean> {
  try {
    const supabaseClient = getSupabaseAdmin();
    const normalizedQuery = normalizeTextForIntentMatching(query);
    
    // Query documents with persona = "menopause" to check intent patterns
    // Limit to reasonable number for performance (checking intent patterns in-memory)
    const { data: menopauseDocs, error } = await supabaseClient
      .from('documents')
      .select('metadata')
      .eq('metadata->>persona', 'menopause')
      .limit(100); // Get sample of menopause docs to check intent patterns
    
    if (error || !menopauseDocs || menopauseDocs.length === 0) {
      // If query fails or no docs found, return false (fall back to keyword matching)
      return false;
    }
    
    // Check if query matches any intent pattern in menopause docs
    for (const doc of menopauseDocs) {
      const metadata = doc.metadata as { intent_patterns?: string[] };
      const intentPatterns = metadata.intent_patterns || [];
      
      // Handle both array format and other formats
      const patterns: string[] = Array.isArray(intentPatterns) 
        ? intentPatterns 
        : typeof intentPatterns === 'string' 
          ? [intentPatterns] 
          : [];
      
      for (const pattern of patterns) {
        const normalizedPattern = normalizeTextForIntentMatching(pattern);
        
        // Check for exact match after normalization
        if (normalizedQuery === normalizedPattern) {
          console.log(`[Persona Classifier] ✅ Query matches menopause KB intent pattern: "${pattern}"`);
          return true;
        }
        
        // Also check for high similarity (word overlap)
        // This catches cases where query is very similar to intent pattern
        const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
        const patternWords = normalizedPattern.split(/\s+/).filter(w => w.length > 2);
        
        if (queryWords.length > 0 && patternWords.length > 0) {
          const matchingWords = queryWords.filter(w => patternWords.includes(w));
          const overlapRatio = matchingWords.length / Math.max(queryWords.length, patternWords.length);
          
          // If >70% word overlap, consider it a match
          if (overlapRatio >= 0.7) {
            console.log(`[Persona Classifier] ✅ Query similar to menopause KB intent pattern: "${pattern}" (overlap: ${(overlapRatio * 100).toFixed(0)}%)`);
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('[Persona Classifier] Error checking menopause KB intent patterns:', error);
    // On error, fall back to keyword matching
    return false;
  }
}

/**
 * Classify user query into one of the four personas using keyword matching
 * IMPROVED: Checks menopause KB intent patterns first for accurate routing
 * Fast, deterministic, and reliable
 */
export async function classifyPersona(query: string): Promise<Persona> {
  const lowerQuery = query.toLowerCase();

  // Exercise Trainer keywords (check first as they're often specific)
  const exerciseKeywords = [
    "workout", "gym", "strength", "cardio", "movement", "yoga", 
    "exercise", "fitness", "training", "walking", "running", "train", "sport"
  ];
  if (exerciseKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return "exercise_trainer";
  }

  // Nutrition Coach keywords
  const nutritionKeywords = [
    "food", "eat", "diet", "protein", "meal", "vitamin", "nutrition", 
    "breakfast", "lunch", "dinner", "snack", "calorie", "carb", 
    "fiber", "recipe", "cooking", "ingredient"
  ];
  if (nutritionKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return "nutrition_coach";
  }

  // CRITICAL IMPROVEMENT: Check if query matches menopause KB intent patterns BEFORE empathy keywords
  // This ensures queries like "Why am I so emotional?" that match "Mood, Anxiety & Emotional Health" 
  // KB entries route to menopause_specialist even if they contain emotional keywords
  const matchesMenopauseKB = await hasMenopauseKBIntentMatch(query);
  if (matchesMenopauseKB) {
    console.log(`[Persona Classifier] Routing to menopause_specialist based on KB intent pattern match`);
    return "menopause_specialist";
  }

  // Empathy Companion keywords (emotional/support)
  // Only check if query doesn't match menopause KB
  const empathyKeywords = [
    "feel", "emotion", "mood", "anxiety", "stress", "overwhelm", 
    "sad", "depressed", "lonely", "support", "struggling", "difficult",
    "hard time", "coping", "mental health", "therapy", "cbt"
  ];
  if (empathyKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return "empathy_companion";
  }

  // Default to menopause_specialist (covers medical, hormone, symptom questions)
  return "menopause_specialist";
}

/**
 * Multi-intent classifier - returns array of applicable personas
 * Useful when query matches multiple personas
 */
export function classifyPersonaMultiIntent(query: string): Persona[] {
  const lowerQuery = query.toLowerCase();
  const personas: Persona[] = [];

  // Exercise Trainer keywords
  const exerciseKeywords = [
    "workout", "gym", "strength", "cardio", "movement", "yoga", 
    "exercise", "fitness", "training", "walking", "running", "train", "sport"
  ];
  if (exerciseKeywords.some(keyword => lowerQuery.includes(keyword))) {
    personas.push("exercise_trainer");
  }

  // Nutrition Coach keywords
  const nutritionKeywords = [
    "food", "eat", "diet", "protein", "meal", "vitamin", "nutrition", 
    "breakfast", "lunch", "dinner", "snack", "calorie", "carb", 
    "fiber", "recipe", "cooking", "ingredient"
  ];
  if (nutritionKeywords.some(keyword => lowerQuery.includes(keyword))) {
    personas.push("nutrition_coach");
  }

  // Empathy Companion keywords
  const empathyKeywords = [
    "feel", "emotion", "mood", "anxiety", "stress", "overwhelm", 
    "sad", "depressed", "lonely", "support", "struggling", "difficult",
    "hard time", "coping", "mental health", "therapy", "cbt"
  ];
  if (empathyKeywords.some(keyword => lowerQuery.includes(keyword))) {
    personas.push("empathy_companion");
  }

  // If no specific matches, default to menopause_specialist
  if (personas.length === 0) {
    personas.push("menopause_specialist");
  }

  return personas;
}







