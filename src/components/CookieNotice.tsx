'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('ipass-cookie-consent');
      if (!consent) setVisible(true);
    } catch {
      // localStorage not available
    }
  }, []);

  const accept = () => {
    localStorage.setItem('ipass-cookie-consent', 'all');
    setVisible(false);
  };

  const essential = () => {
    localStorage.setItem('ipass-cookie-consent', 'essential');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '1.25rem', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, width: 'calc(100% - 2rem)', maxWidth: '680px',
      background: 'rgba(10,20,44,0.92)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 20px 50px -10px rgba(0,0,0,0.8)',
      padding: '1.25rem 1.5rem',
      fontFamily: 'var(--font-inter)',
      animation: 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: '1px' }}>🍪</span>
        <div style={{ flex: 1 }}>
          <p style={{
            color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)',
            fontWeight: 700, fontSize: '0.9rem', margin: '0 0 0.35rem',
          }}>
            We use cookies
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.6, margin: 0 }}>
            Essential cookies keep I-Pass-A working. We also use analytics cookies to improve the platform.
            For students under 13, only essential cookies are used after parental consent.{' '}
            <Link href="/privacy" style={{ color: 'var(--primary)', textDecoration: 'none', borderBottom: '1px solid rgba(14,165,233,0.35)' }}>
              Learn more
            </Link>
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button
          onClick={essential}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-outfit)',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          Essential Only
        </button>
        <button
          onClick={accept}
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, var(--primary) 0%, #0284c7 100%)',
            color: '#fff',
            fontFamily: 'var(--font-outfit)',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(14,165,233,0.25)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(14,165,233,0.35)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(14,165,233,0.25)'; }}
        >
          Accept All Cookies
        </button>
      </div>
    </div>
  );
}
