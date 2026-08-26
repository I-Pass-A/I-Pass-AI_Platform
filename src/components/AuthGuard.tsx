"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Mail, UserX } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, isEmailVerified, isAccountActive } = useAuth();
  const router = useRouter();

  // Show spinner only on first load (no user yet)
  if (loading && !user) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <div style={{ width: "50px", height: "50px", border: "3px solid var(--glass-border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    router.push("/");
    return null;
  }

  // Email not verified
  if (!isEmailVerified) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "var(--bg-gradient)" }}>
        <div className="glass-panel" style={{ maxWidth: "480px", padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ width: "72px", height: "72px", margin: "0 auto 1.5rem", borderRadius: "50%", background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mail size={32} style={{ color: "var(--warning)" }} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>Check Your Email</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" }}>
            We sent a confirmation link to your email. Click it to activate your account, then come back and sign in.
          </p>
          <button onClick={() => router.push("/")} className="btn btn-outline" style={{ width: "100%" }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Account deactivated
  if (!isAccountActive) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "var(--bg-gradient)" }}>
        <div className="glass-panel" style={{ maxWidth: "480px", padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ width: "72px", height: "72px", margin: "0 auto 1.5rem", borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserX size={32} style={{ color: "var(--danger)" }} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>Account Deactivated</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" }}>
            Your account has been deactivated. Please contact your school administrator.
          </p>
          <button onClick={() => router.push("/")} className="btn btn-outline" style={{ width: "100%" }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // All good
  return <>{children}</>;
}
