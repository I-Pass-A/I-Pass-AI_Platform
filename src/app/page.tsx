"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { GraduationCap, Mail, Lock, User as UserIcon, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [grade, setGrade] = useState("9");
  
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // If user is already logged in, redirect to Tutor page
    if (!loading && user) {
      router.push("/tutor");
    }
  }, [user, loading, router]);

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
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-outfit)" }}>Loading I-Pass-A...</p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isLogin) {
        // Sign in via Supabase Auth
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (loginErr) throw loginErr;
      } else {
        // Sign up via Supabase Auth with metadata
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role,
              grade: role === "student" ? grade : null,
              language: role === "student" && parseInt(grade) <= 8 ? "Afaan Oromo" : "English"
            }
          }
        });
        if (signUpErr) throw signUpErr;
        
        setIsLogin(true);
        setError("Account created successfully! Please sign in using your credentials.");
        setName("");
        setPassword("");
        setSubmitting(false);
        return;
      }
      
      router.push("/tutor");
    } catch (err: any) {
      setError(err.message || "Authentication failed. Make sure your email and password are correct.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      background: "radial-gradient(circle at 10% 20%, rgba(14, 165, 233, 0.05) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(20, 184, 166, 0.05) 0%, transparent 40%), var(--bg-gradient)"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "960px",
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        gap: "4rem",
        alignItems: "center"
      }} className="animate-fade-in">
        
        {/* Left Side: Pitch and Branding */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1.5rem"
            }}>
              I
            </div>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 800 }} className="text-gradient-primary">
              I-Pass-A
            </h1>
          </div>
          
          <h2 style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.25, marginBottom: "1.5rem" }}>
            AI-Powered Tutoring & Smart Exam Preparation
          </h2>
          
          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", marginBottom: "2.5rem", lineHeight: 1.6 }}>
            Empowering students from Grades 1–12 with personalized AI learning. Study in English (Grades 9–12) or Afaan Oromo (Grades 1–8) with curriculum-grounded smart tutoring and practice exams.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ padding: "0.5rem", background: "rgba(14, 165, 233, 0.1)", borderRadius: "8px", color: "var(--primary)" }}>
                <BookOpen size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.25rem" }}>Curriculum Grounded (RAG)</h4>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>AI answers are strictly verified against approved school curriculum documents.</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ padding: "0.5rem", background: "rgba(20, 184, 166, 0.1)", borderRadius: "8px", color: "var(--secondary)" }}>
                <GraduationCap size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.25rem" }}>Custom Exam Generation</h4>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Generate mock exams by subject, topic, and difficulty with immediate grading & answer keys.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Glass Login Form */}
        <div className="glass-panel" style={{ padding: "2.5rem 2rem" }}>
          <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", textAlign: "center" }}>
            {isLogin ? "Welcome Back" : "Create Student Account"}
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem", textAlign: "center" }}>
            {isLogin ? "Sign in to access your AI Tutor" : "Sign up to begin your learning journey"}
          </p>

          {error && (
            <div style={{
              background: error.includes("successfully") ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
              border: error.includes("successfully") ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
              color: error.includes("successfully") ? "var(--success)" : "var(--danger)",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
              textAlign: "center"
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: "relative" }}>
                  <UserIcon size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="John Doe"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: "100%", paddingLeft: "2.5rem" }}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@school.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%", paddingLeft: "2.5rem" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", paddingLeft: "2.5rem" }}
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div className="form-group">
                  <label className="form-label">I am a...</label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Content Administrator</option>
                  </select>
                </div>

                {role === "student" && (
                  <div className="form-group animate-fade-in">
                    <label className="form-label">Select Grade / Kutaa</label>
                    <select
                      className="form-select"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      style={{ width: "100%" }}
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((g) => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: "100%", marginTop: "1rem" }}
            >
              {submitting ? "Processing..." : isLogin ? "Sign In" : "Register"}
            </button>
          </form>

          <div style={{
            marginTop: "1.5rem",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "var(--text-secondary)"
          }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary)",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0
              }}
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}
