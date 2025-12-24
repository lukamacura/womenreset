/**
 * Response Formatter - Formats KB responses based on retrieval mode
 * Ensures KB content is formatted naturally without showing field names
 */

import type { KBEntry } from "./types";

/**
 * Strip enhancement text from content (intents/keywords prefix added during ingestion)
 * IMPROVED: Aggressively removes ALL enhancement metadata (Topic, Subtopic, Keywords, Intent patterns)
 *
 * Format structure in stored content:
 * - Topic: X. Subtopic: Y.
 * - Empty line
 * - Intent patterns (repeated questions/statements, each on a new line) - REPEATED 2-3 TIMES
 * - Empty line
 * - Keywords: ... (optional)
 * - Empty line
 * - Original content (with ### **Content**, ### **Action Tips**, etc. sections)
 */
function stripEnhancementText(content: string): string {
  if (!content || !content.trim()) {
    return content;
  }

  let cleaned = content;

  // Step 1: Remove Topic: and Subtopic: lines (can be on same line or separate)
  cleaned = cleaned.replace(/^Topic:.*$/gm, '');
  cleaned = cleaned.replace(/^Subtopic:.*$/gm, '');
  cleaned = cleaned.replace(/^Topic:.*?Subtopic:.*$/gm, '');

  // Step 2: Find where actual content starts (first ### section header)
  const contentStartMatch = cleaned.match(/###\s*\*\*Content\*\*/i);
  let contentStartIndex = -1;
  if (contentStartMatch) {
    contentStartIndex = cleaned.indexOf(contentStartMatch[0]);
  }

  if (contentStartIndex >= 0) {
    // AGGRESSIVE: Remove EVERYTHING before the first ### section header
    // This includes all intent patterns, keywords, and any other metadata
    cleaned = cleaned.substring(contentStartIndex);
  } else {
    // No ### **Content** header found - try to find first substantial paragraph
    // But first, remove all question lines that look like intent patterns
    const lines = cleaned.split('\n');
    const filteredLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        filteredLines.push(line);
        continue;
      }

      // Skip lines that look like intent patterns (questions)
      if (trimmed.endsWith('?')) {
        continue;
      }

      // Skip lines that start with common question words
      if (trimmed.match(/^(What|Why|How|When|Where|Is|Are|Can|Should|Will|Do|Does|Did|Am|Would|Could|I|My|Give|Show|Tell|Help|Want|Need)\s/i)) {
        continue;
      }

      // Skip keyword lines
      if (trimmed.startsWith('Keywords:')) {
        continue;
      }

      // Skip lines that look like keyword lists
      if (trimmed.includes(',') && trimmed.split(',').length > 2 && trimmed.length < 250) {
        continue;
      }

      if (trimmed.endsWith('and more.') || trimmed.endsWith('and more')) {
        continue;
      }

      // Keep this line
      filteredLines.push(line);
    }

    cleaned = filteredLines.join('\n');
  }

  // Step 3: Clean up excessive empty lines (but preserve section breaks)
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n');
  cleaned = cleaned.replace(/\n{3}/g, '\n\n');

  // Step 4: Remove leading/trailing empty lines
  cleaned = cleaned.trim();

  // Step 5: Verify we have substantial content left
  if (cleaned.length < 50) {
    // Fallback: return original if stripping removed everything
    return content.trim();
  }

  return cleaned;
}

/**
 * Format a single KB entry for display, hiding field names
 * Parses content and formats it naturally with clear dividers between sections
 * IMPROVED: Better section detection and formatting with explicit separators
 * @param includeFollowUp - Whether to include follow-up questions (default: true, set to false for verbatim responses)
 * @param excludeMetadata - Whether to exclude metadata fields (keywords, topic, subtopic, intents) from output (default: false)
 */
