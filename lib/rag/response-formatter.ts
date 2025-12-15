/**
 * Response Formatter - Formats KB responses based on retrieval mode
 * Ensures KB content is formatted naturally without showing field names
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
 * Format a single KB entry for display, hiding field names
 * Parses content and formats it naturally with dividers between sections
 */
export function formatKBEntryForDisplay(entry: KBEntry): string {
  if (!entry.content) {
    return "";
  }

  // First strip enhancement text (Topic, Subtopic, Keywords, Intent patterns)
  let content = stripEnhancementText(entry.content).trim();
  
  // Parse and format the content sections naturally
  const parts: string[] = [];
  
  // Extract main content and sections
  const lines = content.split('\n');
  let mainContent: string[] = [];
  let actionTips: string[] = [];
  let motivation: string[] = [];
  let habitStrategy: string[] = [];
  let followUp: string[] = [];
  
  let currentSection: 'main' | 'tips' | 'motivation' | 'habit' | 'followup' = 'main';
  let inHabitStrategy = false;
  let habitStrategyKey = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lowerTrimmed = trimmed.toLowerCase();
    
    // Skip completely empty lines (they help separate sections naturally)
    if (!trimmed) {
      // Empty line might indicate section boundary
      // Check if next line suggests a new section transition
      if (i < lines.length - 1) {
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
        if (nextLine) {
          // If we were in tips and next line is not a bullet, transition to main
          if (currentSection === 'tips' && !nextLine.match(/^[-•*]/) && nextLine.length > 20) {
            currentSection = 'main';
            inHabitStrategy = false;
          }
          // If we were in habit and next line looks like a question or new section, transition
          if (currentSection === 'habit' && (nextLine.endsWith('?') || nextLine.length < 50)) {
            // Might be transitioning to followup or main
            if (nextLine.endsWith('?')) {
              currentSection = 'followup';
              inHabitStrategy = false;
            }
          }
        }
      }
      continue;
    }
    
    // Check for explicit field markers first (before other heuristics)
    if (lowerTrimmed.startsWith('content_text:') || 
        lowerTrimmed.startsWith('action_tips:') ||
        lowerTrimmed.startsWith('motivation_nudge:') ||
        lowerTrimmed.startsWith('habit_strategy:') ||
        lowerTrimmed.startsWith('follow_up_question:')) {
      // Switch to appropriate section
      if (lowerTrimmed.startsWith('action_tips:')) {
        currentSection = 'tips';
        inHabitStrategy = false;
      } else if (lowerTrimmed.startsWith('motivation_nudge:')) {
        currentSection = 'motivation';
        inHabitStrategy = false;
        // Extract content after colon if present
        const afterColon = trimmed.substring('motivation_nudge:'.length).trim();
        if (afterColon) {
          motivation.push(afterColon);
        }
        continue;
      } else if (lowerTrimmed.startsWith('habit_strategy:')) {
        currentSection = 'habit';
        inHabitStrategy = true;
        // Extract content after colon if present
        const afterColon = trimmed.substring('habit_strategy:'.length).trim();
        if (afterColon) {
          habitStrategy.push(afterColon);
        }
        continue;
      } else if (lowerTrimmed.startsWith('follow_up_question:')) {
        currentSection = 'followup';
        inHabitStrategy = false;
        // Extract content after colon if present
        const afterColon = trimmed.substring('follow_up_question:'.length).trim();
        if (afterColon) {
          followUp.push(afterColon);
        }
        continue;
      } else {
        // content_text: - skip the marker, continue in main section
        continue;
      }
    }
    
    // Handle habit_strategy sub-fields (principle:, explanation:, example:, habit_tip:)
    // Only process if we're explicitly in habit section
    if (currentSection === 'habit' && (
      lowerTrimmed.startsWith('principle:') ||
      lowerTrimmed.startsWith('explanation:') ||
      lowerTrimmed.startsWith('example:') ||
      lowerTrimmed.startsWith('habit_tip:')
    )) {
      inHabitStrategy = true;
      // Extract the field name and content
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        habitStrategyKey = trimmed.substring(0, colonIndex).trim();
        const fieldContent = trimmed.substring(colonIndex + 1).trim();
        if (fieldContent) {
          habitStrategy.push(`**${habitStrategyKey.charAt(0).toUpperCase() + habitStrategyKey.slice(1)}:** ${fieldContent}`);
        }
      }
      continue;
    }
    
    // Check if this looks like a bullet point (action tip)
    if (trimmed.match(/^[-•*]\s+/)) {
      if (currentSection === 'main' && mainContent.length > 0) {
        currentSection = 'tips';
        inHabitStrategy = false;
      }
      if (currentSection === 'tips') {
        // Remove bullet marker and clean up
        const tip = trimmed.replace(/^[-•*]\s+/, '').trim();
        if (tip) {
          actionTips.push(tip);
        }
      }
    } else if (trimmed.length > 0) {
      // Regular content line - add to appropriate section
      if (currentSection === 'main') {
        mainContent.push(trimmed);
      } else if (currentSection === 'motivation') {
        motivation.push(trimmed);
      } else if (currentSection === 'habit') {
        // Only add to habit strategy if we're actually processing it
        // If line looks like a question, might be transitioning to followup
        if (trimmed.endsWith('?') && trimmed.length < 200) {
          currentSection = 'followup';
          inHabitStrategy = false;
          followUp.push(trimmed);
        } else if (inHabitStrategy) {
          // Continuation of habit strategy field
          habitStrategy.push(trimmed);
        }
      } else if (currentSection === 'followup') {
        followUp.push(trimmed);
      }
    }
  }
  
  // Build formatted response with dividers between sections
  if (mainContent.length > 0) {
    parts.push(mainContent.join('\n'));
  }
  
  if (actionTips.length > 0) {
    // Add divider before action tips
    if (parts.length > 0) {
      parts.push('\n---\n');
    }
    // Format as bullet points
    parts.push(actionTips.map(tip => `• ${tip}`).join('\n'));
  }
  
  if (motivation.length > 0) {
    // Add divider before motivation
    if (parts.length > 0) {
      parts.push('\n---\n');
    }
    parts.push(motivation.join('\n'));
  }
  
  if (habitStrategy.length > 0) {
    // Add divider before habit strategy
    if (parts.length > 0) {
      parts.push('\n---\n');
    }
    parts.push(habitStrategy.join('\n'));
  }
  
  if (followUp.length > 0) {
    // Add divider before follow-up
    if (parts.length > 0) {
      parts.push('\n---\n');
    }
    parts.push(followUp.join('\n'));
  }
  
  // If we couldn't parse properly, return cleaned original content
  if (parts.length === 0) {
    return content;
  }
  
  // Join parts (dividers already include newlines)
  return parts.join('\n').trim();
}

