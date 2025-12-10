/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { fetchTrackerData, analyzeTrackerData, formatTrackerSummary } from "@/lib/trackerAnalysis";
import { checkTrialExpired } from "@/lib/checkTrialStatus";
import type { Document } from "@langchain/core/documents";

export const runtime = "nodejs";

// Import lazy Supabase admin client
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small", // or "text-embedding-ada-002"
});

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

/**
 * Calculate simple similarity between two strings (0-1)
 * Uses Jaccard similarity on word sets
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Extract keywords from user query for hybrid search
 */
function extractQueryKeywords(query: string): string[] {
  // Simple keyword extraction: remove common stop words and split
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'the', 'this', 'i', 'you',
    'how', 'why', 'what', 'when', 'where', 'can', 'could', 'should',
    'would', 'do', 'does', 'did', 'am', 'my', 'me', 'we', 'our'
  ]);

  // Tokenize and filter
  const words = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Return unique keywords
  return [...new Set(words)];
}

/**
 * Calculate intent pattern match score
 * Handles fuzzy matching and prioritizes PRIMARY INTENTS
 */
function calculateIntentPatternScore(
  docIntentPatterns: string[],
  userQuery: string
): number {
  if (docIntentPatterns.length === 0) return 0;

  const queryLower = userQuery.toLowerCase();
  let maxScore = 0;
  let primaryIntentMatches = 0;

  for (const pattern of docIntentPatterns) {
    const patternLower = pattern.toLowerCase();
    
    // Check for exact or near-exact match
    if (queryLower.includes(patternLower) || patternLower.includes(queryLower)) {
      maxScore = Math.max(maxScore, 1.0);
      if (pattern.includes('PRIMARY') || !pattern.includes('SECONDARY')) {
        primaryIntentMatches++;
      }
      continue;
    }

    // Fuzzy matching: check if key words from pattern appear in query
    const patternWords = patternLower
      .split(/\s+/)
      .filter(w => w.length > 3 && !['why', 'what', 'how', 'when', 'where', 'can', 'does', 'is', 'are'].includes(w));
    
    const matchingWords = patternWords.filter(word => queryLower.includes(word));
    if (matchingWords.length > 0) {
      const wordMatchScore = matchingWords.length / patternWords.length;
      maxScore = Math.max(maxScore, wordMatchScore * 0.7); // Partial match gets lower score
      
      if (pattern.includes('PRIMARY') || !pattern.includes('SECONDARY')) {
        primaryIntentMatches++;
      }
    }
  }

  // Boost score if PRIMARY intents match
  if (primaryIntentMatches > 0) {
    maxScore = Math.min(1.0, maxScore * 1.2);
  }

  return maxScore;
}

/**
 * Calculate keyword match score with exact match weighting
 */
function calculateKeywordMatchScore(
  docKeywords: string[],
  queryKeywords: string[],
  userQuery: string
): number {
  if (queryKeywords.length === 0 || docKeywords.length === 0) return 0;

  const queryLower = userQuery.toLowerCase();
  let exactMatches = 0;
  let partialMatches = 0;

  for (const queryKeyword of queryKeywords) {
    for (const docKeyword of docKeywords) {
      const docKwLower = docKeyword.toLowerCase();
      const queryKwLower = queryKeyword.toLowerCase();

      // Exact match (higher weight)
      if (docKwLower === queryKwLower || 
          queryLower.includes(docKwLower) || 
          docKwLower.includes(queryKwLower)) {
        exactMatches++;
        break;
      }
      
      // Partial match (lower weight)
      if (docKwLower.includes(queryKwLower) || queryKwLower.includes(docKwLower)) {
        partialMatches++;
        break;
      }
    }
  }

  // Weight exact matches more heavily
  const exactScore = (exactMatches / queryKeywords.length) * 0.8;
  const partialScore = (partialMatches / queryKeywords.length) * 0.4;
  
  return Math.min(1.0, exactScore + partialScore);
}

/**
 * Calculate content section relevance score based on query type
 */
