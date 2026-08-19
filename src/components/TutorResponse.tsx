"use client";

/**
 * TutorResponse — Rich markdown renderer for AI tutor answers
 *
 * Renders:
 *  - Headings (H1–H3) with accent colors
 *  - Bold / italic / inline code
 *  - Code blocks (syntax highlighted)
 *  - Block and inline LaTeX equations (KaTeX)
 *  - Tables (GFM)
 *  - Ordered and unordered lists
 *  - Blockquotes → styled "Important Note" cards
 *  - Emoji-prefixed lines → styled callout cards
 *    📌 = Key Point   💡 = Tip   📚 = Definition
 *    📝 = Example     ✅ = Summary  ⚠️ = Warning
 */

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// ── Callout card config ────────────────────────────────────────────────────────

const CALLOUT_MAP: Record<string, { bg: string; border: string; color: string; label: string }> = {
  "📌": { bg: "rgba(14,165,233,0.07)",  border: "rgba(14,165,233,0.25)",  color: "var(--primary)",   label: "Key Point" },
  "💡": { bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.25)",  color: "var(--warning)",   label: "Tip" },
  "📚": { bg: "rgba(99,102,241,0.07)",  border: "rgba(99,102,241,0.25)",  color: "var(--accent)",    label: "Definition" },
  "📝": { bg: "rgba(20,184,166,0.07)",  border: "rgba(20,184,166,0.25)",  color: "var(--secondary)", label: "Example" },
  "✅": { bg: "rgba(34,197,94,0.07)",   border: "rgba(34,197,94,0.25)",   color: "var(--success)",   label: "Summary" },
  "⚠️": { bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.25)",   color: "var(--danger)",    label: "Important" },
  "⚠":  { bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.25)",   color: "var(--danger)",    label: "Important" },
};

function getCallout(text: string) {
  for (const [emoji, config] of Object.entries(CALLOUT_MAP)) {
    if (text.startsWith(emoji)) {
      return { config, text: text.slice(emoji.length).trim() };
    }
  }
  return null;
}

// ── Custom component renderers ─────────────────────────────────────────────────

const components: any = {

  // Headings
  h1: ({ children }: any) => (
    <h2 style={{
      fontSize: "1.3rem", fontWeight: 700, color: "var(--primary)",
      borderBottom: "1px solid rgba(14,165,233,0.2)",
      paddingBottom: "0.4rem", marginTop: "1.5rem", marginBottom: "0.75rem",
    }}>
      {children}
    </h2>
  ),
  h2: ({ children }: any) => (
    <h3 style={{
      fontSize: "1.1rem", fontWeight: 700, color: "var(--secondary)",
      marginTop: "1.25rem", marginBottom: "0.5rem",
    }}>
      {children}
    </h3>
  ),
  h3: ({ children }: any) => (
    <h4 style={{
      fontSize: "1rem", fontWeight: 600, color: "var(--accent)",
      marginTop: "1rem", marginBottom: "0.4rem",
    }}>
      {children}
    </h4>
  ),

  // Paragraphs — detect emoji callouts
  p: ({ children }: any) => {
    const text = typeof children === "string"
      ? children
      : Array.isArray(children)
        ? children.map((c: any) => (typeof c === "string" ? c : "")).join("")
        : "";

    const callout = getCallout(text);
    if (callout) {
      return (
        <div style={{
          background: callout.config.bg,
          border: `1px solid ${callout.config.border}`,
          borderLeft: `3px solid ${callout.config.color}`,
          borderRadius: "var(--radius-sm)",
          padding: "0.75rem 1rem",
          margin: "0.75rem 0",
        }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: callout.config.color, marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {callout.config.label}
          </div>
          <div style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>{callout.text}</div>
        </div>
      );
    }

    return (
      <p style={{ margin: "0.5rem 0", lineHeight: 1.7, fontSize: "0.92rem" }}>
        {children}
      </p>
    );
  },

  // Blockquote → Important Note card
  blockquote: ({ children }: any) => (
    <div style={{
      background: "rgba(239,68,68,0.06)",
      border: "1px solid rgba(239,68,68,0.2)",
      borderLeft: "3px solid var(--danger)",
      borderRadius: "var(--radius-sm)",
      padding: "0.75rem 1rem",
      margin: "0.75rem 0",
    }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--danger)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        ⚠️ Important Note
      </div>
      <div style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>{children}</div>
    </div>
  ),

  // Bold → accent color
  strong: ({ children }: any) => (
    <strong style={{ color: "var(--primary)", fontWeight: 700 }}>{children}</strong>
  ),

  // Inline code
  code: ({ inline, children, className }: any) => {
    if (inline) {
      return (
        <code style={{
          background: "rgba(14,165,233,0.1)",
          color: "var(--primary)",
          padding: "0.1rem 0.35rem",
          borderRadius: "4px",
          fontSize: "0.85em",
          fontFamily: "monospace",
        }}>
          {children}
        </code>
      );
    }
    // Code block
    const lang = className?.replace("language-", "") || "";
    return (
      <div style={{ margin: "0.75rem 0" }}>
        {lang && (
          <div style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: "6px 6px 0 0",
            padding: "0.25rem 0.75rem",
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            borderBottom: "1px solid var(--glass-border)",
            fontFamily: "monospace",
          }}>
            {lang}
          </div>
        )}
        <pre style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid var(--glass-border)",
          borderRadius: lang ? "0 0 6px 6px" : "6px",
          padding: "1rem",
          overflowX: "auto",
          margin: 0,
          fontSize: "0.85rem",
          lineHeight: 1.5,
          fontFamily: "monospace",
        }}>
          <code style={{ color: "var(--secondary)" }}>{children}</code>
        </pre>
      </div>
    );
  },

  // Tables
  table: ({ children }: any) => (
    <div style={{ overflowX: "auto", margin: "0.75rem 0" }}>
      <table style={{
        width: "100%", borderCollapse: "collapse",
        fontSize: "0.875rem", border: "1px solid var(--glass-border)",
        borderRadius: "6px", overflow: "hidden",
      }}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead style={{ background: "rgba(14,165,233,0.08)" }}>{children}</thead>
  ),
  th: ({ children }: any) => (
    <th style={{
      padding: "0.6rem 0.85rem", textAlign: "left", fontWeight: 700,
      fontSize: "0.8rem", color: "var(--primary)",
      borderBottom: "1px solid var(--glass-border)",
    }}>
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td style={{
      padding: "0.55rem 0.85rem",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      fontSize: "0.875rem", lineHeight: 1.5,
    }}>
      {children}
    </td>
  ),
  tr: ({ children }: any) => (
    <tr style={{ transition: "background 0.1s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
      {children}
    </tr>
  ),

  // Lists
  ul: ({ children }: any) => (
    <ul style={{ margin: "0.5rem 0 0.5rem 0.25rem", paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol style={{ margin: "0.5rem 0 0.5rem 0.25rem", paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-primary)" }}>
      {children}
    </li>
  ),

  // Horizontal rule → divider
  hr: () => (
    <hr style={{ border: "none", borderTop: "1px solid var(--glass-border)", margin: "1rem 0" }} />
  ),
};

// ── Main component ─────────────────────────────────────────────────────────────

interface TutorResponseProps {
  content: string;
}

export default function TutorResponse({ content }: TutorResponseProps) {
  return (
    <div style={{
      fontSize: "0.92rem",
      lineHeight: 1.7,
      color: "var(--text-primary)",
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
