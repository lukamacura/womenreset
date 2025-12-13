/**
 * Response Formatter - Formats KB responses based on retrieval mode
 */

import type { KBEntry } from "./types";

/**
 * Format verbatim KB response for kb_strict mode
 * Returns content as-is (already well-formatted)
 */
export function formatVerbatimResponse(kbEntries: KBEntry[]): string {
  if (kbEntries.length === 0) {
    return "";
  }

  // For verbatim responses, return the top entry's content directly
  // Content is already well-formatted from ingestion
  const topEntry = kbEntries[0];
  let response = topEntry.content;

  // If multiple entries, combine them with separators
  if (kbEntries.length > 1) {
    const additionalEntries = kbEntries.slice(1);
    const additionalContent = additionalEntries
      .map(entry => {
        // Add subtopic header if different from first entry
        if (entry.metadata.subtopic !== topEntry.metadata.subtopic) {
          return `\n\n### ${entry.metadata.subtopic}\n\n${entry.content}`;
        }
        return `\n\n---\n\n${entry.content}`;
      })
      .join('');

    response += additionalContent;
  }

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

