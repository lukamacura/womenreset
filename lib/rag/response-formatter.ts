/**
 * Response Formatter - Formats KB responses based on retrieval mode
 */

import type { KBEntry } from "./types";

/**
 * Strip enhancement text from content (intents/keywords prefix added during ingestion)
 * Enhancement is kept in content for vector search but should not be shown to users
 * 
 * New format structure:
 * - Topic: X. Subtopic: Y.
 * - Empty line
 * - Intent patterns (repeated questions/statements, each on a new line)
 * - Empty line
 * - Keywords: ... (optional)
 * - Empty line
 * - Original content
 */
function stripEnhancementText(content: string): string {
  const lines = content.split('\n');
  let contentStartIndex = -1;
  let foundTopic = false;
  
  // Step 1: Find the Topic line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('Topic:')) {
      foundTopic = true;
      continue;
    }
    
    // Step 2: After finding Topic, skip enhancement content
    if (foundTopic) {
      // Skip empty lines
      if (!line) {
        continue;
      }
      
      // Skip Topic/Subtopic lines (in case Subtopic is on separate line)
      if (line.startsWith('Topic:') || line.startsWith('Subtopic:')) {
        continue;
      }
      
      // Skip intent patterns - questions ending with ? or question-like statements
      // Intent patterns are typically:
      // - Questions ending with ?
      // - Short lines starting with question words
      // - Lines that look like questions but might not end with ?
      if (line.endsWith('?') || 
          (line.length < 120 && /^(What|Why|How|When|Where|Is|Are|Can|Should|Will|Do|Does|Did|Am|Would|Could)/i.test(line))) {
        continue;
      }
      
      // Skip Keywords section (can be single or multi-line)
      if (line.startsWith('Keywords:')) {
        // Skip until we find the end of Keywords (empty line after period or end of Keywords content)
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          // If we hit an empty line after Keywords, that's the separator
          if (!nextLine) {
            i = j; // Skip to after the empty line
            break;
          }
          // If next line doesn't look like Keywords continuation, stop
          if (!nextLine.startsWith('Keywords:') && 
              !nextLine.match(/^[a-z][^:]*$/i) && // Not a continuation line (no colon, lowercase start)
              nextLine.length > 50) {
            break;
          }
          j++;
        }
        continue;
      }
      
      // Step 3: Find the first line that's clearly actual content
      // Content indicators:
      // - Substantial length (> 40 characters)
      // - Doesn't start with enhancement markers
      // - Not a question
      // - Contains actual prose (not just keywords or patterns)
      if (line.length > 40 && 
          !line.startsWith('Topic:') && 
          !line.startsWith('Subtopic:') && 
          !line.startsWith('Keywords:') &&
          !line.endsWith('?') &&
          // Check if it looks like actual prose (has lowercase letters, not all caps)
          /[a-z]/.test(line) &&
          // Not just a list of keywords (no excessive commas or semicolons)
          (line.split(',').length < 10 && line.split(';').length < 5)) {
        contentStartIndex = i;
        break;
      }
    }
  }
  
  // If we found content start, return from there
  if (contentStartIndex >= 0) {
    return lines.slice(contentStartIndex).join('\n').trim();
  }
  
  // Fallback 1: Try old format pattern
  if (!foundTopic) {
    const oldPattern = /^This section answers questions about:[\s\S]*?(?: Key topic(?:s)?:[\s\S]*?)?\n\n/;
    const cleaned = content.replace(oldPattern, '');
    if (cleaned !== content) {
      return cleaned.trim();
    }
  }
  
  // Fallback 2: If we found Topic but couldn't find content, try regex removal
  if (foundTopic) {
    // Try to remove everything from Topic to first substantial content line using regex
    // Pattern: Topic line + optional Subtopic line + empty lines + intent patterns + Keywords + empty lines
    const enhancementRegex = /^Topic:[\s\S]*?Subtopic:[\s\S]*?\n\s*\n([\s\S]*?)(?:Keywords:[\s\S]*?\n\s*\n)?\s*\n/;
    const match = content.match(enhancementRegex);
    if (match && match.index !== undefined) {
      // Find where the match ends
      const afterMatch = content.substring(match.index + match[0].length);
      // Verify it's actual content (not more enhancement)
      const firstLine = afterMatch.split('\n')[0].trim();
      if (firstLine.length > 40 && !firstLine.startsWith('Topic:') && !firstLine.endsWith('?')) {
        return afterMatch.trim();
      }
    }
  }
  
  // Fallback 3: Last resort - find first line that's clearly not enhancement
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && 
        line.length > 50 &&
        !line.startsWith('Topic:') && 
        !line.startsWith('Subtopic:') && 
        !line.startsWith('Keywords:') &&
        !line.endsWith('?') &&
        /[a-z]/.test(line)) {
      return lines.slice(i).join('\n').trim();
    }
  }
  
  // If all else fails, return original content
  return content;
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



