/**
 * Response Formatter - Formats KB responses based on retrieval mode
 */

import type { KBEntry } from "./types";

/**
 * Strip enhancement text from content (intents/keywords prefix added during ingestion)
 * Enhancement is kept in content for vector search but should not be shown to users
 * 
 * Format: "This section answers questions about: [intents]. Key topic(s): [keywords].\n\n[actual content]"
 */
function stripEnhancementText(content: string): string {
  // Pattern matches:
  // - "This section answers questions about: ..." (required if intents exist)
  // - Optional space + "Key topic(s): ..." (if keywords exist)
  // - Followed by "\n\n" and then the actual content
  const enhancementPattern = /^This section answers questions about:.*?(?: Key topic(?:s)?:.*?)?\n\n/s;
  const cleaned = content.replace(enhancementPattern, '');
  
  // If pattern didn't match, return original content
  // (in case content doesn't have enhancement, or format changed)
  return cleaned || content;
}

/**
 * Format verbatim KB response for kb_strict mode
 * Returns ONLY the top entry (one complete answer) with enhancement text stripped
 * Each section = 1 complete answer, so we only return the best match
 */
export function formatVerbatimResponse(kbEntries: KBEntry[]): string {
  if (kbEntries.length === 0) {
    return "";
  }

  // For verbatim responses, return ONLY the top entry (highest scoring)
  // Each section is one complete answer, so we don't combine multiple entries
  const topEntry = kbEntries[0];
  const response = stripEnhancementText(topEntry.content);

  return response.trim();
}

/**
 * Format KB context for hybrid mode (to be passed to LLM)
 * Combines multiple KB entries into a context string
 */
export function formatKBContextForLLM(kbEntries: KBEntry[]): string {
  if (kbEntries.length === 0) {
    return "";
  }

  // Group by topic for better organization
  const entriesByTopic = new Map<string, KBEntry[]>();
  for (const entry of kbEntries) {
    const topic = entry.metadata.topic || 'General';
    if (!entriesByTopic.has(topic)) {
      entriesByTopic.set(topic, []);
    }
    entriesByTopic.get(topic)!.push(entry);
  }

  const contextParts: string[] = [];

  for (const [topic, entries] of entriesByTopic.entries()) {
    // Add topic header if multiple topics
    if (entriesByTopic.size > 1) {
      contextParts.push(`## ${topic}\n`);
    }

    // Add each entry's content
    for (const entry of entries) {
      const subtopic = entry.metadata.subtopic || '';

      // Add subtopic header if multiple subtopics in same topic
      if (entries.length > 1 && subtopic) {
        contextParts.push(`### ${subtopic}\n`);
      } else if (subtopic && entriesByTopic.size === 1) {
        // Single topic, single subtopic - just add subtopic
        contextParts.push(`### ${subtopic}\n`);
      }

      contextParts.push(entry.content);

      // Add separator between entries (except last)
      if (entries.indexOf(entry) < entries.length - 1) {
        contextParts.push('\n---\n');
      }
    }

    // Add separator between topics (except last)
    if (Array.from(entriesByTopic.keys()).indexOf(topic) < entriesByTopic.size - 1) {
      contextParts.push('\n\n---\n\n');
    }
  }

  return contextParts.join('\n').trim();
}



