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
    const handleEmailConfirmation = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        const code = searchParams.get('code');

        let verifyError: any = null;
        let userId: string | null = null;

        if (code) {
          // PKCE flow
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          verifyError = error;
          userId = data?.user?.id ?? null;
        } else if (token_hash) {
          // OTP flow — accepts signup, email, recovery etc
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: (type as any) || 'email',
          });
          verifyError = error;
          userId = data?.user?.id ?? null;
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link. Please sign up again.');
          return;
        }

        if (verifyError) {
          console.error('Confirm error:', verifyError.message);
          setStatus('error');
          setMessage(
            verifyError.message?.toLowerCase().includes('expired')
              ? 'This link has expired. Please sign up again to get a new link.'
              : 'Confirmation failed: ' + verifyError.message
          );
          return;
        }

        // Update profile
        if (userId) {
          await supabase
            .from('profiles')
            .update({ email_verified: true, is_active: true })
            .eq('id', userId);
        }

        setStatus('success');
        setMessage('Your email is confirmed! Redirecting to your dashboard...');
        setTimeout(() => router.push('/dashboard'), 2500);

      } catch (err: any) {
        console.error('Confirm exception:', err);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleEmailConfirmation();
  }, [searchParams, router]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "2rem", background: "var(--bg-gradient)"
    }}>
      <div className="glass-panel" style={{ maxWidth: "500px", width: "100%", padding: "3rem 2rem", textAlign: "center" }}>

        {status === 'loading' && (
          <>
            <div style={{ width: "80px", height: "80px", margin: "0 auto 1.5rem", borderRadius: "50%", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Loader size={36} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>Confirming your email...</h2>
            <p style={{ color: "var(--text-secondary)" }}>Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ width: "80px", height: "80px", margin: "0 auto 1.5rem", borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={36} style={{ color: "var(--success)" }} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>Email Confirmed! 🎉</h2>
            <p style={{ color: "var(--text-secondary)" }}>{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width: "80px", height: "80px", margin: "0 auto 1.5rem", borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle size={36} style={{ color: "var(--danger)" }} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>Confirmation Failed</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>{message}</p>
            <button onClick={() => router.push("/")} className="btn btn-primary">Back to Login</button>
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
        <div className="glass-panel" style={{ maxWidth: "500px", width: "100%", padding: "3rem 2rem", textAlign: "center" }}>
          <Loader size={36} style={{ color: "var(--primary)" }} />
        </div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
