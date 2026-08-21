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

  // Show loading state
  if (loading) {
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
        <div className="glass-panel" style={{
          maxWidth: "500px",
          padding: "3rem 2rem",
          textAlign: "center"
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 1.5rem",
            borderRadius: "50%",
            background: "rgba(239,68,68,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <UserX size={36} style={{ color: "var(--danger)" }} />
          </div>
          
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Account Deactivated
          </h2>
          
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "1rem",
            lineHeight: 1.6,
            marginBottom: "2rem"
          }}>
            Your account has been temporarily deactivated. Please contact your school administrator 
            or support team for assistance in reactivating your account.
          </p>
          
          <button
            onClick={() => router.push("/")}
            className="btn btn-outline"
            style={{ marginRight: "1rem" }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Email not verified
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
        <div className="glass-panel" style={{
          maxWidth: "500px",
          padding: "3rem 2rem",
          textAlign: "center"
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 1.5rem",
            borderRadius: "50%",
            background: "rgba(245,158,11,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Mail size={36} style={{ color: "var(--warning)" }} />
          </div>
          
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Verify Your Email
          </h2>
          
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "1rem",
            lineHeight: 1.6,
            marginBottom: "2rem"
          }}>
            We've sent a verification email to your address. Please check your inbox and click 
            the verification link to activate your account and access I-Pass-A.
          </p>
          
          <div style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.2)",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "2rem"
          }}>
            <p style={{ fontSize: "0.9rem", color: "var(--warning)" }}>
              <strong>Didn't receive the email?</strong> Check your spam folder or contact support.
            </p>
          </div>
          
          <button
            onClick={() => router.push("/")}
            className="btn btn-outline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Needs parental consent
  if (needsParentalConsent) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--bg-gradient)"
      }}>
        <div className="glass-panel" style={{
          maxWidth: "500px",
          padding: "3rem 2rem",
          textAlign: "center"
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 1.5rem",
            borderRadius: "50%",
            background: "rgba(99,102,241,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Shield size={36} style={{ color: "var(--accent)" }} />
          </div>
          
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Parental Consent Required
          </h2>
          
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "1rem",
            lineHeight: 1.6,
            marginBottom: "2rem"
          }}>
            As a student under 13, parental consent is required to use I-Pass-A. 
            We've sent a consent form to your parent/guardian. Access will be granted 
            once they approve your account.
          </p>
          
          <div style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "2rem"
          }}>
            <p style={{ fontSize: "0.9rem", color: "var(--accent)" }}>
              <Clock size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
              This process typically takes 24-48 hours.
            </p>
          </div>
          
          <button
            onClick={() => router.push("/")}
            className="btn btn-outline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // All checks passed - render the protected content
  return <>{children}</>;
}