"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Mail, UserX } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AuthGuardProps {
  children: React.ReactNode;
}

function ResendVerification() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  const send = async () => {
    if (!email) { setMsg('Enter your email'); return; }
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      setMsg(error ? 'Failed: ' + error.message : '✅ New link sent! Check your inbox.');
    } catch (e: any) { setMsg('Error: ' + e.message); }
    finally { setSending(false); }
  };

  return (
    <div style={{ marginBottom: "1rem" }}>
      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
        Resend confirmation email:
      </p>
      <input type="email" className="form-input" placeholder="your@email.com"
        value={email} onChange={e => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: "0.5rem" }} />
      <button onClick={send} disabled={sending} className="btn btn-primary" style={{ width: "100%" }}>
        {sending ? 'Sending...' : '📧 Resend Confirmation Email'}
      </button>
      {msg && <p style={{ fontSize: "0.82rem", marginTop: "0.5rem", color: msg.startsWith('✅') ? "var(--success)" : "var(--danger)" }}>{msg}</p>}
    </div>
  );
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, isEmailVerified, isAccountActive, needsParentalConsent } = useAuth();
  const router = useRouter();

  // Show loading state only on first load (no user yet)
  if (loading && !user) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "1rem"
      }}>
        <div style={{
          width: "50px",
          height: "50px",
          border: "3px solid var(--glass-border)",
          borderTopColor: "var(--primary)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    router.push("/");
    return null;
  }

  // Email not verified - show verification prompt
  if (!isEmailVerified) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", padding: "2rem", background: "var(--bg-gradient)"
      }}>
        <div className="glass-panel" style={{ maxWidth: "500px", padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ width: "80px", height: "80px", margin: "0 auto 1.5rem", borderRadius: "50%", background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mail size={36} style={{ color: "var(--warning)" }} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>Verify Your Email</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            We sent a verification link to your email address. Click it to activate your account.
          </p>
          <ResendVerification />
          <button onClick={() => router.push("/")} className="btn btn-outline" style={{ width: "100%", marginTop: "0.75rem" }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Account is deactivated
  if (!isAccountActive) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--bg-gradient)"
      }}>
        <div className="glass-panel" style={{ maxWidth: "500px", padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{
            width: "80px", height: "80px", margin: "0 auto 1.5rem",
            borderRadius: "50%", background: "rgba(239,68,68,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <UserX size={36} style={{ color: "var(--danger)" }} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Account Deactivated
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
            Your account has been deactivated. Please contact your school administrator for assistance.
          </p>
          <button onClick={() => router.push("/")} className="btn btn-outline">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // All checks passed
  return <>{children}</>;
}