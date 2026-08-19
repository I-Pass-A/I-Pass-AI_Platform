'use client';

import { useState } from 'react';
import Link from 'next/link';

type Step = 1 | 2 | 3;

const InputField = ({
  label, id, type = 'text', placeholder, value, onChange, required,
}: {
  label: string; id: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    <label htmlFor={id} style={{ fontFamily: 'var(--font-outfit)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
      {label}{required && <span style={{ color: 'var(--primary)', marginLeft: '3px' }}>*</span>}
    </label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      style={{
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '0.7rem 1rem',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-inter)',
        fontSize: '0.9rem',
        outline: 'none',
        width: '100%',
        transition: 'border-color 0.15s ease',
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
    />
  </div>
);

const SelectField = ({
  label, id, value, onChange, options, required,
}: {
  label: string; id: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    <label htmlFor={id} style={{ fontFamily: 'var(--font-outfit)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
      {label}{required && <span style={{ color: 'var(--primary)', marginLeft: '3px' }}>*</span>}
    </label>
    <select
      id={id}
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      style={{
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '0.7rem 1rem',
        color: value ? 'var(--text-primary)' : 'var(--text-muted)',
        fontFamily: 'var(--font-inter)',
        fontSize: '0.9rem',
        outline: 'none',
        width: '100%',
        cursor: 'pointer',
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value} style={{ background: '#0a142c' }}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

const ConsentCheck = ({
  id, checked, onChange, required, children,
}: {
  id: string; checked: boolean; onChange: (v: boolean) => void;
  required?: boolean; children: React.ReactNode;
}) => (
  <label htmlFor={id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer' }}>
    <div
      onClick={() => onChange(!checked)}
      style={{
        flexShrink: 0, marginTop: '2px',
        width: '20px', height: '20px', borderRadius: '6px',
        border: `2px solid ${checked ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
        background: checked ? 'var(--primary)' : 'rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s ease',
        boxShadow: checked ? '0 0 0 3px rgba(14,165,233,0.15)' : 'none',
      }}
    >
      {checked && (
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
      {children}
      {required && <span style={{ color: 'var(--primary)', marginLeft: '4px', fontSize: '0.75rem' }}>(required)</span>}
    </span>
  </label>
);

export default function ParentalConsent() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    parentName: '', parentEmail: '', relationship: 'parent',
    childName: '', childAge: '', childGrade: '',
    privacyRead: false, termsRead: false,
    dataConsent: false, mainConsent: false, commsConsent: false,
  });

  const set = (key: keyof typeof form) => (val: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const step1Valid = form.parentName && form.parentEmail && form.relationship;
  const step2Valid = form.childName && form.childAge;
  const step3Valid = form.privacyRead && form.termsRead && form.dataConsent && form.mainConsent;

  if (step === 3 && form.mainConsent) {
    // submitted view handled below
  }

  const stepLabels = ['Your Details', 'Child Details', 'Consent'];
  const stepIcons = ['👤', '🧒', '✅'];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 20% 30%, rgba(20,184,166,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(14,165,233,0.05) 0%, transparent 50%), var(--bg-gradient)',
      padding: '3rem 1.5rem',
      fontFamily: 'var(--font-inter)',
    }}>
      <div style={{ maxWidth: '620px', margin: '0 auto' }}>

        {/* Back */}
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            ← Back to I-Pass-A
          </Link>
        </div>

        {/* Header */}
        <div style={{
          background: 'rgba(20,184,166,0.07)',
          border: '1px solid rgba(20,184,166,0.2)',
          borderRadius: '20px',
          padding: '2rem 2.5rem',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '160px', height: '160px',
            background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '2rem' }}>👪</span>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-outfit)', fontSize: '1.75rem', fontWeight: 800, margin: 0,
                background: 'linear-gradient(135deg, #2dd4bf 0%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.03em',
              }}>Parental Consent</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0, marginTop: '0.2rem' }}>
                Required for students under 13 (COPPA) &amp; under 16 in the EU (GDPR)
              </p>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, margin: 0 }}>
            I-Pass-A is an AI-powered educational platform. Before your child can create an account,
            we need your authorization. This takes about 2 minutes.
          </p>
        </div>

        {/* Step indicator */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          padding: '1.1rem 1.5rem',
          marginBottom: '1.25rem',
          gap: '0',
        }}>
          {stepLabels.map((label, i) => {
            const num = (i + 1) as Step;
            const isActive = step === num;
            const isDone = step > num;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: isDone ? 'rgba(34,197,94,0.2)' : isActive ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${isDone ? 'rgba(34,197,94,0.5)' : isActive ? 'rgba(14,165,233,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isDone ? '0.9rem' : '1rem',
                    transition: 'all 0.2s ease',
                  }}>
                    {isDone ? '✓' : stepIcons[i]}
                  </div>
                  <span style={{
                    fontSize: '0.72rem', fontFamily: 'var(--font-outfit)', fontWeight: 600,
                    color: isDone ? '#4ade80' : isActive ? 'var(--primary)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}>{label}</span>
                </div>
                {i < 2 && (
                  <div style={{
                    flex: 1, height: '2px', margin: '0 0.5rem', marginBottom: '1.1rem',
                    background: isDone ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.07)',
                    borderRadius: '2px', transition: 'background 0.3s ease',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Form card */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '2rem',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
                  Your Information
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                  As the parent or legal guardian authorizing this account.
                </p>
              </div>

              <InputField label="Full Name" id="parentName" placeholder="Jane Smith"
                value={form.parentName} onChange={set('parentName')} required />

              <InputField label="Email Address" id="parentEmail" type="email" placeholder="jane@example.com"
                value={form.parentEmail} onChange={set('parentEmail')} required />

              <SelectField label="Relationship to Child" id="relationship" value={form.relationship}
                onChange={set('relationship')}
                options={[
                  { value: 'parent', label: 'Parent' },
                  { value: 'guardian', label: 'Legal Guardian' },
                  { value: 'custodian', label: 'Custodian' },
                ]}
                required
              />

              <button
                disabled={!step1Valid}
                onClick={() => setStep(2)}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: step1Valid
                    ? 'linear-gradient(135deg, var(--secondary) 0%, #0f766e 100%)'
                    : 'rgba(255,255,255,0.05)',
                  color: step1Valid ? '#fff' : 'var(--text-muted)',
                  fontFamily: 'var(--font-outfit)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: step1Valid ? 'pointer' : 'not-allowed',
                  boxShadow: step1Valid ? '0 4px 14px rgba(20,184,166,0.3)' : 'none',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.01em',
                }}
              >
                Continue to Child Details →
              </button>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
                  Your Child's Details
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                  Information about the student who will use I-Pass-A.
                </p>
              </div>

              <InputField label="Child's Full Name" id="childName" placeholder="Alex Smith"
                value={form.childName} onChange={set('childName')} required />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <SelectField label="Age" id="childAge" value={form.childAge}
                  onChange={set('childAge')}
                  options={[
                    { value: '', label: 'Select age' },
                    ...Array.from({ length: 14 }, (_, i) => ({ value: String(i + 5), label: String(i + 5) })),
                  ]}
                  required
                />
                <SelectField label="Grade Level" id="childGrade" value={form.childGrade}
                  onChange={set('childGrade')}
                  options={[
                    { value: '', label: 'Select grade' },
                    { value: 'K', label: 'Kindergarten' },
                    ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Grade ${i + 1}` })),
                  ]}
                />
              </div>

              {/* What we collect callout */}
              <div style={{
                background: 'rgba(14,165,233,0.06)',
                border: '1px solid rgba(14,165,233,0.15)',
                borderRadius: '12px',
                padding: '1rem 1.1rem',
              }}>
                <p style={{ color: 'var(--primary)', fontFamily: 'var(--font-outfit)', fontSize: '0.82rem', fontWeight: 700, margin: '0 0 0.6rem' }}>
                  📦 What we collect for your child
                </p>
                {[
                  'Name, email, grade level',
                  'Quiz scores and learning progress',
                  'AI tutor questions & responses',
                  'Time on platform (for learning analytics)',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--primary)', fontSize: '0.7rem' }}>▸</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{item}</span>
                  </div>
                ))}
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.5rem 0 0' }}>
                  We never share this data for advertising.{' '}
                  <Link href="/privacy" style={{ color: 'var(--primary)', textDecoration: 'none', borderBottom: '1px solid rgba(14,165,233,0.35)' }}>
                    Full privacy policy →
                  </Link>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setStep(1)} style={{
                  flex: 1, padding: '0.8rem', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-outfit)', fontWeight: 600, fontSize: '0.9rem',
                  cursor: 'pointer',
                }}>
                  ← Back
                </button>
                <button
                  disabled={!step2Valid}
                  onClick={() => setStep(3)}
                  style={{
                    flex: 2, padding: '0.85rem', borderRadius: '10px', border: 'none',
                    background: step2Valid
                      ? 'linear-gradient(135deg, var(--secondary) 0%, #0f766e 100%)'
                      : 'rgba(255,255,255,0.05)',
                    color: step2Valid ? '#fff' : 'var(--text-muted)',
                    fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '0.95rem',
                    cursor: step2Valid ? 'pointer' : 'not-allowed',
                    boxShadow: step2Valid ? '0 4px 14px rgba(20,184,166,0.3)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Review & Consent →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && !form.mainConsent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
                  Review &amp; Give Consent
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                  Please read each item carefully before checking the box.
                </p>
              </div>

              {/* Summary recap */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px', padding: '1rem',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  {[
                    { label: 'Guardian', value: form.parentName },
                    { label: 'Email', value: form.parentEmail },
                    { label: 'Child', value: form.childName },
                    { label: 'Age / Grade', value: `${form.childAge}${form.childGrade ? ` / Grade ${form.childGrade}` : ''}` },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'var(--font-outfit)', fontWeight: 600, letterSpacing: '0.03em', marginBottom: '0.15rem' }}>{item.label.toUpperCase()}</div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setStep(1)} style={{
                  marginTop: '0.9rem', background: 'none', border: 'none',
                  color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-inter)',
                  textDecoration: 'underline',
                }}>
                  Edit details
                </button>
              </div>

              {/* Consent checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <ConsentCheck id="privacyRead" checked={form.privacyRead} onChange={set('privacyRead')} required>
                  I have read and understood the{' '}
                  <Link href="/privacy" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none', borderBottom: '1px solid rgba(14,165,233,0.4)' }}>
                    Privacy Policy
                  </Link>
                  , including how student data is protected under COPPA and GDPR.
                </ConsentCheck>

                <ConsentCheck id="termsRead" checked={form.termsRead} onChange={set('termsRead')} required>
                  I have read and agree to the{' '}
                  <Link href="/terms" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none', borderBottom: '1px solid rgba(14,165,233,0.4)' }}>
                    Terms of Use
                  </Link>
                  . My child will use the platform for legitimate educational purposes only.
                </ConsentCheck>

                <ConsentCheck id="dataConsent" checked={form.dataConsent} onChange={set('dataConsent')} required>
                  I consent to the collection and processing of my child's educational data as described above.
                  I understand how{' '}
                  <Link href="/data-transparency" target="_blank" style={{ color: 'var(--secondary)', textDecoration: 'none', borderBottom: '1px solid rgba(20,184,166,0.4)' }}>
                    AI processes student data
                  </Link>
                  .
                </ConsentCheck>

                <ConsentCheck id="commsConsent" checked={form.commsConsent} onChange={set('commsConsent')}>
                  I consent to receiving progress updates and important account notifications about my child's account.{' '}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>(optional)</span>
                </ConsentCheck>

                {/* Main consent — highlighted */}
                <div style={{
                  background: 'rgba(20,184,166,0.07)',
                  border: `1px solid ${form.mainConsent ? 'rgba(20,184,166,0.45)' : 'rgba(20,184,166,0.2)'}`,
                  borderRadius: '12px',
                  padding: '1rem',
                  transition: 'border-color 0.2s ease',
                }}>
                  <ConsentCheck id="mainConsent" checked={form.mainConsent} onChange={set('mainConsent')} required>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                      I hereby authorize my child to create and use an account on I-Pass-A.
                    </strong>
                    I confirm I am the parent or legal guardian and have the authority to provide this consent.
                  </ConsentCheck>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setStep(2)} style={{
                  flex: 1, padding: '0.8rem', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-outfit)', fontWeight: 600, fontSize: '0.9rem',
                  cursor: 'pointer',
                }}>
                  ← Back
                </button>
                <button
                  disabled={!step3Valid}
                  onClick={() => set('mainConsent')(true)}
                  style={{
                    flex: 2, padding: '0.85rem', borderRadius: '10px', border: 'none',
                    background: step3Valid
                      ? 'linear-gradient(135deg, var(--secondary) 0%, #0f766e 100%)'
                      : 'rgba(255,255,255,0.05)',
                    color: step3Valid ? '#fff' : 'var(--text-muted)',
                    fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '0.95rem',
                    cursor: step3Valid ? 'pointer' : 'not-allowed',
                    boxShadow: step3Valid ? '0 4px 14px rgba(20,184,166,0.3)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Submit Consent
                </button>
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === 3 && form.mainConsent && (
            <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '18px',
                background: 'rgba(34,197,94,0.15)',
                border: '2px solid rgba(34,197,94,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem',
              }}>
                ✅
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.35rem', fontWeight: 800, color: '#4ade80', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                  Consent Submitted
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, margin: 0 }}>
                  Thank you, <strong style={{ color: 'var(--text-primary)' }}>{form.parentName}</strong>.
                  We've received your authorization for <strong style={{ color: 'var(--text-primary)' }}>{form.childName}</strong> to use I-Pass-A.
                </p>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                textAlign: 'left',
                width: '100%',
              }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-outfit)', margin: '0 0 0.65rem' }}>
                  Next steps
                </p>
                {[
                  'Check your email for a confirmation',
                  'Your child\'s account will be activated within 24 hours',
                  'Login instructions will be sent to you',
                  'You can modify or withdraw consent anytime via parents@ipass-a.com',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.45rem', alignItems: 'flex-start' }}>
                    <span style={{
                      flexShrink: 0, width: '20px', height: '20px', borderRadius: '6px',
                      background: 'rgba(20,184,166,0.15)', color: 'var(--secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 800, fontFamily: 'var(--font-outfit)',
                    }}>{i + 1}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/" style={{
                display: 'inline-block', padding: '0.8rem 2rem',
                background: 'linear-gradient(135deg, var(--primary) 0%, #0284c7 100%)',
                borderRadius: '10px', color: '#fff', textDecoration: 'none',
                fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '0.9rem',
                boxShadow: '0 4px 14px rgba(14,165,233,0.3)',
              }}>
                Return to I-Pass-A
              </Link>
            </div>
          )}

        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '1.5rem', lineHeight: 1.6 }}>
          Questions? Email{' '}
          <a href="mailto:parents@ipass-a.com" style={{ color: 'var(--primary)', textDecoration: 'none' }}>parents@ipass-a.com</a>
          {' '}·{' '}
          <Link href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Privacy Policy</Link>
          {' '}·{' '}
          <Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Terms of Use</Link>
        </p>

      </div>
    </div>
  );
}
