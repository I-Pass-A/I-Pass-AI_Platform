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
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get all possible params
        const token_hash = searchParams.get('token_hash');
        const type       = searchParams.get('type');
        const code       = searchParams.get('code');

        // Also check URL hash fragment (Supabase sometimes uses #access_token=...&type=...)
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const hashParams = new URLSearchParams(hash.replace('#', ''));
        const hashAccessToken  = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');
        const hashType         = hashParams.get('type');

        const debug = `token_hash:${!!token_hash} code:${!!code} hash:${!!hash} hashToken:${!!hashAccessToken} type:${type || hashType}`;
        setDebugInfo(debug);
        console.log('[Confirm]', debug, 'fullURL:', typeof window !== 'undefined' ? window.location.href : '');

        let verifyError: any = null;
        let userId: string | null = null;
        let confirmed = false;

        if (hashAccessToken && hashRefreshToken) {
          // Hash fragment flow — set session directly
          const { data, error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          verifyError = error;
          userId = data?.user?.id ?? null;
          confirmed = !error && !!data?.user;

        } else if (hash && !hashAccessToken) {
          // Hash exists but no access_token — Supabase auth listener already consumed it
          // Wait for onAuthStateChange to fire and set session
          await new Promise(r => setTimeout(r, 2000));
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            userId = session.user.id;
            confirmed = true;
          }
          // If still no session, fall through to error below

        } else if (code) {
          // PKCE code flow
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          verifyError = error;
          userId = data?.user?.id ?? null;
          confirmed = !error && !!data?.user;

          // The shared Supabase client also detects sessions in the URL. If it
          // handled the code first, exchanging it a second time fails even
          // though confirmation succeeded. Use that established session.
          if (!confirmed) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              verifyError = null;
              userId = session.user.id;
              confirmed = true;
            }
          }

        } else if (token_hash) {
          // OTP token_hash flow — try both 'signup' and 'email' types
          const otpType = type === 'signup' ? 'signup' : 'email';
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: otpType as any,
          });
          verifyError = error;
          userId = data?.user?.id ?? null;
          confirmed = !error && !!data?.user;

          // If first attempt failed, try other type
          if (verifyError) {
            const altType = otpType === 'signup' ? 'email' : 'signup';
            const { data: d2, error: e2 } = await supabase.auth.verifyOtp({
              token_hash,
              type: altType as any,
            });
            if (!e2 && d2?.user) {
              verifyError = null;
              userId = d2.user.id;
              confirmed = true;
            }
          }

        } else {
          // No params but hash exists — Supabase's auth listener may have already 
          // processed the token. Wait briefly then check session.
          if (hash) {
            await new Promise(r => setTimeout(r, 1500));
          }
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            userId = session.user.id;
            confirmed = true;
          } else {
            setStatus('error');
            setMessage('Invalid confirmation link. Please sign up again to get a new link.');
            return;
          }
        }

        if (verifyError && !confirmed) {
          console.error('[Confirm] error:', verifyError);
          setStatus('error');
          setMessage(
            verifyError.message?.toLowerCase().includes('expired') || verifyError.message?.toLowerCase().includes('invalid')
              ? 'This confirmation link has expired. Please sign up again to get a new one.'
              : 'Confirmation failed: ' + verifyError.message
          );
          return;
        }

        if (!confirmed) {
          setStatus('error');
          setMessage('Could not verify your email. The link may have expired. Please sign up again.');
          return;
        }

        setStatus('success');
        setMessage('Your email is confirmed! Redirecting to your dashboard...');
        setTimeout(() => router.push('/dashboard'), 2500);

      } catch (err: any) {
        console.error('[Confirm] exception:', err);
        setStatus('error');
        setMessage('An unexpected error occurred: ' + err.message);
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
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>{message}</p>
            {debugInfo && <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "1.5rem", fontFamily: "monospace" }}>{debugInfo}</p>}
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
