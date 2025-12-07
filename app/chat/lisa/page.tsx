/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { motion } from "framer-motion";
import {
  Loader2,
  Menu,
  Plus,
  Send,
  Trash,
  Trash2,
  X,
  Rocket,
  User,
  Copy,
  Check,
  Link as LinkIcon,
  Quote,
  MessageSquare,
  History,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ===== Theme (matching app pink/purple theme, optimized for 40+ vision) ===== */
const THEME = {
  pink: {
    50: "#FDF2F8",   // Very light pink
    100: "#FCE7F3",  // Light pink (matches app background)
    200: "#FBCFE8",  // Lighter pink
    300: "#F9A8D4",  // Medium light pink
    400: "#F472B6",  // Medium pink (matches app primary)
    500: "#EC4899",  // Standard pink
    600: "#DB2777",  // Darker pink
    700: "#BE185D",  // Dark pink
    800: "#9F1239",  // Very dark pink
  },
  purple: {
    100: "#F3E8FF",  // Very light purple
    200: "#E9D5FF",  // Light purple
    300: "#D8B4FE",  // Medium light purple
    400: "#C084FC",  // Medium purple
    500: "#A855F7",  // Standard purple
    600: "#9333EA",  // Darker purple
    700: "#7E22CE",  // Dark purple
  },
  fuchsia: {
    100: "#FDF4FF",
    200: "#FAE8FF",
    300: "#F5D0FE",
    400: "#F0ABFC",
    500: "#E879F9",
    600: "#D946EF",
  },
  text: {
    900: "#1F2937",  // High contrast dark text
    800: "#374151",  // Dark text
    700: "#4B5563",  // Medium dark text
    600: "#6B7280",  // Medium text
    500: "#9CA3AF",  // Light text for placeholders
  },
  background: {
    light: "#FDF2F8",  // Matches app background #ffe9ef
    white: "#FFFFFF",
  },
} as const;

/* ===== Types & Keys ===== */
type Msg = { role: "user" | "assistant"; content: string; ts?: number; isGreeting?: boolean };
type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Msg[];
};

const SESSIONS_KEY = "Lisa-chat-sessions";
const ACTIVE_KEY = "Lisa-chat-active";
const DATE_LOCALE = "en-US";


/* ===== Utils ===== */
function splitByFences(src: string) {
  const parts: { code: boolean; text: string }[] = [];
  let i = 0;
  const fence = /```[\s\S]*?```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(src))) {
    if (m.index > i) parts.push({ code: false, text: src.slice(i, m.index) });
    parts.push({ code: true, text: m[0] });
    i = m.index + m[0].length;
  }
  if (i < src.length) parts.push({ code: false, text: src.slice(i) });
  return parts;
}

