import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Transparency | I-Pass-A',
  description: 'Exactly how I-Pass-A AI processes, stores, and protects student data.',
};

export default function DataTransparency() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 70% 10%, rgba(99,102,241,0.06) 0%, transparent 45%), radial-gradient(circle at 10% 90%, rgba(20,184,166,0.05) 0%, transparent 45%), var(--bg-gradient)',
      padding: '3rem 1.5rem',
      fontFamily: 'var(--font-inter)',
    }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* Back */}
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            ← Back to I-Pass-A
          </Link>
        </div>

        {/* Header */}
        <div style={{
          background: 'rgba(99,102,241,0.07)',
          border: '1px solid rgba(99,102,241,0.22)',
          borderRadius: '20px',
          padding: '2.5rem',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', bottom: '-60px', right: '-60px',
            width: '220px', height: '220px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>🔬</span>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-outfit)', fontSize: '2rem', fontWeight: 800, margin: 0,
                background: 'linear-gradient(135deg, #a5b4fc 0%, #2dd4bf 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.03em',
              }}>Data Transparency</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, marginTop: '0.25rem' }}>
                Updated quarterly · Last revised: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>
            We believe in radical transparency. This page shows exactly what our AI does with student data —
            nothing hidden, no jargon. If anything is unclear, email{' '}
            <a href="mailto:privacy@ipass-a.com" style={{ color: '#a5b4fc', textDecoration: 'none' }}>privacy@ipass-a.com</a>.
          </p>
        </div>

        {/* At a glance */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', marginBottom: '1.25rem',
        }}>
          {[
            { icon: '🚫', label: 'No Ads', desc: 'Data is never used for advertising or commercial profiling', color: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', text: '#f87171' },
            { icon: '🔒', label: 'Encrypted', desc: 'All data encrypted in transit (TLS 1.3) and at rest (AES-256)', color: 'rgba(14,165,233,0.07)', border: 'rgba(14,165,233,0.2)', text: 'var(--primary)' },
            { icon: '🗑️', label: 'Deletable', desc: 'Parents can request full deletion of a child\'s data at any time', color: 'rgba(34,197,94,0.07)', border: 'rgba(34,197,94,0.2)', text: '#4ade80' },
          ].map(item => (
            <div key={item.label} style={{
              background: item.color, border: `1px solid ${item.border}`,
              borderRadius: '14px', padding: '1.25rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{item.icon}</div>
              <div style={{ color: item.text, fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>{item.label}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* AI Data Flow */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px', padding: '2rem', marginBottom: '1.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🔄</span>
            <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              How Data Flows Through Our AI
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { step: '01', icon: '✏️', label: 'Input', desc: 'Student asks a question or starts a quiz', color: 'rgba(14,165,233,0.15)', text: 'var(--primary)' },
              { step: '02', icon: '🧹', label: 'Anonymisation', desc: 'Personal identifiers stripped before any AI processing', color: 'rgba(245,158,11,0.12)', text: '#fbbf24' },
              { step: '03', icon: '📚', label: 'Curriculum Match', desc: 'AI matches the query to grade-level Ethiopian curriculum content', color: 'rgba(99,102,241,0.12)', text: '#a5b4fc' },
              { step: '04', icon: '💡', label: 'Response', desc: 'Age-appropriate educational response generated and returned', color: 'rgba(20,184,166,0.12)', text: 'var(--secondary)' },
              { step: '05', icon: '📊', label: 'Logging', desc: 'Only anonymised performance metrics stored for platform improvement', color: 'rgba(34,197,94,0.1)', text: '#4ade80' },
            ].map((item, i) => (
              <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.9rem',
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px', padding: '0.85rem 1rem', flex: 1,
                }}>
                  <div style={{
                    flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px',
                    background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem',
                  }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: item.text, fontFamily: 'var(--font-outfit)', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' }}>{item.step}</span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)', fontSize: '0.88rem', fontWeight: 700 }}>{item.label}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>{item.desc}</div>
                  </div>
                </div>
                {i < 4 && (
                  <div style={{ width: '2px', height: '12px', background: 'rgba(255,255,255,0.06)', margin: '0 auto', position: 'relative', left: '-50%', display: 'none' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Functions breakdown */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px', padding: '2rem', marginBottom: '1.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🤖</span>
            <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              What Each AI System Does
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              {
                icon: '💬', title: 'AI Tutor',
                input: ['Student question or problem', 'Subject and grade level', 'Current topic context'],
                output: ['Curriculum-aligned explanation', 'Practice problems', 'Study suggestions'],
                color: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.15)',
              },
              {
                icon: '📝', title: 'Quiz Generator',
                input: ['Curriculum textbook content', 'Grade level and subject', 'Teacher-set objectives'],
                output: ['Multiple-choice questions', 'True/false and open questions', 'Difficulty-scaled items'],
                color: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.15)',
              },
              {
                icon: '📈', title: 'Progress Analytics',
                input: ['Quiz scores (aggregated)', 'Time spent per topic', 'Error patterns'],
                output: ['Knowledge gap identification', 'Revision topic suggestions', 'Progress reports for teachers'],
                color: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.15)',
              },
            ].map(item => (
              <div key={item.title} style={{
                background: item.color, border: `1px solid ${item.border}`,
                borderRadius: '12px', padding: '1.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                  <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.title}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', letterSpacing: '0.04em', margin: '0 0 0.4rem' }}>INPUT DATA</p>
                    {item.input.map(t => (
                      <div key={t} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--primary)', fontSize: '0.65rem', marginTop: '3px' }}>▸</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', letterSpacing: '0.04em', margin: '0 0 0.4rem' }}>OUTPUT</p>
                    {item.output.map(t => (
                      <div key={t} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--secondary)', fontSize: '0.65rem', marginTop: '3px' }}>▸</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Retention table */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px', padding: '2rem', marginBottom: '1.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '1.4rem' }}>⏳</span>
            <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Data Retention At a Glance
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Data Type', 'Kept For', 'Why'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '0.6rem 0.9rem',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700,
                      fontFamily: 'var(--font-outfit)', letterSpacing: '0.04em',
                      borderBottom: '1px solid rgba(255,255,255,0.07)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Account information', 'Active + 3 years', 'Educational records'],
                  ['Exam & quiz results', 'Active + 1 year', 'Progress tracking & reporting'],
                  ['AI conversation logs', '30 days (anonymised)', 'System improvement only'],
                  ['Usage analytics', '2 years (aggregated)', 'Platform optimisation'],
                  ['Children\'s data', 'Deleted immediately on request', 'COPPA / GDPR compliance'],
                ].map(([type, period, reason], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.65rem 0.9rem', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{type}</td>
                    <td style={{ padding: '0.65rem 0.9rem', color: i === 4 ? '#4ade80' : 'var(--primary)', fontSize: '0.85rem', fontWeight: 500 }}>{period}</td>
                    <td style={{ padding: '0.65rem 0.9rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Your rights */}
        <div style={{
          background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.15)',
          borderRadius: '16px', padding: '1.75rem 2rem', marginBottom: '1.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.1rem' }}>
            <span style={{ fontSize: '1.4rem' }}>⚖️</span>
            <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Your Data Rights
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {[
              { icon: '👁️', right: 'Access', desc: 'View all data we hold about you' },
              { icon: '✏️', right: 'Correction', desc: 'Update or fix inaccurate information' },
              { icon: '🗑️', right: 'Erasure', desc: 'Request full deletion of your account' },
              { icon: '📦', right: 'Portability', desc: 'Export your data in a common format' },
              { icon: '🚫', right: 'Objection', desc: 'Opt out of certain data processing' },
              { icon: '🧑‍⚖️', right: 'Human Review', desc: 'Request human review of any AI decision' },
            ].map(item => (
              <div key={item.right} style={{
                display: 'flex', gap: '0.65rem', alignItems: 'flex-start',
                background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.1)',
                borderRadius: '10px', padding: '0.75rem 0.85rem',
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ color: 'var(--primary)', fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.15rem' }}>{item.right}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.9rem', marginBottom: 0 }}>
            To exercise any of these rights, email{' '}
            <a href="mailto:privacy@ipass-a.com" style={{ color: 'var(--primary)', textDecoration: 'none' }}>privacy@ipass-a.com</a>
            {' '}or visit our{' '}
            <Link href="/parental-consent" style={{ color: 'var(--secondary)', textDecoration: 'none' }}>Parental Consent page</Link>
            {' '}for child-specific requests.
          </p>
        </div>

        {/* Footer nav */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: '1.5rem',
          display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap',
        }}>
          {[
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Use', href: '/terms' },
            { label: 'Parental Consent', href: '/parental-consent' },
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