export function formatKBEntryForDisplay(entry: KBEntry, includeFollowUp: boolean = true, excludeMetadata: boolean = false): string {
  if (!entry.content) {
    return "";
  }

  // First strip enhancement text (Topic, Subtopic, Keywords, Intent patterns)
  let content = stripEnhancementText(entry.content).trim();
  
  // If excludeMetadata is true, aggressively remove any remaining metadata references
  if (excludeMetadata) {
    // Remove any remaining topic/subtopic references
    content = content.replace(/^Topic:.*$/gim, '');
    content = content.replace(/^Subtopic:.*$/gim, '');
    content = content.replace(/Topic:.*?Subtopic:.*?$/gim, '');
    
    // Remove keyword mentions
    content = content.replace(/^Keywords?:.*$/gim, '');
    content = content.replace(/Keywords?:.*?$/gim, '');
    
    // Remove intent pattern lines (questions that look like intent patterns)
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      // Skip lines that are just questions (likely intent patterns)
      if (trimmed.endsWith('?') && trimmed.length < 150) {
        // Check if it looks like an intent pattern (question format)
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'can', 'should', 'will', 'is', 'are', 'do', 'does'];
        const startsWithQuestion = questionWords.some(word => trimmed.toLowerCase().startsWith(word));
        if (startsWithQuestion) {
          return false; // Exclude this line
        }
      }
      return true;
    });
    content = filteredLines.join('\n');
    
    // Clean up excessive whitespace
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.trim();
  }
  
  // DEBUG: Log if content still has headers (for troubleshooting)
  if (content.includes('### **Content**') || content.includes('### **Action Tips**')) {
    console.log('[Formatter] Warning: Content still contains section headers after stripEnhancementText');
  }
  
  // Parse sections using regex patterns (more reliable than line-by-line)
  const sections: {
    content: string[];
    actionTips: string[];
    motivation: string[];
    habitStrategy: string[];
    followUp: string[];
  } = {
    content: [],
    actionTips: [],
    motivation: [],
    habitStrategy: [],
    followUp: []
  };
  
  // Extract Content section (main content)
  // Stop at the FIRST ### **Action Tips** header (not at --- separators, which are part of content)
  // PRESERVE all line breaks and spaces - don't filter out empty lines
  const contentMatch = content.match(/###\s*\*\*Content\*\*\s*\n([\s\S]*?)(?=\n---\s*\n###\s*\*\*Action Tips?\*\*)/i);
  if (contentMatch) {
    let contentText = contentMatch[1];
    // Remove any --- separators at the end only
    contentText = contentText.replace(/\n*---\s*$/g, '');
    // Preserve all lines including empty ones to maintain formatting
    sections.content = contentText.split('\n');
  } else {
    // Try without the --- before Action Tips
    const contentMatch2 = content.match(/###\s*\*\*Content\*\*\s*\n([\s\S]*?)(?=###\s*\*\*(?:Action|Motivation|Habit|Follow-Up))/i);
    if (contentMatch2) {
      let contentText = contentMatch2[1];
      contentText = contentText.replace(/\n*---\s*$/g, '');
      // Preserve all lines including empty ones to maintain formatting
      sections.content = contentText.split('\n');
    }
  }
  
  // Extract Action Tips section - preserve original bullet format and bold text
  // Stop at the next --- separator (before Motivation section)
  const actionTipsMatch = content.match(/###\s*\*\*Action Tips?\*\*\s*\n([\s\S]*?)(?=\n---\s*\n###\s*\*\*Motivation)/i);
  if (actionTipsMatch) {
    let tipsText = actionTipsMatch[1].trim();
    // Remove trailing --- if present
    tipsText = tipsText.replace(/\n*---\s*$/g, '');
    // Only include lines that are actual tips (start with - or •, or are emoji bullets)
    const tipLines = tipsText.split('\n').filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.match(/^###/)) return false; // Skip headers
      if (trimmed.match(/^---$/)) return false; // Skip separators
      // Include bullet points (-, •, *, or emoji bullets like 📵)
      return trimmed.match(/^[-•*]/) || trimmed.match(/^[\p{Emoji}]/u);
    });
    sections.actionTips = tipLines;
  } else {
    // Try without --- before Motivation
    const actionTipsMatch2 = content.match(/###\s*\*\*Action Tips?\*\*\s*\n([\s\S]*?)(?=###\s*\*\*(?:Motivation|Habit|Follow-Up))/i);
    if (actionTipsMatch2) {
      let tipsText = actionTipsMatch2[1].trim();
      tipsText = tipsText.replace(/\n*---\s*$/g, '');
      const tipLines = tipsText.split('\n').filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        if (trimmed.match(/^###/)) return false;
        if (trimmed.match(/^---$/)) return false;
        return trimmed.match(/^[-•*]/) || trimmed.match(/^[\p{Emoji}]/u);
      });
      sections.actionTips = tipLines;
    }
  }
  
  // Extract Motivation Nudge section
  // Stop at the next --- separator or next section header
  const motivationMatch = content.match(/###\s*\*\*Motivation Nudge\*\*\s*\n([\s\S]*?)(?=\n---\s*\n###|$)/i);
  if (motivationMatch) {
    let motivationText = motivationMatch[1].trim();
    // Remove trailing --- if present
    motivationText = motivationText.replace(/\n*---\s*$/g, '');
    if (motivationText) {
      sections.motivation = motivationText.split('\n').filter(line => line.trim().length > 0);
    }
  } else {
    // Try without --- separator
    const motivationMatch2 = content.match(/###\s*\*\*Motivation Nudge\*\*\s*\n([\s\S]*?)(?=###\s*\*\*(?:Habit|Follow-Up)|$)/i);
    if (motivationMatch2) {
      let motivationText = motivationMatch2[1].trim();
      motivationText = motivationText.replace(/\n*---\s*$/g, '');
      if (motivationText) {
        sections.motivation = motivationText.split('\n').filter(line => line.trim().length > 0);
      }
    }
  }
  
  // Extract Habit Strategy section
  // IMPORTANT: Stop only at actual section headers, not at --- separators
  const habitMatch = content.match(/###\s*\*\*Habit Strategy[\s\S]*?\*\*\s*\n([\s\S]*?)(?=###\s*\*\*(?:Content|Action|Motivation|Follow-Up|Keywords|Intent)|$)/i);
  if (habitMatch) {
    const habitText = habitMatch[1].trim();
    if (habitText) {
      // The ingestion script stores habit_strategy as values only (without field names)
      // Order is: principle, explanation, example, habit_tip (one per line)
      // Format them nicely with block quotes and bolds
      const formattedHabitStrategy: string[] = [];
      
      // Split by lines and filter out empty lines
      const lines = habitText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Try to parse as structured fields (principle:, explanation:, etc.)
      let hasStructuredFields = false;
      const extractField = (text: string, fieldName: string): string | null => {
        // Try to match field: "quoted value" or field: unquoted value
        const quotedMatch = text.match(new RegExp(`\\b${fieldName}:\\s*["']([^"']+)["']`, 'i'));
        if (quotedMatch) {
          hasStructuredFields = true;
          return quotedMatch[1].trim();
        }
        // Try unquoted value (until end of line or next field marker)
        const unquotedMatch = text.match(new RegExp(`\\b${fieldName}:\\s*([^\\n]+?)(?=\\n\\s*(?:principle|explanation|example|habit_tip|###|$))`, 'i'));
        if (unquotedMatch) {
          hasStructuredFields = true;
          return unquotedMatch[1].trim();
        }
        return null;
      };
      
      // First try structured format (with field names)
      const principle = extractField(habitText, 'principle');
      const explanation = extractField(habitText, 'explanation');
      const example = extractField(habitText, 'example');
      const habitTip = extractField(habitText, 'habit_tip');
      
      if (hasStructuredFields) {
        // Format with field names
        if (principle) formattedHabitStrategy.push(`> **Principle:** ${principle}`);
        if (explanation) formattedHabitStrategy.push(`> **Explanation:** ${explanation}`);
        if (example) formattedHabitStrategy.push(`> **Example:** ${example}`);
        if (habitTip) formattedHabitStrategy.push(`> **Habit Tip:** ${habitTip}`);
      } else if (lines.length >= 4) {
        // Assume order: principle, explanation, example, habit_tip (as stored by ingestion script)
        formattedHabitStrategy.push(`> **Principle:** ${lines[0]}`);
        formattedHabitStrategy.push(`> **Explanation:** ${lines[1]}`);
        formattedHabitStrategy.push(`> **Example:** ${lines[2]}`);
        formattedHabitStrategy.push(`> **Habit Tip:** ${lines[3]}`);
      } else {
        // Fallback: format each line as a blockquote with bold label
        lines.forEach((line, index) => {
          const labels = ['Principle', 'Explanation', 'Example', 'Habit Tip'];
          const label = labels[index] || 'Tip';
          formattedHabitStrategy.push(`> **${label}:** ${line}`);
        });
      }
      
      sections.habitStrategy = formattedHabitStrategy;
    }
  }
  
  // Extract Follow-Up Question section (only if includeFollowUp is true)
  if (includeFollowUp) {
    // Try multiple patterns to catch all variations
    // IMPORTANT: Follow-Up is usually the last section, so capture until end of content
    const followUpMatch = content.match(/###\s*\*\*Follow-Up (?:Question|Questions)?\*\*\s*\n([\s\S]*?)$/i);

    if (followUpMatch) {
      let followUpText = followUpMatch[1].trim();
      // Remove any trailing separators
      followUpText = followUpText.replace(/\n*---\s*$/g, '');
      if (followUpText) {
        // Take all lines (follow-up questions can be multi-line)
        const lines = followUpText.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.match(/^###/));
        if (lines.length > 0) {
          sections.followUp = lines;
        }
      }
    }
  }
  
  // If no sections were found via regex, try fallback parsing
  if (sections.content.length === 0 && sections.actionTips.length === 0 && 
      sections.motivation.length === 0 && sections.habitStrategy.length === 0 && 
      (!includeFollowUp || sections.followUp.length === 0)) {
    // Fallback: use cleaned content as-is
    const fallbackLines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && 
             !trimmed.startsWith('Topic:') && 
             !trimmed.startsWith('Subtopic:') &&
             !trimmed.startsWith('Keywords:') &&
             !trimmed.match(/^###\s*\*\*(?:Keywords?|Intent Patterns?)\*\*/i);
    });
    if (fallbackLines.length > 0) {
      sections.content = fallbackLines;
    }
  }
  
  // Build formatted response with clear section separators matching desired format
  // IMPORTANT: All section headers (### **Content**, etc.) are already removed during extraction
  const parts: string[] = [];

  // Main content section - preserve internal structure (including all line breaks and spaces)
  if (sections.content.length > 0) {
    // Join preserving all line breaks (including empty lines)
    const contentText = sections.content.join('\n');
    // Only trim leading/trailing whitespace, not internal formatting
    parts.push(contentText.trimStart().trimEnd());
    // Add separator after content section
    parts.push('\n\n---\n\n');
  }

  // Action Tips section - preserve original bullet format and bold text
  if (sections.actionTips.length > 0) {
    parts.push(sections.actionTips.join('\n'));
    parts.push('\n\n---\n\n');
  }

  // Motivation section - format as blockquote
  if (sections.motivation.length > 0) {
    const blockquoteLines = sections.motivation.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      return `> ${trimmed}`;
    }).filter(line => line.length > 0);
    parts.push(blockquoteLines.join('\n'));
    parts.push('\n\n---\n\n');
  }

  // Habit Strategy section
  if (sections.habitStrategy.length > 0) {
    parts.push(sections.habitStrategy.join('\n'));
    parts.push('\n\n---\n\n');
  }

  // Follow-Up Question section (only include if includeFollowUp is true)
  if (includeFollowUp && sections.followUp.length > 0) {
    const followUpText = sections.followUp.join('\n').trim();
    if (followUpText) {
      parts.push(followUpText);
    }
  }
  
  
  // If we couldn't parse properly, return cleaned original content
  if (parts.length === 0) {
    return content;
  }
  
  // Join parts and clean up
  let result = parts.join('').trim();

  // Clean up excessive newlines (but preserve --- separators)
  // First normalize all whitespace around ---
  result = result.replace(/\s*---\s*/g, '\n\n---\n\n');

  // Then clean up any excessive newlines (more than 2)
  result = result.replace(/\n{3,}/g, '\n\n');

  // Final trim
  result = result.trim();

  return result;
}

/**
 * Format verbatim KB response for kb_strict mode
 * IMPROVED: Returns top entry formatted nicely, but includes additional entries if top entry is too short
 * Each section = 1 complete answer, but we can combine if needed for completeness
 * @param excludeMetadata - Whether to exclude metadata fields from output (default: false, set to true for strict intent-based retrieval)
 */
export function formatVerbatimResponse(kbEntries: KBEntry[], excludeMetadata: boolean = false): string {
  if (kbEntries.length === 0) {
    return "";
  }

  // Get top entry (highest scoring) and format it
  // Include follow-up questions in verbatim responses
  const topEntry = kbEntries[0];
  let response = formatKBEntryForDisplay(topEntry, true, excludeMetadata);
  
  // IMPROVED: If top entry is very short (< 200 chars), consider including next entry
  // This helps when the top match is a brief intro but second match has more detail
  if (response.length < 200 && kbEntries.length > 1) {
    const secondEntry = kbEntries[1];
    const secondContent = formatKBEntryForDisplay(secondEntry, true, excludeMetadata);
    
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



