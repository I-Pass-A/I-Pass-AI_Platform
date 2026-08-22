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