"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getSubjectsForGrade } from "@/lib/subjects";
import {
  MessageSquare, Award, Clock, CheckCircle,
  BookOpen, TrendingUp, AlertCircle, ChevronRight,
  Star, ClipboardList,
} from "lucide-react";

interface PendingAssignment {
  id: number;
  title: string;
  assignment_type: "quiz" | "homework" | "assignment";
  due_date: string;
  subject: string;
  topic: string;
}

interface RecentAttempt {
  id: number;
  subject: string;
  topic: string;
  score: number;
  submitted_at: string;
}

interface Stats {
  totalSessions: number;
  totalExams: number;
  avgScore: number | null;
  pendingCount: number;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [pending, setPending] = useState<PendingAssignment[]>([]);
  const [recent, setRecent] = useState<RecentAttempt[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSessions: 0, totalExams: 0, avgScore: null, pendingCount: 0 });
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const activeGrade = user.role === "teacher"
        ? (user.grade_taught ?? user.grade)
        : user.grade;

      const promises: Promise<any>[] = [];

      // 1. Pending assignments (students only)
      if (user.role === "student") {
        promises.push(
          supabase
            .from("teacher_assignments")
            .select("id, title, assignment_type, due_date, exams(subject, topic)")
            .eq("published", true)
            .eq("target_grade", activeGrade ?? "")
            .gt("due_date", new Date().toISOString())
            .order("due_date", { ascending: true })
            .limit(4)
        );
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      // 2. Recent exam attempts
      promises.push(
        supabase
          .from("exam_attempts")
          .select("id, score, submitted_at, exams(subject, topic)")
          .eq("student_id", user.id)
          .order("submitted_at", { ascending: false })
          .limit(5)
      );

      // 3. Tutor sessions count
      promises.push(
        supabase
          .from("tutor_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
      );

      const [pendingRes, attemptsRes, sessionsRes] = await Promise.all(promises);

      // Pending assignments
      const pendingData: PendingAssignment[] = (pendingRes.data || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        assignment_type: a.assignment_type,
        due_date: a.due_date,
        subject: a.exams?.subject ?? "",
        topic: a.exams?.topic ?? "",
      }));
      setPending(pendingData);

      // Recent attempts
      const attemptsData: RecentAttempt[] = (attemptsRes.data || []).map((a: any) => ({
        id: a.id,
        subject: a.exams?.subject ?? "Unknown",
        topic: a.exams?.topic ?? "",
        score: a.score,
        submitted_at: a.submitted_at,
      }));
      setRecent(attemptsData);

      // Stats
      const scores = attemptsData.map((a) => a.score);
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
        : null;

      setStats({
        totalSessions: sessionsRes.count ?? 0,
        totalExams: scores.length,
        avgScore,
        pendingCount: pendingData.length,
      });
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setFetching(false);
    }
  };

  if (loading || !user) return null;

  const isAO = user.language === "Afaan Oromo";
  const activeGrade = user.role === "teacher"
    ? (user.grade_taught ?? user.grade)
    : user.grade;
  const subjects = getSubjectsForGrade(activeGrade);
  const isTeacher = user.role === "teacher";
  const isAdmin = user.role === "admin";

  const hour = new Date().getHours();
  const greeting = isAO
    ? (hour < 12 ? "Akkam bultan" : hour < 17 ? "Akkam oolan" : "Akkam ooltan")
    : (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");

  const typeColor = (t: string) =>
    t === "quiz" ? "var(--primary)" : t === "homework" ? "var(--secondary)" : "var(--accent)";
  const typeLabel = (t: string) =>
    isAO
      ? (t === "quiz" ? "Gaaffii" : t === "homework" ? "Hojii Mana" : "Hojii Kutaa")
      : (t === "quiz" ? "Quiz" : t === "homework" ? "Homework" : "Assignment");

  const scoreColor = (s: number) =>
    s >= 80 ? "var(--success)" : s >= 50 ? "var(--warning)" : "var(--danger)";

  const daysUntil = (due: string) => {
    const diff = new Date(due).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days === 0
      ? (isAO ? "Har'a" : "Today")
      : days === 1
        ? (isAO ? "Boru" : "Tomorrow")
        : isAO ? `Guyyaa ${days} booda` : `${days} days left`;
  };

  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-content" style={{ gap: "2rem" }}>

        {/* ── Welcome Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "0.25rem" }}>{greeting},</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>{user.name} 👋</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
              {isAO
                ? `Kutaa ${activeGrade} · ${user.language}`
                : `Grade ${activeGrade} · ${user.language}${isTeacher ? " · " + (isAO ? "Barsiisaa" : "Teacher") : ""}`}
            </p>
          </div>
          <img src="/logo.png" alt="I-Pass-A" style={{ width: "52px", height: "52px", borderRadius: "10px", objectFit: "cover" }} />
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {[
            {
              icon: <MessageSquare size={20} style={{ color: "var(--primary)" }} />,
              value: fetching ? "—" : stats.totalSessions,
              label: isAO ? "Marii Barumsa" : "Tutor Sessions",
              color: "var(--primary)",
            },
            {
              icon: <Award size={20} style={{ color: "var(--secondary)" }} />,
              value: fetching ? "—" : stats.totalExams,
              label: isAO ? "Qormaata Fudhatame" : "Exams Taken",
              color: "var(--secondary)",
            },
            {
              icon: <TrendingUp size={20} style={{ color: "var(--accent)" }} />,
              value: fetching ? "—" : stats.avgScore !== null ? `${stats.avgScore}%` : (isAO ? "Dhibuu" : "No data"),
              label: isAO ? "Qabxii Giddugaleessa" : "Avg Score",
              color: "var(--accent)",
            },
            {
              icon: <ClipboardList size={20} style={{ color: "var(--warning)" }} />,
              value: fetching ? "—" : stats.pendingCount,
              label: isAO ? "Ramaddii Eeggatu" : "Pending Assignments",
              color: "var(--warning)",
            },
          ].map((s, i) => (
            <div key={i} className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1.75rem", flex: 1 }}>

          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

            {/* Pending assignments — students only */}
            {!isTeacher && !isAdmin && (
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <h2 style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <ClipboardList size={16} style={{ color: "var(--warning)" }} />
                    {isAO ? "Ramaddii Eeggatu" : "Pending Assignments"}
                  </h2>
                  <Link href="/exams" style={{ fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    {isAO ? "Hunda Ilaali" : "View All"} <ChevronRight size={13} />
                  </Link>
                </div>

                {fetching ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{isAO ? "Fidaa jira..." : "Loading..."}</p>
                ) : pending.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-secondary)" }}>
                    <CheckCircle size={28} style={{ color: "var(--success)", marginBottom: "0.5rem" }} />
                    <p style={{ fontSize: "0.875rem" }}>{isAO ? "Ramaddii eeggattu hin jirtu!" : "You're all caught up!"}</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {pending.map((a) => (
                      <Link key={a.id} href="/exams" style={{ textDecoration: "none" }}>
                        <div className="glass-panel glass-panel-hover" style={{ padding: "0.9rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: typeColor(a.assignment_type), background: `${typeColor(a.assignment_type)}15`, padding: "0.1rem 0.4rem", borderRadius: "4px", textTransform: "capitalize" }}>
                                {typeLabel(a.assignment_type)}
                              </span>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{a.subject}</span>
                            </div>
                            <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>{a.title}</p>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "0.75rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "var(--warning)" }}>
                              <Clock size={11} /> {daysUntil(a.due_date)}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Teacher quick actions */}
            {(isTeacher || isAdmin) && (
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Star size={16} style={{ color: "var(--accent)" }} />
                  {isAO ? "Hojii Ariifachiisaa" : "Quick Actions"}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {[
                    { label: isAO ? "Qormaata Haaraa Uumi" : "Generate New Exam", href: "/exams", color: "var(--primary)", icon: <Award size={16} /> },
                    { label: isAO ? "Ramaddii Maxxansi" : "Publish Assignment", href: "/exams", color: "var(--accent)", icon: <ClipboardList size={16} /> },
                    { label: isAO ? "Barsiisaa AI Fayyadami" : "Use AI Tutor", href: "/tutor", color: "var(--secondary)", icon: <MessageSquare size={16} /> },
                    ...(isAdmin ? [{ label: isAO ? "Kitaaba Ol-kaasi" : "Upload Textbook", href: "/admin", color: "var(--warning)", icon: <BookOpen size={16} /> }] : []),
                  ].map((action, i) => (
                    <Link key={i} href={action.href} style={{ textDecoration: "none" }}>
                      <div className="glass-panel glass-panel-hover" style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${action.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: action.color, flexShrink: 0 }}>
                          {action.icon}
                        </div>
                        <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{action.label}</span>
                        <ChevronRight size={14} style={{ marginLeft: "auto", color: "var(--text-muted)" }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent exam scores */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <TrendingUp size={16} style={{ color: "var(--secondary)" }} />
                  {isAO ? "Qormaata Dhumaa" : "Recent Exam Scores"}
                </h2>
                <Link href="/results" style={{ fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  {isAO ? "Hunda Ilaali" : "View All"} <ChevronRight size={13} />
                </Link>
              </div>

              {fetching ? (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{isAO ? "Fidaa jira..." : "Loading..."}</p>
              ) : recent.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-secondary)" }}>
                  <AlertCircle size={28} style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }} />
                  <p style={{ fontSize: "0.875rem" }}>{isAO ? "Ammaaf qormaata hin fudhanne." : "No exams taken yet. Head to Exam Centre to start."}</p>
                  <Link href="/exams">
                    <button className="btn btn-outline" style={{ marginTop: "0.75rem", fontSize: "0.8rem", padding: "0.4rem 1rem" }}>
                      {isAO ? "Qormaata Eegali" : "Start an Exam"}
                    </button>
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {recent.map((a) => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: "1px solid var(--glass-border)" }}>
                      <div>
                        <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{a.subject}</span>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginLeft: "0.4rem" }}>— {a.topic}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {new Date(a.submitted_at).toLocaleDateString()}
                        </span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: scoreColor(a.score), minWidth: "42px", textAlign: "right" }}>
                          {Math.round(a.score)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column — Quick start */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <BookOpen size={16} style={{ color: "var(--primary)" }} />
                {isAO ? "Gosa Barnootaa" : "Start Studying"}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {subjects.map((subj) => (
                  <Link key={subj} href={`/tutor`} style={{ textDecoration: "none" }}>
                    <div className="glass-panel glass-panel-hover" style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{subj}</span>
                      <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Score progress ring */}
            {stats.avgScore !== null && (
              <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>
                  {isAO ? "Qabxii Giddugaleessa" : "Overall Performance"}
                </h2>
                <div style={{ position: "relative", width: "110px", height: "110px", margin: "0 auto 1rem" }}>
                  <svg viewBox="0 0 110 110" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
                    <circle cx="55" cy="55" r="48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                    <circle cx="55" cy="55" r="48" fill="none"
                      stroke={scoreColor(stats.avgScore)}
                      strokeWidth="10"
                      strokeDasharray={`${(stats.avgScore / 100) * 301.6} 301.6`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span style={{ fontSize: "1.5rem", fontWeight: 800, color: scoreColor(stats.avgScore) }}>{stats.avgScore}%</span>
                  </div>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  {isAO
                    ? `Qormaata ${stats.totalExams} irratti hundaa'uun`
                    : `Based on ${stats.totalExams} exam${stats.totalExams !== 1 ? "s" : ""}`}
                </p>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, marginTop: "0.4rem",
                  color: stats.avgScore >= 80 ? "var(--success)" : stats.avgScore >= 50 ? "var(--warning)" : "var(--danger)" }}>
                  {stats.avgScore >= 80
                    ? (isAO ? "Baay'ee Gaarii! 🎉" : "Excellent work! 🎉")
                    : stats.avgScore >= 50
                      ? (isAO ? "Cimsadhu! 💪" : "Keep pushing! 💪")
                      : (isAO ? "Itti fufi barmadhu! 📚" : "More practice needed 📚")}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
