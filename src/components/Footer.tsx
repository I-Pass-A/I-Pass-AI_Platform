'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  const legalLinks = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Use', href: '/terms' },
    { label: 'Data Transparency', href: '/data-transparency' },
    { label: 'Parental Consent', href: '/parental-consent' },
  ];

  const badges = [
    { label: 'COPPA', color: 'rgba(14,165,233,0.12)', text: '#38bdf8' },
    { label: 'GDPR', color: 'rgba(20,184,166,0.12)', text: '#2dd4bf' },
    { label: 'FERPA', color: 'rgba(99,102,241,0.12)', text: '#a5b4fc' },
    { label: 'No Ads Ever', color: 'rgba(245,158,11,0.1)', text: '#fcd34d' },
  ];

  return (
    <footer style={{
      background: 'rgba(6,11,25,0.85)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      fontFamily: 'var(--font-inter)',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem 1.5rem' }}>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>

          {/* Brand block */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <img src="/logo.png" alt="I-Pass-A" style={{ width: '36px', height: '36px', borderRadius: '9px', objectFit: 'cover' }} />
              <span style={{
                fontFamily: 'var(--font-outfit)', fontSize: '1.15rem', fontWeight: 800,
                background: 'linear-gradient(135deg, #38bdf8 0%, #10b981 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>I-Pass-A</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.7, marginBottom: '1.1rem', maxWidth: '320px' }}>
              AI-powered tutoring and exam preparation for Ethiopian students in Grades 6, 8 &amp; 12.
              Safe, private, and curriculum-aligned.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {badges.map(b => (
                <span key={b.label} style={{
                  background: b.color,
                  border: `1px solid ${b.color.replace('0.12', '0.3').replace('0.1', '0.25')}`,
                  borderRadius: '6px', padding: '0.2rem 0.55rem',
                  fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em',
                  fontFamily: 'var(--font-outfit)', color: b.text,
                }}>{b.label}</span>
              ))}
            </div>
          </div>

          {/* Developer / Organization */}
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', letterSpacing: '0.06em', marginBottom: '0.9rem' }}>
              DEVELOPED BY
            </p>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Adama Smart City
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              Adama Administrative City Administration â€” Digital Innovation &amp; Smart Services Directorate
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <a href="https://adama.gov.et" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                <Globe size={13} /> adama.gov.et
              </a>
              <a href="mailto:smartcity@adama.gov.et" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                <Mail size={13} /> smartcity@adama.gov.et
              </a>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Phone size={13} /> +251 22 111 0000
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={13} /> Adama (Nazret), Oromia, Ethiopia
              </span>
            </div>
          </div>

          {/* Legal links */}
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', letterSpacing: '0.06em', marginBottom: '0.9rem' }}>
              LEGAL &amp; PRIVACY
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {legalLinks.map(l => (
                <Link key={l.href} href={l.href} style={{ color: 'var(--text-muted)', fontSize: '0.84rem', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', letterSpacing: '0.06em', marginBottom: '0.9rem' }}>
              PLATFORM SUPPORT
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { label: 'General Support', href: 'mailto:support@ipass-a.adama.gov.et' },
                { label: 'School Inquiries', href: 'mailto:schools@ipass-a.adama.gov.et' },
                { label: 'Parent Support', href: 'mailto:parents@ipass-a.adama.gov.et' },
                { label: 'Technical Issues', href: 'mailto:tech@ipass-a.adama.gov.et' },
              ].map(l => (
                <a key={l.href} href={l.href} style={{ color: 'var(--text-muted)', fontSize: '0.84rem', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Children's privacy banner */}
        <div style={{
          background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.12)',
          borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.75rem',
          display: 'flex', gap: '0.85rem', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>ðŸ”’</span>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Children's Privacy: </strong>
            I-Pass-A complies with COPPA and GDPR. Students under 13 require parental consent.
            We never share student data with advertisers. Parents can review or delete their child's data at any time â€”
            email{' '}
            <a href="mailto:parents@ipass-a.adama.gov.et" style={{ color: 'var(--primary)', textDecoration: 'none' }}>parents@ipass-a.adama.gov.et</a>.
          </p>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.77rem', margin: 0 }}>
            Â© {year} I-Pass-A Â· Developed by <strong style={{ color: 'var(--text-secondary)' }}>Adama Smart City</strong>. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {legalLinks.slice(0, 2).map(l => (
              <Link key={l.href} href={l.href} style={{ color: 'var(--text-muted)', fontSize: '0.77rem', textDecoration: 'none' }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );

}