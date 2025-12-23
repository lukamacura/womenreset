import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { fetchTrackerData, analyzeTrackerData, formatTrackerSummary } from "@/lib/trackerAnalysis";
import { checkTrialExpired } from "@/lib/checkTrialStatus";

export const runtime = "nodejs";

// Import lazy Supabase admin client
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Import RAG orchestrator
import { orchestrateRAG } from "@/lib/rag/orchestrator";
import { getPersonaSystemPrompt } from "@/lib/rag/persona-prompts";
import { addMessage, getConversationHistory } from "@/lib/rag/conversation-memory";
import type { RetrievalMode } from "@/lib/rag/types";

/**
 * Parse date/time references from user input and convert to ISO timestamp
 * Handles: "yesterday", "2 days ago", "last week", "this morning", "3 hours ago", etc.
 */
function parseDateTimeReference(dateReference: string, defaultDate: Date = new Date()): string {
  if (!dateReference || !dateReference.trim()) {
    return defaultDate.toISOString();
  }

  const input = dateReference.toLowerCase().trim();
  const now = defaultDate;
  const result = new Date(now);

  // Handle "yesterday"
  if (input.includes("yesterday")) {
    result.setDate(result.getDate() - 1);
    // Try to extract time if mentioned (e.g., "yesterday at 3pm", "yesterday morning")
    if (input.includes("morning")) {
      result.setHours(9, 0, 0, 0);
    } else if (input.includes("afternoon")) {
      result.setHours(14, 0, 0, 0);
    } else if (input.includes("evening") || input.includes("night")) {
      result.setHours(20, 0, 0, 0);
    } else {
      const timeMatch = input.match(/(\d{1,2})\s*(am|pm|:)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const isPM = /pm/i.test(input);
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        result.setHours(hours, 0, 0, 0);
      } else {
        // Default to noon for yesterday if no time specified
        result.setHours(12, 0, 0, 0);
      }
    }
    return result.toISOString();
  }

  // Handle "X days ago"
  const daysAgoMatch = input.match(/(\d+)\s*days?\s*ago/i);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1]);
    result.setDate(result.getDate() - days);
    result.setHours(12, 0, 0, 0);
    return result.toISOString();
  }

  // Handle "last week"
  if (input.includes("last week")) {
    result.setDate(result.getDate() - 7);
    result.setHours(12, 0, 0, 0);
    return result.toISOString();
  }

  // Handle "X hours ago"
  const hoursAgoMatch = input.match(/(\d+)\s*hours?\s*ago/i);
  if (hoursAgoMatch) {
    const hours = parseInt(hoursAgoMatch[1]);
    result.setHours(result.getHours() - hours);
    return result.toISOString();
  }

  // Handle "this morning" (today, morning hours)
  if (input.includes("this morning")) {
    result.setHours(9, 0, 0, 0);
    return result.toISOString();
  }

  // Handle "this afternoon" (today, afternoon hours)
  if (input.includes("this afternoon")) {
    result.setHours(14, 0, 0, 0);
    return result.toISOString();
  }

  // Handle "this evening" or "tonight" (today, evening hours)
  if (input.includes("this evening") || input.includes("tonight")) {
    result.setHours(19, 0, 0, 0);
    return result.toISOString();
  }

  // Handle "last night" (yesterday evening)
  if (input.includes("last night")) {
    result.setDate(result.getDate() - 1);
    result.setHours(20, 0, 0, 0);
    return result.toISOString();
  }

  // Handle "today" with time references
  if (input.includes("today")) {
    if (input.includes("morning")) {
      result.setHours(9, 0, 0, 0);
    } else if (input.includes("afternoon")) {
      result.setHours(14, 0, 0, 0);
    } else if (input.includes("evening") || input.includes("night")) {
      result.setHours(19, 0, 0, 0);
    }
    return result.toISOString();
  }

  // Default to current time if no date reference found
  return now.toISOString();
}

