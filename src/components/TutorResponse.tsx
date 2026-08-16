"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TutorResponseProps {
  content: string;
}

export default function TutorResponse({ content }: TutorResponseProps) {
  return (
    <div className="tutor-response">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="tutor-h1">{children}</h1>
          ),

          h2: ({ children }) => (
            <h2 className="tutor-h2">{children}</h2>
          ),

          h3: ({ children }) => (
            <h3 className="tutor-h3">{children}</h3>
          ),

          p: ({ children }) => (
            <p className="tutor-paragraph">{children}</p>
          ),

          strong: ({ children }) => (
            <strong className="tutor-bold">{children}</strong>
          ),

          ul: ({ children }) => (
            <ul className="tutor-list">{children}</ul>
          ),

          ol: ({ children }) => (
            <ol className="tutor-list tutor-ordered">{children}</ol>
          ),

          li: ({ children }) => (
            <li>{children}</li>
          ),

          blockquote: ({ children }) => (
            <blockquote className="tutor-quote">
              {children}
            </blockquote>
          ),

          code: ({ children }) => (
            <code className="tutor-code">
              {children}
            </code>
          ),

          table: ({ children }) => (
            <div className="tutor-table-wrapper">
              <table className="tutor-table">{children}</table>
            </div>
          ),

          thead: ({ children }) => (
            <thead>{children}</thead>
          ),

          tbody: ({ children }) => (
            <tbody>{children}</tbody>
          ),

          tr: ({ children }) => (
            <tr>{children}</tr>
          ),

          th: ({ children }) => (
            <th>{children}</th>
          ),

          td: ({ children }) => (
            <td>{children}</td>
          ),

          hr: () => <hr className="tutor-divider" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}