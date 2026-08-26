"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type       = searchParams.get('type') || 'signup';
        const code       = searchParams.get('code');

        if (token_hash) {
          // Standard OTP flow — token_hash in query param (not hash fragment)
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });
          if (error) {
            setStatus('error');
            setMessage(error.message);
            return;
          }
        } else if (code) {
          // PKCE flow
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setStatus('error');
            setMessage(error.message);
            return;
          }
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link. Please sign up again.');
          return;
        }

        setStatus('success');
        setMessage('Your email is confirmed! You can now sign in.');
        setTimeout(() => router.push('/'), 3000);

      } catch (err: any) {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };

    run();
  }, [searchParams, router]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "2rem", background: "var(--bg-gradient)"
    }}>
      <div className="glass-panel" style={{ maxWidth: "480px", width: "100%", padding: "3rem 2rem", textAlign: "center" }}>

        {status === 'loading' && (
          <>
            <div style={{ width: "72px", height: "72px", margin: "0 auto 1.5rem", borderRadius: "50%", background: "rgba(14,165,233,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Loader size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Confirming your email</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Please wait...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ width: "72px", height: "72px", margin: "0 auto 1.5rem", borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={32} style={{ color: "var(--success)" }} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Email Confirmed!</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>{message}</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Redirecting to login...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width: "72px", height: "72px", margin: "0 auto 1.5rem", borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle size={32} style={{ color: "var(--danger)" }} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Confirmation Failed</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>{message}</p>
            <button onClick={() => router.push("/")} className="btn btn-primary" style={{ width: "100%" }}>
              Back to Login
            </button>
          </>
        )}

        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-gradient)" }}>
        <div style={{ width: "40px", height: "40px", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
