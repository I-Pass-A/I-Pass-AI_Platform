"use client";
import Link from "next/link";
import { Shield, ArrowLeft, Mail, Phone } from "lucide-react";

export default function ParentalConsentPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-gradient)", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>

        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", textDecoration: "none", fontSize: "0.875rem", marginBottom: "2rem" }}>
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <Shield size={28} style={{ color: "var(--warning)" }} />
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>Parental Consent</h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "3rem" }}>
          For parents and guardians of students in Grades 6 and 8
        </p>

        {/* Banner */}
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "2rem", display: "flex", gap: "0.75rem" }}>
          <Shield size={20} style={{ color: "var(--warning)", flexShrink: 0, marginTop: "2px" }} />
          <p style={{ color: "var(--warning)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
            <strong>Important:</strong> I-Pass-A serves students who may be under 13 years of age, particularly those in Grades 6 and 8. In compliance with COPPA (Children's Online Privacy Protection Act) and Ethiopian data protection guidelines, we require parental or guardian consent for these students to use the platform.
          </p>
        </div>

        {[
          {
            title: "What Your Child Uses I-Pass-A For",
            body: `I-Pass-A provides:\n\n• AI-powered tutoring grounded in the official Ethiopian curriculum\n• Practice exam generation for Grade 6 and Grade 8 subjects\n• Assignment submission and review with their teacher\n\nAll content is curriculum-aligned and educationally appropriate. There is no social networking, chat with strangers, or user-generated content outside of academic work.`,
            color: "var(--warning)"
          },
          {
            title: "What Data We Collect About Your Child",
            body: `We collect only what is needed to provide the educational service:\n\n• Name and email address (for account login)\n• School name and grade level\n• Tutor session content (questions asked and answers received)\n• Exam scores and submitted answers\n\nWe do NOT collect photos, location data, phone numbers, or any biometric information.`,
            color: "var(--warning)"
          },
          {
            title: "How We Protect Your Child's Data",
            body: `• All data is encrypted in transit and at rest\n• Your child's data is never shared with advertisers\n• Only their assigned teacher and school administrator can view their work\n• Other students cannot see your child's data\n• You may request deletion of all your child's data at any time`,
            color: "var(--warning)"
          },
          {
            title: "Your Rights as a Parent or Guardian",
            body: `Under COPPA and applicable law, you have the right to:\n\n• Review the personal information we have collected from your child\n• Request correction of inaccurate information\n• Request deletion of your child's account and all associated data\n• Withdraw consent at any time (which will deactivate your child's account)\n• Receive a copy of your child's data\n\nTo exercise any of these rights, contact us using the information below.`,
            color: "var(--warning)"
          },
          {
            title: "How to Give or Withdraw Consent",
            body: `To authorize your child's account:\n1. Your child signs up on I-Pass-A using their name, email, school, and grade\n2. They receive an email verification link — clicking it activates their account\n\nIf your child is under 13 and you did NOT authorize this account, or if you wish to withdraw consent:\n\nContact us immediately at parents@ipass-a.adama.gov.et and we will deactivate and delete the account within 48 hours.`,
            color: "var(--warning)"
          },
        ].map((section, i) => (
          <div key={i} className="glass-panel" style={{ padding: "1.75rem", marginBottom: "1rem", borderLeft: `3px solid ${section.color}` }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.75rem", color: section.color }}>{section.title}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.75, whiteSpace: "pre-line" }}>{section.body}</p>
          </div>
        ))}

        {/* Contact block */}
        <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--warning)" }}>Contact Us About Your Child's Account</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Mail size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
              <a href="mailto:parents@ipass-a.adama.gov.et" style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.9rem" }}>
                parents@ipass-a.adama.gov.et
              </a>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Phone size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>+251 22 111 0000</span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.5rem" }}>
              We respond to all parental inquiries within 48 hours.
            </p>
          </div>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", marginTop: "2rem" }}>
          © 2026 I-Pass-A · Adama Smart City ·{" "}
          <Link href="/privacy" style={{ color: "var(--primary)", textDecoration: "none" }}>Privacy Policy</Link> ·{" "}
          <Link href="/terms" style={{ color: "var(--primary)", textDecoration: "none" }}>Terms of Use</Link>
        </p>
      </div>
    </main>
  );
}
