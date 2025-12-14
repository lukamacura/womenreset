import * as fs from 'fs';
import * as path from 'path';

/**
 * Convert Markdown format knowledge base files to YAML format
 */

function convertMarkdownToYAML(content: string): string {
  // Split by sections (## headings)
  const sections = content.split(/^##\s+/m).filter(s => s.trim());
  const yamlSections: string[] = [];

  for (const section of sections) {
    // Extract metadata
    const personaMatch = section.match(/\*\*Persona:\*\*\s*([^\r\n]+)/);
    const topicMatch = section.match(/\*\*Topic:\*\*\s*([^\r\n]+)/);
    const subtopicMatch = section.match(/\*\*Subtopic:\*\*\s*([^\r\n]+)/);

    if (!personaMatch || !topicMatch || !subtopicMatch) {
      console.warn('Skipping section without required metadata');
      continue;
    }

    const persona = personaMatch[1].trim();
    const topic = topicMatch[1].trim();
    const subtopic = subtopicMatch[1].trim();

    // Extract content
    const contentMatch = section.match(/###\s+\*\*Content\*\*\s*\n([\s\S]*?)(?=###|$)/);
    const contentText = contentMatch ? contentMatch[1].trim() : '';

    // Extract action tips
    const actionTipsMatch = section.match(/###\s+\*\*Action Tips?\*\*\s*\n([\s\S]*?)(?=###|$)/);
    const actionTipsLines = actionTipsMatch 
      ? actionTipsMatch[1].split('\n').filter(l => l.trim().startsWith('-'))
      : [];

    // Extract motivation nudge
    const motivationMatch = section.match(/###\s+\*\*Motivation Nudge\*\*\s*\n([\s\S]*?)(?=###|$)/);
    const motivationNudge = motivationMatch ? motivationMatch[1].trim() : '';

    // Extract habit strategy
    const habitStrategyMatch = section.match(/###\s+\*\*Habit Strategy[^]*?\*\*\s*\n([\s\S]*?)(?=###|$)/);
    let habitStrategy: any = null;
    if (habitStrategyMatch) {
      const strategyText = habitStrategyMatch[1];
      const principleMatch = strategyText.match(/\*\*Strategy:\*\*\s*([^\n]+)/);
      const explanationMatch = strategyText.match(/\*\*Explanation:\*\*\s*([^\n]+)/);
      const exampleMatch = strategyText.match(/\*\*Example:\*\*\s*([^\n]+)/);
      const tipMatch = strategyText.match(/\*\*Habit Tip:\*\*\s*([^\n]+)/);
      
      if (principleMatch || explanationMatch || exampleMatch || tipMatch) {
        habitStrategy = {
          principle: principleMatch ? principleMatch[1].trim() : '',
          explanation: explanationMatch ? explanationMatch[1].trim() : '',
          example: exampleMatch ? exampleMatch[1].trim() : '',
          habit_tip: tipMatch ? tipMatch[1].trim() : '',
        };
      }
    }

    // Extract follow-up question
    const followUpMatch = section.match(/###\s+\*\*Follow-Up Questions?\*\*\s*\n([\s\S]*?)(?=###|$)/);
    const followUpQuestion = followUpMatch ? followUpMatch[1].trim() : '';

    // Extract intent patterns
    const intentPatternsMatch = section.match(/###\s+\*\*Intent Patterns?\*\*\s*\n([\s\S]*?)(?=###|$)/);
    const intentPatterns: string[] = [];
    if (intentPatternsMatch) {
      const patternsText = intentPatternsMatch[1];
      const patternLines = patternsText.split('\n');
      for (const line of patternLines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('-') && !trimmed.match(/^-\s*\[/)) {
          let pattern = trimmed.replace(/^-\s*/, '').trim();
          // Remove trailing notes in brackets
          pattern = pattern.replace(/\s*\[\+.*?\]\s*$/, '').trim();
          if (pattern && pattern.length >= 3) {
            intentPatterns.push(pattern);
          }
        }
      }
    }

    // Extract keywords
    const keywordsMatch = section.match(/###\s+\*\*Keywords?\*\*\s*\n([\s\S]*?)(?=###|$)/);
    const keywords: string[] = [];
    if (keywordsMatch) {
      const keywordsText = keywordsMatch[1];
      const keywordLines = keywordsText.split('\n');
      for (const line of keywordLines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('-') && !trimmed.match(/\[shared|\[→/)) {
          let keyword = trimmed.replace(/^-\s*/, '').trim();
          // Remove shared/route notes
          keyword = keyword.replace(/\s*\[shared.*?\]\s*$/, '').trim();
          keyword = keyword.replace(/\s*\[→.*?\]\s*$/, '').trim();
          if (keyword) {
            keywords.push(keyword);
          }
        }
      }
    }

    // Build YAML section
    let yamlSection = '---\n';
    yamlSection += `persona: "${persona}"\n`;
    yamlSection += `topic: "${topic}"\n`;
    yamlSection += `subtopic: "${subtopic}"\n\n`;
    
    yamlSection += 'content_text: |\n';
    if (contentText) {
      const contentLines = contentText.split('\n');
      for (const line of contentLines) {
        yamlSection += `  ${line}\n`;
      }
    }

    if (actionTipsLines.length > 0) {
      yamlSection += '\naction_tips:\n';
      for (const tip of actionTipsLines) {
        const cleanTip = tip.replace(/^-\s*/, '').trim();
        yamlSection += `  - "${cleanTip}"\n`;
      }
    }

    if (motivationNudge) {
      yamlSection += `\nmotivation_nudge: "${motivationNudge.replace(/"/g, '\\"')}"\n`;
    }

    if (habitStrategy && (habitStrategy.principle || habitStrategy.explanation)) {
      yamlSection += '\nhabit_strategy:\n';
      if (habitStrategy.principle) yamlSection += `  principle: "${habitStrategy.principle.replace(/"/g, '\\"')}"\n`;
      if (habitStrategy.explanation) yamlSection += `  explanation: "${habitStrategy.explanation.replace(/"/g, '\\"')}"\n`;
      if (habitStrategy.example) yamlSection += `  example: "${habitStrategy.example.replace(/"/g, '\\"')}"\n`;
      if (habitStrategy.habit_tip) yamlSection += `  habit_tip: "${habitStrategy.habit_tip.replace(/"/g, '\\"')}"\n`;
    }

    if (followUpQuestion) {
      yamlSection += `\nfollow_up_question: "${followUpQuestion.replace(/"/g, '\\"')}"\n`;
    }

    if (intentPatterns.length > 0) {
      yamlSection += '\nintent_patterns:\n';
      for (const pattern of intentPatterns) {
        yamlSection += `  - "${pattern.replace(/"/g, '\\"')}"\n`;
      }
    }

    if (keywords.length > 0) {
      yamlSection += '\nkeywords:\n';
      for (const keyword of keywords) {
        yamlSection += `  - "${keyword.replace(/"/g, '\\"')}"\n`;
      }
    }

    yamlSection += '---\n\n';
    yamlSections.push(yamlSection);
  }

  return yamlSections.join('');
}

// Convert files
const filesToConvert = [
  'Metabolic Changes & Weight Gain.md',
  'Sleep Disturbances.md',
];

const kbDir = path.join(__dirname, '..', 'knowledge-base');

for (const filename of filesToConvert) {
  const filePath = path.join(kbDir, filename);
  if (fs.existsSync(filePath)) {
    console.log(`Converting ${filename}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const yamlContent = convertMarkdownToYAML(content);
    fs.writeFileSync(filePath, yamlContent, 'utf-8');
    console.log(`✓ Converted ${filename}`);
  }
}

console.log('Conversion complete!');
