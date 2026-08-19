import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | I-Pass-A',
  description: 'Privacy Policy for I-Pass-A — how we protect student data under COPPA and GDPR.',
};

const Section = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
  <div style={{
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '1.25rem',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
      <span style={{ fontSize: '1.4rem' }}>{icon}</span>
      <h2 style={{
        fontFamily: 'var(--font-outfit)',
        fontSize: '1.15rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        margin: 0,
        letterSpacing: '-0.02em',
      }}>{title}</h2>
    </div>
    {children}
  </div>
);

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.6rem', alignItems: 'flex-start' }}>
    <span style={{ color: 'var(--primary)', marginTop: '2px', flexShrink: 0, fontSize: '0.85rem' }}>▸</span>
    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{children}</span>
  </div>
);

const Badge = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{
    display: 'inline-block',
    background: color,
    borderRadius: '6px',
    padding: '0.2rem 0.6rem',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    fontFamily: 'var(--font-outfit)',
    marginRight: '0.4rem',
    marginBottom: '0.3rem',
  }}>{children}</span>
);

export default function PrivacyPolicy() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 15% 20%, rgba(14,165,233,0.05) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(20,184,166,0.05) 0%, transparent 45%), var(--bg-gradient)',
      padding: '3rem 1.5rem',
      fontFamily: 'var(--font-inter)',
    }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>

        {/* Back nav */}
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/" style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            ← Back to I-Pass-A
          </Link>
        </div>

        {/* Header */}
        <div style={{
          background: 'rgba(14,165,233,0.06)',
          border: '1px solid rgba(14,165,233,0.18)',
          borderRadius: '20px',
          padding: '2.5rem',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '180px', height: '180px',
            background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>🔒</span>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-outfit)',
                fontSize: '2rem',
                fontWeight: 800,
                margin: 0,
                background: 'linear-gradient(135deg, #38bdf8 0%, #10b981 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.03em',
              }}>Privacy Policy</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, marginTop: '0.25rem' }}>
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>
            I-Pass-A is built for students. We take data protection seriously — especially for children.
            This policy explains exactly what we collect, why, and how it's protected under{' '}
            <strong style={{ color: 'var(--primary)' }}>COPPA</strong>,{' '}
            <strong style={{ color: 'var(--secondary)' }}>GDPR</strong>, and applicable privacy laws.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1.25rem' }}>
            <Badge color="rgba(14,165,233,0.15)"><span style={{ color: '#38bdf8' }}>COPPA Compliant</span></Badge>
            <Badge color="rgba(20,184,166,0.15)"><span style={{ color: '#2dd4bf' }}>GDPR Aligned</span></Badge>
            <Badge color="rgba(99,102,241,0.15)"><span style={{ color: '#a5b4fc' }}>FERPA Aligned</span></Badge>
            <Badge color="rgba(245,158,11,0.15)"><span style={{ color: '#fcd34d' }}>No Ads. Ever.</span></Badge>
          </div>
        </div>

        {/* Children warning callout */}
        <div style={{
          background: 'rgba(245,158,11,0.07)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: '12px',
          padding: '1.1rem 1.4rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.85rem',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>👪</span>
          <div>
            <p style={{ color: '#fcd34d', fontWeight: 600, fontSize: '0.9rem', margin: '0 0 0.3rem 0', fontFamily: 'var(--font-outfit)' }}>
              Notice for Parents &amp; Guardians
            </p>
            <p style={{ color: 'rgba(252,211,77,0.8)', fontSize: '0.84rem', lineHeight: 1.6, margin: 0 }}>
              Students under 13 require parental consent before using I-Pass-A.
              Visit our{' '}
              <Link href="/parental-consent" style={{ color: '#fbbf24', borderBottom: '1px solid rgba(251,191,36,0.4)', textDecoration: 'none' }}>
                Parental Consent page
              </Link>{' '}
              to complete authorization. Parents can review or delete their child's data at any time.
            </p>
          </div>
        </div>

        {/* Sections */}
        <Section icon="📥" title="1. Information We Collect">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '1rem' }}>
            We only collect what's needed to provide educational services.
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem',
          }}>
            {[
              { label: 'Account Info', desc: 'Name, email, grade level, role', icon: '👤' },
              { label: 'Learning Data', desc: 'Quiz scores, exam results, progress', icon: '📊' },
              { label: 'AI Interactions', desc: 'Tutor questions & responses', icon: '🤖' },
              { label: 'Usage Patterns', desc: 'Time on platform, features used', icon: '📈' },
            ].map((item) => (
              <div key={item.label} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '0.9rem',
              }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{item.icon}</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-outfit)', marginBottom: '0.2rem' }}>{item.label}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{
            background: 'rgba(14,165,233,0.05)',
            border: '1px solid rgba(14,165,233,0.15)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
          }}>
            <p style={{ color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600, margin: '0 0 0.35rem 0', fontFamily: 'var(--font-outfit)' }}>
              For Children Under 13 (COPPA Enhanced)
            </p>
            <Bullet>Same data with <strong style={{ color: 'var(--text-primary)' }}>enhanced protections</strong> — parental consent required first</Bullet>
            <Bullet>Parents can review, edit, or delete all information at any time</Bullet>
            <Bullet>No behavioral advertising or commercial profiling — ever</Bullet>
          </div>
        </Section>

        <Section icon="🤖" title="2. How Our AI Uses Your Data">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '1rem' }}>
            Our AI systems are used <strong style={{ color: 'var(--text-primary)' }}>exclusively for education</strong>. Here's exactly what happens:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
            {[
              { step: '01', label: 'You ask a question', desc: 'Student submits a query or takes a quiz' },
              { step: '02', label: 'Identifiers stripped', desc: 'Personal info removed before AI processing' },
              { step: '03', label: 'Curriculum matching', desc: 'AI matches content to grade-level curriculum' },
              { step: '04', label: 'Response generated', desc: 'Educational explanation returned to student' },
              { step: '05', label: 'Anonymized logging', desc: 'Only anonymized patterns stored for improvement' },
            ].map((item) => (
              <div key={item.step} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'rgba(255,255,255,0.015)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
              }}>
                <span style={{
                  flexShrink: 0, width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(14,165,233,0.15)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 800, fontFamily: 'var(--font-outfit)',
                }}>{item.step}</span>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>{item.label}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '0.85rem' }}>
              <p style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.5rem', fontFamily: 'var(--font-outfit)' }}>✓ AI Does</p>
              {['Generate quiz questions', 'Explain curriculum topics', 'Anonymized pattern analysis', 'Personalized feedback'].map(t => (
                <div key={t} style={{ color: 'rgba(74,222,128,0.8)', fontSize: '0.78rem', marginBottom: '0.25rem' }}>• {t}</div>
              ))}
            </div>
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.85rem' }}>
              <p style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.5rem', fontFamily: 'var(--font-outfit)' }}>✗ AI Never Does</p>
              {['Store personal conversations', 'Share data with advertisers', 'Create commercial profiles', 'Access non-educational data'].map(t => (
                <div key={t} style={{ color: 'rgba(248,113,113,0.8)', fontSize: '0.78rem', marginBottom: '0.25rem' }}>• {t}</div>
              ))}
            </div>
          </div>
        </Section>

        <Section icon="👶" title="3. Children's Privacy Rights (COPPA & GDPR)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: '10px', padding: '1rem' }}>
              <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.75rem', fontFamily: 'var(--font-outfit)' }}>Under 13 — COPPA</p>
              <Bullet>Parent/guardian consent <strong style={{ color: 'var(--text-primary)' }}>required</strong> before signup</Bullet>
              <Bullet>Minimal data collection only</Bullet>
              <Bullet>No third-party sharing for marketing</Bullet>
              <Bullet>Parents can review or delete data</Bullet>
            </div>
            <div style={{ background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.15)', borderRadius: '10px', padding: '1rem' }}>
              <p style={{ color: 'var(--secondary)', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.75rem', fontFamily: 'var(--font-outfit)' }}>Under 16 — GDPR</p>
              <Bullet>Parental consent for data processing</Bullet>
              <Bullet>Right to data portability & erasure</Bullet>
              <Bullet>Enhanced security measures</Bullet>
              <Bullet>Regular data protection audits</Bullet>
            </div>
          </div>
        </Section>

        <Section icon="🛡️" title="4. Data Security">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
            {[
              { icon: '🔐', label: 'Encryption', desc: 'TLS 1.3 in transit, AES-256 at rest' },
              { icon: '🔑', label: 'Access Control', desc: 'Role-based auth, least-privilege access' },
              { icon: '📋', label: 'Audit Logs', desc: 'All data access logged and reviewed' },
              { icon: '🧪', label: 'Pen Testing', desc: 'Regular security vulnerability scans' },
              { icon: '👥', label: 'Staff Training', desc: 'All personnel trained on data protection' },
              { icon: '🚨', label: 'Incident Response', desc: '72-hour breach notification to authorities' },
            ].map((item) => (
              <div key={item.label} style={{
                background: 'rgba(255,255,255,0.015)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '0.85rem 0.75rem',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>{item.icon}</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font-outfit)', marginBottom: '0.25rem' }}>{item.label}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem', lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section icon="⏳" title="5. Data Retention">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Data Type', 'Retention Period', 'Reason'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '0.65rem 0.85rem',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600,
                      fontFamily: 'var(--font-outfit)', letterSpacing: '0.03em',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Account information', 'Active + 3 years', 'Educational records'],
                  ['Quiz & exam results', 'Active + 1 year', 'Progress tracking'],
                  ['AI conversation logs', '30 days (anonymized)', 'System improvement'],
                  ['Usage analytics', '2 years (aggregated)', 'Platform optimization'],
                  ['Children\'s data', 'Deleted on parental request', 'COPPA / GDPR compliance'],
                ].map(([type, period, reason], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-primary)', fontSize: '0.84rem' }}>{type}</td>
                    <td style={{ padding: '0.65rem 0.85rem', color: i === 4 ? '#4ade80' : 'var(--primary)', fontSize: '0.84rem', fontWeight: 500 }}>{period}</td>
                    <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section icon="✉️" title="6. Contact Our Privacy Team">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            {[
              { role: 'Privacy Officer', email: 'privacy@ipass-a.com', icon: '🔒' },
              { role: 'Parent & Guardian Inquiries', email: 'parents@ipass-a.com', icon: '👪' },
              { role: 'General Support', email: 'support@ipass-a.com', icon: '💬' },
              { role: 'Legal & Compliance', email: 'legal@ipass-a.com', icon: '⚖️' },
            ].map((item) => (
              <a key={item.role} href={`mailto:${item.email}`} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                textDecoration: 'none',
                transition: 'border-color 0.15s ease',
              }}>
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>{item.role}</div>
                  <div style={{ color: 'var(--primary)', fontSize: '0.83rem', fontWeight: 500 }}>{item.email}</div>
                </div>
              </a>
            ))}
          </div>
        </Section>

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
            { label: 'Terms of Use', href: '/terms' },
            { label: 'Parental Consent', href: '/parental-consent' },
            { label: 'Data Transparency', href: '/data-transparency' },
          ].map(link => (
            <Link key={link.href} href={link.href} style={{
              color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '2px', transition: 'color 0.15s ease',
            }}>
              {link.label}
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
