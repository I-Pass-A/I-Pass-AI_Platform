"use client";

import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

export default function AIPerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Don't render on server or if not mounted
  if (!mounted) return null;

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        title="AI Performance Monitor"
        style={{
          position: "fixed",
          bottom: "1rem",
          right: "1rem",
          background: "var(--primary)",
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 50,
          boxShadow: "0 4px 14px rgba(14,165,233,0.4)",
        }}
      >
        <Activity size={18} />
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed",
      bottom: "1rem",
      right: "1rem",
      background: "var(--sidebar-bg)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      color: "var(--text-primary)",
      padding: "1rem",
      borderRadius: "12px",
      border: "1px solid var(--glass-border)",
      width: "280px",
      zIndex: 50,
      fontSize: "0.82rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Activity size={14} style={{ color: "var(--primary)" }} /> AI Monitor
        </span>
        <button onClick={() => setIsVisible(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem" }}>✕</button>
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", margin: 0 }}>
        Using OpenRouter — Gemma 4 31B (free) with GPT-4o-mini fallback.
      </p>
    </div>
  );
}
