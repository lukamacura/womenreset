/**
 * Persona Prompt Builder
 * Builds system prompts from persona specifications
 */

import type { Persona } from "../types";
import { exercisePersonaSpec } from "./exercisePersonaSpec";
import { nutritionPersonaSpec } from "./nutritionPersonaSpec";
import { empathyPersonaSpec } from "./empathyPersonaSpec";
import { isLowEnergyState, isOvertrainingSignal } from "./exerciseDetectors";

export interface BuildOptions {
  userQuery?: string;
  isWhyHormoneQuestion?: boolean;
}

/**
 * Builds a system prompt for a given persona using its specification
 */
export function buildPersonaPrompt(persona: Persona, options: BuildOptions = {}): string {
  const { userQuery = "", isWhyHormoneQuestion = false } = options;
  
  switch (persona) {
    case "exercise_trainer":
      return buildExercisePrompt(userQuery, isWhyHormoneQuestion);
    case "nutrition_coach":
      return buildNutritionPrompt(isWhyHormoneQuestion);
    case "empathy_companion":
      return buildEmpathyPrompt();
    case "menopause_specialist":
      // Menopause specialist uses the original prompt (not restructured yet)
      // This will be handled by the existing getPersonaSystemPrompt function
      return "";
    default:
      return "";
  }
}

function buildExercisePrompt(userQuery: string, isWhyHormoneQuestion: boolean): string {
  const spec = exercisePersonaSpec;
  const parts: string[] = [];
  
  // Persona goal
  parts.push(`You are an Exercise Trainer specializing in midlife movement with a ${spec.persona_goal}.`);
  parts.push("");
  
  // TONE GUIDELINES
  parts.push("TONE GUIDELINES:");
  spec.tone_do.forEach(guideline => {
    parts.push(`- ${guideline}`);
  });
  spec.tone_avoid.forEach(guideline => {
    parts.push(`- ${guideline}`);
  });
  parts.push("");
  
  // HARD RULES (prominently placed)
  parts.push("HARD RULES (CRITICAL):");
  spec.rules.forEach(rule => {
    parts.push(`- ${rule}`);
  });
  
  // WHY question routing rule
  if (isWhyHormoneQuestion) {
    parts.push("- If user asks 'why' questions about hormones, estrogen, progesterone, or perimenopause causes, redirect: 'That 'why' is best answered by the Menopause Persona — want the explanation, or should I focus on a plan?' (do not explain hormones)");
  }
  parts.push("");
  
  // CORE TRAINING PRINCIPLES (Seven Pillars)
  parts.push("CORE TRAINING PRINCIPLES:");
  spec.seven_pillars.forEach((pillar, index) => {
    parts.push(`${index + 1}. ${pillar}`);
  });
  parts.push("");
  
  // Strength guidelines
  parts.push("STRENGTH TRAINING GUIDELINES:");
  parts.push(`- Reps: ${spec.strength_guidelines.reps}`);
  parts.push(`- Sets: ${spec.strength_guidelines.sets}`);
  parts.push(`- Rest: ${spec.strength_guidelines.rest}`);
  parts.push(`- Focus: ${spec.strength_guidelines.compound_moves}`);
  parts.push(`- Alternatives: ${spec.strength_guidelines.alternatives}`);
  parts.push(`- Tempo: ${spec.strength_guidelines.slow_tempo}`);
  parts.push("");
  
  // SIT Protocol
  parts.push("SPRINT INTERVALS (SIT) PROTOCOL:");
  parts.push(`- Duration: ${spec.sit_protocol.duration}`);
  parts.push(`- Frequency: ${spec.sit_protocol.frequency}`);
  parts.push("");
  
  // Zone 2 Protocol
  parts.push("ZONE 2 CARDIO PROTOCOL:");
  parts.push(`- Duration: ${spec.zone2_protocol.duration}`);
  parts.push(`- Frequency: ${spec.zone2_protocol.frequency}`);
  parts.push(`- Pace: ${spec.zone2_protocol.pace}`);
  parts.push("");
  
  // State detection and adaptation
  const isLowEnergy = isLowEnergyState(userQuery);
  const isOvertraining = isOvertrainingSignal(userQuery);
  
  if (isLowEnergy) {
    parts.push("LOW-ENERGY DAY PROTOCOL (ACTIVE):");
    parts.push("User is reporting low energy. Default to these options:");
    spec.low_energy_menu.forEach(option => {
      parts.push(`- ${option}`);
    });
    parts.push(`Reassure: "${spec.low_energy_reassurance}"`);
    parts.push("");
  } else {
    parts.push("LOW-ENERGY DAY PROTOCOL:");
    parts.push("When user reports fatigue, poor sleep, stress, bloating:");
    spec.low_energy_menu.forEach(option => {
      parts.push(`- ${option}`);
    });
    parts.push(`Reassure: "${spec.low_energy_reassurance}"`);
    parts.push("");
  }
  
  if (isOvertraining) {
    parts.push("OVERTRAINING PROTECTION (ACTIVE):");
    parts.push("User is showing overtraining signals. Default to protective guidance:");
    spec.overtraining_responses.forEach(response => {
      parts.push(`- ${response}`);
    });
    parts.push("");
  } else {
    parts.push("OVERTRAINING & RECOVERY PROTECTION:");
    parts.push("Triggers: " + spec.overtraining_triggers.join(", "));
    parts.push("Responses:");
    spec.overtraining_responses.forEach(response => {
      parts.push(`- ${response}`);
    });
    parts.push("");
  }
  
  // Safety boundaries
  parts.push("SAFETY BOUNDARIES:");
  spec.safety_boundaries.forEach(boundary => {
    parts.push(`- ${boundary}`);
  });
  parts.push("");
  
  // Follow-up rules
  parts.push("FOLLOW-UP RULES:");
  spec.follow_up_rules.forEach(rule => {
    parts.push(`- ${rule}`);
  });
  parts.push("");
  
  // Pre-plan questions
  parts.push("PRE-PLAN QUESTIONS (3-5 max):");
  spec.preplan_questions.forEach((question, index) => {
    parts.push(`${index + 1}. "${question}"`);
  });
  parts.push("");
  parts.push(`PRE-PLAN LOGIC: ${spec.preplan_logic}`);
  parts.push("");
  
  // Output guidelines
  parts.push("OUTPUT GUIDELINES:");
  parts.push("- Always offer 5/10/20-minute options when possible");
  spec.output_guidelines.forEach(guideline => {
    parts.push(`- ${guideline}`);
  });
  parts.push("");
  
  // Empathy starters
  parts.push("EMPATHY STARTERS:");
  spec.empathy_starters.forEach(starter => {
    parts.push(`- "${starter}"`);
  });
  
  return parts.join("\n");
}

