'use client';

import Link from 'next/link';

interface TermsAcceptanceProps {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  lang?: 'EN' | 'AO';
}

export default function TermsAcceptance({ accepted, onChange, lang = 'EN' }: TermsAcceptanceProps) {
  return (
    <div style={{
      background: 'rgba(14, 165, 233, 0.04)',
      border: `1px solid ${accepted ? 'rgba(14,165,233,0.35)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 'var(--radius-sm)',
      padding: '0.9rem 1rem',
      transition: 'border-color 0.2s ease',
    }}>
      <label style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        cursor: 'pointer',
        userSelect: 'none',
      }}>
        {/* Custom checkbox */}
        <span
          onClick={() => onChange(!accepted)}
          style={{
            flexShrink: 0,
            marginTop: '2px',
            width: '18px',
            height: '18px',
            borderRadius: '5px',
            border: `2px solid ${accepted ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
            background: accepted ? 'var(--primary)' : 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            boxShadow: accepted ? '0 0 0 3px rgba(14,165,233,0.15)' : 'none',
          }}
        >
          {accepted && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>

        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {lang === 'EN' ? (
            <>
              I agree to the{' '}
              <Link href="/terms" target="_blank"
                style={{ color: 'var(--primary)', textDecoration: 'none', borderBottom: '1px solid rgba(14,165,233,0.4)' }}>
                Terms of Use
              </Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank"
                style={{ color: 'var(--primary)', textDecoration: 'none', borderBottom: '1px solid rgba(14,165,233,0.4)' }}>
                Privacy Policy
              </Link>
              . I understand how{' '}
              <Link href="/data-transparency" target="_blank"
                style={{ color: 'var(--secondary)', textDecoration: 'none', borderBottom: '1px solid rgba(20,184,166,0.4)' }}>
                AI processes student data
              </Link>
              . Students under 13 require{' '}
              <Link href="/parental-consent" target="_blank"
                style={{ color: 'var(--secondary)', textDecoration: 'none', borderBottom: '1px solid rgba(20,184,166,0.4)' }}>
                parental consent
              </Link>
              .
            </>
          ) : (
            <>
              Ani{' '}
              <Link href="/terms" target="_blank"
                style={{ color: 'var(--primary)', textDecoration: 'none', borderBottom: '1px solid rgba(14,165,233,0.4)' }}>
                Seerota Fayyadamaa
              </Link>
              {' '}fi{' '}
              <Link href="/privacy" target="_blank"
                style={{ color: 'var(--primary)', textDecoration: 'none', borderBottom: '1px solid rgba(14,165,233,0.4)' }}>
                Imaama Dhuunfaa
              </Link>
              {' '}walii gala. AI{' '}
              <Link href="/data-transparency" target="_blank"
                style={{ color: 'var(--secondary)', textDecoration: 'none', borderBottom: '1px solid rgba(20,184,166,0.4)' }}>
                odeeffannoo barattootaa
              </Link>
              {' '}akkamitti itti fayyadamu hubadha.
            </>
          )}
        </span>
      </label>
    </div>
  );
}
