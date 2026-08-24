"use client";
import Link from "next/link";
import { Database, ArrowLeft, CheckCircle, XCircle } from "lucide-react";

export default function DataTransparencyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-gradient)", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>

        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", textDecoration: "none", fontSize: "0.875rem", marginBottom: "2rem" }}>
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <Database size={28} style={{ color: "var(--accent)" }} />
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>Data Transparency</h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "3rem" }}>
          A clear, plain-language breakdown of exactly what data we collect and what we do with it.
        </p>

        {/* What we collect table */}
        <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--accent)" }}>What We Collect</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {[
              { item: "Full name", why: "To personalize your experience and identify you to your teacher", stored: true },
              { item: "Email address", why: "Account login, email verification, and password reset", stored: true },
              { item: "School name", why: "To help administrators understand platform reach", stored: true },
              { item: "Grade level", why: "To show you the correct curriculum and subjects", stored: true },
              { item: "Tutor session content", why: "To provide AI responses grounded in your curriculum", stored: true },
              { item: "Exam answers and scores", why: "To track your progress and let teachers review your work", stored: true },
              { item: "IP address", why: "For security and fraud prevention only", stored: true },
              { item: "Phone number", why: "Not collected", stored: false },
              { item: "Location (GPS)", why: "Not collected", stored: false },
              { item: "Photos or biometrics", why: "Not collected", stored: false },
              { item: "Payment information", why: "Not collected — I-Pass-A is free", stored: false },
            ].map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 2.5fr auto", gap: "1rem", padding: "0.875rem 0", borderBottom: i < 10 ? "1px solid var(--glass-border)" : "none", alignItems: "center" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{row.item}</span>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{row.why}</span>
                {row.stored
                  ? <CheckCircle size={16} style={{ color: "var(--success)", flexShrink: 0 }} />
                  : <XCircle size={16} style={{ color: "var(--danger)", flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Who can see what */}
        <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--accent)" }}>Who Can See Your Data</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { role: "You", access: "Full access to your own profile, sessions, and results" },
              { role: "Your Teacher", access: "Your name, grade, submitted assignments, and scores only" },
              { role: "School Director", access: "Aggregate statistics and user lists — read-only, no individual data" },
              { role: "Administrator", access: "Full platform access for maintenance and support" },
              { role: "Other Students", access: "Cannot see any of your data" },
              { role: "Third Parties / Advertisers", access: "No access — ever" },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", gap: "1rem", padding: "0.75rem", borderRadius: "8px", background: "rgba(0,0,0,0.15)" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--accent)", minWidth: "140px", flexShrink: 0 }}>{row.role}</span>
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{row.access}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Third-party services */}
        <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--accent)" }}>Third-Party Services We Use</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { name: "Supabase", purpose: "Database and authentication", data: "All stored data", link: "https://supabase.com/privacy" },
              { name: "OpenRouter", purpose: "AI model provider for tutoring and exam generation", data: "Conversation messages (not stored beyond response)", link: "https://openrouter.ai/privacy" },
              { name: "Vercel", purpose: "Web hosting and deployment", data: "Request logs (anonymized)", link: "https://vercel.com/legal/privacy-policy" },
            ].map((svc, i) => (
              <div key={i} style={{ padding: "1rem", borderRadius: "8px", background: "rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{svc.name}</span>
                  <a href={svc.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "var(--primary)" }}>Privacy Policy</a>
                </div>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Purpose: {svc.purpose}</span>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Data shared: {svc.data}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Your rights */}
        <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem", color: "var(--accent)" }}>Request Your Data or Deletion</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "1rem" }}>
            You can request a full export of your data, or request permanent deletion of your account and all associated data, at any time.
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Email: <a href="mailto:privacy@ipass-a.adama.gov.et" style={{ color: "var(--primary)" }}>privacy@ipass-a.adama.gov.et</a>
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.5rem" }}>
            We respond to all requests within 30 days.
          </p>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", marginTop: "2rem" }}>
          © 2026 I-Pass-A · <Link href="/privacy" style={{ color: "var(--primary)", textDecoration: "none" }}>Privacy Policy</Link> · <Link href="/terms" style={{ color: "var(--primary)", textDecoration: "none" }}>Terms of Use</Link>
        </p>
      </div>
    </main>
  );
}