function buildNutritionPrompt(isWhyHormoneQuestion: boolean): string {
  const spec = nutritionPersonaSpec;
  const parts: string[] = [];
  
  // Persona goal
  parts.push(`You are a Nutrition Coach specializing in midlife nutrition with a ${spec.persona_goal}.`);
  parts.push("");
  
  // TONE GUIDELINES
  parts.push("TONE GUIDELINES:");
  spec.tone_do.forEach(guideline => {
    parts.push(`- ${guideline}`);
  });
  spec.tone_avoid.forEach(guideline => {
    parts.push(`- ${guideline}`);
  });
  parts.push("");
  
  // HARD RULES (prominently placed)
  parts.push("HARD RULES (CRITICAL):");
  spec.rules.forEach(rule => {
    parts.push(`- ${rule}`);
  });
  
  // WHY question routing rule
  if (isWhyHormoneQuestion) {
    parts.push("- If user asks 'why' questions about hormones, estrogen, progesterone, or perimenopause causes, redirect: 'That 'why' is best answered by the Menopause Persona — want the explanation, or should I focus on a plan?' (do not explain hormones)");
  }
  parts.push("");
  
  // CORE NUTRITION PRINCIPLES
  parts.push("CORE NUTRITION PRINCIPLES:");
  parts.push(`1. Protein-Anchored: ${spec.protein_guidelines.per_meal}, ${spec.protein_guidelines.breakfast}, ${spec.protein_guidelines.carb_pairing}`);
  parts.push(`2. Mediterranean-Style: ${spec.mediterranean_pattern.join(", ")}`);
  parts.push(`3. Smart Carbs & Fiber: ${spec.smart_carbs_fiber.join(", ")}`);
  parts.push(`4. Healthy Fats: ${spec.healthy_fats.join(", ")}`);
  parts.push(`5. Smart Snacks: ${spec.smart_snacks}`);
  parts.push(`6. Meal Rhythm: ${spec.meal_rhythm.spacing}, ${spec.meal_rhythm.overnight_fast}`);
  parts.push(`7. ${spec.plant_diversity}`);
  parts.push("");
  
  // Habit-building approach
  parts.push("HABIT-BUILDING APPROACH:");
  spec.habit_building_principles.forEach(principle => {
    parts.push(`- ${principle}`);
  });
  parts.push("");
  
  // Safety boundaries
  parts.push("SAFETY BOUNDARIES:");
  spec.safety_boundaries.forEach(boundary => {
    parts.push(`- ${boundary}`);
  });
  parts.push("");
  
  // Follow-up rules
  parts.push("FOLLOW-UP RULES:");
  parts.push("- Must include at least one habit-building follow-up prompt");
  spec.follow_up_rules.forEach(rule => {
    parts.push(`- ${rule}`);
  });
  parts.push("");
  
  // Pre-plan questions
  parts.push("PRE-PLAN QUESTIONS (3-6 max, no hormone questions):");
  spec.preplan_questions.forEach((question, index) => {
    parts.push(`${index + 1}. "${question}"`);
  });
  parts.push("");
  parts.push(`PRE-PLAN LOGIC: ${spec.preplan_logic}`);
  parts.push("");
  
  // Output guidelines
  parts.push("OUTPUT GUIDELINES:");
  parts.push("- Must be protein-anchored (mentions protein target / protein-first)");
  parts.push("- Must include at least one habit-building follow-up prompt");
  spec.output_guidelines.forEach(guideline => {
    parts.push(`- ${guideline}`);
  });
  parts.push("");
  
  // Empathy starters
  parts.push("EMPATHY STARTERS:");
  spec.empathy_starters.forEach(starter => {
    parts.push(`- "${starter}"`);
  });
  
  return parts.join("\n");
}

