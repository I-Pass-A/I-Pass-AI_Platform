import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use | I-Pass-A',
  description: 'Terms of Use for I-Pass-A — rules, expectations and protections for all users.',
};

const Rule = ({ allowed, children }: { allowed: boolean; children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.55rem', alignItems: 'flex-start' }}>
    <span style={{
      flexShrink: 0, marginTop: '1px',
      width: '18px', height: '18px', borderRadius: '5px',
      background: allowed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.65rem',
    }}>
      {allowed
        ? <span style={{ color: '#4ade80' }}>✓</span>
        : <span style={{ color: '#f87171' }}>✕</span>}
    </span>
    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>{children}</span>
  </div>
);

export default function TermsOfUse() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 85% 15%, rgba(99,102,241,0.05) 0%, transparent 45%), radial-gradient(circle at 15% 85%, rgba(14,165,233,0.05) 0%, transparent 45%), var(--bg-gradient)',
      padding: '3rem 1.5rem',
      fontFamily: 'var(--font-inter)',
    }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>

        {/* Back */}
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            ← Back to I-Pass-A
          </Link>
        </div>

        {/* Header */}
        <div style={{
          background: 'rgba(99,102,241,0.07)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '20px',
          padding: '2.5rem',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-50px', right: '-50px',
            width: '200px', height: '200px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>📋</span>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-outfit)',
                fontSize: '2rem',
                fontWeight: 800,
                margin: 0,
                background: 'linear-gradient(135deg, #a5b4fc 0%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.03em',
              }}>Terms of Use</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, marginTop: '0.25rem' }}>
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>
            By using I-Pass-A you agree to these terms. If you are under 18, your parent or guardian must review
            and agree on your behalf. These terms exist to keep the platform safe, fair, and effective for everyone.
          </p>
        </div>

        {/* Quick Summary — tick format */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '1.75rem 2rem',
          marginBottom: '1.25rem',
        }}>
          <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            📌 Summary — What You're Agreeing To
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
            {[
              'Use the platform for genuine educational purposes',
              'Complete your own work honestly — no cheating',
              'Keep your login credentials private',
              'Follow your school\'s academic integrity policy',
              'Respect other students and teachers on the platform',
              'Use the AI tutor to learn, not to get answers for you',
              'Parents supervise their child\'s usage',
              'Report inappropriate content or behaviour',
            ].map((item, i) => (
              <Rule key={i} allowed={true}>{item}</Rule>
            ))}
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 0.5rem' }}>These are prohibited:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
              {[
                'Sharing answers or cheating on assessments',
                'Uploading malicious code or disruptive content',
                'Attempting to hack or exploit the platform',
                'Using the platform for commercial purposes',
              ].map((item, i) => (
                <Rule key={i} allowed={false}>{item}</Rule>
              ))}
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '1rem', marginBottom: 0 }}>
            Read the full details in each section below, or jump to:{' '}
            <Link href="/privacy" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Privacy Policy</Link>
            {' · '}
            <Link href="/data-transparency" style={{ color: 'var(--secondary)', textDecoration: 'none' }}>How AI Uses Data</Link>
            {' · '}
            <Link href="/parental-consent" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Parental Consent</Link>
          </p>
        </div>

        {/* Section builder */}
        {[
          {
            icon: '🏫',
            title: '1. Educational Use & Accounts',
            content: (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '1rem' }}>
                  I-Pass-A is designed for legitimate educational use by students, teachers, and administrators.
                  Accounts must be registered with accurate information.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem' }}>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-outfit)', marginBottom: '0.5rem' }}>Students</p>
                    <Rule allowed={true}>Take quizzes and use the AI tutor</Rule>
                    <Rule allowed={true}>Track personal progress and results</Rule>
                    <Rule allowed={false}>Share account credentials with anyone</Rule>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem' }}>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-outfit)', marginBottom: '0.5rem' }}>Teachers & Admins</p>
                    <Rule allowed={true}>Publish assignments and monitor results</Rule>
                    <Rule allowed={true}>Upload curriculum materials</Rule>
                    <Rule allowed={false}>Access student data beyond their class</Rule>
                  </div>
                </div>
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '0.85rem 1rem', marginTop: '0.75rem' }}>
                  <p style={{ color: '#fcd34d', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-outfit)', margin: '0 0 0.25rem' }}>For Students Under 18</p>
                  <p style={{ color: 'rgba(252,211,77,0.75)', fontSize: '0.81rem', lineHeight: 1.6, margin: 0 }}>
                    Under 13: Parent/guardian must create and manage account.{' '}
                    Under 16 (EU): Parental consent required.{' '}
                    <Link href="/parental-consent" style={{ color: '#fbbf24', textDecoration: 'none', borderBottom: '1px solid rgba(251,191,36,0.4)' }}>Complete consent form →</Link>
                  </p>
                </div>
              </>
            ),
          },
          {
            icon: '🤖',
            title: '2. Using the AI Tutor',
            content: (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '1rem' }}>
                  The AI tutor is here to help you <strong style={{ color: 'var(--text-primary)' }}>understand and learn</strong> — not to do your work for you.
                  Using it responsibly is both a requirement and a benefit.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px', padding: '0.9rem' }}>
                    <p style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: '0 0 0.5rem' }}>✓ Great uses</p>
                    <Rule allowed={true}>Explain a concept you don't understand</Rule>
                    <Rule allowed={true}>Ask for practice problems on a topic</Rule>
                    <Rule allowed={true}>Get study strategies and revision tips</Rule>
                    <Rule allowed={true}>Clarify assignment instructions</Rule>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '0.9rem' }}>
                    <p style={{ color: '#f87171', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: '0 0 0.5rem' }}>✕ Not allowed</p>
                    <Rule allowed={false}>Ask AI to complete homework for you</Rule>
                    <Rule allowed={false}>Request exam answers during assessments</Rule>
                    <Rule allowed={false}>Bypass academic integrity checks</Rule>
                    <Rule allowed={false}>Use AI for non-educational purposes</Rule>
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.85rem', marginBottom: 0 }}>
                  See exactly how our AI handles data →{' '}
                  <Link href="/data-transparency" style={{ color: 'var(--secondary)', textDecoration: 'none', borderBottom: '1px solid rgba(20,184,166,0.35)' }}>
                    Data Transparency Report
                  </Link>
                </p>
              </>
            ),
          },
          {
            icon: '🏆',
            title: '3. Academic Integrity',
            content: (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '1rem' }}>
                  I-Pass-A actively supports honest learning. All platform activity may be monitored for integrity.
                </p>
                <div style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px', padding: '1rem',
                }}>
                  <Rule allowed={true}>Complete your own work and assessments</Rule>
                  <Rule allowed={true}>Follow your school's academic integrity policies</Rule>
                  <Rule allowed={true}>Report suspected violations you witness</Rule>
                  <Rule allowed={false}>Cheat, plagiarise, or copy others' work</Rule>
                  <Rule allowed={false}>Use external tools to answer exam questions</Rule>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', padding: '0.85rem 1rem', marginTop: '0.75rem' }}>
                  <p style={{ color: '#f87171', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-outfit)', margin: '0 0 0.25rem' }}>Consequences of violations</p>
                  <p style={{ color: 'rgba(248,113,113,0.75)', fontSize: '0.81rem', lineHeight: 1.6, margin: 0 }}>
                    Academic dishonesty may result in account suspension, notification to your school, and permanent record of the incident.
                  </p>
                </div>
              </>
            ),
          },
          {
            icon: '👪',
            title: '4. Parents & Guardians',
            content: (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '1rem' }}>
                  Parents have full rights over their child's account and data.
                  <Link href="/parental-consent" style={{ color: 'var(--primary)', marginLeft: '0.4rem', textDecoration: 'none', borderBottom: '1px solid rgba(14,165,233,0.35)' }}>
                    Parental consent form →
                  </Link>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.9rem' }}>
                    <p style={{ color: 'var(--secondary)', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: '0 0 0.5rem' }}>Your Rights</p>
                    <Rule allowed={true}>Review all data collected about your child</Rule>
                    <Rule allowed={true}>Request correction or deletion of data</Rule>
                    <Rule allowed={true}>Withdraw consent and close account</Rule>
                    <Rule allowed={true}>Contact us with any concerns</Rule>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.9rem' }}>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: '0 0 0.5rem' }}>Your Responsibilities</p>
                    <Rule allowed={true}>Supervise your child's platform usage</Rule>
                    <Rule allowed={true}>Ensure your child follows these terms</Rule>
                    <Rule allowed={true}>Report concerns to us promptly</Rule>
                    <Rule allowed={true}>Keep parental contact info up to date</Rule>
                  </div>
                </div>
              </>
            ),
          },
          {
            icon: '⚖️',
            title: '5. Suspension & Termination',
            content: (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '1rem' }}>
                  Accounts may be suspended or terminated for violations of these Terms, at our discretion.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <p style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', marginBottom: '0.5rem' }}>Grounds for suspension</p>
                    <Rule allowed={false}>Violation of Terms of Use</Rule>
                    <Rule allowed={false}>Academic dishonesty or cheating</Rule>
                    <Rule allowed={false}>Harassment or abusive behaviour</Rule>
                    <Rule allowed={false}>Security abuse or hacking attempts</Rule>
                  </div>
                  <div>
                    <p style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', marginBottom: '0.5rem' }}>Your right to leave</p>
                    <Rule allowed={true}>Terminate your account at any time</Rule>
                    <Rule allowed={true}>Parents can close a child's account</Rule>
                    <Rule allowed={true}>Data deleted per our Privacy Policy</Rule>
                    <Rule allowed={true}>No penalty for voluntary termination</Rule>
                  </div>
                </div>
              </>
            ),
          },
        ].map((section) => (
          <div key={section.title} style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.4rem' }}>{section.icon}</span>
              <h2 style={{
                fontFamily: 'var(--font-outfit)',
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}>{section.title}</h2>
            </div>
            {section.content}
          </div>
        ))}

        {/* Agreement footer */}
        <div style={{
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.18)',
          borderRadius: '14px',
          padding: '1.5rem',
          textAlign: 'center',
          marginBottom: '2rem',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.7, margin: 0 }}>
            By using I-Pass-A you confirm you have read and agree to these terms.
            If you're a parent agreeing on behalf of a minor, these terms apply to your child's use of the service.
          </p>
        </div>

        {/* Footer nav */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Parental Consent', href: '/parental-consent' },
            { label: 'Data Transparency', href: '/data-transparency' },
          ].map(link => (
            <Link key={link.href} href={link.href} style={{
              color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2px',
            }}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
