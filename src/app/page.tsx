"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { GraduationCap, Mail, Lock, User as UserIcon, BookOpen, ChevronRight, Globe, Award } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [viewState, setViewState] = useState<"hero" | "auth">("hero");
  const [isLogin, setIsLogin] = useState(true);
  const [lang, setLang] = useState<"EN" | "AO">("EN");
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [grade, setGrade] = useState("12");
  
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-outfit)" }}>
          {lang === "EN" ? "Loading I-Pass-A..." : "I-Pass-A loading jira..."}
        </p>
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
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (loginErr) throw loginErr;
      } else {
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
        setError(
          lang === "EN" 
            ? "Account created successfully! Please sign in using your credentials." 
            : "Herri kee milkiin uumameera! Maaloo odeeffannoo keen seeni."
        );
        setName("");
        setPassword("");
        setSubmitting(false);
        return;
      }
      
      router.push("/tutor");
    } catch (err: any) {
      setError(
        err.message || 
        (lang === "EN" ? "Authentication failed." : "Seensa eeyyamuun hin danda'amne.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // UI translations
  const t = {
    title: "I-Pass-A",
    subtitle: lang === "EN" 
      ? "AI-Powered Tutoring & Smart Exam Preparation" 
      : "Barumsa AI fi Qophii Qormaataa Saffisaa",
    desc: lang === "EN"
      ? "Empowering students in Grades 6, 8, and 12 with personalized AI learning. Study in English (Grade 12) or Afaan Oromo (Grades 6 & 8) with curriculum-grounded tutoring and national exam preparation."
      : "Barattoota Kutaa 6, 8, fi 12 barumsa AI dhuunfaatiin gahoomsuu. Barnoota kee Ingiliffaan (Kutaa 12) ykn Afaan Oromootiin (Kutaa 6 & 8) qorannoo qormaataa fi tutor-gochaan baradhu.",
    discover: lang === "EN" ? "Discover the Platform" : "Platformii Argadhu",
    statStudents: lang === "EN" ? "12,500+ Active Students" : "Barattoota 12,500+ Ol",
    statExams: lang === "EN" ? "85,000+ Generated Exams" : "Qormaata 85,000+ Ol",
    statSchools: lang === "EN" ? "45+ Connected Schools" : "Manneen Barumsaa 45+",
    welcomeBack: lang === "EN" ? "Welcome Back" : "Akkam Jirtu",
    welcomeSub: lang === "EN" ? "Sign in to access your AI Tutor" : "Barnoota kee itti fufuuf seeni",
    createAcc: lang === "EN" ? "Create Account" : "Hera Uumi",
    createSub: lang === "EN" ? "Sign up to begin your learning journey" : "Barumsa kee eegaluuf galmaa'i",
    nameLabel: lang === "EN" ? "Full Name" : "Maqaa Guutuu",
    emailLabel: lang === "EN" ? "Email Address" : "Email Keessan",
    passLabel: lang === "EN" ? "Password" : "Jecha Iccitii",
    roleLabel: lang === "EN" ? "I am a..." : "Ani...",
    roleStudent: lang === "EN" ? "Student" : "Barataa",
    roleTeacher: lang === "EN" ? "Teacher" : "Barsiisaa",
    roleAdmin: lang === "EN" ? "Content Administrator" : "Bulchaa Curriculum",
    gradeLabel: lang === "EN" ? "Select Grade" : "Kutaa Filadhu",
    signInBtn: lang === "EN" ? "Sign In" : "Seeni",
    signUpBtn: lang === "EN" ? "Sign Up" : "Galmaa'i",
    haveAccount: lang === "EN" ? "Already have an account?" : "Hera qabduu?",
    noAccount: lang === "EN" ? "Don't have an account?" : "Hera hin qabduu?",
    backBtn: lang === "EN" ? "Back" : "Gara Dubaatti"
  };

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      padding: "2rem",
      background: "radial-gradient(circle at 10% 20%, rgba(14, 165, 233, 0.04) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(20, 184, 166, 0.04) 0%, transparent 40%), var(--bg-gradient)"
    }}>
      
      {/* Top Navbar: Language Selection */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto 3rem auto",
        padding: "1rem 0"
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
          <img 
            src="/logo.png" 
            alt="I-Pass-A Logo" 
            style={{ width: "72px", height: "72px", borderRadius: "12px", objectFit: "cover" }} 
          />
          <span style={{ fontSize: "1.35rem", fontWeight: 800 }} className="text-gradient-primary">
            I-Pass-A
          </span>
        </div>

        {/* Clean Language Switcher Toggle */}
        <button
          onClick={() => setLang(lang === "EN" ? "AO" : "EN")}
          className="btn btn-outline"
          style={{
            padding: "0.4rem 0.75rem",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <Globe size={14} />
          <span>{lang === "EN" ? "Afaan Oromoo" : "English"}</span>
        </button>
      </header>

      {/* Main Pitch/Form Area */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "1000px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2rem"
        }} className="animate-fade-in">

          {/* STATE 1: Hero Pitch and Statistics */}
          {viewState === "hero" && (
            <div style={{
              textAlign: "center",
              maxWidth: "720px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2.5rem"
            }}>
              <div>
                <h1 style={{ fontSize: "3rem", fontWeight: 800, lineHeight: 1.1, marginBottom: "1rem" }}>
                  {t.subtitle}
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "1.15rem", lineHeight: 1.6 }}>
                  {t.desc}
                </p>
              </div>

              {/* Discover Call-to-Action */}
              <button
                onClick={() => setViewState("auth")}
                className="btn btn-primary"
                style={{
                  padding: "0.9rem 2.2rem",
                  fontSize: "1.1rem",
                  borderRadius: "30px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem"
                }}
              >
                {t.discover} <ChevronRight size={18} />
              </button>

              {/* Statistics Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1.5rem",
                width: "100%",
                marginTop: "1.5rem"
              }}>
                {[
                  { label: t.statStudents, desc: lang === "EN" ? "Preparing for Grades 6, 8, & 12 Exams" : "Qophii Qormaata Kutaa 6, 8, fi 12" },
                  { label: t.statExams, desc: lang === "EN" ? "Mock and practice tests taken" : "Qormaanni mock fudhatame" },
                  { label: t.statSchools, desc: lang === "EN" ? "Schools using platform features" : "Manneen barumsaa itti fayyadaman" }
                ].map((stat, idx) => (
                  <div 
                    key={idx} 
                    className="glass-panel" 
                    style={{ padding: "1.25rem", background: "rgba(255,255,255,0.01)", textAlign: "center" }}
                  >
                    <h3 style={{ fontSize: "1.25rem", color: "var(--primary)", fontWeight: 700 }}>
                      {stat.label}
                    </h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      {stat.desc}
                    </p>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* STATE 2: Auth Login/Register Forms */}
          {viewState === "auth" && (
            <div 
              className="glass-panel animate-fade-in" 
              style={{
                width: "100%",
                maxWidth: "420px",
                padding: "2.5rem 2rem",
                position: "relative"
              }}
            >
              {/* Back button to HERO */}
              <button
                onClick={() => { setViewState("hero"); setError(""); }}
                style={{
                  position: "absolute",
                  left: "1.5rem",
                  top: "1.5rem",
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
              >
                ← {t.backBtn}
              </button>

              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem", marginTop: "1rem", textAlign: "center" }}>
                {isLogin ? t.welcomeBack : t.createAcc}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem", textAlign: "center" }}>
                {isLogin ? t.welcomeSub : t.createSub}
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
                    <label className="form-label">{t.nameLabel}</label>
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
                  <label className="form-label">{t.emailLabel}</label>
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
                  <label className="form-label">{t.passLabel}</label>
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
                      <label className="form-label">{t.roleLabel}</label>
                      <select
                        className="form-select"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        style={{ width: "100%" }}
                      >
                        <option value="student">{t.roleStudent}</option>
                        <option value="teacher">{t.roleTeacher}</option>
                        <option value="admin">{t.roleAdmin}</option>
                      </select>
                    </div>

                    {role === "student" && (
                      <div className="form-group animate-fade-in">
                        <label className="form-label">{t.gradeLabel}</label>
                        <select
                          className="form-select"
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          style={{ width: "100%" }}
                        >
                          {["6", "8", "12"].map((g) => (
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
                  {submitting ? "..." : isLogin ? t.signInBtn : t.signUpBtn}
                </button>
              </form>

              <div style={{
                marginTop: "1.5rem",
                textAlign: "center",
                fontSize: "0.85rem",
                color: "var(--text-secondary)"
              }}>
                {isLogin ? t.noAccount : t.haveAccount}{" "}
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
                  {isLogin ? t.signUpBtn : t.signInBtn}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
