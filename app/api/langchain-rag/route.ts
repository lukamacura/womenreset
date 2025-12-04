/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { formatDocumentsAsString } from "langchain/util/document";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { fetchTrackerData, analyzeTrackerData, formatTrackerSummary } from "@/lib/trackerAnalysis";

export const runtime = "nodejs";

// Import lazy Supabase admin client
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small", // or "text-embedding-ada-002"
});

// Initialize LLM with function calling support
const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini", // or "gpt-4" for better quality
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Base system prompt for menopause support
const BASE_SYSTEM_PROMPT = `You are Lisa, a compassionate menopause support expert who feels like a trusted friend. You've been helping women navigate menopause for years, and you understand that this journey is deeply personal and often emotional.

YOUR PERSONALITY:
- Warm, empathetic, and genuinely caring
- Knowledgeable but never condescending
- Encouraging and supportive
- Realistic and honest about challenges
- Celebratory of wins, big and small

CONVERSATION STYLE:
- Use the user's name (from profile) naturally in conversation when available
- Match their emotional tone - if they're frustrated, validate first before advising
- Ask thoughtful follow-up questions that show you're listening: "How did that work for you?" or "Tell me more about that..."
- Reference previous conversations: "I remember you mentioned..." or "Last week you said..."
- Connect current conversation to past discussions
- Use natural transitions, not robotic responses
- After answering: "Does this resonate with your experience?"
- When suggesting: "Would you like me to help you create a plan for this?"

PROACTIVE ENGAGEMENT:
- If tracker data shows patterns, share insights: "I noticed your symptoms improve on workout days - that's great progress!"
- If user hasn't logged in 3+ days: "I haven't heard from you recently - how are you feeling?"
- If goals mentioned: "How's your progress toward [goal]?"
- Celebrate wins: "Your hot flashes decreased 40% - that's amazing! Your consistency is paying off."
- If patterns detected: "I see your hot flashes spike on weekdays - could work stress be a factor?"

TEMPORAL & CONTEXTUAL AWARENESS:
- Time of day: Morning = energy/planning, Evening = reflection/wind-down
- Day of week: Monday = stress check, Weekend = activity suggestions
- Symptom timing: "You usually log hot flashes in the afternoon - let's track that pattern"
- Life events: "I know you mentioned a big presentation coming up - how's your stress?"
- Seasonal: "Summer heat can worsen hot flashes - here are cooling strategies"

EMOTIONAL INTELLIGENCE:
- Detect emotional cues: frustration, anxiety, celebration, confusion
- Validate first: "I can hear how frustrating this is for you" or "It's completely normal to feel overwhelmed"
- Normalize: "Many women experience this - you're not alone"
- Empower: "You've already made progress by tracking this - that's a big step"
- Support: "Let's work through this together, one step at a time"

FOLLOW-UP STRATEGY:
- After answering: "Does this resonate with your experience?"
- When suggesting: "Would you like me to help you create a plan for this?"
- When logging: "How did you feel after that workout?"
- When patterns emerge: "I'm curious - what do you think might be causing this?"
- When goals mentioned: "What would success look like for you in 2 weeks?"

IMPORTANT: Always personalize your responses based on the user's profile, tracker data, and previous conversations. 
Use their specific information (age, menopause stage, symptoms, lifestyle, preferences, tracked data) to provide tailored advice.

CAPABILITIES:
1. DATA ANALYSIS: You have access to the user's symptom, nutrition, and fitness tracker data. Use this to:
   - Identify patterns and trends (e.g., "Your hot flashes decreased 30% this month")
   - Detect correlations (e.g., "Your symptoms improve on workout days")
   - Provide personalized insights based on their actual data
   - Compare current vs. past performance

2. PROACTIVE COACHING: Based on tracker data, you can:
   - Suggest logging entries when users mention symptoms/meals/workouts
   - Recommend actions based on patterns (e.g., "Since you logged high stress, try these techniques")
   - Track progress toward goals
   - Alert about concerning patterns

3. CONVERSATIONAL LOGGING: When users mention symptoms, meals, or workouts naturally, you can log them using the available tools:
   - log_symptom: Log a symptom with name, severity (1-10), optional notes, and timestamp
   - log_nutrition: Log a food item with meal type, optional calories and notes
   - log_fitness: Log a workout with exercise name, type, optional duration, calories, and intensity

4. LONG-TERM MEMORY: When users explicitly mention wanting to save something to their long-term memory, profile, or want you to remember something important, use the update_long_term_memory tool:
   - update_long_term_memory: Save important information to the user's profile (name, age, menopause_profile, nutrition_profile, exercise_profile, emotional_stress_profile, lifestyle_context)
   - Only use this when the user explicitly requests to save/remember something long-term
   - For lifestyle_context, you can save preferences, goals, important facts, or any context the user wants remembered permanently
   - Examples: "Remember that I prefer morning workouts", "Save that I'm allergic to dairy", "I want you to remember that my goal is to reduce hot flashes by 50%"

5. PERSONALIZED PLANS: Create custom recommendations based on:
   - User's tracker patterns
   - Their profile information
   - Evidence from knowledge base
   - Their stated goals and preferences

Guidelines:
- Be empathetic, warm, and supportive
- ALWAYS reference the user's specific profile and tracker data when relevant
- Proactively suggest logging when users mention trackable information
- Provide evidence-based information from the knowledge base
- Reference previous conversations when relevant to show continuity
- Use tracker data to provide concrete, data-driven insights
- If you don't know something, say so rather than guessing
- Focus on practical, actionable advice tailored to their situation
- Consider the user's menopause stage, symptoms, lifestyle context, AND tracked data in every response`;

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
    const { userInput, user_id, history, stream: streamParam } = (await req.json()) as {
      userInput?: string;
      user_id?: string;
      history?: string;
      stream?: boolean;
    };

    // Check if this is a greeting request (empty userInput)
    if (!userInput?.trim()) {
      if (user_id) {
        const greeting = await generatePersonalizedGreeting(user_id);
        return NextResponse.json({ reply: greeting, isGreeting: true });
      }
      return NextResponse.json({ error: "Missing userInput" }, { status: 400 });
    }

    if (!user_id?.trim()) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
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

    // 3. Initialize vector store and retrieve documents
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabaseClient,
      tableName: "documents",
      queryName: "match_documents",
    });

    const retriever = vectorStore.asRetriever({
      k: 5,
      searchType: "similarity",
    });

    const relevantDocs = await retriever.getRelevantDocuments(userInput);
    const context = relevantDocs.length > 0 
      ? formatDocumentsAsString(relevantDocs) 
      : "";

    // 4. Build comprehensive user profile context for personalization
    let userContext = "";
    if (userProfile) {
      const profileParts: string[] = [];
      
      if (userProfile.name) profileParts.push(`Name: ${userProfile.name}`);
      if (userProfile.age) profileParts.push(`Age: ${userProfile.age}`);
      
      if (userProfile.menopause_profile) {
        profileParts.push(`Menopause Stage/Profile: ${userProfile.menopause_profile}`);
      }
      if (userProfile.nutrition_profile) {
        profileParts.push(`Nutrition Preferences/Profile: ${userProfile.nutrition_profile}`);
      }
      if (userProfile.exercise_profile) {
        profileParts.push(`Exercise Habits/Profile: ${userProfile.exercise_profile}`);
      }
      if (userProfile.emotional_stress_profile) {
        profileParts.push(`Emotional/Stress Profile: ${userProfile.emotional_stress_profile}`);
      }
      if (userProfile.lifestyle_context) {
        profileParts.push(`Lifestyle Context: ${userProfile.lifestyle_context}`);
      }

      if (profileParts.length > 0) {
        userContext = `\n\n=== USER PROFILE (ALWAYS USE THIS FOR PERSONALIZATION) ===\n${profileParts.join("\n")}\n=== END USER PROFILE ===\n`;
      }
    }

    // 5. Build conversation history from database (long-term memory)
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

    // 6. Parse conversation history from request (current session)
    const sessionHistoryMessages = parseHistory(history || "");
    const allHistoryMessages = [...dbHistoryMessages, ...sessionHistoryMessages];

    // 7. Build comprehensive system message with all context
    const systemParts: string[] = [BASE_SYSTEM_PROMPT];
    
    if (userContext && userContext.trim()) {
      systemParts.push(userContext);
    }

    if (trackerContext && trackerContext.trim()) {
      systemParts.push(trackerContext);
    }

    if (context && context.trim()) {
      systemParts.push(`\n\n=== KNOWLEDGE BASE CONTEXT ===\n${context.trim()}\n=== END KNOWLEDGE BASE ===\n`);
    }

    if (allHistoryMessages.length > 0) {
      systemParts.push(`\nNote: You have access to ${allHistoryMessages.length} previous conversation turns. Use this history to provide continuity and personalized responses.`);
    }

    const systemMessage = systemParts.join("\n");

    // 8. Build messages array using LangChain message classes
    const messages: any[] = [new SystemMessage(systemMessage)];

    const recentHistory = allHistoryMessages.slice(-20);
    for (const [role, content] of recentHistory) {
      if (role === "user" && content.trim()) {
        messages.push(new HumanMessage(content));
      } else if (role === "assistant" && content.trim()) {
        messages.push(new AIMessage(content));
      }
    }

    messages.push(new HumanMessage(userInput));

    // 9. Create tools for function calling
    const tools = [
      new DynamicStructuredTool({
        name: "log_symptom",
        description: "Log a symptom entry for the user. Use this when the user mentions experiencing a symptom, even casually. Extract the symptom name, severity (1-10), optional notes, and use current timestamp.",
        schema: z.object({
          name: z.string().describe("The name of the symptom (e.g., 'hot flashes', 'sleep disturbance', 'mood swings')"),
          severity: z.number().min(1).max(10).describe("Severity level from 1 (mild) to 10 (severe)"),
          notes: z.string().optional().describe("Optional additional notes about the symptom"),
        }),
        func: async ({ name, severity, notes }) => {
          try {
            const supabaseClient = getSupabaseAdmin();
            const { error } = await supabaseClient
              .from("symptoms")
              .insert([
                {
                  user_id,
                  name: name.trim(),
                  severity,
                  notes: notes?.trim() || null,
                  occurred_at: new Date().toISOString(),
                },
              ])
              .select()
              .single();

            if (error) {
              return `Error logging symptom: ${error.message}`;
            }
            return `Successfully logged symptom: ${name} (severity ${severity}/10)`;
          } catch (e: any) {
            return `Error logging symptom: ${e.message}`;
          }
        },
      }),
      new DynamicStructuredTool({
        name: "log_nutrition",
        description: "Log a nutrition/food entry for the user. Use this when the user mentions eating something or having a meal. Extract food item, meal type, optional calories, and use current timestamp.",
        schema: z.object({
          food_item: z.string().describe("The name of the food or meal (e.g., 'salmon with vegetables', 'oatmeal', 'chicken salad')"),
          meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).describe("Type of meal"),
          calories: z.number().optional().describe("Optional calorie count if mentioned"),
          notes: z.string().optional().describe("Optional additional notes about the meal"),
        }),
        func: async ({ food_item, meal_type, calories, notes }) => {
          try {
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
                  consumed_at: new Date().toISOString(),
                },
              ])
              .select()
              .single();

            if (error) {
              return `Error logging nutrition: ${error.message}`;
            }
            return `Successfully logged ${meal_type}: ${food_item}${calories ? ` (${calories} calories)` : ""}`;
          } catch (e: any) {
            return `Error logging nutrition: ${e.message}`;
          }
        },
      }),
      new DynamicStructuredTool({
        name: "log_fitness",
        description: "Log a fitness/workout entry for the user. Use this when the user mentions exercising, working out, or any physical activity. Extract exercise name, type, optional duration, calories, intensity, and use current timestamp.",
        schema: z.object({
          exercise_name: z.string().describe("The name of the exercise or activity (e.g., 'yoga', 'walking', 'weight lifting', 'swimming')"),
          exercise_type: z.enum(["cardio", "strength", "flexibility", "sports", "other"]).describe("Type of exercise"),
          duration_minutes: z.number().optional().describe("Optional duration in minutes if mentioned"),
          calories_burned: z.number().optional().describe("Optional calories burned if mentioned"),
          intensity: z.enum(["low", "medium", "high"]).optional().describe("Optional intensity level if mentioned"),
          notes: z.string().optional().describe("Optional additional notes about the workout"),
        }),
        func: async ({ exercise_name, exercise_type, duration_minutes, calories_burned, intensity, notes }) => {
          try {
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
                  performed_at: new Date().toISOString(),
                },
              ])
              .select()
              .single();

            if (error) {
              return `Error logging fitness: ${error.message}`;
            }
            return `Successfully logged ${exercise_type} workout: ${exercise_name}${duration_minutes ? ` (${duration_minutes} min)` : ""}`;
          } catch (e: any) {
            return `Error logging fitness: ${e.message}`;
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
            const updateData: any = {};
            
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
          } catch (e: any) {
            return `Error updating long-term memory: ${e.message}`;
          }
        },
      }),
    ];

    const llmWithTools = llm.bindTools(tools);

    // 10. Handle streaming vs non-streaming
    if (useStreaming) {
      // Create streaming response
      const stream = new ReadableStream({
          async start(controller) {
            try {
              let fullResponse = "";
              const currentMessages: any[] = [...messages];
              const maxIterations = 5; // Prevent infinite loops
              let iteration = 0;

              while (iteration < maxIterations) {
                iteration++;
                
                // Get response with tools
                const response = await llmWithTools.invoke(currentMessages);
                
                // Check for tool calls
                if (response.tool_calls && response.tool_calls.length > 0) {
                  // Execute tools
                  const toolResults = [];
                  
                  for (const toolCall of response.tool_calls) {
                    const tool = tools.find((t) => t.name === toolCall.name);
                    if (tool && toolCall.id) {
                      try {
                        const result = await (tool as any).invoke(toolCall.args);
                        toolResults.push(
                          new ToolMessage({
                            content: result,
                            tool_call_id: toolCall.id,
                          })
                        );
                      } catch (e: any) {
                        toolResults.push(
                          new ToolMessage({
                            content: `Error: ${e.message}`,
                            tool_call_id: toolCall.id,
                          })
                        );
                      }
                    }
                  }
                  
                  // Add tool results to messages and continue
                  currentMessages.push(response);
                  currentMessages.push(...toolResults);
                  
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
                    .map((part: any) => {
                      if (typeof part === 'string') return part;
                      if (part && typeof part === 'object' && 'text' in part) {
                        return part.text;
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
                    
                    // Small delay for smooth streaming (reduced for faster response)
                    await new Promise(resolve => setTimeout(resolve, 10));
                  }
                }
                
                // Break after streaming response
                break;
              }
              
              // Store conversation after streaming completes
              if (fullResponse) {
                await storeConversation(user_id, userInput, fullResponse);
              }
              
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
              );
              controller.close();
            } catch (error: any) {
              console.error("Streaming error:", error);
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`)
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
        const toolResults = [];
        
        for (const toolCall of response.tool_calls) {
          const tool = tools.find((t) => t.name === toolCall.name);
          if (tool && toolCall.id) {
            try {
              const result = await (tool as any).invoke(toolCall.args);
              toolResults.push(
                new ToolMessage({
                  content: result,
                  tool_call_id: toolCall.id,
                })
              );
            } catch (e: any) {
              toolResults.push(
                new ToolMessage({
                  content: `Error: ${e.message}`,
                  tool_call_id: toolCall.id,
                })
              );
            }
          }
        }
        
        messages.push(response);
        messages.push(...toolResults);
        const finalResponse = await llmWithTools.invoke(messages);
        responseText = typeof finalResponse.content === 'string' 
          ? finalResponse.content 
          : String(finalResponse.content);
      } else {
        responseText = typeof response.content === 'string' 
          ? response.content 
          : String(response.content);
      }

      await storeConversation(user_id, userInput, responseText);

      return NextResponse.json({ 
        reply: responseText,
        toolCallsMade,
      });
    }
  } catch (e: any) {
    console.error("LangChain RAG error:", e);
    return NextResponse.json(
      { error: `Internal error: ${e?.message ?? "unknown"}` },
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

