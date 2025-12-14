/**
 * Response Formatter - Formats KB responses based on retrieval mode
 */

import type { KBEntry } from "./types";

/**
 * Strip enhancement text from content (intents/keywords prefix added during ingestion)
 * IMPROVED: More reliable detection using multiple strategies
 * 
 * Format structure:
 * - Topic: X. Subtopic: Y.
 * - Empty line
 * - Intent patterns (repeated questions/statements, each on a new line)
 * - Empty line
 * - Keywords: ... (optional)
 * - Empty line
 * - Original content
 */
function stripEnhancementText(content: string): string {
  if (!content || !content.trim()) {
    return content;
  }

  const lines = content.split('\n');
  
  // Strategy 1: Look for clear content markers (most reliable)
  // Enhancement sections typically end with a double newline before actual content
  // Look for pattern: Topic/Subtopic/Keywords sections, then double newline, then content
  
  // Find the last occurrence of enhancement markers
  let lastEnhancementIndex = -1;
  let foundTopic = false;
  let foundKeywords = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('Topic:')) {
      foundTopic = true;
      lastEnhancementIndex = i;
    } else if (line.startsWith('Subtopic:')) {
      lastEnhancementIndex = i;
    } else if (line.startsWith('Keywords:')) {
      foundKeywords = true;
      lastEnhancementIndex = i;
      // Keywords section might span multiple lines - find where it ends
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (!nextLine) {
          // Empty line after keywords - this is likely the separator
          lastEnhancementIndex = j;
          break;
        }
        // If next line looks like content (not keyword continuation), stop
        if (nextLine.length > 50 && 
            !nextLine.startsWith('Keywords:') && 
            !/^[a-z][^:]*$/i.test(nextLine)) {
          break;
        }
        j++;
      }
    } else if (foundTopic && line) {
      // After finding Topic, check if this is an intent pattern (question)
      const isQuestion = line.endsWith('?') || 
        (line.length < 120 && /^(What|Why|How|When|Where|Is|Are|Can|Should|Will|Do|Does|Did|Am|Would|Could)/i.test(line));
      
      if (isQuestion) {
        lastEnhancementIndex = i;
      } else if (line.length > 40 && 
                 !line.startsWith('Topic:') && 
                 !line.startsWith('Subtopic:') &&
                 !line.startsWith('Keywords:') &&
                 /[a-z]/.test(line)) {
        // This looks like actual content - stop here
        break;
      }
    }
  }
  
  // If we found enhancement markers, start content after them
  if (lastEnhancementIndex >= 0) {
    // Skip to the first non-empty line after enhancement
    for (let i = lastEnhancementIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && 
          line.length > 30 &&
          !line.startsWith('Topic:') && 
          !line.startsWith('Subtopic:') &&
          !line.startsWith('Keywords:') &&
          !line.endsWith('?') &&
          /[a-z]/.test(line)) {
        const result = lines.slice(i).join('\n').trim();
        if (result.length > 50) { // Ensure we have substantial content
          return result;
        }
      }
    }
  }
  
  // Strategy 2: Try regex-based removal (for well-formed documents)
  const enhancementPatterns = [
    // Pattern: Topic + Subtopic + empty lines + questions + Keywords + empty lines
    /^Topic:[\s\S]*?Subtopic:[\s\S]*?\n\s*\n(?:[^\n]*\?[\s\S]*?\n\s*\n)?(?:Keywords:[\s\S]*?\n\s*\n)?\s*\n/,
    // Pattern: Topic + questions + Keywords
    /^Topic:[\s\S]*?\n\s*\n(?:[^\n]*\?[\s\S]*?\n\s*\n)?(?:Keywords:[\s\S]*?\n\s*\n)?\s*\n/,
    // Old format pattern
    /^This section answers questions about:[\s\S]*?(?: Key topic(?:s)?:[\s\S]*?)?\n\n/,
  ];
  
  for (const pattern of enhancementPatterns) {
    const cleaned = content.replace(pattern, '');
    if (cleaned !== content && cleaned.trim().length > 50) {
      const firstLine = cleaned.split('\n')[0].trim();
      // Verify first line looks like content
      if (firstLine.length > 30 && 
          !firstLine.startsWith('Topic:') && 
          !firstLine.endsWith('?') &&
          /[a-z]/.test(firstLine)) {
        return cleaned.trim();
      }
    }
  }
  
  // Strategy 3: Find first substantial content line (fallback)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && 
        line.length > 50 &&
        !line.startsWith('Topic:') && 
        !line.startsWith('Subtopic:') && 
        !line.startsWith('Keywords:') &&
        !line.endsWith('?') &&
        /[a-z]/.test(line) &&
        // Not just a list (check for prose structure)
        line.split(',').length < 15 &&
        line.split(';').length < 8) {
      const result = lines.slice(i).join('\n').trim();
      if (result.length > 50) {
        return result;
      }
    }
  }
  
  // Last resort: return original content (better than empty string)
  return content.trim();
}

/**
 * Format verbatim KB response for kb_strict mode
 * IMPROVED: Returns top entry, but includes additional entries if top entry is too short
 * Each section = 1 complete answer, but we can combine if needed for completeness
 */
export function formatVerbatimResponse(kbEntries: KBEntry[]): string {
  if (kbEntries.length === 0) {
    return "";
  }

  // Get top entry (highest scoring)
  const topEntry = kbEntries[0];
  let response = stripEnhancementText(topEntry.content).trim();
  
  // IMPROVED: If top entry is very short (< 200 chars), consider including next entry
  // This helps when the top match is a brief intro but second match has more detail
  if (response.length < 200 && kbEntries.length > 1) {
    const secondEntry = kbEntries[1];
    const secondContent = stripEnhancementText(secondEntry.content).trim();
    
    // Only include second entry if:
    // 1. It's from the same topic/subtopic (likely continuation)
    // 2. Or it's substantially longer and relevant
    const sameTopic = topEntry.metadata.topic === secondEntry.metadata.topic;
    const sameSubtopic = topEntry.metadata.subtopic === secondEntry.metadata.subtopic;
    
    if ((sameTopic && sameSubtopic) || (secondContent.length > response.length * 1.5)) {
      // Combine entries with a separator
      response = `${response}\n\n${secondContent}`;
    }
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



