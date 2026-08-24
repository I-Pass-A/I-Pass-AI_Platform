"use client";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-gradient)", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>

        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", textDecoration: "none", fontSize: "0.875rem", marginBottom: "2rem" }}>
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <Shield size={28} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>Privacy Policy</h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "3rem" }}>
          Last updated: January 2026 · Developed by Adama Smart City
        </p>

        {[
          {
            title: "1. Who We Are",
            body: `I-Pass-A is an AI-powered educational platform developed and operated by the Adama City Administration — Digital Innovation and Smart Services Directorate, Adama, Oromia, Ethiopia. We provide AI tutoring and exam preparation services for students in Grades 6, 8, and 12.`
          },
          {
            title: "2. Information We Collect",
            body: `We collect the following information when you register and use I-Pass-A:\n\n• Account data: name, email address, school name, grade level\n• Usage data: tutor session content, exam attempts, scores\n• Technical data: device type, browser type, IP address (for security)\n\nWe do NOT collect financial information, precise location data, or any biometric data.`
          },
          {
            title: "3. How We Use Your Information",
            body: `Your information is used exclusively to:\n\n• Provide personalized AI tutoring grounded in your grade curriculum\n• Generate and grade practice exams\n• Allow teachers to assign and review student work\n• Allow school directors to monitor platform usage\n• Improve the educational effectiveness of I-Pass-A\n\nWe never sell your personal data to third parties. We never use student data for advertising.`
          },
          {
            title: "4. Children's Privacy (COPPA Compliance)",
            body: `I-Pass-A serves students who may be under 13 years of age. We comply with the Children's Online Privacy Protection Act (COPPA).\n\n• Students in Grades 6 and 8 may be under 13. Signup for these grades requires parental or guardian consent.\n• We do not knowingly collect personal data from children under 13 without verifiable parental consent.\n• Parents and guardians may review, correct, or request deletion of their child's data at any time by contacting us at parents@ipass-a.adama.gov.et.`
          },
          {
            title: "5. Data Storage and Security",
            body: `Your data is stored securely on Supabase infrastructure (hosted in the EU/US). We implement:\n\n• End-to-end encryption for data in transit (HTTPS/TLS)\n• Row-Level Security policies so users can only access their own data\n• Regular security audits\n• Automatic session expiration\n\nWhile we take reasonable precautions, no system is completely secure. We will notify affected users promptly in the event of a data breach.`
          },
          {
            title: "6. Data Sharing",
            body: `We share data only as follows:\n\n• With your school's teachers and administrators — only for educational purposes\n• With Supabase (our database provider) — for storage only, under strict data processing agreements\n• With OpenRouter (our AI provider) — conversation content is processed to generate responses but is not stored by them beyond the request\n\nWe do not share data with advertisers, data brokers, or other third parties.`
          },
          {
            title: "7. Your Rights",
            body: `Under GDPR and applicable Ethiopian data protection law, you have the right to:\n\n• Access your personal data\n• Correct inaccurate data\n• Request deletion of your data ("right to be forgotten")\n• Object to processing\n• Data portability\n\nTo exercise any of these rights, email support@ipass-a.adama.gov.et with your request.`
          },
          {
            title: "8. Data Retention",
            body: `We retain your data for as long as your account is active. If you delete your account:\n\n• Your profile and personal data are deleted immediately\n• Exam scores and session history are deleted within 30 days\n• Backups are purged within 90 days\n\nYou may request account deletion at any time by contacting support@ipass-a.adama.gov.et.`
          },
          {
            title: "9. Changes to This Policy",
            body: `We may update this Privacy Policy periodically. We will notify you of significant changes via email or an in-app notice. Continued use of I-Pass-A after changes constitutes acceptance of the updated policy.`
          },
          {
            title: "10. Contact Us",
            body: `Adama Smart City — Digital Innovation and Smart Services Directorate\nEmail: smartcity@adama.gov.et\nPrivacy inquiries: privacy@ipass-a.adama.gov.et\nParent/guardian inquiries: parents@ipass-a.adama.gov.et\nAdama, Oromia, Ethiopia`
          },
        ].map((section, i) => (
          <div key={i} className="glass-panel" style={{ padding: "1.75rem", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--primary)" }}>{section.title}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.75, whiteSpace: "pre-line" }}>{section.body}</p>
          </div>
        ))}

        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", marginTop: "2rem" }}>
          © 2026 I-Pass-A · Adama Smart City · <Link href="/terms" style={{ color: "var(--primary)", textDecoration: "none" }}>Terms of Use</Link>
        </p>
      </div>
    </main>
  );
}