function buildEmpathyPrompt(): string {
  const spec = empathyPersonaSpec;
  const parts: string[] = [];
  
  // Persona goal
  parts.push(`You are an Empathy Companion specializing in ${spec.persona_goal}.`);
  parts.push("");
  
  // TONE GUIDELINES
  parts.push("TONE GUIDELINES:");
  parts.push("- Warm, grounding, gentle, compassionate, encouraging");
  parts.push("- Emotionally intelligent and naturally conversational");
  parts.push("- Slow-paced: Give space for processing, don't rush");
  parts.push("- Non-judgmental: Normalize all feelings without toxic positivity");
  parts.push("- Active listener: Mirror, reflect, validate before advising");
  parts.push("- Small talk capable: Handle greetings, casual chat, check-ins naturally");
  parts.push("");
  
  // CORE CBT FRAMEWORK (Validate → Reframe → Tiny Action)
  parts.push("CORE CBT FRAMEWORK (Validate → Reframe → Tiny Action):");
  parts.push("1. **Validate the feeling**");
  spec.cbt_micro_flow.validate.forEach(example => {
    parts.push(`   - "${example}"`);
  });
  parts.push("");
  parts.push("2. **Gently reframe**");
  spec.cbt_micro_flow.reframe.forEach(example => {
    parts.push(`   - "${example}"`);
  });
  parts.push("");
  parts.push("3. **Tiny calming action**");
  spec.cbt_micro_flow.tiny_action.forEach(example => {
    parts.push(`   - "${example}"`);
  });
  parts.push("");
  
  // CBT Tools
  parts.push("CBT TOOLS TO USE:");
  parts.push(`- **Identify thought**: "${spec.cbt_tools.identify_thought}"`);
  parts.push(`- **Challenge distortion**: "${spec.cbt_tools.challenge_distortion}"`);
  parts.push(`- **Evidence check**: "${spec.cbt_tools.evidence_check}"`);
  parts.push(`- **Balanced belief**: "${spec.cbt_tools.balanced_belief}"`);
  parts.push("");
  
  // Emotional regulation micro-actions
  parts.push("EMOTIONAL REGULATION MICRO-ACTIONS (body-based grounding):");
  spec.emotional_regulation_actions.forEach(action => {
    parts.push(`- ${action}`);
  });
  parts.push("");
  
  // Conversational capabilities
  parts.push("CONVERSATIONAL CAPABILITIES:");
  spec.conversational_behaviors.forEach(behavior => {
    parts.push(`✅ ${behavior}`);
  });
  parts.push("");
  
  // Follow-up patterns
  parts.push("FOLLOW-UP PATTERNS:");
  spec.follow_up_patterns.forEach(pattern => {
    parts.push(`- ${pattern}`);
  });
  parts.push("");
  
  // Safety boundaries
  parts.push("SAFETY BOUNDARIES (CRITICAL):");
  spec.safety_boundaries.forEach(boundary => {
    parts.push(`- ${boundary}`);
  });
  parts.push("");
  
  // Crisis protocol
  parts.push("CRISIS PROTOCOL:");
  parts.push("If user expresses self-harm, danger, or severe distress:");
  parts.push("Respond safely and warmly:");
  parts.push(`"${spec.crisis_protocol}"`);
  parts.push("- Keep response short and action-focused");
  parts.push("- Encourage reaching out to immediate help");
  parts.push("- Do NOT hardcode specific hotline numbers (make configurable by locale)");
  parts.push("- Maintain warm, supportive tone while directing to professional help");
  parts.push("");
  
  // Output guidelines
  parts.push("OUTPUT GUIDELINES:");
  parts.push("- Must follow Validate → Reframe → Tiny Action structure");
  parts.push("- Must include at least one grounding micro-action");
  parts.push("End emotional explorations with:");
  parts.push("  1. Grounding invitation: 'Take one slow breath — just for a moment'");
  parts.push("  2. Gentle choice: 'Would you like to explore this more, or shift to something lighter?'");
  
  return parts.join("\n");
}

