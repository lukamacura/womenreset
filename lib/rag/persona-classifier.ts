/**
 * Persona Classifier - Routes user queries to appropriate persona
 * Uses fast keyword-based classification as primary method
 */

import type { Persona } from "./types";

/**
 * Classify user query into one of the four personas using keyword matching
 * Fast, deterministic, and reliable
 */
export function classifyPersona(query: string): Persona {
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

  // Empathy Companion keywords (emotional/support)
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







