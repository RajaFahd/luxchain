import { useState } from "react";

interface CopyableTextProps {
  text: string;
  truncateText?: string;
  style?: React.CSSProperties;
  link?: string;
}

export default function CopyableText({ text, truncateText, style, link }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", ...style }}>
      {link ? (
        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ fontFamily: "var(--font-roboto-mono)", fontSize: "12px", textDecoration: "none", ...style }}
          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
          title="Buka di Etherscan"
        >
          {truncateText || text}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: "4px", display: "inline-block" }}>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      ) : (
        <span style={{ fontFamily: "var(--font-roboto-mono)", fontSize: "12px", ...style }}>
          {truncateText || text}
        </span>
      )}
      {text && text !== "-" && (
        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: copied ? "var(--lc-success)" : "var(--muted-foreground)",
            transition: "all 0.2s ease",
            borderRadius: "4px",
          }}
          onMouseEnter={(e) => {
            if (!copied) {
              e.currentTarget.style.color = "var(--primary)";
              e.currentTarget.style.background = "rgba(200, 169, 110, 0.1)";
            }
          }}
          onMouseLeave={(e) => {
            if (!copied) {
              e.currentTarget.style.color = "var(--muted-foreground)";
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
