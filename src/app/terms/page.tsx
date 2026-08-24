"use client";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-gradient)", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>

        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", textDecoration: "none", fontSize: "0.875rem", marginBottom: "2rem" }}>
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <FileText size={28} style={{ color: "var(--secondary)" }} />
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>Terms of Use</h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "3rem" }}>
          Last updated: January 2026 · Effective immediately upon account creation
        </p>

        {[
          {
            title: "1. Acceptance of Terms",
            body: `By creating an account on I-Pass-A, you agree to these Terms of Use. If you are under 18, a parent or guardian must review and accept these terms on your behalf. If you do not agree, do not use the platform.`
          },
          {
            title: "2. Who May Use I-Pass-A",
            body: `I-Pass-A is intended for:\n\n• Students enrolled in Grades 6, 8, or 12 in schools served by Adama City Administration\n• Teachers assigned to those grade levels\n• School administrators and directors\n\nYou must provide accurate information when registering. Using false information may result in account termination.`
          },
          {
            title: "3. Acceptable Use",
            body: `You agree to use I-Pass-A only for lawful educational purposes. You must NOT:\n\n• Share your account credentials with others\n• Attempt to access other users' accounts or data\n• Use the platform to cheat on formal examinations\n• Upload content that is harmful, offensive, or illegal\n• Attempt to reverse-engineer, scrape, or disrupt the platform\n• Use the AI tutor to generate harmful, inappropriate, or misleading content\n\nViolations may result in immediate account suspension.`
          },
          {
            title: "4. AI-Generated Content",
            body: `I-Pass-A uses artificial intelligence to generate tutoring responses and exam questions. You acknowledge that:\n\n• AI responses are based on uploaded curriculum materials but may occasionally be inaccurate\n• AI-generated exam questions are for practice purposes only and are not official assessments\n• You should verify important information with your teacher or textbook\n• I-Pass-A is not responsible for decisions made based solely on AI-generated content`
          },
          {
            title: "5. Intellectual Property",
            body: `All platform content — including the I-Pass-A brand, interface design, and AI system — is owned by the Adama City Administration. Curriculum content is the property of the Ethiopian Ministry of Education.\n\nYou may not reproduce, distribute, or commercially exploit any content from I-Pass-A without written permission.`
          },
          {
            title: "6. Privacy",
            body: `Your use of I-Pass-A is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please read it carefully at ipass-a.adama.gov.et/privacy.`
          },
          {
            title: "7. Account Termination",
            body: `We reserve the right to suspend or terminate your account at any time if you:\n\n• Violate these Terms of Use\n• Provide false registration information\n• Misuse the AI tutor for purposes unrelated to education\n• Engage in behavior that harms other users\n\nYou may also delete your own account at any time by contacting support@ipass-a.adama.gov.et.`
          },
          {
            title: "8. Limitation of Liability",
            body: `I-Pass-A is provided "as is" for educational purposes. The Adama City Administration is not liable for:\n\n• Academic outcomes resulting from use of the platform\n• Temporary service interruptions or data loss\n• Inaccuracies in AI-generated content\n\nOur total liability is limited to the amount you paid for the service (which is zero, as I-Pass-A is free).`
          },
          {
            title: "9. Changes to Terms",
            body: `We may update these Terms periodically. We will notify you via email or in-app notice of significant changes. Continued use of I-Pass-A after changes take effect constitutes acceptance.`
          },
          {
            title: "10. Governing Law",
            body: `These Terms are governed by the laws of the Federal Democratic Republic of Ethiopia. Any disputes shall be resolved through the courts of Adama (Nazret), Oromia, Ethiopia.\n\nFor questions, contact: smartcity@adama.gov.et`
          },
        ].map((section, i) => (
          <div key={i} className="glass-panel" style={{ padding: "1.75rem", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--secondary)" }}>{section.title}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.75, whiteSpace: "pre-line" }}>{section.body}</p>
          </div>
        ))}

        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", marginTop: "2rem" }}>
          © 2026 I-Pass-A · Adama Smart City · <Link href="/privacy" style={{ color: "var(--primary)", textDecoration: "none" }}>Privacy Policy</Link>
        </p>
      </div>
    </main>
  );
}
