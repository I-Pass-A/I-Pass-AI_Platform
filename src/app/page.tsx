"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { GraduationCap, Mail, Lock, User as UserIcon, BookOpen, ChevronRight, Globe, Award } from "lucide-react";
import { supabase } from "@/lib/supabase";
import TermsAcceptance from "@/components/TermsAcceptance";
import Link from "next/link";
import Footer from "@/components/Footer";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [viewState, setViewState] = useState<"hero" | "auth">("hero");
  const [isLogin, setIsLogin] = useState(true);
  const [lang, setLang] = useState<"EN" | "AO">("EN");
  
  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [grade, setGrade] = useState("12");
  const [gradeTaught, setGradeTaught] = useState("12");
  
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState("");

  useEffect(() => {
    // Handle Supabase PKCE code redirect — happens when user clicks
    // the password reset link in their email (lands on /?code=...)
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      router.replace(`/auth/reset-password?code=${code}`);
      return;
    }

    if (!loading && user) {
      router.push(user.role === "director" ? "/director" : "/dashboard");
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSubmitting(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      // Always show success message for security (don't reveal if email exists)
      setForgotSent(true);
      setForgotError("");
    } catch (err: any) {
      // Still show success to prevent email enumeration
      setForgotSent(true);
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      console.log('🔄 Starting authentication...', { isLogin, email });
      
      if (isLogin) {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (loginErr) {
          console.error('❌ Login error:', loginErr);
          throw loginErr;
        }
      } else {
        // Check if user is under 13 for COPPA compliance
        const isMinor = parseInt(grade) <= 8; // Grades 6-8 typically under 13-16
        
        console.log('🔄 Attempting signup...', { email, grade, isMinor });
        
        const { error: signUpErr, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
            data: {
              name: `${firstName.trim()} ${lastName.trim()}`,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              school_name: schoolName.trim(),
              age: age ? parseInt(age) : null,
              gender: gender || null,
              role: "student",
              grade,
              grade_taught: null,
              language: parseInt(grade) <= 8 ? "Afaan Oromo" : "English",
              is_minor: isMinor,
              parental_consent_required: isMinor,
              parental_consent_given: !isMinor,
              terms_accepted: termsAccepted,
              terms_accepted_at: new Date().toISOString(),
              email_verified: false,
              is_active: true
            }
          }
        });
        
        console.log('🔄 Signup response:', { data, error: signUpErr });
        
        if (signUpErr) {
          console.error('❌ Signup error:', signUpErr);
          throw signUpErr;
        }
        
        // Show success message - different based on email confirmation
        if (data.user && !data.session) {
          // Email confirmation required
          setError(
            lang === "EN" 
              ? "✅ Account created! Please check your email and click the verification link to activate your account." 
              : "✅ Herri kee uumameera! Email keessan ilaali fi link mirkaneessaa cuqaasi."
          );
        } else {
          // Direct access (no email confirmation needed)
          setError(
            lang === "EN" 
              ? "✅ Account created successfully! Redirecting to your dashboard..." 
              : "✅ Herri kee milkaa'inaan uumameera! Gara dashboard keessanitti geessaa jira..."
          );
          
          // Auto-redirect to dashboard after 2 seconds
          setTimeout(() => {
            window.location.href = '/tutor';
          }, 2000);
        }
        setFirstName("");
        setLastName("");
        setSchoolName("");
        setAge("");
        setGender("");
        setPassword("");
        setEmail("");
        setSubmitting(false);
        return;
      }
      
      router.push("/dashboard");
    } catch (err: any) {
      console.error('❌ Authentication error:', err);
      
      let errorMessage = err.message || "Authentication failed";
      
      // Provide user-friendly error messages
      if (err.message?.includes('fetch')) {
        errorMessage = lang === "EN" 
          ? "Network error. Please check your connection and try again."
          : "Dogoggora networkii. Walitti dhufeenya keessan ilaalii deebi'aa yaallaa.";
      } else if (err.message?.includes('Invalid login credentials')) {
        errorMessage = lang === "EN"
          ? "Invalid email or password. Please try again."
          : "Email ykn jecha iccitii sirrii miti. Deebi'aa yaallaa.";
      } else if (err.message?.includes('User already registered')) {
        errorMessage = lang === "EN"
          ? "An account with this email already exists. Try logging in instead."
          : "Herri email kanaan duraan jira. Seenuu yaallaa.";
      }
      
      setError(errorMessage);
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
    gradeLabel: lang === "EN" ? "Your Grade" : "Kutaa Kee",
    gradeTaughtLabel: lang === "EN" ? "Grade You Teach" : "Kutaa Barsiiftu",
    signInBtn: lang === "EN" ? "Sign In" : "Seeni",
    signUpBtn: lang === "EN" ? "Sign Up" : "Galmaa'i",
    haveAccount: lang === "EN" ? "Already have an account?" : "Hera qabduu?",
    noAccount: lang === "EN" ? "Don't have an account?" : "Hera hin qabduu?",
    backBtn: lang === "EN" ? "Back" : "Gara Dubaatti",
    forgotPass: lang === "EN" ? "Forgot password?" : "Jecha iccitii dagatte?",
    forgotTitle: lang === "EN" ? "Reset Password" : "Jecha Iccitii Haaromsi",
    forgotDesc: lang === "EN"
      ? "Enter your email and we'll send you a reset link."
      : "Email keessan galchaa, link haaromsuu isinii erga.",
    forgotBtn: lang === "EN" ? "Send Reset Link" : "Link Ergi",
    forgotSentTitle: lang === "EN" ? "Check your email" : "Email keessan ilaali",
    forgotSentDesc: lang === "EN"
      ? "If an account exists with this email, you'll receive a password reset link. Check your inbox and spam folder."
      : "Yoo herri email kanaan jiraate, link haaromsuu ergama. Inbox fi spam keessan ilaali.",
    backToLogin: lang === "EN" ? "Back to Sign In" : "Gara Seensaatti Deebi'i",
  };

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      padding: "1rem",
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
        padding: "1rem 0",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
          <img 
            src="/logo.png" 
            alt="I-Pass-A Logo" 
            style={{ width: "60px", height: "60px", borderRadius: "12px", objectFit: "cover" }} 
          />
          <span style={{ fontSize: "1.2rem", fontWeight: 800 }} className="text-gradient-primary">
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
                <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, lineHeight: 1.1, marginBottom: "1rem", textAlign: "center" }}>
                  {t.subtitle}
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "clamp(1rem, 2.5vw, 1.15rem)", lineHeight: 1.6 }}>
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
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
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
                    <h3 style={{ fontSize: "clamp(1rem, 2.5vw, 1.25rem)", color: "var(--primary)", fontWeight: 700 }}>
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
                padding: "2rem 1.5rem",
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

              {/* Forgot password modal overlay */}
              {showForgot && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(6,11,25,0.92)", borderRadius: "var(--radius-md)", zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "center", padding: "1.5rem" }}
                  className="animate-fade-in">
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.35rem" }}>{t.forgotTitle}</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{t.forgotDesc}</p>

                  {forgotSent ? (
                    <div style={{ textAlign: "center", padding: "1rem" }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📧</div>
                      <h4 style={{ fontWeight: 700, marginBottom: "0.35rem" }}>{t.forgotSentTitle}</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{t.forgotSentDesc}</p>
                      <button onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }} className="btn btn-outline" style={{ width: "100%" }}>
                        {t.backToLogin}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword}>
                      {forgotError && (
                        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", padding: "0.65rem 0.9rem", borderRadius: "var(--radius-sm)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                          {forgotError}
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
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            style={{ width: "100%", paddingLeft: "2.5rem" }}
                          />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={forgotSubmitting} style={{ width: "100%", marginBottom: "0.75rem" }}>
                        {forgotSubmitting ? "Sending..." : t.forgotBtn}
                      </button>
                      <button type="button" onClick={() => { setShowForgot(false); setForgotError(""); }} className="btn btn-outline" style={{ width: "100%", fontSize: "0.85rem" }}>
                        {t.backToLogin}
                      </button>
                    </form>
                  )}
                </div>
              )}

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
                  <>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">{lang === "EN" ? "First Name" : "Maqaa"}</label>
                        <div style={{ position: "relative" }}>
                          <UserIcon size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                          <input
                            type="text"
                            className="form-input"
                            placeholder={lang === "EN" ? "John" : "Tolaa"}
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            style={{ width: "100%", paddingLeft: "2.5rem" }}
                          />
                        </div>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">{lang === "EN" ? "Last Name" : "Godaansaa"}</label>
                        <div style={{ position: "relative" }}>
                          <UserIcon size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                          <input
                            type="text"
                            className="form-input"
                            placeholder={lang === "EN" ? "Doe" : "Girma"}
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            style={{ width: "100%", paddingLeft: "2.5rem" }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">{lang === "EN" ? "School Name" : "Maqaa Mana Barumsaa"}</label>
                      <div style={{ position: "relative" }}>
                        <BookOpen size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input
                          type="text"
                          className="form-input"
                          placeholder={lang === "EN" ? "e.g. Adama Secondary School" : "fkn. Mana Barumsaa Adaamaa"}
                          required
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                          style={{ width: "100%", paddingLeft: "2.5rem" }}
                        />
                      </div>
                    </div>

                    {/* Age & Gender */}
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">{lang === "EN" ? "Age" : "Umrii"}</label>
                        <select
                          className="form-select"
                          required
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          style={{ width: "100%" }}
                        >
                          <option value="">{lang === "EN" ? "Select age" : "Filadhu"}</option>
                          {Array.from({ length: 14 }, (_, i) => i + 5).map(a => (
                            <option key={a} value={String(a)}>{a}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">{lang === "EN" ? "Gender" : "Saala"}</label>
                        <select
                          className="form-select"
                          required
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          style={{ width: "100%" }}
                        >
                          <option value="">{lang === "EN" ? "Select" : "Filadhu"}</option>
                          <option value="male">{lang === "EN" ? "Male" : "Dhiira"}</option>
                          <option value="female">{lang === "EN" ? "Female" : "Dhalaa"}</option>
                        </select>
                      </div>
                    </div>

                    {/* Parental consent notice for under-13 */}
                    {age && parseInt(age) < 13 && (
                      <div style={{
                        padding: "0.875rem 1rem",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.25)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem"
                      }}>
                        <p style={{ fontSize: "0.82rem", color: "var(--warning)", fontWeight: 600, margin: 0 }}>
                          ⚠️ {lang === "EN" ? "Parental Consent Required" : "Hayyama Maatii Barbaachisa"}
                        </p>
                        <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                          {lang === "EN"
                            ? "Students under 13 require a parent or guardian to complete a consent form before accessing the platform."
                            : "Barataan umrii 13 gadi ta'e abbaa/haadha ykn eegduu barbaachisa."}
                        </p>
                        <a
                          href="/parental-consent"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "var(--warning)",
                            textDecoration: "none",
                            borderBottom: "1px solid rgba(245,158,11,0.4)",
                            width: "fit-content"
                          }}
                        >
                          {lang === "EN" ? "Open Parental Consent Form →" : "Foom Hayyama Maatii Bani →"}
                        </a>
                      </div>
                    )}
                  </>
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
                      style={{ width: "100%", paddingLeft: "2.5rem", borderColor: !isLogin && password && password.length < 8 ? "var(--danger)" : undefined }}
                    />
                  </div>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotError(""); setForgotSent(false); }}
                      style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.8rem", cursor: "pointer", padding: "0.25rem 0", textAlign: "right", width: "100%", marginTop: "0.25rem" }}
                    >
                      {t.forgotPass}
                    </button>
                  )}
                  {/* Password strength indicator — signup only */}
                  {!isLogin && password.length > 0 && (
                    <div style={{ marginTop: "0.5rem" }}>
                      {/* Strength bar */}
                      <div style={{ height: "4px", borderRadius: "2px", background: "var(--glass-border)", overflow: "hidden", marginBottom: "0.4rem" }}>
                        <div style={{
                          height: "100%",
                          width: password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? "100%"
                            : password.length >= 8 ? "65%" : "30%",
                          background: password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? "var(--success)"
                            : password.length >= 8 ? "var(--warning)" : "var(--danger)",
                          transition: "width 0.3s, background 0.3s",
                          borderRadius: "2px"
                        }} />
                      </div>
                      {/* Requirements checklist */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        {[
                          { label: lang === "EN" ? "At least 8 characters" : "Qubee 8 ol", met: password.length >= 8 },
                          { label: lang === "EN" ? "One uppercase letter" : "Qubee guddaa tokko", met: /[A-Z]/.test(password) },
                          { label: lang === "EN" ? "One number" : "Lakkoofsa tokko", met: /[0-9]/.test(password) },
                        ].map((req, i) => (
                          <span key={i} style={{ fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "0.3rem", color: req.met ? "var(--success)" : "var(--text-muted)" }}>
                            {req.met ? "✓" : "○"} {req.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {!isLogin && (
                  <>
                    {/* Grade — students only, no role selector needed */}
                    <div className="form-group animate-fade-in">
                      <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <GraduationCap size={14} /> {t.gradeLabel}
                      </label>
                      <select
                        className="form-select"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        style={{ width: "100%" }}
                      >
                        <option value="6">{lang === "EN" ? "Grade 6" : "Kutaa 6"} — Afaan Oromo</option>
                        <option value="8">{lang === "EN" ? "Grade 8" : "Kutaa 8"} — Afaan Oromo</option>
                        <option value="12">{lang === "EN" ? "Grade 12" : "Kutaa 12"} — English</option>
                      </select>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                        {lang === "EN"
                          ? (parseInt(grade) <= 8 ? "Instruction language: Afaan Oromo" : "Instruction language: English")
                          : (parseInt(grade) <= 8 ? "Afaan barumsa: Afaan Oromo" : "Afaan barumsa: Ingiliffaa")}
                      </span>
                    </div>

                    {/* Staff notice */}
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)", border: "1px solid var(--glass-border)" }}>
                      {lang === "EN"
                        ? "Teachers, admins and directors use pre-assigned credentials — contact your school."
                        : "Barsiisaan, bulchaan fi hogganaan odeeffannoo duraan kennameef fayyadamu."}
                    </div>

                    {/* Terms acceptance — signup only */}
                    <div style={{ marginTop: "1rem" }}>
                      <TermsAcceptance
                        accepted={termsAccepted}
                        onChange={setTermsAccepted}
                        lang={lang}
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || (!isLogin && !termsAccepted) || (!isLogin && (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)))}
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
                    setTermsAccepted(false);
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

      {/* Show full footer only on hero state */}
      {viewState === "hero" && <Footer />}

      {/* Mobile responsive styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          .glass-panel {
            margin: 0 0.5rem;
          }
        }
        
        @media (max-width: 480px) {
          main {
            padding: 0.5rem !important;
          }
          
          header {
            margin-bottom: 2rem !important;
          }
          
          .glass-panel {
            padding: 1.5rem 1rem !important;
          }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

    </main>
  );
}
