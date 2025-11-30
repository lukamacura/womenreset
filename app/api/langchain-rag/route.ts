/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { createClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { formatDocumentsAsString } from "langchain/util/document";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

export const runtime = "nodejs";

// Initialize Supabase client (server-side with service role)
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small", // or "text-embedding-ada-002"
});

// Initialize LLM
const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini", // or "gpt-4" for better quality
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Base system prompt for menopause support
const BASE_SYSTEM_PROMPT = `You are Lisa, a compassionate and knowledgeable menopause support assistant. 
You help women navigate through peri-menopause, menopause, and post-menopause with evidence-based guidance.

IMPORTANT: Always personalize your responses based on the user's profile and previous conversations. 
Use their specific information (age, menopause stage, symptoms, lifestyle, preferences) to provide tailored advice.

Guidelines:
- Be empathetic, warm, and supportive
- ALWAYS reference the user's specific profile information when relevant
- Provide evidence-based information from the knowledge base
- Reference previous conversations when relevant to show continuity
- If you don't know something, say so rather than guessing
- Focus on practical, actionable advice tailored to their situation
- Consider the user's menopause stage, symptoms, and lifestyle context in every response`;

export async function POST(req: NextRequest) {
  try {
    const { userInput, user_id, history } = (await req.json()) as {
      userInput?: string;
      user_id?: string;
      history?: string;
    };

    if (!userInput?.trim()) {
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

    // 1. Fetch user profile for personalization (from user_profiles table)
    const { data: userProfile } = await supabaseClient
      .from("user_profiles")
      .select("*")
      .eq("user_id", user_id)
      .single();

    // 2. Fetch recent conversation history from database (long-term memory)
    const { data: recentConversations } = await supabaseClient
      .from("conversations")
      .select("user_message, assistant_message, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(10); // Get last 10 conversations for context

    // 3. Initialize vector store
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabaseClient,
      tableName: "documents",
      queryName: "match_documents",
    });

    // 4. Retrieve relevant documents from knowledge base
    const retriever = vectorStore.asRetriever({
      k: 5, // Number of documents to retrieve
      searchType: "similarity",
    });

    const relevantDocs = await retriever.getRelevantDocuments(userInput);

    // 5. Build context string from retrieved documents
    const context = relevantDocs.length > 0 
      ? formatDocumentsAsString(relevantDocs) 
      : "";

    // 6. Build comprehensive user profile context for personalization
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

    // 7. Build conversation history from database (long-term memory)
    const dbHistoryMessages: Array<["user" | "assistant", string]> = [];
    if (recentConversations && recentConversations.length > 0) {
      // Reverse to get chronological order (oldest first)
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

    // 8. Parse conversation history from request (current session)
    const sessionHistoryMessages = parseHistory(history || "");

    // 9. Combine database history with session history
    // Use database history first (long-term), then session history (current chat)
    const allHistoryMessages = [...dbHistoryMessages, ...sessionHistoryMessages];

    // 10. Build comprehensive system message with all context
    const systemParts: string[] = [BASE_SYSTEM_PROMPT];
    
    // Add user profile context prominently (for personalization)
    if (userContext && userContext.trim()) {
      systemParts.push(userContext);
    }

    // Add context from retrieved documents (knowledge base)
    if (context && context.trim()) {
      systemParts.push(`\n\n=== KNOWLEDGE BASE CONTEXT ===\n${context.trim()}\n=== END KNOWLEDGE BASE ===\n`);
    }

    // Add note about conversation history
    if (allHistoryMessages.length > 0) {
      systemParts.push(`\nNote: You have access to ${allHistoryMessages.length} previous conversation turns. Use this history to provide continuity and personalized responses.`);
    }

    // Join all system parts
    const systemMessage = systemParts.join("\n");

    // 11. Build messages array using LangChain message classes
    const messages: any[] = [
      new SystemMessage(systemMessage),
    ];

    // Add conversation history (from database + current session)
    // Limit to last 20 messages to avoid token limits
    const recentHistory = allHistoryMessages.slice(-20);
    for (const [role, content] of recentHistory) {
      if (role === "user" && content.trim()) {
        messages.push(new HumanMessage(content));
      } else if (role === "assistant" && content.trim()) {
        messages.push(new AIMessage(content));
      }
    }

    // Add current user input
    messages.push(new HumanMessage(userInput));

    // 12. Invoke LLM directly with messages (no template needed)
    const response = await llm.invoke(messages);
    
    // Extract text from response
    const responseText = typeof response.content === 'string' 
      ? response.content 
      : String(response.content);

    // 13. Store conversation in Supabase for long-term memory (conversations table)
    await storeConversation(user_id, userInput, responseText);

    return NextResponse.json({ reply: responseText });
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