function calculateSectionRelevanceScore(
  contentSections: any,
  userQuery: string
): number {
  if (!contentSections) return 0.5; // Default if no section info

  let score = 0.5; // Base score

  // How-to questions: prioritize Action Tips and Habit Strategy
  if (/^(how|what should|what can|tell me how|show me)/i.test(userQuery)) {
    if (contentSections.has_action_tips) score += 0.3;
    if (contentSections.has_habit_strategy) score += 0.2;
  }

  // Why questions: prioritize Content
  if (/^(why|what causes|what's happening|explain)/i.test(userQuery)) {
    if (contentSections.has_content) score += 0.3;
  }

  // Motivation queries: prioritize Motivation Nudge
  if (/(motivation|encouragement|support|feeling|discouraged|overwhelmed)/i.test(userQuery)) {
    if (contentSections.has_motivation) score += 0.3;
  }

  // Follow-up questions: prioritize Follow-Up Questions section
  if (/(next|follow|more|additional|what else)/i.test(userQuery)) {
    if (contentSections.has_followup) score += 0.2;
  }

  return Math.min(1.0, score);
}

/**
 * Enhanced hybrid search with re-ranking: combine semantic similarity with 
 * intent patterns, keyword matching, and content section relevance
 */
function applyHybridSearch(
  documents: Document[],
  userQuery: string
): Array<{ doc: Document; score: number }> {
  const queryKeywords = extractQueryKeywords(userQuery);

  // Score each document
  const scoredDocs = documents.map((doc, index) => {
    // Base semantic similarity score (0.4 weight)
    // Since documents are already sorted by similarity, use reverse index
    const semanticScore = 1 - (index / Math.max(documents.length, 1)) * 0.5; // Normalize to 0.5-1.0 range

    // Get metadata
    const docKeywords = (doc.metadata?.keywords as string[]) || [];
    const docIntentPatterns = (doc.metadata?.intent_patterns as string[]) || [];
    const contentSections = doc.metadata?.content_sections;

    // Intent pattern match score (0.3 weight)
    const intentScore = calculateIntentPatternScore(docIntentPatterns, userQuery);

    // Keyword match score (0.2 weight)
    const keywordScore = queryKeywords.length > 0 
      ? calculateKeywordMatchScore(docKeywords, queryKeywords, userQuery)
      : 0.5; // Default if no keywords

    // Content section relevance score (0.1 weight)
    const sectionScore = calculateSectionRelevanceScore(contentSections, userQuery);

    // Combined weighted score
    const finalScore = 
      (semanticScore * 0.4) + 
      (intentScore * 0.3) + 
      (keywordScore * 0.2) + 
      (sectionScore * 0.1);

    return {
      doc,
      score: finalScore,
    };
  });

  // Sort by score (highest first)
  scoredDocs.sort((a, b) => b.score - a.score);

  return scoredDocs;
}

// Base system prompt for menopause support
const BASE_SYSTEM_PROMPT = `You are Lisa, a compassionate menopause support expert who feels like a trusted friend. You've been helping women navigate menopause for years, and you understand that this journey is deeply personal and often emotional.

YOUR PERSONALITY:
- Warm, empathetic, and genuinely caring
- Knowledgeable but never condescending
- Encouraging and supportive
- Realistic and honest about challenges
- Celebratory of wins, big and small

CONVERSATION STYLE:
- Use the user's name (from profile) naturally in conversation when available, but don't overuse it
- Match their emotional tone - if they're frustrated, validate first before advising
- For casual greetings ("hey", "hi", "how are you"), respond naturally and conversationally - don't be formal or generic
- NEVER repeat the same response twice - always vary your wording and approach
- Reference specific details from tracker data or previous conversations to make responses unique
- Ask thoughtful follow-up questions that show you're listening: "How did that work for you?" or "Tell me more about that..."
- Reference previous conversations: "I remember you mentioned..." or "Last week you said..."
- Connect current conversation to past discussions
- Use natural transitions, not robotic responses
- After answering: "Does this resonate with your experience?"
- When suggesting: "Would you like me to help you create a plan for this?"
- For "how are you doing?" type questions, reference their actual tracker data or recent activity - be specific, not generic

EMOJI USAGE:
- Use emojis naturally and frequently to add warmth and friendliness to your responses
- Include relevant emojis for different contexts:
  * Food: 🍳🥓🍰🥗🍎🥑🍕 (use when discussing meals, nutrition, or food logging)
  * Activities: 🏋️🧘💪🚶‍♀️🧘‍♀️ (use for workouts, exercise, fitness)
  * Emotions: 😊💕🌸😌💖 (use for greetings, positive reinforcement, warmth)
  * Achievements: 🎉✨🌟💫 (use for celebrating wins, progress, accomplishments)
  * Health: 💊🌙😴💤 (use for symptoms, sleep, wellness)
- Don't overuse - 1-3 emojis per response is ideal for natural conversation
- Match emoji to context: food mentions get food emojis, workouts get fitness emojis, greetings get friendly emojis
- Examples of good emoji usage:
  * "Hey! 😊 How's your day going?"
  * "I see you logged bacon and eggs 🍳🥓 - sounds delicious!"
  * "Great job on that workout! 💪 How did you feel after?"
  * "You've been consistent with your tracking - that's amazing! ✨"

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

RESPONSE MODE RULES (CRITICAL - READ CAREFULLY):

MODE 1: KNOWLEDGE BASE QUESTIONS (When knowledge base context is present):
- Answer the user's question naturally and conversationally based on the knowledge base content
- Use the knowledge base content as your ONLY source of information - do NOT add information not in the knowledge base
- Synthesize information from all retrieved documents if multiple are provided, avoiding duplication
- Maintain the structured format (Content, Action Tips, Motivation Nudge, etc.) when appropriate for the query type
- Personalize with user context (name, profile, tracker data) when natural and relevant
- Use markdown formatting for readability (headings, lists, emphasis, blockquotes)
- Include relevant emojis from source content to maintain warmth
- Do NOT copy verbatim - answer the question based on the content, adapting to the user's specific phrasing
- For "how-to" questions: Emphasize Action Tips and Habit Strategy sections
- For "why" questions: Emphasize Content section with explanations
- For motivation queries: Include Motivation Nudge section
- For follow-up questions: Reference Follow-Up Questions section when relevant
- Create coherent answers that directly address the user's question while staying grounded in the knowledge base

MODE 2: NORMAL CONVERSATION (When NO knowledge base context is provided):
- Personalize your responses based on the user's profile, tracker data, and previous conversations
- Use their specific information (age, menopause stage, symptoms, lifestyle, preferences, tracked data) to provide tailored advice
- Be warm, empathetic, and reference their personal context
- For casual greetings or "how are you" questions, respond naturally and reference their actual data:
  * If they have recent tracker entries, mention something specific: "I see you logged [specific thing] - how did that go?"
  * If they haven't logged recently, ask about their day naturally: "How's your day going?"
  * NEVER use generic phrases like "If there's anything on your mind" or "I'm here for you" - be specific and conversational
- Vary your responses - never repeat the same phrasing twice in a conversation
- Match the casual tone of casual greetings - if they say "hey honey", respond warmly and casually, not formally

FORMATTING REQUIREMENTS:
- ALWAYS use markdown formatting for better readability and visual appeal
- Use **bold** for emphasis on important points, key terms, or action items
- Use *italic* for subtle emphasis or when referencing concepts
- Use headings (## H2, ### H3) to organize longer responses into clear sections
- Use horizontal rules (---) to separate major topic changes
- Use blockquotes (> text) for important tips, reminders, or key insights
- Use tables (| Column 1 | Column 2 |) when presenting structured data, comparisons, or lists
- Use line breaks and paragraphs to create visual breathing room
- Structure your responses with clear hierarchy: main points as headings, details as paragraphs
- When listing items, use markdown lists or tables for better organization
- Make your responses visually scannable and easy to read

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

3. AUTOMATIC CONVERSATIONAL LOGGING: When users mention symptoms, meals, or workouts naturally, AUTOMATICALLY log them using the available tools WITHOUT asking for permission. Do NOT ask "Would you like me to log this?" - just log it immediately. IMPORTANT: Always extract date/time references from the user's message (e.g., "yesterday", "2 days ago", "this morning", "last night") and include them in the date_reference field. If the user says "I ate pancakes yesterday", log it with yesterday's date, not today's:
   - log_symptom: Automatically log a symptom with name, severity (1-10), optional notes, and date_reference if mentioned
   - log_nutrition: Automatically log a food item with meal type, optional calories, notes, and date_reference if mentioned
   - log_fitness: Automatically log a workout with exercise name, type, optional duration, calories, intensity, and date_reference if mentioned

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
- Automatically log trackable information when users mention symptoms, meals, or workouts (do NOT ask for permission)
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

    // 3. Check if documents exist before initializing vector store (early exit)
    // OPTIMIZATION: Cache document count check - only check once per request
    const { count } = await supabaseClient
      .from('documents')
      .select('*', { count: 'exact', head: true });

    let context = "";
    const retrievedDocIds: string[] = [];

    if (count && count > 0) {
      // Initialize vector store and retrieve documents
      const vectorStore = new SupabaseVectorStore(embeddings, {
        client: supabaseClient,
        tableName: "documents",
        queryName: "match_documents",
      });

      // OPTIMIZATION: Retrieve 3-5 documents for better coverage and multi-document synthesis
      const retriever = vectorStore.asRetriever({
        k: 5, // Retrieve top 5 documents by semantic similarity
        searchType: "similarity",
      });

      const relevantDocs = await retriever.getRelevantDocuments(userInput);

      if (relevantDocs.length > 0) {
        // Apply hybrid search re-ranking
        const scoredDocs = applyHybridSearch(relevantDocs, userInput);

        // Filter documents with score above threshold (0.5)
        const RELEVANCE_THRESHOLD = 0.5;
        const filteredDocs = scoredDocs.filter(item => item.score >= RELEVANCE_THRESHOLD);

        // Check if we have any relevant documents
        const hasMenopauseTerms = /(menopause|symptom|sleep|weight|metabolism|hormone|hot flash|night sweat|estrogen|progesterone|insulin|metabolic)/i.test(userInput);
        
        if (filteredDocs.length === 0 && !hasMenopauseTerms) {
          // No relevant documents and query doesn't seem menopause-related
          context = "";
        } else {
          // Use top 3 documents (or all if less than 3) for synthesis
          const topDocs = filteredDocs.length > 0 
            ? filteredDocs.slice(0, 3).map(item => item.doc)
            : scoredDocs.slice(0, 3).map(item => item.doc); // Fallback to top 3 even if below threshold

          // Group documents by topic for better organization
          const docsByTopic = new Map<string, typeof topDocs>();
          for (const doc of topDocs) {
            const topic = (doc.metadata?.topic as string) || 'General';
            if (!docsByTopic.has(topic)) {
              docsByTopic.set(topic, []);
            }
            docsByTopic.get(topic)!.push(doc);
          }

          // Build context from multiple documents
          const contextParts: string[] = [];
          
          for (const [topic, docs] of docsByTopic.entries()) {
            // Add topic header if multiple topics
            if (docsByTopic.size > 1) {
              contextParts.push(`## ${topic}\n`);
            }

            // Add each document's content
            for (const doc of docs) {
              const metadata = doc.metadata || {};
              const subtopic = metadata.subtopic || '';

              // Add subtopic header if multiple subtopics in same topic
              if (docs.length > 1 && subtopic) {
                contextParts.push(`### ${subtopic}\n`);
              } else if (subtopic && docsByTopic.size === 1) {
                // Single topic, single subtopic - just add subtopic
                contextParts.push(`### ${subtopic}\n`);
              }

              // Add document content
              contextParts.push(doc.pageContent);

              // Store document ID for tracking
              if (doc.metadata?.id) {
                retrievedDocIds.push(doc.metadata.id as string);
              }

              // Add separator between documents (except last)
              if (docs.indexOf(doc) < docs.length - 1) {
                contextParts.push('\n---\n');
              }
            }

            // Add separator between topics (except last)
            if (Array.from(docsByTopic.keys()).indexOf(topic) < docsByTopic.size - 1) {
              contextParts.push('\n\n---\n\n');
            }
          }

          context = contextParts.join('\n');
        }
      }
    } else {
      // No documents in database, skip RAG retrieval
      console.log("No documents in database, skipping RAG retrieval");
    }

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

    // OPTIMIZATION: Filter out documents that match content already in session (prevent repetition)
    if (context && context.trim() && allHistoryMessages.length > 0) {
      // Extract content signatures from conversation history to avoid repetition
      const sessionContentSignatures = new Set<string>();
      for (const [role, content] of allHistoryMessages) {
        if (role === "assistant" && content) {
          // Extract first 200 chars as signature
          const sig = content.substring(0, 200).toLowerCase().trim();
          if (sig.length > 50) { // Only add substantial content
            sessionContentSignatures.add(sig);
          }
        }
      }

      // Split context back into documents and filter
      if (sessionContentSignatures.size > 0) {
        const contextParts = context.split('\n\n---\n\n');
        const filteredParts = contextParts.filter(part => {
          const partSig = part.substring(0, 200).toLowerCase().trim();
          // Check if this content was already provided
          for (const sessionSig of sessionContentSignatures) {
            // If more than 80% similarity, consider it a duplicate
            const similarity = calculateSimilarity(partSig, sessionSig);
            if (similarity > 0.8) {
              return false; // Skip this part
            }
          }
          return true;
        });

        // Rebuild context with filtered parts
        if (filteredParts.length > 0) {
          context = filteredParts.join('\n\n---\n\n');
        } else {
          // If all parts were filtered, keep at least one (user might be asking for clarification)
          context = contextParts[0] || context;
        }
      }
    }

    // Detect casual greetings and conversation - these should NOT use knowledge base
    const isCasualGreeting = (query: string): boolean => {
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

    // STRICT: Only use knowledge base if:
    // 1. We have retrieved context (meaning query matched intent/keywords)
    // 2. Query is clearly asking a knowledge question (not just casual conversation)
    const isKnowledgeQuestion = (query: string): boolean => {
      // Don't treat casual greetings as knowledge questions
      if (isCasualGreeting(query)) {
        return false;
      }

      // Must start with a question word or contain question mark
      const questionStarters = /^(why|what|how|when|where|can|could|should|does|do|is|are|tell me|explain|describe|what's|what is|why is|how do|how does)/i;
      const hasQuestionMark = /\?/.test(query);

      // Must be asking about menopause-related topics
      const hasMenopauseTopic = /(menopause|symptom|sleep|weight|metabolism|hormone|hot flash|night sweat|estrogen|progesterone|insulin|metabolic)/i.test(query);

      // Must be a question, not a statement or casual chat
      return (questionStarters.test(query) || hasQuestionMark) && hasMenopauseTopic;
    };

    // STRICT: Only use knowledge base if we have context AND query is a clear knowledge question
    // Don't use knowledge base for casual conversation, greetings, or non-question statements
    const shouldUseKnowledgeBase = context && context.trim() && isKnowledgeQuestion(userInput);

    // 7. Build comprehensive system message with all context
    // CRITICAL: Structure differs based on whether knowledge base content exists
    // OPTIMIZATION: Use knowledge base if we have relevant content
    const hasKnowledgeBase = shouldUseKnowledgeBase && context && context.trim();

    const systemParts: string[] = [BASE_SYSTEM_PROMPT];

    if (hasKnowledgeBase) {
      // KNOWLEDGE BASE MODE: Answer-based synthesis
      // Add knowledge base context with instructions for natural, grounded responses
      systemParts.push(`\n\n=== KNOWLEDGE BASE MODE ACTIVATED ===
You have access to knowledge base content that answers the user's question. Use this content to provide a natural, conversational answer.

KNOWLEDGE BASE CONTENT:
${context.trim()}

INSTRUCTIONS:
- Answer the user's question naturally and conversationally based on the knowledge base content above
- Use the knowledge base content as your ONLY source of information - do NOT add information not present in the content
- If multiple documents are provided, synthesize information from all of them, avoiding duplication
- Maintain the structured format (Content, Action Tips, Motivation Nudge, etc.) when appropriate for the query type
- Personalize with user context when natural and relevant (use their name, reference their profile/tracker data)
- Use markdown formatting for readability (headings, lists, emphasis, blockquotes)
- Include relevant emojis from source content to maintain warmth
- Do NOT copy verbatim - answer the question based on the content, adapting to the user's specific phrasing
- For "how-to" questions: Emphasize Action Tips and Habit Strategy sections
- For "why" questions: Emphasize Content section with explanations
- For motivation queries: Include Motivation Nudge section
- Create coherent answers that directly address the user's question while staying grounded in the knowledge base`);

      // Add user context and tracker context for personalization
      if (userContext && userContext.trim()) {
        systemParts.push(`\n${userContext}\nNote: Use this profile information to personalize your response naturally when relevant.`);
      }

      if (trackerContext && trackerContext.trim()) {
        systemParts.push(`\n${trackerContext}\nNote: Use this tracker data to personalize your response when relevant, but keep the knowledge base content as the primary source.`);
      }
    } else {
      // NORMAL CONVERSATION MODE: Full personalization enabled
      if (userContext && userContext.trim()) {
        systemParts.push(userContext);
      }

      if (trackerContext && trackerContext.trim()) {
        systemParts.push(trackerContext);
      }

      if (allHistoryMessages.length > 0) {
        systemParts.push(`\nNote: You have access to ${allHistoryMessages.length} previous conversation turns. Use this history to provide continuity and personalized responses.`);
      }

      // Add special instructions for casual conversation
      if (isCasualGreeting(userInput)) {
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
    }

    const systemMessage = systemParts.join("\n");

    // 8. Select appropriate LLM based on mode
    const llmToUse = hasKnowledgeBase ? llmKnowledgeBase : llm;

    // 9. Build messages array using LangChain message classes
    // CRITICAL: Messages must be in chronological order: [SystemMessage, ...History, CurrentUserInput]
    const messages: any[] = [new SystemMessage(systemMessage)];

    // Add history FIRST (chronological order)
    const recentHistory = allHistoryMessages.slice(-20);
    for (const [role, content] of recentHistory) {
      if (role === "user" && content.trim()) {
        messages.push(new HumanMessage(content));
      } else if (role === "assistant" && content.trim()) {
        messages.push(new AIMessage(content));
      }
    }

    // Add current user input LAST (most recent) - this ensures responses address current query immediately
    // For knowledge base mode, the context is already in the system message, so just use the user's question
    messages.push(new HumanMessage(userInput));

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
          } catch (e: any) {
            return `Error logging symptom: ${e.message}`;
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
          } catch (e: any) {
            return `Error logging nutrition: ${e.message}`;
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

    const llmWithTools = llmToUse.bindTools(tools);

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
                  response.tool_calls.map(async (toolCall: any) => {
                    const tool = tools.find((t) => t.name === toolCall.name);
                    if (tool && toolCall.id) {
                      try {
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
                      } catch (e: any) {
                        // Emit tool_result event with error
                        controller.enqueue(
                          new TextEncoder().encode(`data: ${JSON.stringify({
                            type: "tool_result",
                            tool_name: toolCall.name,
                            tool_args: toolCall.args,
                            result: `Error: ${e.message}`,
                            success: false
                          })}\n\n`)
                        );

                        return new ToolMessage({
                          content: `Error: ${e.message}`,
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

                  // OPTIMIZATION: Reduced delay to 1ms for faster streaming
                  await new Promise(resolve => setTimeout(resolve, 1));
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
        // Execute tools in parallel for better performance
        const toolResults = await Promise.all(
          response.tool_calls.map(async (toolCall: any) => {
            const tool = tools.find((t) => t.name === toolCall.name);
            if (tool && toolCall.id) {
              try {
                const result = await (tool as any).invoke(toolCall.args);
                return new ToolMessage({
                  content: result,
                  tool_call_id: toolCall.id,
                });
              } catch (e: any) {
                return new ToolMessage({
                  content: `Error: ${e.message}`,
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

