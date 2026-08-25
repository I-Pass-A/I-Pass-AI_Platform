"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Mail, Shield, AlertTriangle, UserX, Clock } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
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
            borderRadius: "50%", background: "rgba(245,158,11,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Mail size={36} style={{ color: "var(--warning)" }} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Verify Your Email
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            We sent a verification link to your email address. Click it to activate your account and access I-Pass-A.
          </p>
          <div style={{
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
            padding: "1rem", borderRadius: "8px", marginBottom: "2rem"
          }}>
            <p style={{ fontSize: "0.9rem", color: "var(--warning)", margin: 0 }}>
              Didn't receive the email? Check your spam folder or try signing up again.
            </p>
          </div>
          <button onClick={() => router.push("/")} className="btn btn-outline">
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