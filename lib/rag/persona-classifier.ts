/**
 * Persona Classifier - Routes user queries to appropriate persona
 */

import { ChatOpenAI } from "@langchain/openai";
import type { Persona } from "./types";

const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.3, // Lower temperature for more consistent classification
  openAIApiKey: process.env.OPENAI_API_KEY,
});

/**
 * Classify user query into one of the four personas using LLM
 */
export async function classifyPersona(query: string): Promise<Persona> {
  try {
    const classificationPrompt = `You are a query classifier for a menopause support chatbot with 4 distinct personas.

Classify the following user query into ONE of these personas:

1. **menopause_specialist**: Medical questions, hormone questions, symptom explanations, menopause education, HRT questions (general), physiology questions
   Examples: "What are hot flashes?", "Why does menopause affect sleep?", "What is HRT?", "How do hormones change during menopause?"

2. **nutrition_coach**: Food, meals, diet, nutrition, eating habits, meal planning, food-symptom correlations
   Examples: "What should I eat for breakfast?", "Meal plan for hot flashes", "Nutrition tips for menopause", "What foods help with sleep?"

3. **exercise_trainer**: Workouts, exercise, movement, fitness, training, exercise plans, physical activity
   Examples: "Workout plan for menopause", "Best exercises for weight loss", "How to start exercising", "Low-impact exercises"

4. **empathy_companion**: Emotional support, feelings, stress, validation, CBT, mental health, emotional regulation, casual conversation
   Examples: "I'm feeling overwhelmed", "How to manage stress", "I'm struggling with this", "Just need someone to talk to"

User query: "${query}"

Respond with ONLY the persona name (one word: menopause_specialist, nutrition_coach, exercise_trainer, or empathy_companion).`;

    const response = await llm.invoke(classificationPrompt);
    const result = typeof response.content === 'string' 
      ? response.content.trim().toLowerCase()
      : String(response.content).trim().toLowerCase();

    // Validate result
    if (result === "menopause_specialist" || result === "nutrition_coach" || 
        result === "exercise_trainer" || result === "empathy_companion") {
      return result as Persona;
    }

    // Fallback to keyword-based classification
    return classifyPersonaByKeywords(query);
  } catch (error) {
    console.error("Error in LLM persona classification:", error);
    // Fallback to keyword-based classification
    return classifyPersonaByKeywords(query);
  }
}

/**
 * Fallback keyword-based classification
 */
function classifyPersonaByKeywords(query: string): Persona {
  const lowerQuery = query.toLowerCase();

  // Nutrition Coach keywords
  const nutritionKeywords = [
    "food", "meal", "eat", "diet", "nutrition", "breakfast", "lunch", "dinner",
    "snack", "calorie", "protein", "carb", "fiber", "recipe", "cooking", "ingredient"
  ];
  if (nutritionKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return "nutrition_coach";
  }

  // Exercise Trainer keywords
  const exerciseKeywords = [
    "workout", "exercise", "fitness", "training", "gym", "cardio", "strength",
    "yoga", "walking", "running", "movement", "physical activity", "train", "sport"
  ];
  if (exerciseKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return "exercise_trainer";
  }

  // Empathy Companion keywords (emotional/support)
  const empathyKeywords = [
    "feel", "feeling", "emotion", "stress", "anxious", "overwhelmed", "sad",
    "depressed", "lonely", "support", "help me", "struggling", "difficult",
    "hard time", "coping", "mental health", "therapy", "cbt"
  ];
  if (empathyKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return "empathy_companion";
  }

  // Default to menopause_specialist (covers medical, hormone, symptom questions)
  return "menopause_specialist";
}