/** Robustly convert “markdown-looking” / HTML-ish text into real Markdown. */
function normalizeMarkdown(src: string): string {
  if (!src) return "";
  let s = src.replace(/\r\n?/g, "\n");

  // Unwrap single full-message fences like ```md ... ```
  s = s.replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i, "$1");

  // Remove zero-width & NBSP
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  s = s.replace(/\u00A0/g, " ");

  // Process non-code chunks for HTML-y artifacts
  const parts = splitByFences(s).map(({ code, text }) => {
    if (code) return { code, text };

    let t = text;

    // Basic HTML list to Markdown
    t = t
      .replace(/<\/li>\s*/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/?(ul|ol)[^>]*>/gi, "\n");

    // Paragraph-like tags → blank lines
    t = t.replace(/<\/?(p|div)[^>]*>/gi, "\n\n");

    // Strip other small tags but keep <br>
    t = t.replace(/<(?!br\s*\/?>)[^>\n]{1,60}>/gi, "");

    // Clean “ | ” separators inside bullet content
    t = t.replace(/^(\s*[-*]\s+.*)$/gm, (line) =>
      line.replace(/\s*\|\s*\|\s*/g, " - ").replace(/\s\|\s/g, " - "),
    );

    // Normalize ATX headings & ensure blank line before
    t = t.replace(
      /^[\t ]*(#{1,6})([ \t]+)([^\n]+)$/gm,
      (_m, hashes, _sp, txt) => `${hashes} ${txt.trim()}`,
    );
    t = t.replace(/([^\n])\n(#{1,6}\s+)/g, "$1\n\n$2");

    // Convert setext to ATX
    t = t.replace(/^([^\n]+)\n[=]{3,}\s*$/gm, (_m, tt) => `# ${tt.trim()}`);
    t = t.replace(/^([^\n]+)\n[-]{3,}\s*$/gm, (_m, tt) => `## ${tt.trim()}`);

    // Prevent accidental 4-space code blocks
    t = t.replace(/^\s{4}([^\n]+)/gm, (_m, line) => line);

    // Collapse excessive blank lines
    t = t.replace(/\n{3,}/g, "\n\n");

    return { code, text: t };
  });

  s = parts.map((p) => p.text).join("");
  return s.trim();
}

// IDs / LS helpers
const uid = () =>
  Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
const safeLSGet = (k: string) => {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(k) : null;
  } catch {
    return null;
  }
};
const safeLSSet = (k: string, v: string) => {
  try {
    if (typeof window !== "undefined") localStorage.setItem(k, v);
  } catch { }
};

/** Build a compact history of previous turns (NOT including the current user message). */
function buildHistory(messages: Msg[], maxChars = 4000): string {
  const lines = messages.map(
    (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.trim()}`,
  );
  const acc: string[] = [];
  let total = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (total + line.length + 1 > maxChars) break;
    acc.push(line);
    total += line.length + 1;
  }
  return acc.reverse().join("\n");
}

/* ===================== */
/*   Markdown Styling    */
/* ===================== */

// Allow only <br> HTML via rehype-raw + sanitize
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "br"],
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch { }
      }}
      className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg border-2 bg-white px-3 py-2 text-sm font-semibold shadow-md transition-all hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-300"
      style={{ borderColor: THEME.pink[300], color: THEME.text[800] }}
      aria-label="Copy code"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}{" "}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// Enhanced markdown renderer with support for headings, dividers, blockquotes, tables, bold, italic
function renderMarkdownText(text: string) {
  if (!text) return null;

  // Split text into blocks (paragraphs, headings, dividers, blockquotes, tables)
  const blocks: Array<{ type: string; content: string }> = [];
  const lines = text.split('\n');
  let currentBlock: { type: string; content: string } | null = null;
  let inTable = false;
  let tableRows: string[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check for horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      blocks.push({ type: 'hr', content: '' });
      return;
    }

    // Check for headings (h1-h5)
    const headingMatch = trimmed.match(/^(#{1,5})\s+(.+)$/);
    if (headingMatch) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      blocks.push({ type: `h${headingMatch[1].length}`, content: headingMatch[2] });
      return;
    }

    // Check for blockquote
    if (trimmed.startsWith('> ')) {
      if (currentBlock?.type !== 'blockquote') {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'blockquote', content: trimmed.slice(2) };
      } else {
        currentBlock.content += '\n' + trimmed.slice(2);
      }
      return;
    }

    // Check for table
    if (trimmed.includes('|') && trimmed.split('|').length >= 3) {
      if (!inTable) {
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        inTable = true;
        tableRows = [];
      }
      // Skip separator row (|---|---|)
      if (!/^[\s|:\-]+$/.test(trimmed)) {
        tableRows.push(trimmed);
      }
      return;
    } else {
      if (inTable && tableRows.length > 0) {
        blocks.push({ type: 'table', content: tableRows.join('\n') });
        tableRows = [];
        inTable = false;
      }
    }

    // Regular paragraph
    if (trimmed) {
      if (currentBlock?.type !== 'paragraph') {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'paragraph', content: trimmed };
      } else {
        currentBlock.content += '\n' + trimmed;
      }
    } else {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
    }
  });

  // Add remaining blocks
  if (inTable && tableRows.length > 0) {
    blocks.push({ type: 'table', content: tableRows.join('\n') });
  }
  if (currentBlock) {
    blocks.push(currentBlock);
  }

  // Render blocks
  return (
    <>
      {blocks.map((block, blockIdx) => {
        if (block.type === 'hr') {
          return (
            <hr
              key={`hr-${blockIdx}`}
              style={{
                border: 'none',
                borderTop: `2px solid ${THEME.pink[200]}`,
                margin: '2rem 0',
                background: `linear-gradient(to right, transparent, ${THEME.pink[300]}, transparent)`,
                height: '1px',
              }}
            />
          );
        }

        if (block.type.startsWith('h')) {
          const level = parseInt(block.type[1]);
          const sizes = { 1: '2.5rem', 2: '2rem', 3: '1.5rem', 4: '1.25rem', 5: '1.1rem' };
          const weights = { 1: 800, 2: 700, 3: 600, 4: 600, 5: 600 };
          const margins = { 1: '1.5rem 0 0.75rem', 2: '1.25rem 0 0.5rem', 3: '1rem 0 0.5rem', 4: '0.75rem 0 0.5rem', 5: '0.75rem 0 0.25rem' };

          return (
            <div
              key={`${block.type}-${blockIdx}`}
              style={{
                fontSize: sizes[level as keyof typeof sizes] || '1rem',
                fontWeight: weights[level as keyof typeof weights] || 600,
                color: THEME.pink[600],
                margin: margins[level as keyof typeof margins] || '0.5rem 0',
                lineHeight: '1.2',
                letterSpacing: '-0.02em',
              }}
            >
              {renderInlineMarkdown(block.content)}
            </div>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={`blockquote-${blockIdx}`}
              style={{
                borderLeft: `4px solid ${THEME.pink[400]}`,
                paddingLeft: '1rem',
                margin: '1rem 0',
                fontStyle: 'italic',
                color: THEME.text[700],
                backgroundColor: THEME.pink[50],
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
              }}
            >
              {block.content.split('\n').map((line, lineIdx) => (
                <div key={lineIdx}>{renderInlineMarkdown(line)}</div>
              ))}
            </blockquote>
          );
        }

        if (block.type === 'table') {
          const rows = block.content.split('\n').filter(r => r.trim());
          if (rows.length === 0) return null;

          const headerRow = rows[0].split('|').map(c => c.trim()).filter(c => c);
          const dataRows = rows.slice(1).map(row =>
            row.split('|').map(c => c.trim()).filter(c => c)
          );

          return (
            <div
              key={`table-${blockIdx}`}
              style={{
                margin: '1rem 0',
                overflowX: 'auto',
                borderRadius: '0.75rem',
                border: `1px solid ${THEME.pink[200]}`,
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: THEME.pink[100] }}>
                    {headerRow.map((cell, cellIdx) => (
                      <th
                        key={cellIdx}
                        style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'left',
                          fontWeight: 700,
                          color: THEME.text[900],
                          borderBottom: `2px solid ${THEME.pink[300]}`,
                        }}
                      >
                        {renderInlineMarkdown(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      style={{
                        backgroundColor: rowIdx % 2 === 0 ? 'white' : THEME.pink[50],
                      }}
                    >
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          style={{
                            padding: '0.75rem 1rem',
                            borderBottom: `1px solid ${THEME.pink[200]}`,
                            color: THEME.text[800],
                          }}
                        >
                          {renderInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p
            key={`para-${blockIdx}`}
            style={{
              marginBottom: blockIdx < blocks.length - 1 ? '1rem' : '0',
              fontSize: '1.125rem',
              lineHeight: '1.4',
              color: THEME.text[900],
              fontWeight: 500,
              letterSpacing: '0.01em',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
            }}
          >
            {renderInlineMarkdown(block.content)}
          </p>
        );
      })}
    </>
  );
}

// Helper function to render inline markdown (bold, italic) within text
function renderInlineMarkdown(text: string) {
  if (!text) return null;

  const parts: (string | React.ReactElement)[] = [];
  let currentIndex = 0;
  let keyCounter = 0;

  // Match **bold**, *italic*, and ~~strikethrough~~
  // First collect all bold matches to exclude them from italic matching
  const boldMatches: Array<{ start: number; end: number }> = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let boldMatch;
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    boldMatches.push({ start: boldMatch.index, end: boldMatch.index + boldMatch[0].length });
  }

  // Collect strikethrough matches
  const strikethroughMatches: Array<{ start: number; end: number }> = [];
  const strikethroughRegex = /~~(.+?)~~/g;
  let strikethroughMatch;
  while ((strikethroughMatch = strikethroughRegex.exec(text)) !== null) {
    strikethroughMatches.push({ start: strikethroughMatch.index, end: strikethroughMatch.index + strikethroughMatch[0].length });
  }

  const matches: Array<{ start: number; end: number; content: string; type: string }> = [];

  // Add bold matches
  boldMatches.forEach(({ start, end }) => {
    const content = text.slice(start + 2, end - 2);
    matches.push({ start, end, content, type: 'bold' });
  });

  // Add strikethrough matches
  strikethroughMatches.forEach(({ start, end }) => {
    const content = text.slice(start + 2, end - 2);
    matches.push({ start, end, content, type: 'strikethrough' });
  });

  // Add italic matches, but exclude those that overlap with bold or strikethrough
  const italicRegex = /\*([^*]+?)\*/g;
  let italicMatch;
  while ((italicMatch = italicRegex.exec(text)) !== null) {
    const start = italicMatch.index;
    const end = start + italicMatch[0].length;
    // Check if this italic match overlaps with any bold or strikethrough match
    const overlaps = boldMatches.some(bm =>
      (start >= bm.start && start < bm.end) ||
      (end > bm.start && end <= bm.end) ||
      (start <= bm.start && end >= bm.end)
    ) || strikethroughMatches.some(sm =>
      (start >= sm.start && start < sm.end) ||
      (end > sm.start && end <= sm.end) ||
      (start <= sm.start && end >= sm.end)
    );
    if (!overlaps) {
      matches.push({ start, end, content: italicMatch[1], type: 'italic' });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  matches.forEach((match) => {
    if (match.start > currentIndex) {
      const beforeText = text.slice(currentIndex, match.start);
      if (beforeText) {
        parts.push(beforeText);
      }
    }

    if (match.type === 'bold') {
      parts.push(
        <strong key={`bold-${keyCounter++}`} style={{ fontWeight: 700, color: THEME.text[900] }}>
          {match.content}
        </strong>
      );
    } else if (match.type === 'italic') {
      parts.push(
        <em key={`italic-${keyCounter++}`} style={{ fontStyle: 'italic' }}>
          {match.content}
        </em>
      );
    } else if (match.type === 'strikethrough') {
      parts.push(
        <del key={`strikethrough-${keyCounter++}`} style={{ textDecoration: 'line-through', opacity: 0.7 }}>
          {match.content}
        </del>
      );
    }

    currentIndex = match.end;
  });

  if (currentIndex < text.length) {
    parts.push(text.slice(currentIndex));
  }

  if (parts.length === 0) {
    return text;
  }

  return <>{parts}</>;
}

const MarkdownBubble = React.memo(function MarkdownBubble({ children }: { children: string }) {
  const text = useMemo(() => normalizeMarkdown(children), [children]);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const strip = (props: any) => {
    const { ...rest } = props || {};
    return rest;
  };

  const bubbleMotionProps = prefersReduced
    ? {}
    : {
      initial: { opacity: 0, y: 10, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      transition: { duration: 0.7 },
    };

  return (
    <motion.div
      {...bubbleMotionProps}
      className="prose prose-slate max-w-none prose-xl md:prose-2xl prose-headings:font-bold prose-p:my-5 prose-p:text-xl prose-p:leading-loose prose-strong:font-bold prose-a:no-underline prose-a:font-semibold prose-li:my-3 prose-li:text-xl prose-blockquote:font-normal prose-img:my-5 prose-h1:text-4xl md:prose-h1:text-6xl prose-h2:text-3xl prose-h3:text-2xl"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        skipHtml={false}
        components={{
          h1(p: any) {
            const { children, ...rest } = p;
            return (
              <h1
                {...strip(rest)}
                className="mt-1 mb-5 flex items-center gap-3 text-5xl font-extrabold tracking-tight md:text-6xl"
                style={{ color: THEME.pink[600] }}
              >
                {children}
              </h1>
            );
          },
          h2(p: any) {
            const { children, ...rest } = p;
            return (
              <h2
                {...strip(rest)}
                className="mt-7 mb-4 flex items-center gap-3 text-4xl font-bold"
                style={{ color: THEME.text[900] }}
              >
                <span className="inline-block h-6 w-1.5 rounded-full" style={{ backgroundColor: THEME.pink[400] }} />
                {children}
              </h2>
            );
          },
          h3(p: any) {
            const { children, ...rest } = p;
            return (
              <h3
                {...strip(rest)}
                className="mt-4 mb-3 text-2xl font-bold"
                style={{ color: THEME.text[900] }}
              >
                {children}
              </h3>
            );
          },
          h4(p: any) {
            const { children, ...rest } = p;
            return (
              <h4
                {...strip(rest)}
                className="mt-3 mb-2 text-xl font-semibold"
                style={{ color: THEME.text[900] }}
              >
                {children}
              </h4>
            );
          },
          h5(p: any) {
            const { children, ...rest } = p;
            return (
              <h5
                {...strip(rest)}
                className="mt-3 mb-2 text-lg font-semibold"
                style={{ color: THEME.text[800] }}
              >
                {children}
              </h5>
            );
          },
          p(p: any) {
            const { children, ...rest } = p;
            return (
              <p
                {...strip(rest)}
                className="my-2 text-base leading-relaxed text-slate-800/95"
                style={{ lineHeight: '1.4' }}
              >
                {children}
              </p>
            );
          },
          hr() {
            return (
              <hr className="my-4 h-0.5 border-0 bg-linear-to-r from-transparent via-[#B7A3DE]/60 to-transparent" />
            );
          },
          a(p: any) {
            const { children, ...rest } = p;
            return (
              <a
                {...strip(rest)}
                className="group inline-flex items-center gap-1 underline decoration-2 decoration-dotted underline-offset-[5px] text-[#57407F] hover:underline-offset-[7px]"
                target="_blank"
                rel="noreferrer noopener"
              >
                <LinkIcon className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-px group-hover:scale-110" />
                {children}
              </a>
            );
          },
          ul(p: any) {
            const { children, ...rest } = p;
            return (
              <ul {...strip(rest)} className="my-4 space-y-2 pl-5">
                {children}
              </ul>
            );
          },
          ol(p: any) {
            const { children, ...rest } = p;
            return (
              <ol
                {...strip(rest)}
                className="my-4 list-decimal space-y-2 pl-6"
              >
                {children}
              </ol>
            );
          },
          li(p: any) {
            const { children, ...rest } = p;
            return (
              <li {...strip(rest)} className="relative pl-7">
                <span className="absolute left-0 top-3 h-2 w-2 rounded-full bg-[#927DC7]/60" />
                {children}
              </li>
            );
          },
          blockquote(p: any) {
            const first =
              typeof p?.children?.[0] === "string"
                ? (p.children[0] as string)
                : "";
            const m = first.match(/^\s*\[\!(tip|note|caution)\]\s*/i);

            if (!m) {
              return (
                <blockquote className="my-4 rounded-xl border-l-4 p-3 text-base" style={{ borderColor: THEME.pink[400], backgroundColor: THEME.pink[50], color: THEME.text[800], lineHeight: '1.4' }}>
                  {p.children}
                </blockquote>
              );
            }

            const kind = m[1].toLowerCase() as "tip" | "note" | "caution";

            const colorMap: Record<
              "tip" | "note" | "caution",
              { ring: string; bg: string; text: string; title: string }
            > = {
              tip: {
                ring: "#4E9A92",
                bg: "#F1FAF8",
                text: "#155E54",
                title: "Tip",
              },
              note: {
                ring: "#927DC7",
                bg: "#F7F3FB",
                text: "#57407F",
                title: "Note",
              },
              caution: {
                ring: "#F59E0B",
                bg: "#FFF7ED",
                text: "#7C2D12",
                title: "Caution",
              },
            };

            const colors = colorMap[kind] ?? colorMap.note;

            const cleaned = Array.isArray(p.children)
              ? p.children.map((ch: any, i: number) =>
                typeof ch === "string" && i === 0
                  ? ch.replace(/^\s*\[\!(tip|note|caution)\]\s*/i, "")
                  : ch,
              )
              : p.children;

            return (
              <blockquote
                className="my-3 rounded-xl border-l-4 p-3"
                style={{
                  borderColor: colors.ring,
                  backgroundColor: colors.bg,
                  color: colors.text,
                  lineHeight: '1.4',
                }}
              >
                <div className="mb-1 flex items-center gap-2 font-medium text-sm">
                  <Quote className="h-4 w-4" /> {colors.title}
                </div>
                <div className="text-slate-800/90 text-base">{cleaned}</div>
              </blockquote>
            );
          },
          table(p: any) {
            const { children, ...rest } = p;
            return (
              <div className="my-4 overflow-hidden rounded-xl border-2 bg-white shadow-md" style={{ borderColor: THEME.pink[200] }}>
                <table {...strip(rest)} className="w-full text-base">
                  {children}
                </table>
              </div>
            );
          },
          thead(p: any) {
            const { children, ...rest } = p;
            return (
              <thead {...strip(rest)} className="font-semibold" style={{ backgroundColor: THEME.pink[100], color: THEME.text[800] }}>
                {children}
              </thead>
            );
          },
          th(p: any) {
            const { children, ...rest } = p;
            return (
              <th
                {...strip(rest)}
                className="px-4 py-2 text-left text-sm font-bold uppercase tracking-wide"
                style={{ color: THEME.text[700] }}
              >
                {children}
              </th>
            );
          },
          td(p: any) {
            const { children, ...rest } = p;
            return (
              <td
                {...strip(rest)}
                className="border-t px-4 py-2 text-base"
                style={{ borderColor: THEME.pink[200], color: THEME.text[900] }}
              >
                {children}
              </td>
            );
          },
          img(p: any) {
            const { alt, ...rest } = p;
            return (
              <div className="my-3 overflow-hidden rounded-xl border-2 bg-white" style={{ borderColor: THEME.pink[200] }}>
                <Image
                  {...strip(rest)}
                  alt={alt ?? ""}
                  className="mx-auto block h-auto max-h-80 w-full max-w-full object-contain"
                />
                {alt && (
                  <div className="px-3 pb-2 pt-1.5 text-center text-sm font-semibold" style={{ color: THEME.text[600] }}>
                    {alt}
                  </div>
                )}
              </div>
            );
          },
          code(p: any) {
            const { inline, className, children, ...rest } = p;
            const txt = String(children ?? "");
            const match = /language-([\w-]+)/.exec(className || "");
            const language = match?.[1];

            if (inline) {
              return (
                <code
                  {...strip(rest)}
                  className="rounded-md px-2 py-1 text-sm font-mono"
                  style={{ backgroundColor: THEME.pink[100], color: THEME.text[900] }}
                >
                  {txt}
                </code>
              );
            }

            return (
              <pre className="relative my-3 overflow-hidden rounded-xl border-2 bg-white" style={{ borderColor: THEME.pink[200] }}>
                <div className="flex items-center justify-between border-b-2 px-3 py-2 text-xs uppercase tracking-wide font-semibold" style={{ borderColor: THEME.pink[200], backgroundColor: THEME.pink[100], color: THEME.text[700] }}>
                  <span>{language || "code"}</span>
                </div>
                <div className="relative">
                  <CopyButton text={txt} />
                  <code
                    {...strip(rest)}
                    className="block min-w-full whitespace-pre px-3 pb-3 pt-2 font-mono text-[13px] leading-6"
                  >
                    {txt}
                  </code>
                </div>
              </pre>
            );
          },
          del(p: any) {
            const { children, ...rest } = p;
            return (
              <del
                {...strip(rest)}
                style={{ textDecoration: 'line-through', opacity: 0.7 }}
              >
                {children}
              </del>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </motion.div>
  );
});

/* ===== LocalStorage hydration with normalization ===== */
function hydrate(raw: string | null): Conversation[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Conversation[];
    return parsed.map((c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.role === "assistant"
          ? { ...m, content: normalizeMarkdown(m.content) }
          : m,
      ),
    }));
  } catch {
    return null;
  }
}

const lisaImages = ["/lisa.png", "/lisa2.png", "/lisa3.png", "/lisa4.png", "/lisa5.png"];

function ChatPageInner() {
  const router = useRouter();

  /* ---- State ---- */
  const [sessions, setSessions] = useState<Conversation[]>(() => {
    const normalized = hydrate(safeLSGet(SESSIONS_KEY));
    if (normalized) return normalized;

    // start with no sessions; we'll create one on first mount
    return [];
  });


  const [activeId, setActiveId] = useState<string | null>(() => {
    const raw = safeLSGet(ACTIVE_KEY);
    if (raw) return raw;
    const rawS = safeLSGet(SESSIONS_KEY);
    if (rawS) {
      try {
        const parsed: Conversation[] = JSON.parse(rawS);
        return parsed[0]?.id ?? null;
      } catch { }
    }
    return null;
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLisaThinking, setIsLisaThinking] = useState(false);
  const [lisaImageIndex, setLisaImageIndex] = useState(0);

  // ✅ auth user id (no localStorage)
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
      },
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Animate through Lisa images when sending/thinking
  useEffect(() => {
    if (!isLisaThinking) {
      // Reset to first image when not thinking
      setLisaImageIndex(0);
      return;
    }

    // Start animation when thinking
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % lisaImages.length;
      setLisaImageIndex(currentIndex);
    }, 500); // Change image every 500ms for fast animation (2s total for 4 images)

    return () => clearInterval(interval);
  }, [isLisaThinking]);


  // Chat list refs (auto-scroll)
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef(false);
  const [stickToBottom, setStickToBottom] = useState(true);



  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );

  /* ---- Persist ---- */
  useEffect(() => {
    safeLSSet(SESSIONS_KEY, JSON.stringify(sessions));
    if (activeId) safeLSSet(ACTIVE_KEY, activeId);
  }, [sessions, activeId]);

  /* ---- Auto-scroll behavior ---- */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const threshold = 120;
      const nearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      setStickToBottom(nearBottom);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (stickToBottom) {
        // Scroll to bottom to ensure full visibility
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [stickToBottom]);

  useEffect(() => {
    if (stickToBottom) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        const el = listRef.current;
        if (el) {
          // Scroll to absolute bottom to ensure full visibility
          el.scrollTop = el.scrollHeight;
        }
      }, 100);
    }
  }, [sessions, activeId, loading, stickToBottom, streamingContent]);

  /* ---- Textarea autosize ---- */
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!input || input.trim() === "") {
      // Reset to normal height when input is empty
      el.style.height = "44px";
    } else {
      el.style.height = "0px";
      el.style.height = Math.min(200, el.scrollHeight) + "px";
    }
  }, [input]);

  /* ---- Helpers ---- */
  const upsertAndAppendMessage = useCallback(
    (convId: string, msg: Msg, makeIfMissing?: () => Conversation) => {
      setSessions((prev) => {
        const i = prev.findIndex((c) => c.id === convId);
        if (i === -1) {
          const base =
            makeIfMissing?.() ?? {
              id: convId,
              title: "Menopause Support Chat",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              messages: [],
            };
          const created: Conversation = {
            ...base,
            messages: [
              ...base.messages,
              { ...msg, ts: msg.ts ?? Date.now() },
            ],
            updatedAt: Date.now(),
          };
          return [created, ...prev];
        }
        const next = [...prev];
        const c = next[i];
        next[i] = {
          ...c,
          messages: [...c.messages, { ...msg, ts: msg.ts ?? Date.now() }],
          updatedAt: Date.now(),
          title:
            c.title === "Menopause Support Chat" &&
              msg.role === "user" &&
              msg.content
              ? msg.content.slice(0, 40)
              : c.title,
        };
        return next;
      });
    },
    [],
  );

  const newChat = useCallback(async (): Promise<string> => {
    const id = uid();
    const now = Date.now();

    // Fetch personalized greeting
    let greeting = "Hey, it's Lisa 🌸🌸🌸";

    if (userId) {
      try {
        const res = await fetch("/api/langchain-rag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            userInput: "",
            stream: false,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.reply) {
            // Strip markdown formatting from personalized greeting
            let personalizedGreeting = data.reply;
            // Remove markdown headers, bold, etc.
            personalizedGreeting = personalizedGreeting.replace(/^#+\s*/gm, '');
            personalizedGreeting = personalizedGreeting.replace(/\*\*(.*?)\*\*/g, '$1');
            personalizedGreeting = personalizedGreeting.replace(/\*(.*?)\*/g, '$1');
            personalizedGreeting = personalizedGreeting.replace(/\n\n+/g, '\n').trim();
            greeting = personalizedGreeting || "Hey, it's Lisa";
          }
        }
      } catch (error) {
        // Use default greeting on error
        console.error("Error fetching personalized greeting:", error);
      }
    }

    const conv: Conversation = {
      id,
      title: "Menopause Support Chat",
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          role: "assistant",
          content: greeting,
          ts: now,
          isGreeting: true,
        },
      ],
    };
    setSessions((prev) => [conv, ...prev]);
    setActiveId(id);
    setMenuOpen(false);
    setInput("");
    setStickToBottom(true);
    return id;
  }, [userId]);

  const openChat = useCallback((id: string) => {
    setActiveId(id);
    setMenuOpen(false);
    setStickToBottom(true);
  }, []);
  // Always start with a fresh chat when the page is opened
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    // Create a new chat and make it active on first mount,
    // regardless of any existing history.
    void newChat();
  }, [newChat]);


  /* ---- API ---- */
  const sendToAPI = useCallback(
    async (text: string, targetId?: string) => {
      const id = targetId ?? activeId;
      if (!id) return;

      upsertAndAppendMessage(
        id,
        { role: "user", content: text },
        () => ({
          id,
          title: "Menopause Support Chat",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [
            {
              role: "assistant",
              content: "Hey, it's Lisa",
              ts: Date.now(),
            },
          ],
        }),
      );

      setInput("");
      setLoading(true);
      setIsStreaming(true);
      setIsLisaThinking(true);
      setStreamingContent("");
      setStreamingMessageId(id);
      setStickToBottom(true);

      try {
        const convo = sessions.find((s) => s.id === id);
        const priorMessages = convo?.messages ?? [];
        const history = buildHistory(priorMessages);

        // ✅ always use Supabase auth id
        let finalUserId = userId;
        if (!finalUserId) {
          const { data } = await supabase.auth.getUser();
          finalUserId = data.user?.id ?? null;
        }
        if (!finalUserId) throw new Error("User not authenticated.");

        const res = await fetch("/api/langchain-rag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: finalUserId,
            userInput: text,
            history,
            stream: true, // Enable streaming
          }),
          cache: "no-store",
        });

        if (!res.ok) {
          const errorText = await res.text();
          let errorData: any = null;
          try {
            errorData = JSON.parse(errorText);
          } catch { }
          const msg =
            errorData?.error ||
            errorData?.message ||
            `${res.status} ${res.statusText}`;
          throw new Error(msg);
        }

        // Check if response is streaming (text/event-stream) or JSON
        const contentType = res.headers.get("content-type");

        if (contentType?.includes("text/event-stream")) {
          // Handle streaming response
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error("No response body");
          }

          // Create a placeholder message for streaming if it doesn't exist
          setStreamingMessageId(id);
          setStreamingContent("");

          // Ensure there's a placeholder assistant message
          const convo = sessions.find((s) => s.id === id);
          const lastMsg = convo?.messages[convo.messages.length - 1];
          if (!lastMsg || lastMsg.role !== "assistant" || lastMsg.content) {
            upsertAndAppendMessage(id, {
              role: "assistant",
              content: "",
              ts: Date.now(),
            });
          }

          let buffer = "";
          let fullResponse = "";

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.trim() && line.startsWith("data: ")) {
                  try {
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr) continue;

                    const data = JSON.parse(jsonStr);

                    if (data.type === "chunk" && data.content !== undefined) {
                      // Backend sends accumulated content, so use it directly
                      fullResponse = data.content;

                      // Use requestAnimationFrame for smoother updates with debouncing
                      if (typeof window !== 'undefined') {
                        requestAnimationFrame(() => {
                          setStreamingContent(fullResponse);

                          // Smooth auto-scroll during streaming
                          if (stickToBottom) {
                            requestAnimationFrame(() => {
                              const el = listRef.current;
                              if (el) {
                                el.scrollTop = el.scrollHeight;
                              }
                            });
                          }
                        });
                      }
                    } else if (data.type === "done") {
                      // Streaming complete
                      const reply = normalizeMarkdown(fullResponse);
                      setSessions((prev) => {
                        const updated = prev.map((s) => {
                          if (s.id === id) {
                            const msgs = [...s.messages];
                            const lastMsg = msgs[msgs.length - 1];
                            if (lastMsg && lastMsg.role === "assistant" && !lastMsg.content) {
                              msgs[msgs.length - 1] = { ...lastMsg, content: reply };
                            } else {
                              msgs.push({ role: "assistant", content: reply, ts: Date.now() });
                            }
                            return { ...s, messages: msgs, updatedAt: Date.now() };
                          }
                          return s;
                        });
                        return updated;
                      });
                      setStreamingContent("");
                      setStreamingMessageId(null);
                      setIsStreaming(false);
                      setLoading(false);
                      setIsLisaThinking(false);
                      return;
                    } else if (data.type === "error") {
                      throw new Error(data.error || "Streaming error");
                    }
                  } catch (e) {
                    // Skip malformed JSON, but log for debugging
                    if (line.trim() !== "data: [DONE]" && !line.trim().startsWith(":")) {
                      console.warn("Error parsing SSE data:", e, "Line:", line);
                    }
                  }
                }
              }
            }

            // Fallback: if we didn't get a "done" message, save what we have
            if (fullResponse) {
              const reply = normalizeMarkdown(fullResponse);
              setSessions((prev) => {
                const updated = prev.map((s) => {
                  if (s.id === id) {
                    const msgs = [...s.messages];
                    const lastMsg = msgs[msgs.length - 1];
                    if (lastMsg && lastMsg.role === "assistant" && !lastMsg.content) {
                      msgs[msgs.length - 1] = { ...lastMsg, content: reply };
                    } else {
                      msgs.push({ role: "assistant", content: reply, ts: Date.now() });
                    }
                    return { ...s, messages: msgs, updatedAt: Date.now() };
                  }
                  return s;
                });
                return updated;
              });
            }
          } catch (streamError: any) {
            console.error("Streaming error:", streamError);
            throw streamError;
          } finally {
            setStreamingContent("");
            setStreamingMessageId(null);
            setIsStreaming(false);
            setLoading(false);
            setIsLisaThinking(false);
          }
        } else {
          // Non-streaming response (fallback)
          const raw = await res.text();
          let data: any = null;
          try {
            data = JSON.parse(raw);
          } catch { }

          const rawReply: string =
            data?.reply ??
            data?.outputs?.output_0 ??
            data?.outputs?.output ??
            data?.outputs?.answer ??
            (data?.outputs
              ? (Object.values(data.outputs).find(
                (v: any) => typeof v === "string",
              ) as string)
              : "") ??
            "⚠️ Empty reply";

          const reply = normalizeMarkdown(rawReply);
          upsertAndAppendMessage(id, { role: "assistant", content: reply });
          setStreamingContent("");
          setStreamingMessageId(null);
          setIsStreaming(false);
          setLoading(false);
          setIsLisaThinking(false);
        }
      } catch (e: any) {
        const safeMsg = String(e?.message || "unknown error").replace(
          /<[^>]*>/g,
          "",
        );
        upsertAndAppendMessage(id, {
          role: "assistant",
          content: `Oops, something went wrong 🧠 - ${safeMsg}`,
        });
        setStreamingContent("");
        setStreamingMessageId(null);
        setIsStreaming(false);
        setLoading(false);
        setIsLisaThinking(false);
      }
    },
    [activeId, sessions, upsertAndAppendMessage, userId, stickToBottom],
  );

  /* ---- UI ---- */
  const SidebarContent = (
    <div className="flex h-full flex-col">

      <button
        onClick={() => {
          void newChat();
          if (window.innerWidth < 1024) {
            setMenuOpen(false);
          }
        }}
        className="inline-flex mb-4 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-pink-400 text-white px-3 py-2 text-sm font-semibold transition-all active:bg-pink-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-pink-300 touch-manipulation shadow-md"
        title="New chat"
        aria-label="Start a new chat"
      >
        <Plus className="h-4 w-4" />
        <span>New Chat</span>
      </button>

      <h4 className="hidden lg:block mt-4 mb-2 px-3 text-sm font-bold" style={{ color: THEME.text[800] }}>
        History
      </h4>
      <nav className="space-y-2 overflow-y-auto overflow-x-hidden flex-1 pr-3 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {sessions.length === 0 && (
          <div className="px-5 py-7 text-center text-lg" style={{ color: THEME.text[600] }}>
            No conversations yet.
            <div className="mt-3 text-base">Start a new chat to begin!</div>
          </div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`group relative flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-sm transition-all active:scale-[0.98] touch-manipulation ${s.id === activeId
                ? "bg-pink-300 shadow-sm"
                : "bg-white/60 active:bg-white/80 hover:bg-white/70"
              }`}
            onClick={() => {
              openChat(s.id);
              if (window.innerWidth < 1024) {
                setMenuOpen(false);
              }
            }}
            title="Open chat"
            role="button"
            aria-label={`Open chat: ${s.title || "Conversation"}`}
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm leading-snug mb-0.5 line-clamp-2" style={{ color: THEME.text[900] }}>
                {s.title || "Conversation"}
              </div>
              <div className="text-xs" style={{ color: THEME.text[600] }}>
                {new Date(s.updatedAt).toLocaleDateString(DATE_LOCALE, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSessions((prev) => {
                  const rest = prev.filter((x) => x.id !== s.id);
                  setActiveId((curr) =>
                    curr === s.id ? rest[0]?.id ?? null : curr,
                  );
                  return rest;
                });
              }}
              className="cursor-pointer p-1.5 rounded-lg transition-all active:bg-red-100 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-300 touch-manipulation shrink-0"
              title="Delete chat"
              aria-label="Delete chat"
              style={{ color: THEME.text[700] }}
            >
              <Trash className="h-4 w-4" />
            </button>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${THEME.pink[100]};
          border-radius: 10px;
          margin: 8px 0;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, ${THEME.pink[400]}, ${THEME.pink[500]});
          border-radius: 10px;
          border: 2px solid ${THEME.pink[100]};
          transition: all 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, ${THEME.pink[500]}, ${THEME.pink[600]});
        }
        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${THEME.pink[400]} ${THEME.pink[100]};
        }
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.2; }
        }
        .streaming-cursor {
          animation: blink 1s ease-in-out infinite;
        }
        .streaming-content {
          transition: opacity 0.15s ease-in-out;
        }
        .streaming-text {
          animation: fadeIn 0.2s ease-in;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        #composer::placeholder {
          color: #6B7280;
          opacity: 1;
          line-height: 1.5;
          vertical-align: middle;
        }
        #composer {
          display: flex;
          align-items: center;
        }
      `}</style>
      <div
        className="flex h-screen w-full text-foreground transition-all duration-500 ease-in-out relative overflow-hidden"
        style={{
          color: THEME.text[900],
        }}
      >
        {/* Nature-inspired gradient background with texture */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 120% 80% at 20% 20%, rgba(255, 182, 193, 0.5) 0%, transparent 60%),
              radial-gradient(ellipse 100% 70% at 80% 60%, rgba(221, 160, 221, 0.4) 0%, transparent 60%),
              radial-gradient(ellipse 90% 60% at 50% 80%, rgba(255, 228, 225, 0.35) 0%, transparent 60%),
              radial-gradient(ellipse 70% 50% at 10% 50%, rgba(255, 192, 203, 0.3) 0%, transparent 50%),
              linear-gradient(135deg, 
                #FDF2F8 0%, 
                #FCE7F3 20%, 
                #F9E8FF 40%,
                #F3E8FF 60%, 
                #E9D5FF 80%, 
                #FDF4FF 100%
              )
            `,
          }}
        >
          {/* Subtle texture overlay */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `
                radial-gradient(circle at 2px 2px, rgba(236, 72, 153, 0.15) 1px, transparent 0),
                radial-gradient(circle at 8px 8px, rgba(168, 85, 247, 0.1) 1px, transparent 0)
              `,
              backgroundSize: '20px 20px, 16px 16px',
            }}
          />
          {/* Soft cloud-like shapes */}
          <div
            className="absolute top-0 left-0 w-full h-full opacity-25"
            style={{
              background: `
                radial-gradient(ellipse 900px 500px at 15% 15%, rgba(255, 182, 193, 0.45), transparent),
                radial-gradient(ellipse 700px 600px at 85% 35%, rgba(221, 160, 221, 0.35), transparent),
                radial-gradient(ellipse 800px 450px at 45% 75%, rgba(255, 228, 225, 0.35), transparent),
                radial-gradient(ellipse 600px 400px at 5% 50%, rgba(255, 192, 203, 0.3), transparent)
              `,
            }}
          />
        </div>
        <div className="relative z-10 flex h-full w-full">
          {/* Sidebar - Desktop */}
          <aside
            className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block"
            aria-label="Sidebar"
          >
            <div
              className="h-full rounded-none border-r border-foreground/10 p-4 shadow-sm backdrop-blur-md"
              style={{
                backgroundColor: `rgba(252, 231, 243, 0.85)`,
                backdropFilter: 'blur(10px)',
              }}
            >
              {SidebarContent}
            </div>
          </aside>

          {/* Mobile Sidebar Backdrop */}
          {menuOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Sidebar - Mobile (Toggleable) */}
          <aside
            className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] lg:hidden transform transition-transform duration-300 ease-in-out ${menuOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            aria-label="Mobile Sidebar"
          >
            <div
              className="h-full border-r-2 p-3 sm:p-4 backdrop-blur-md"
              style={{
                backgroundColor: `rgba(255, 255, 255, 0.95)`,
                backdropFilter: 'blur(10px)',
                borderColor: THEME.pink[300],
                boxShadow: menuOpen ? "4px 0 24px rgba(0, 0, 0, 0.15)" : "none"
              }}
            >
              <div className="flex items-center justify-between mb-3 pb-3 border-b-2" style={{ borderColor: THEME.pink[200] }}>
                <h2 className="text-2xl font-bold" style={{ color: THEME.text[900] }}>History</h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-3 rounded-lg transition-all hover:bg-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  aria-label="Close menu"
                  style={{ color: THEME.text[800] }}
                >
                  <X className="h-7 w-7" />
                </button>
              </div>
              {SidebarContent}
            </div>
          </aside>

          {/* Main */}
          <main className="flex min-w-0 flex-1 flex-col transition-all duration-500 ease-in-out lg:pl-72">
            {/* Top bar (mobile) */}
            <div className="fixed w-full z-100 top-0 flex items-center justify-between  px-4 py-2 lg:hidden bg-pink-200/30 backdrop-blur-lg " style={{
            }}>
              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 rounded-lg transition-all active:bg-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-300 touch-manipulation"
                aria-label="Open history"
                style={{ color: THEME.text[800] }}
              >
                <History className="h-6 w-6" />
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg transition-all active:bg-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-300 touch-manipulation"
                aria-label="Close chat"
                style={{ color: THEME.text[800] }}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Top bar (desktop) - Close button */}
            <div className="hidden lg:flex fixed top-0 right-0 z-50 items-center justify-end p-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg transition-all hover:bg-pink-100 active:bg-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                aria-label="Close chat"
                style={{ color: THEME.text[800] }}
              >
                <X className="h-6 w-6" />
              </button>
            </div>


            {/* Chat */}
            <section
              ref={listRef}
              className="flex-1 pt-12 overflow-y-auto relative"
              style={{
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: '120px',
              }}
            >
              {/* Fixed background character image positioned at bottom-right */}
              <div className="fixed right-0 bottom-0 pointer-events-none z-0" style={{ right: '5%', bottom: '140px' }}>
                <div className="relative w-[180px] h-[180px] sm:w-60 sm:h-60 md:w-[300px] md:h-[300px] opacity-15">
                  {lisaImages.map((src, index) => (
                    <Image
                      key={src}
                      src={src}
                      alt={`Lisa ${index + 1}`}
                      width={300}
                      height={300}
                      className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ease-in-out ${index === lisaImageIndex ? "opacity-100" : "opacity-0"
                        }`}
                    />
                  ))}
                </div>
              </div>

              <div className="relative z-10 mx-auto w-full max-w-3xl px-4 sm:px-6 py-3 sm:py-4 space-y-3">
                {(active?.messages ?? []).filter(m => m.content || (isStreaming && m.role === "assistant")).map((m, i) => {
                  const isUser = m.role === "user";
                  // Check if this is the streaming message: it's the last assistant message and we're currently streaming
                  const isLastMessage = i === (active?.messages ?? []).length - 1;
                  const isStreamingMsg = isStreaming && !isUser && streamingMessageId === activeId && isLastMessage && (streamingContent || m.content === "");
                  return (
                    <div
                      key={`${m.ts ?? i}-${i}`}
                      className={`flex items-start gap-2 sm:gap-3 ${isUser ? "justify-end" : ""
                        }`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-3 text-base leading-relaxed sm:px-5 sm:py-4 sm:text-lg transition-all backdrop-blur-sm ${isUser
                            ? "ml-auto max-w-[90%] sm:max-w-[80%] shadow-lg"
                            : "max-w-[90%] sm:max-w-[80%] bg-white/95 ring-1 shadow-lg"
                          }`}
                        style={{
                          lineHeight: '1.4',
                          ...(isUser
                            ? {
                              backgroundColor: `rgba(251, 207, 232, 0.9)`,
                              backdropFilter: 'blur(10px)',
                              color: THEME.text[900],
                              boxShadow: "0 4px 16px rgba(236, 72, 153, 0.25)",
                            }
                            : {
                              backgroundColor: `rgba(255, 255, 255, 0.95)`,
                              backdropFilter: 'blur(10px)',
                              color: THEME.text[900],
                              borderColor: THEME.pink[200],
                              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
                            })
                        }}
                      >
                        {isStreamingMsg ? (
                          <div className="relative w-full min-h-5 streaming-content">
                            {streamingContent ? (
                              <div className="streaming-text wrap-break-words" style={{
                                fontSize: '1rem',
                                lineHeight: '1.4',
                                color: THEME.text[900],
                                fontWeight: 500,
                                letterSpacing: '0.01em',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                              }}>
                                {renderMarkdownText(streamingContent)}
                                <span
                                  className="inline-block w-0.5 h-5 ml-1 mb-0.5 align-middle rounded-sm streaming-cursor"
                                  style={{
                                    backgroundColor: THEME.pink[500],
                                    transition: 'opacity 0.2s ease-in-out',
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 text-lg" style={{ color: THEME.text[600] }}>
                                <div className="flex gap-2">
                                  <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: THEME.pink[400], animationDelay: "0ms" }} />
                                  <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: THEME.pink[400], animationDelay: "150ms" }} />
                                  <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: THEME.pink[400], animationDelay: "300ms" }} />
                                </div>
                                <span className="italic">Lisa is typing...</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {m.isGreeting ? (
                              <div className="text-xl sm:text-2xl font-bold" style={{ color: THEME.pink[600], lineHeight: '1.4' }}>
                                {m.content}
                              </div>
                            ) : (
                              <div className="wrap-break-words" style={{
                                fontSize: '1rem',
                                lineHeight: '1.4',
                                color: THEME.text[900],
                                fontWeight: 500,
                                letterSpacing: '0.01em',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                              }}>
                                {renderMarkdownText(m.content)}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {loading && !isStreaming && (
                  <div className="flex items-center gap-3 pl-10 sm:pl-12 text-base sm:text-lg" style={{ color: THEME.text[700] }}>
                    <div className="flex gap-2">
                      <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: THEME.pink[500], animationDelay: "0ms" }} />
                      <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: THEME.pink[500], animationDelay: "150ms" }} />
                      <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: THEME.pink[500], animationDelay: "300ms" }} />
                    </div>
                    <span className="italic font-medium">Lisa is thinking...</span>
                  </div>
                )}
                <div ref={bottomRef} style={{ height: '1px', marginTop: '1rem' }} />
              </div>
            </section>

            {/* Composer */}
            <footer className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md safe-area-inset-bottom lg:left-72" style={{
              backdropFilter: 'blur(10px)',
              borderColor: THEME.pink[300],
              paddingBottom: 'env(safe-area-inset-bottom, 0)',
              backgroundColor: 'transparent',
            }}>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const text = input.trim();
                  if (!text || loading) return;
                  const id = activeId ?? await newChat();
                  // Reset textarea height immediately
                  if (textareaRef.current) {
                    textareaRef.current.style.height = "44px";
                  }
                  void sendToAPI(text, id);
                }}
                className="mx-auto flex w-full max-w-4xl items-end gap-2 sm:gap-3 px-2 py-3 sm:px-0 sm:py-2"
              >
                <div className="relative flex w-full items-center">
                  <label htmlFor="composer" className="sr-only">
                    Message Lisa
                  </label>
                  <div className="relative w-full">
                    <textarea
                      id="composer"
                      ref={textareaRef}
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          const text = input.trim();
                          if (!text || loading) return;
                          const id = activeId ?? await newChat();
                          void sendToAPI(text, id);
                        }
                      }}
                      aria-label="Type your message"
                      placeholder="Ask anything..."
                      className="w-full bg-pink-400/10 backdrop-blur-lg resize-none overflow-hidden text-md font-bold rounded-2xl border-0 px-4 py-3 pr-14 sm:px-5 sm:py-auto sm:pr-16 outline-none transition-all touch-manipulation"
                    />

                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="inline-flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 focus:outline-none touch-manipulation shadow-lg"
                  style={{
                    backgroundColor: input.trim() ? '#ff637e' : '#E5E7EB',
                    color: input.trim() ? '#FFFFFF' : '#9CA3AF',
                  }}
                  aria-label="Send message"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </button>

              </form>
            </footer>
          </main>
        </div>
      </div>
    </>
  );
}

export default dynamic(() => Promise.resolve(ChatPageInner), { ssr: false });
