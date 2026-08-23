"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Handle the recovery token from the reset email URL
  useEffect(() => {
    const handleRecoveryToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const token_hash = params.get("token_hash");
      const code = params.get("code");
      const type = params.get("type");

      // PKCE flow: ?code=... landed directly here
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError("This reset link has expired or already been used. Please request a new one.");
        }
        window.history.replaceState({}, "", "/auth/reset-password");
        return;
      }

      // OTP flow: ?token_hash=...&type=recovery
      if (token_hash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type: "recovery" });
        if (error) {
          setError("This reset link has expired or already been used. Please request a new one.");
        }
        window.history.replaceState({}, "", "/auth/reset-password");
        return;
      }

      // Callback already exchanged code — just check session exists
      const { data: { session } } = await supabase.auth.getSession() as any;
      if (!session) {
        // Wait briefly for session to propagate
        await new Promise(r => setTimeout(r, 1000));
        const { data: { session: s2 } } = await supabase.auth.getSession() as any;
        if (!s2) {
          setError("Reset link expired. Please request a new one.");
        }
      }
    };

    handleRecoveryToken();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      setSuccess(true);
      // Give the user 3 seconds to read the success message, then go to dashboard
      setTimeout(() => router.replace("/dashboard"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background:
          "radial-gradient(circle at 10% 20%, rgba(14,165,233,0.04) 0%, transparent 40%), var(--bg-gradient)",
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{ width: "100%", maxWidth: "400px", padding: "2.5rem 2rem" }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img
            src="/logo.png"
            alt="I-Pass-A"
            style={{ width: "60px", height: "60px", borderRadius: "12px", objectFit: "cover", marginBottom: "0.75rem" }}
          />
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Set New Password</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Choose a strong password for your account.
          </p>
        </div>

        {/* Success state */}
        {success ? (
          <div
            style={{
              textAlign: "center",
              padding: "1.5rem",
              borderRadius: "var(--radius-sm)",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <CheckCircle size={36} style={{ color: "var(--success)", marginBottom: "0.75rem" }} />
            <h3 style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Password Updated!</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              Redirecting you to the dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "var(--danger)",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                  marginBottom: "1.25rem",
                }}
              >
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type={showPass ? "text" : "password"}
                  className="form-input"
                  placeholder="Min. 8 characters"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: 0,
                  }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type={showPass ? "text" : "password"}
                  className="form-input"
                  placeholder="Repeat password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  style={{
                    width: "100%",
                    paddingLeft: "2.5rem",
                    borderColor:
                      confirm && password !== confirm ? "var(--danger)" : undefined,
                  }}
                />
              </div>
              {confirm && password !== confirm && (
                <span style={{ fontSize: "0.78rem", color: "var(--danger)", marginTop: "0.25rem" }}>
                  Passwords do not match
                </span>
              )}
            </div>

            {/* Strength indicator */}
            {password.length > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    height: "4px",
                    borderRadius: "2px",
                    background: "var(--glass-border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width:
                        password.length >= 12
                          ? "100%"
                          : password.length >= 8
                            ? "65%"
                            : "30%",
                      background:
                        password.length >= 12
                          ? "var(--success)"
                          : password.length >= 8
                            ? "var(--warning)"
                            : "var(--danger)",
                      transition: "width 0.3s, background 0.3s",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color:
                      password.length >= 12
                        ? "var(--success)"
                        : password.length >= 8
                          ? "var(--warning)"
                          : "var(--danger)",
                    marginTop: "0.25rem",
                    display: "block",
                  }}
                >
                  {password.length >= 12 ? "Strong" : password.length >= 8 ? "Good" : "Too short"}
                </span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || password.length < 8 || password !== confirm}
              style={{ width: "100%" }}
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