/**
 * Format verbatim KB response for kb_strict mode
 * IMPROVED: Returns top entry formatted nicely, but includes additional entries if top entry is too short
 * Each section = 1 complete answer, but we can combine if needed for completeness
 */
export function formatVerbatimResponse(kbEntries: KBEntry[]): string {
  if (kbEntries.length === 0) {
    return "";
  }

  // Get top entry (highest scoring) and format it
  const topEntry = kbEntries[0];
  let response = formatKBEntryForDisplay(topEntry);
  
  // IMPROVED: If top entry is very short (< 200 chars), consider including next entry
  // This helps when the top match is a brief intro but second match has more detail
  if (response.length < 200 && kbEntries.length > 1) {
    const secondEntry = kbEntries[1];
    const secondContent = formatKBEntryForDisplay(secondEntry);
    
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
 * Uses formatter to ensure no field names appear
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

    // Add each entry's content (formatted to hide field names)
    for (const entry of entries) {
      const subtopic = entry.metadata.subtopic || '';

      // Add subtopic header if multiple subtopics in same topic
      if (entries.length > 1 && subtopic) {
        contextParts.push(`### ${subtopic}\n`);
      } else if (subtopic && entriesByTopic.size === 1) {
        // Single topic, single subtopic - just add subtopic
        contextParts.push(`### ${subtopic}\n`);
      }

      // Format entry to hide field names
      const formattedContent = formatKBEntryForDisplay(entry);
      contextParts.push(formattedContent);

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