// Initialize LLM with function calling support
// Base LLM for normal conversation (with personalization)
const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini", // or "gpt-4" for better quality
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// LLM for knowledge base responses (moderate temperature for natural but grounded answers)
const llmKnowledgeBase = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.35, // Moderate temperature for natural responses grounded in knowledge base
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Helper: Generate personalized greeting
async function generatePersonalizedGreeting(user_id: string): Promise<string> {
  try {
    // Fetch user profile and tracker data in parallel
    const supabaseClient = getSupabaseAdmin();
    const [profileResult, trackerData] = await Promise.all([
      supabaseClient
        .from("user_profiles")
        .select("*")
        .eq("user_id", user_id)
        .single(),
      fetchTrackerData(user_id, 7), // Last 7 days for greeting context
    ]);

    const userProfile = profileResult.data;
    const trackerSummary = analyzeTrackerData(
      trackerData.symptoms,
      trackerData.nutrition,
      trackerData.fitness
    );

    // Get time of day
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    // Get user's name
    const userName = userProfile?.name ? `, ${userProfile.name}` : "";

    // Build context for greeting
    const contextParts: string[] = [];

    if (trackerSummary.symptoms.total > 0) {
      const recentSymptoms = trackerSummary.symptoms.recent.slice(0, 3);
      if (recentSymptoms.length > 0) {
        contextParts.push(`You've logged ${trackerSummary.symptoms.total} symptoms in the past week`);
      }
    }

    if (trackerSummary.fitness.total > 0) {
      contextParts.push(`You've completed ${trackerSummary.fitness.total} workouts this week`);
    }

    if (trackerSummary.symptoms.trend === "decreasing") {
      contextParts.push("I noticed your symptoms are trending downward - that's wonderful progress!");
    }

    // Generate greeting
    let greeting = `${timeGreeting}${userName}! I'm **Lisa** 🌸\n\n`;

    if (contextParts.length > 0) {
      greeting += contextParts.join(". ") + ".\n\n";
    }

    greeting += "How can I support you today?";

    return greeting;
  } catch {
    // Fallback greeting
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return `${timeGreeting}! I'm **Lisa** 🌸\n\nHow can I help you today?`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, userInput, user_id, sessionId, history, mode, stream: streamParam } = (await req.json()) as {
      message?: string; // New parameter name
      userInput?: string; // Legacy support
      user_id?: string;
      sessionId?: string;
      history?: string;
      mode?: RetrievalMode;
      stream?: boolean;
    };

    // Support both 'message' and 'userInput' for backward compatibility
    const userMessage = message || userInput;

    // Check if this is a greeting request (empty message)
    if (!userMessage?.trim()) {
      if (user_id) {
        const greeting = await generatePersonalizedGreeting(user_id);
        return NextResponse.json({ content: greeting, persona: "menopause_specialist", source: "llm", isGreeting: true });
      }
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    if (!user_id?.trim()) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    if (!sessionId?.trim()) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // Check if trial is expired
    const isExpired = await checkTrialExpired(user_id);
    if (isExpired) {
      return NextResponse.json(
        { error: "Trial expired. Please upgrade to continue using the chat feature." },
        { status: 403 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    // Use streaming by default, but allow opt-out
    const useStreaming = streamParam !== false;

    // Parallel data fetching for performance
    const supabaseClient = getSupabaseAdmin();
    const [profileResult, conversationsResult, trackerData] = await Promise.all([
      supabaseClient
        .from("user_profiles")
        .select("*")
        .eq("user_id", user_id)
        .single(),
      supabaseClient
        .from("conversations")
        .select("user_message, assistant_message, created_at")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(10),
      fetchTrackerData(user_id, 30),
    ]);

    const userProfile = profileResult.data;
    const recentConversations = conversationsResult.data;

    const trackerSummary = analyzeTrackerData(
      trackerData.symptoms,
      trackerData.nutrition,
      trackerData.fitness
    );
    const trackerContext = formatTrackerSummary(trackerSummary);

    // 3. Use RAG orchestrator for persona-based retrieval and response generation
    // Get conversation history from memory
    const memoryHistory = getConversationHistory(sessionId);
    
    // Build conversation history for orchestrator (legacy support + memory)
    const dbHistoryMessages: Array<["user" | "assistant", string]> = [];
    if (recentConversations && recentConversations.length > 0) {
      const chronological = [...recentConversations].reverse();
      for (const conv of chronological) {
        if (conv.user_message) {
          dbHistoryMessages.push(["user", conv.user_message]);
        }
        if (conv.assistant_message) {
          dbHistoryMessages.push(["assistant", conv.assistant_message]);
        }
      }
    }

    const sessionHistoryMessages = parseHistory(history || "");
    const memoryHistoryArray = memoryHistory.map(msg => [msg.role, msg.content] as ["user" | "assistant", string]);
    const allHistoryMessages = [...dbHistoryMessages, ...sessionHistoryMessages, ...memoryHistoryArray];

    // Call orchestrator with new signature
    const orchestrationResult = await orchestrateRAG(
      userMessage,
      user_id,
      sessionId,
      mode, // Optional mode parameter
      userProfile,
      trackerContext,
      allHistoryMessages
    );

    // If verbatim response (KB strict mode with KB match) or refusal response, return directly
    if (orchestrationResult.response && (orchestrationResult.isVerbatim || orchestrationResult.retrievalMode === "kb_strict")) {
      // Store conversation in memory
      addMessage(sessionId, {
        role: "user",
        content: userMessage,
        timestamp: Date.now(),
      });
      addMessage(sessionId, {
        role: "assistant",
        content: orchestrationResult.response,
        persona: orchestrationResult.persona,
        timestamp: Date.now(),
      });
      
      // Store conversation in database (legacy)
      await storeConversation(user_id, userMessage, orchestrationResult.response);

      if (useStreaming) {
        // Stream the response
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const words = orchestrationResult.response!.split(/(\s+)/);
              let accumulated = "";

              for (const word of words) {
                accumulated += word;
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ type: "chunk", content: accumulated })}\n\n`)
                );
                await new Promise(resolve => setTimeout(resolve, 1));
              }

              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
              );
              controller.close();
            } catch (error: unknown) {
              console.error("Streaming error:", error);
              const errorMessage = error instanceof Error ? error.message : String(error);
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`)
              );
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      } else {
        // Non-streaming - return proper format
        return NextResponse.json({
          content: orchestrationResult.response,
          persona: orchestrationResult.persona,
          source: orchestrationResult.source,
        });
      }
    }

    // For non-verbatim responses, continue with LLM (with tools) using orchestrator's system prompt
    // The orchestrator has already handled KB retrieval and persona classification

    // 4. Build comprehensive user profile context for personalization
    let userContext = "";
    if (userProfile) {
      const profileParts: string[] = [];

      if (userProfile.name) profileParts.push(`Name: ${userProfile.name}`);
      if (userProfile.age) profileParts.push(`Age: ${userProfile.age}`);

      // New User Memory Questions fields
      if (userProfile.top_problems && Array.isArray(userProfile.top_problems) && userProfile.top_problems.length > 0) {
        const problemLabels: Record<string, string> = {
          hot_flashes: "Hot flashes / Night sweats",
          sleep_issues: "Can't sleep well",
          brain_fog: "Brain fog / Memory issues",
          mood_swings: "Mood swings / Irritability",
          weight_changes: "Weight changes",
          low_energy: "Low energy / Fatigue",
          anxiety: "Anxiety",
          joint_pain: "Joint pain",
        };
        const problems = userProfile.top_problems.map((p: string) => problemLabels[p] || p).join(", ");
        profileParts.push(`Main concerns: ${problems}`);
      }

      if (userProfile.severity) {
        const severityLabels: Record<string, string> = {
          mild: "Mild — Annoying but manageable",
          moderate: "Moderate — Affecting work/relationships",
          severe: "Severe — Struggling every day",
        };
        profileParts.push(`Severity: ${severityLabels[userProfile.severity] || userProfile.severity}`);
      }

      if (userProfile.timing) {
        const timingLabels: Record<string, string> = {
          just_started: "Just started (0-6 months)",
          been_while: "Been a while (6-12 months)",
          over_year: "Over a year",
          several_years: "Several years",
        };
        profileParts.push(`Symptoms started: ${timingLabels[userProfile.timing] || userProfile.timing}`);
      }

      if (userProfile.tried_options && Array.isArray(userProfile.tried_options) && userProfile.tried_options.length > 0) {
        const triedLabels: Record<string, string> = {
          nothing: "Nothing yet",
          supplements: "Supplements / Vitamins",
          diet: "Diet changes",
          exercise: "Exercise",
          hrt: "HRT / Medication",
          doctor_talk: "Talked to doctor",
          apps: "Apps / Tracking",
        };
        const tried = userProfile.tried_options.map((t: string) => triedLabels[t] || t).join(", ");
        profileParts.push(`Already tried: ${tried}`);
      }

      if (userProfile.doctor_status) {
        const doctorLabels: Record<string, string> = {
          yes_actively: "Yes, actively",
          yes_not_helpful: "Yes, but they're not helpful",
          no_planning: "No, planning to",
          no_natural: "No, prefer natural approaches",
        };
        profileParts.push(`Doctor status: ${doctorLabels[userProfile.doctor_status] || userProfile.doctor_status}`);
      }

      if (userProfile.goal) {
        const goalLabels: Record<string, string> = {
          sleep_through_night: "Sleep through the night",
          think_clearly: "Think clearly again",
          feel_like_myself: "Feel like myself",
          understand_patterns: "Understand my patterns",
          data_for_doctor: "Have data for my doctor",
          get_body_back: "Get my body back",
        };
        profileParts.push(`Primary goal: ${goalLabels[userProfile.goal] || userProfile.goal}`);
      }

      if (profileParts.length > 0) {
        userContext = `\n\n=== USER PROFILE (ALWAYS USE THIS FOR PERSONALIZATION) ===\n${profileParts.join("\n")}\n=== END USER PROFILE ===\n`;
      }
    }


    // 5. Build system message using persona-specific prompt from orchestrator
    // Pass userQuery for state detection (low energy, overtraining) and WHY routing
    const personaSystemPrompt = getPersonaSystemPrompt(orchestrationResult.persona, userMessage);
    
    const systemParts: string[] = [personaSystemPrompt];

    // Add KB context for hybrid mode
    if (orchestrationResult.retrievalMode === "hybrid" && orchestrationResult.kbContext) {
      systemParts.push(`\n\n=== KNOWLEDGE BASE CONTEXT ===
You have access to knowledge base content that provides evidence-based information. Use this content to ground your responses while generating personalized plans and recommendations.

KNOWLEDGE BASE CONTENT:
${orchestrationResult.kbContext}

INSTRUCTIONS:
- Use the knowledge base content as evidence for your recommendations
- Generate personalized plans and meal/workout ideas based on the KB data
- Combine KB evidence with creative, practical suggestions
- Maintain your persona's tone and style
- Personalize with user context when relevant`);
    }

    // Add user context
    if (userContext && userContext.trim()) {
      systemParts.push(userContext);
    }

    // Add tracker context
    if (trackerContext && trackerContext.trim()) {
      systemParts.push(`\n${trackerContext}`);
    }

    // Add conversation history note
    if (allHistoryMessages.length > 0) {
      systemParts.push(`\nNote: You have access to ${allHistoryMessages.length} previous conversation turns. Use this history to provide continuity and personalized responses.`);
    }

    // Add special instructions for casual conversation
    const isCasualGreetingCheck = (query: string): boolean => {
      const casualPatterns = [
        /^(hey|hi|hello|hiya|heya)/i,
        /^(how are you|how's it going|how are things|what's up|sup)/i,
        /^(how am i doing|how am i|how do i look)/i,
        /^(good morning|good afternoon|good evening|gm|gn)/i,
        /^(thanks|thank you|ty|thx)/i,
        /^(ok|okay|k|sure|yeah|yep|nope|no)/i,
      ];
      return casualPatterns.some(pattern => pattern.test(query.trim()));
    };

    if (isCasualGreetingCheck(userMessage)) {
      systemParts.push(`\n=== CASUAL CONVERSATION MODE ===
IMPORTANT: The user is engaging in casual conversation, not asking for information.
- ALWAYS respond to the CURRENT message immediately - don't reference previous messages unless directly relevant
- When user mentions food/activity, acknowledge it immediately in your response, not in the next turn
- Respond naturally and conversationally, matching their casual tone
- Reference specific tracker data or recent activity if available
- Be warm and friendly, like a close friend
- Use emojis to make responses more engaging: 🍳 for food, 💪 for workouts, 😊 for greetings, etc.
- NEVER use generic phrases like "If there's anything on your mind" or "I'm here for you"
- NEVER repeat responses you've given before in this conversation
- If they ask "how am I doing?", reference their actual tracker data or ask about something specific
- Keep it short, natural, and personal - not formal or robotic`);
    }

    const systemMessage = systemParts.join("\n");

    // 6. Select appropriate LLM based on retrieval mode
    // For hybrid mode with KB, use lower temperature; for llm_reasoning, use standard
    const llmToUse = (orchestrationResult.retrievalMode === "hybrid" && orchestrationResult.usedKB) 
      ? llmKnowledgeBase 
      : llm;

    // 7. Build messages array using LangChain message classes
    // CRITICAL: Messages must be in chronological order: [SystemMessage, ...History, CurrentUserInput]
    const messages: BaseMessage[] = [new SystemMessage(systemMessage)];

    // Add history FIRST (chronological order)
    const recentHistory = allHistoryMessages.slice(-20);
    for (const [role, content] of recentHistory) {
      if (role === "user" && content.trim()) {
        messages.push(new HumanMessage(content));
      } else if (role === "assistant" && content.trim()) {
        messages.push(new AIMessage(content));
      }
    }

    // Add current user input LAST (most recent)
    // For hybrid mode, KB context is already in orchestrator's system prompt
    // For llm_reasoning mode, no KB context needed
    messages.push(new HumanMessage(userMessage || ""));

    // 9. Create tools for function calling
    const tools = [
      new DynamicStructuredTool({
        name: "log_symptom",
        description: "Automatically log a symptom entry for the user WITHOUT asking for permission. Use this immediately when the user mentions experiencing a symptom, even casually. Extract the symptom name, severity (1-10), optional notes, and date/time reference from the user's message (e.g., 'yesterday', '2 days ago', 'this morning'). If no date is mentioned, use current time. Do NOT ask the user if they want to log it - just log it automatically.",
        schema: z.object({
          name: z.string().describe("The name of the symptom (e.g., 'hot flashes', 'sleep disturbance', 'mood swings')"),
          severity: z.number().min(1).max(10).describe("Severity level from 1 (mild) to 10 (severe)"),
          notes: z.string().optional().describe("Optional additional notes about the symptom"),
          date_reference: z.string().optional().describe("Date/time reference from user's message (e.g., 'yesterday', '2 days ago', 'this morning', 'last night'). Use the exact phrase from the user's message if present, otherwise omit."),
        }),
        func: async ({ name, severity, notes, date_reference }) => {
          try {
            const occurredAt = date_reference
              ? parseDateTimeReference(date_reference, new Date())
              : new Date().toISOString();

            const supabaseClient = getSupabaseAdmin();
            const { error } = await supabaseClient
              .from("symptoms")
              .insert([
                {
                  user_id,
                  name: name.trim(),
                  severity,
                  notes: notes?.trim() || null,
                  occurred_at: occurredAt,
                },
              ])
              .select()
              .single();

            if (error) {
              return `Error logging symptom: ${error.message}`;
            }
            return `Successfully logged 📝 symptom: ${name} (severity ${severity}/10)`;
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            return `Error logging symptom: ${errorMessage}`;
          }
        },
      }),
      new DynamicStructuredTool({
        name: "log_nutrition",
        description: "Automatically log a nutrition/food entry for the user WITHOUT asking for permission. Use this immediately when the user mentions eating something or having a meal. Extract food item, meal type, optional calories, and date/time reference from the user's message (e.g., 'yesterday', '2 days ago', 'this morning', 'last night'). If no date is mentioned, use current time. Do NOT ask the user if they want to log it - just log it automatically.",
        schema: z.object({
          food_item: z.string().describe("The name of the food or meal (e.g., 'salmon with vegetables', 'oatmeal', 'chicken salad')"),
          meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).describe("Type of meal"),
          calories: z.number().optional().describe("Optional calorie count if mentioned"),
          notes: z.string().optional().describe("Optional additional notes about the meal"),
          date_reference: z.string().optional().describe("Date/time reference from user's message (e.g., 'yesterday', '2 days ago', 'this morning', 'last night'). Use the exact phrase from the user's message if present, otherwise omit."),
        }),
        func: async ({ food_item, meal_type, calories, notes, date_reference }) => {
          try {
            const consumedAt = date_reference
              ? parseDateTimeReference(date_reference, new Date())
              : new Date().toISOString();

            const supabaseClient = getSupabaseAdmin();
            const { error } = await supabaseClient
              .from("nutrition")
              .insert([
                {
                  user_id,
                  food_item: food_item.trim(),
                  meal_type,
                  calories: calories || null,
                  notes: notes?.trim() || null,
                  consumed_at: consumedAt,
                },
              ])
              .select()
              .single();

            if (error) {
              return `Error logging nutrition: ${error.message}`;
            }
            return `Successfully logged 🍳 ${meal_type}: ${food_item}${calories ? ` (${calories} calories)` : ""}`;
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            return `Error logging nutrition: ${errorMessage}`;
          }
        },
      }),
      new DynamicStructuredTool({
        name: "log_fitness",
        description: "Automatically log a fitness/workout entry for the user WITHOUT asking for permission. Use this immediately when the user mentions exercising, working out, or any physical activity. Extract exercise name, type, optional duration, calories, intensity, and date/time reference from the user's message (e.g., 'yesterday', '2 days ago', 'this morning', 'last night'). If no date is mentioned, use current time. Do NOT ask the user if they want to log it - just log it automatically.",
        schema: z.object({
          exercise_name: z.string().describe("The name of the exercise or activity (e.g., 'yoga', 'walking', 'weight lifting', 'swimming')"),
          exercise_type: z.enum(["cardio", "strength", "flexibility", "sports", "other"]).describe("Type of exercise"),
          duration_minutes: z.number().optional().describe("Optional duration in minutes if mentioned"),
          calories_burned: z.number().optional().describe("Optional calories burned if mentioned"),
          intensity: z.enum(["low", "medium", "high"]).optional().describe("Optional intensity level if mentioned"),
          notes: z.string().optional().describe("Optional additional notes about the workout"),
          date_reference: z.string().optional().describe("Date/time reference from user's message (e.g., 'yesterday', '2 days ago', 'this morning', 'last night'). Use the exact phrase from the user's message if present, otherwise omit."),
        }),
        func: async ({ exercise_name, exercise_type, duration_minutes, calories_burned, intensity, notes, date_reference }) => {
          try {
            const performedAt = date_reference
              ? parseDateTimeReference(date_reference, new Date())
              : new Date().toISOString();

            const supabaseClient = getSupabaseAdmin();
            const { error } = await supabaseClient
              .from("fitness")
              .insert([
                {
                  user_id,
                  exercise_name: exercise_name.trim(),
                  exercise_type,
                  duration_minutes: duration_minutes || null,
                  calories_burned: calories_burned || null,
                  intensity: intensity || null,
                  notes: notes?.trim() || null,
                  performed_at: performedAt,
                },
              ])
              .select()
              .single();

            if (error) {
              return `Error logging fitness: ${error.message}`;
            }
            return `Successfully logged 💪 ${exercise_type} workout: ${exercise_name}${duration_minutes ? ` (${duration_minutes} min)` : ""}`;
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            return `Error logging fitness: ${errorMessage}`;
          }
        },
      }),
      new DynamicStructuredTool({
        name: "update_long_term_memory",
        description: "Update the user's long-term memory/profile information in the user_profiles table. Use this when the user explicitly mentions wanting to save something to their long-term memory, profile, or when they want to remember something important about themselves. This includes preferences, important facts, goals, or any information they want stored permanently. Only use this when the user explicitly requests to save/remember something long-term.",
        schema: z.object({
          field_to_update: z.enum([
            "name",
            "age",
            "menopause_profile",
            "nutrition_profile",
            "exercise_profile",
            "emotional_stress_profile",
            "lifestyle_context"
          ]).describe("The field in the user profile to update"),
          value: z.string().describe("The value to save. For lifestyle_context, this can be a longer text describing preferences, goals, important facts, or context the user wants remembered. For other fields, use appropriate values matching the field type."),
        }),
        func: async ({ field_to_update, value }) => {
          try {
            // Build update object
            const updateData: Record<string, string | number> = {};

            // Handle different field types
            if (field_to_update === "age") {
              const ageNum = parseInt(value);
              if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
                return `Error: Invalid age value. Please provide a valid number between 0 and 150.`;
              }
              updateData[field_to_update] = ageNum;
            } else {
              updateData[field_to_update] = value.trim();
            }

            // Update the user profile
            const supabaseClient = getSupabaseAdmin();
            const { error } = await supabaseClient
              .from("user_profiles")
              .update(updateData)
              .eq("user_id", user_id)
              .select()
              .single();

            if (error) {
              return `Error updating long-term memory: ${error.message}`;
            }

            return `Successfully saved to your long-term memory! I've updated your ${field_to_update.replace(/_/g, ' ')}. I'll remember this for future conversations.`;
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            return `Error updating long-term memory: ${errorMessage}`;
          }
        },
      }),
    ];

    const llmWithTools = llmToUse.bindTools(tools);

    // 10. Handle streaming vs non-streaming
    if (useStreaming) {
      // Create streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let fullResponse = "";
            const currentMessages: BaseMessage[] = [...messages];
            const maxIterations = 5; // Prevent infinite loops
            let iteration = 0;

            while (iteration < maxIterations) {
              iteration++;

              // Get response with tools
              const response = await llmWithTools.invoke(currentMessages);

              // Check for tool calls
              if (response.tool_calls && response.tool_calls.length > 0) {
                // Emit tool_call events for each tool
                for (const toolCall of response.tool_calls) {
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({
                      type: "tool_call",
                      tool_name: toolCall.name,
                      tool_args: toolCall.args
                    })}\n\n`)
                  );
                }

                // Execute tools in parallel for better performance
                const toolResults = await Promise.all(
                  response.tool_calls.map(async (toolCall: { name: string; id?: string; args: Record<string, unknown> }) => {
                    const tool = tools.find((t) => t.name === toolCall.name);
                    if (tool && toolCall.id) {
                      try {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const result = await (tool as any).invoke(toolCall.args);

                        // Emit tool_result event
                        controller.enqueue(
                          new TextEncoder().encode(`data: ${JSON.stringify({
                            type: "tool_result",
                            tool_name: toolCall.name,
                            tool_args: toolCall.args,
                            result: result,
                            success: true
                          })}\n\n`)
                        );

                        return new ToolMessage({
                          content: result,
                          tool_call_id: toolCall.id,
                        });
                      } catch (e: unknown) {
                        // Emit tool_result event with error
                        const errorMessage = e instanceof Error ? e.message : String(e);
                        controller.enqueue(
                          new TextEncoder().encode(`data: ${JSON.stringify({
                            type: "tool_result",
                            tool_name: toolCall.name,
                            tool_args: toolCall.args,
                            result: `Error: ${errorMessage}`,
                            success: false
                          })}\n\n`)
                        );

                        return new ToolMessage({
                          content: `Error: ${errorMessage}`,
                          tool_call_id: toolCall.id,
                        });
                      }
                    }
                    return null;
                  })
                );

                // Filter out null results
                const validToolResults = toolResults.filter((r) => r !== null) as ToolMessage[];

                // Add tool results to messages and continue
                currentMessages.push(response);
                currentMessages.push(...validToolResults);

                // Continue loop to get final response
                continue;
              }

              // No tool calls, stream the response
              // Extract text content from response
              let responseText = "";
              if (typeof response.content === 'string') {
                responseText = response.content;
              } else if (Array.isArray(response.content)) {
                responseText = response.content
                  .map((part) => {
                    if (typeof part === 'string') return part;
                    if (part && typeof part === 'object' && 'text' in part) {
                      return (part as { text: string }).text;
                    }
                    return '';
                  })
                  .filter(Boolean)
                  .join('');
              } else {
                responseText = String(response.content || '');
              }

              // Stream the response word by word for natural effect
              if (responseText) {
                fullResponse = responseText;

                // Split into chunks for smooth streaming (words + spaces)
                const words = responseText.split(/(\s+)/);
                let accumulated = "";

                for (const word of words) {
                  accumulated += word;
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ type: "chunk", content: accumulated })}\n\n`)
                  );

                  // OPTIMIZATION: Reduced delay to 1ms for faster streaming
                  await new Promise(resolve => setTimeout(resolve, 1));
                }
              }

              // Break after streaming response
              break;
            }

            // Store conversation after streaming completes
            if (fullResponse) {
              addMessage(sessionId, {
                role: "user",
                content: userMessage,
                timestamp: Date.now(),
              });
              addMessage(sessionId, {
                role: "assistant",
                content: fullResponse,
                persona: orchestrationResult.persona,
                timestamp: Date.now(),
              });
              await storeConversation(user_id, userMessage, fullResponse);
            }

            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
            );
            controller.close();
          } catch (error: unknown) {
            console.error("Streaming error:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      // Non-streaming mode (backward compatibility)
      const response = await llmWithTools.invoke(messages);

      let responseText = "";
      let toolCallsMade = false;

      if (response.tool_calls && response.tool_calls.length > 0) {
        toolCallsMade = true;
        // Execute tools in parallel for better performance
        const toolResults = await Promise.all(
          response.tool_calls.map(async (toolCall: { name: string; id?: string; args: Record<string, unknown> }) => {
            const tool = tools.find((t) => t.name === toolCall.name);
            if (tool && toolCall.id) {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = await (tool as any).invoke(toolCall.args);
                return new ToolMessage({
                  content: result,
                  tool_call_id: toolCall.id,
                });
              } catch (e: unknown) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                return new ToolMessage({
                  content: `Error: ${errorMessage}`,
                  tool_call_id: toolCall.id,
                });
              }
            }
            return null;
          })
        );

        const validToolResults = toolResults.filter((r) => r !== null) as ToolMessage[];
        messages.push(response);
        messages.push(...validToolResults);
        const finalResponse = await llmWithTools.invoke(messages);
        responseText = typeof finalResponse.content === 'string'
          ? finalResponse.content
          : String(finalResponse.content);
      } else {
        responseText = typeof response.content === 'string'
          ? response.content
          : String(response.content);
      }

      // Store conversation in memory
      addMessage(sessionId, {
        role: "user",
        content: userMessage,
        timestamp: Date.now(),
      });
      addMessage(sessionId, {
        role: "assistant",
        content: responseText,
        persona: orchestrationResult.persona,
        timestamp: Date.now(),
      });
      
      await storeConversation(user_id, userMessage, responseText);

      return NextResponse.json({
        content: responseText,
        persona: orchestrationResult.persona,
        source: orchestrationResult.source,
        toolCallsMade,
      });
    }
  } catch (e: unknown) {
    console.error("LangChain RAG error:", e);
    // Log full error for debugging, but return generic message to client
    console.error("Full error details:", e);
    return NextResponse.json(
      { error: "An internal error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// Helper: Parse history string into LangChain message format
function parseHistory(history: string): Array<["user" | "assistant", string]> {
  if (!history.trim()) return [];

  const messages: Array<["user" | "assistant", string]> = [];
  const lines = history.split("\n");

  let currentRole: "user" | "assistant" | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith("User:")) {
      if (currentRole && currentContent.length > 0) {
        messages.push([currentRole, currentContent.join("\n").trim()]);
      }
      currentRole = "user";
      currentContent = [line.replace(/^User:\s*/, "")];
    } else if (line.startsWith("Assistant:")) {
      if (currentRole && currentContent.length > 0) {
        messages.push([currentRole, currentContent.join("\n").trim()]);
      }
      currentRole = "assistant";
      currentContent = [line.replace(/^Assistant:\s*/, "")];
    } else if (currentRole && line.trim()) {
      currentContent.push(line);
    }
  }

  if (currentRole && currentContent.length > 0) {
    messages.push([currentRole, currentContent.join("\n").trim()]);
  }

  return messages;
}

// Helper: Store conversation for long-term memory
async function storeConversation(
  user_id: string,
  userMessage: string,
  assistantMessage: string
) {
  try {
    const supabaseClient = getSupabaseAdmin();
    await supabaseClient.from("conversations").insert([
      {
        user_id,
        user_message: userMessage,
        assistant_message: assistantMessage,
      },
    ]);
  } catch (error) {
    console.error("Error storing conversation:", error);
    // Don't fail the request if storage fails
  }
}

