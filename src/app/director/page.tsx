"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Users, BookOpen, Award, ClipboardList,
  TrendingUp, Eye, GraduationCap, MessageSquare,
  ChevronDown, ChevronUp, Shield, RefreshCw,
  CheckCircle, Clock, BarChart2, Database,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface UserRow {
  id: string;
  name: string;
  role: string;
  grade: string | null;
  grade_taught: string | null;
  language: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

interface PlatformData {
  users: UserRow[];
  schools: string[];
  stats: {
    students: number;
    teachers: number;
    admins: number;
    totalUsers: number;
    sessions: number;
    examAttempts: number;
    assignments: number;
    submissions: number;
    chunks: number;
    totalSchools: number;
  };
  gradeBreakdown: { grade: string; students: number; teachers: number; sessions: number; exams: number }[];
  recentActivity: { type: string; label: string; time: string; color: string }[];
  curriculumByGrade: { grade: string; subjects: number; chunks: number }[];
  assignmentStats: { published: number; pending_grade: number; graded: number };
}

// ── Director Page ──────────────────────────────────────────────────────────────
export default function DirectorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<PlatformData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [expandRole, setExpandRole] = useState<string | null>("student");
  const [tab, setTab] = useState<"overview" | "users" | "grades" | "curriculum" | "reports">("overview");

  useEffect(() => {
    if (!loading && (!user || user.role !== "director")) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "director") loadAll();
  }, [user]);

  const loadAll = async () => {
    setFetching(true);
    try {
      const [
        profilesRes, sessionsRes, attemptsRes, assignRes, subRes, chunksRes,
        recentSessionsRes, recentAttemptsRes, subStatsRes,
        allSessionsRes, allAttemptsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id,name,role,grade,grade_taught,language,is_active,email_verified,created_at").order("created_at", { ascending: false }),
        supabase.from("tutor_sessions").select("id", { count: "exact", head: true }),
        supabase.from("exam_attempts").select("id", { count: "exact", head: true }),
        supabase.from("teacher_assignments").select("id", { count: "exact", head: true }),
        supabase.from("assignment_submissions").select("id", { count: "exact", head: true }),
        supabase.from("curriculum_chunks").select("grade,subject"),
        supabase.from("tutor_sessions").select("user_id,subject,started_at").order("started_at", { ascending: false }).limit(5),
        supabase.from("exam_attempts").select("student_id,score,submitted_at").order("submitted_at", { ascending: false }).limit(5),
        supabase.from("assignment_submissions").select("graded,raw_score"),
        // Per-grade usage: all sessions with user profile grade
        supabase.from("tutor_sessions").select("user_id, profiles!inner(grade, role)"),
        // Per-grade exams: all attempts with user profile grade
        supabase.from("exam_attempts").select("student_id, score, profiles!inner(grade)"),
      ]);

      const allUsers: UserRow[] = profilesRes.data || [];
      const chunks = chunksRes.data || [];

      // Schools from school_name metadata (if column exists)
      const schoolSet = new Set<string>();
      allUsers.forEach((u: any) => { if (u.school_name) schoolSet.add(u.school_name); });
      const schools = Array.from(schoolSet).sort();

      // Grade breakdown with real session/exam counts
      const grades = ["6", "8", "12"];
      const allSessions = allSessionsRes.data || [];
      const allAttempts = allAttemptsRes.data || [];

      const gradeBreakdown = grades.map(g => {
        const students  = allUsers.filter(u => u.role === "student" && u.grade === g);
        const teachers  = allUsers.filter(u => u.role === "teacher" && u.grade_taught === g);
        const studentIds = new Set(students.map(u => u.id));
        const gradeSessions = allSessions.filter((s: any) => studentIds.has(s.user_id)).length;
        const gradeExams    = allAttempts.filter((a: any) => studentIds.has(a.student_id)).length;
        const gradeScores   = allAttempts.filter((a: any) => studentIds.has(a.student_id)).map((a: any) => a.score);
        const avgScore = gradeScores.length ? Math.round(gradeScores.reduce((s: number, v: number) => s + v, 0) / gradeScores.length) : null;
        return {
          grade: g,
          students: students.length,
          teachers: teachers.length,
          sessions: gradeSessions,
          exams: gradeExams,
          avgScore,
        };
      });

      // Curriculum by grade
      const curriculumByGrade = grades.map(g => {
        const gradeChunks = chunks.filter((c: any) => c.grade === g);
        const subjects = new Set(gradeChunks.map((c: any) => c.subject)).size;
        return { grade: g, subjects, chunks: gradeChunks.length };
      });

      // Assignment stats
      const subs = subStatsRes.data || [];
      const assignmentStats = {
        published: assignRes.count || 0,
        pending_grade: subs.filter((s: any) => !s.graded).length,
        graded: subs.filter((s: any) => s.graded).length,
      };

      // Recent activity feed
      const recentActivity: { type: string; label: string; time: string; color: string }[] = [];
      for (const s of (recentSessionsRes.data || [])) {
        recentActivity.push({
          type: "session",
          label: `Tutor session — ${s.subject || "Unknown subject"}`,
          time: new Date(s.started_at).toLocaleString(),
          color: "var(--primary)",
        });
      }
      for (const a of (recentAttemptsRes.data || [])) {
        recentActivity.push({
          type: "exam",
          label: `Exam completed — score: ${Math.round(a.score)}%`,
          time: new Date(a.submitted_at).toLocaleString(),
          color: "var(--secondary)",
        });
      }
      recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setData({
        users: allUsers,
        schools,
        stats: {
          students:    allUsers.filter(u => u.role === "student").length,
          teachers:    allUsers.filter(u => u.role === "teacher").length,
          admins:      allUsers.filter(u => u.role === "admin").length,
          totalUsers:  allUsers.length,
          sessions:    sessionsRes.count ?? 0,
          examAttempts: attemptsRes.count ?? 0,
          assignments: assignRes.count ?? 0,
          submissions: subRes.count ?? 0,
          chunks:      chunks.length,
          totalSchools: schoolSet.size,
        },
        gradeBreakdown,
        recentActivity,
        curriculumByGrade,
        assignmentStats,
      });
    } catch (e) { console.error(e); }
    finally { setFetching(false); }
  };

  if (loading || !user || user.role !== "director") return null;

  const roleGroups = [
    { role: "student",  label: "Students",       color: "var(--primary)",   icon: <GraduationCap size={16} /> },
    { role: "teacher",  label: "Teachers",        color: "var(--secondary)", icon: <BookOpen size={16} /> },
    { role: "admin",    label: "Administrators",  color: "var(--accent)",    icon: <Shield size={16} /> },
    { role: "director", label: "Directors",       color: "var(--warning)",   icon: <Eye size={16} /> },
  ];

  const tabs = [
    { id: "overview"   as const, label: "Overview",   icon: <BarChart2 size={15} /> },
    { id: "grades"     as const, label: "By Grade",   icon: <GraduationCap size={15} /> },
    { id: "users"      as const, label: "Users",      icon: <Users size={15} /> },
    { id: "curriculum" as const, label: "Curriculum", icon: <Database size={15} /> },
    { id: "reports"    as const, label: "Reports",    icon: <TrendingUp size={15} /> },
  ];

  const s = data?.stats;

  return (
    <AuthGuard>
      <div className="app-container">
        <Sidebar />
        <main className="main-content" style={{ gap: "2rem" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "12px", background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Eye size={24} style={{ color: "var(--warning)" }} />
              </div>
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.25rem" }}>Director Overview</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Read-only view of all platform activity across all grades.
                </p>
              </div>
            </div>
            <button onClick={loadAll} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: "0.25rem", borderBottom: "1px solid var(--glass-border)" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.75rem 1.25rem", fontSize: "0.875rem",
                fontWeight: tab === t.id ? 600 : 400,
                background: "transparent", border: "none", cursor: "pointer",
                color: tab === t.id ? "var(--primary)" : "var(--text-secondary)",
                borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: "-1px", transition: "all 0.15s",
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
          {tab === "overview" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                {[
                  { label: "Total Users",     value: s?.totalUsers,    icon: <Users size={18} />,        color: "var(--primary)" },
                  { label: "Students",        value: s?.students,      icon: <GraduationCap size={18} />, color: "var(--secondary)" },
                  { label: "Teachers",        value: s?.teachers,      icon: <BookOpen size={18} />,      color: "var(--accent)" },
                  { label: "Schools",         value: s?.totalSchools || "—", icon: <Shield size={18} />, color: "var(--warning)" },
                  { label: "Tutor Sessions",  value: s?.sessions,      icon: <MessageSquare size={18} />, color: "var(--primary)" },
                  { label: "Exams Taken",     value: s?.examAttempts,  icon: <Award size={18} />,         color: "var(--success)" },
                  { label: "Assignments",     value: s?.assignments,   icon: <ClipboardList size={18} />, color: "var(--warning)" },
                  { label: "Submissions",     value: s?.submissions,   icon: <TrendingUp size={18} />,    color: "var(--danger)" },
                ].map((card, i) => (
                  <div key={i} className="glass-panel" style={{ padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.875rem" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "9px", background: `${card.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: card.color, flexShrink: 0 }}>
                      {card.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, lineHeight: 1 }}>{fetching ? "—" : card.value}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{card.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Assignment health + recent activity */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>

                {/* Assignment health */}
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <ClipboardList size={16} style={{ color: "var(--warning)" }} /> Assignment Health
                  </h3>
                  {[
                    { label: "Published Assignments", value: data?.assignmentStats.published, color: "var(--primary)", icon: <CheckCircle size={14} /> },
                    { label: "Submissions Received",  value: s?.submissions,                  color: "var(--secondary)", icon: <TrendingUp size={14} /> },
                    { label: "Pending Grading",       value: data?.assignmentStats.pending_grade, color: "var(--warning)", icon: <Clock size={14} /> },
                    { label: "Graded",                value: data?.assignmentStats.graded,     color: "var(--success)", icon: <CheckCircle size={14} /> },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: i < 3 ? "1px solid var(--glass-border)" : "none" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ color: item.color }}>{item.icon}</span>
                        {item.label}
                      </span>
                      <span style={{ fontWeight: 700, color: item.color, fontSize: "1rem" }}>{fetching ? "—" : (item.value ?? 0)}</span>
                    </div>
                  ))}
                </div>

                {/* Recent activity */}
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Clock size={16} style={{ color: "var(--primary)" }} /> Recent Activity
                  </h3>
                  {fetching ? (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Loading...</p>
                  ) : (data?.recentActivity || []).length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No recent activity.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {(data?.recentActivity || []).slice(0, 6).map((act, i) => (
                        <div key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: act.color, flexShrink: 0, marginTop: "5px" }} />
                          <div>
                            <p style={{ fontSize: "0.82rem", color: "var(--text-primary)", margin: 0 }}>{act.label}</p>
                            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, marginTop: "0.15rem" }}>{act.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── BY GRADE TAB ──────────────────────────────────────────────────── */}
          {tab === "grades" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {(data?.gradeBreakdown || []).map(g => {
                const gradeUsers = (data?.users || []).filter(u => u.grade === g.grade || u.grade_taught === g.grade);
                const students = gradeUsers.filter(u => u.role === "student");
                const teachers = gradeUsers.filter(u => u.role === "teacher");
                const lang = g.grade === "12" ? "English" : "Afaan Oromo";
                const color = g.grade === "6" ? "var(--primary)" : g.grade === "8" ? "var(--secondary)" : "var(--accent)";

                return (
                  <div key={g.grade} className="glass-panel" style={{ padding: "1.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", color, fontWeight: 800, fontSize: "1.1rem" }}>
                          {g.grade}
                        </div>
                        <div>
                          <h3 style={{ fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>Grade {g.grade}</h3>
                          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{lang}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "1.5rem" }}>
                        {[
                          { label: "Students", value: students.length, color: "var(--primary)" },
                          { label: "Teachers", value: teachers.length, color: "var(--secondary)" },
                        ].map((s, i) => (
                          <div key={i} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Teachers for this grade */}
                    {teachers.length > 0 && (
                      <div style={{ marginBottom: "1rem" }}>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.6rem" }}>Teachers</p>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          {teachers.map(t => (
                            <span key={t.id} style={{ fontSize: "0.82rem", padding: "0.3rem 0.75rem", borderRadius: "20px", background: "rgba(20,184,166,0.1)", color: "var(--secondary)", border: "1px solid rgba(20,184,166,0.2)" }}>
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Students list */}
                    {students.length > 0 ? (
                      <div>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.6rem" }}>
                          Students ({students.length})
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.5rem" }}>
                          {students.map(s => (
                            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.75rem", borderRadius: "8px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
                              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color, flexShrink: 0 }}>
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: "0.82rem", fontWeight: 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>
                                  {s.is_active ? "Active" : "Inactive"} · {s.email_verified ? "Verified" : "Unverified"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No students enrolled yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── USERS TAB ─────────────────────────────────────────────────────── */}
          {tab === "users" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                All platform users — {data?.users.length || 0} total
              </p>
              {roleGroups.map(({ role, label, color, icon }) => {
                const group = (data?.users || []).filter(u => u.role === role);
                if (group.length === 0) return null;
                const isOpen = expandRole === role;
                return (
                  <div key={role} style={{ border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                    <button onClick={() => setExpandRole(isOpen ? null : role)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.25rem", background: `${color}08`, border: "none", cursor: "pointer", borderBottom: isOpen ? "1px solid var(--glass-border)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ color }}>{icon}</span>
                        <span style={{ fontWeight: 700, color, fontSize: "0.9rem" }}>{label}</span>
                        <span style={{ fontSize: "0.72rem", background: `${color}18`, color, padding: "0.1rem 0.5rem", borderRadius: "8px", fontWeight: 700 }}>{group.length}</span>
                      </div>
                      {isOpen ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
                    </button>

                    {isOpen && (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "0.5rem 1.25rem", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}>
                          {["Name", "Grade", "Language", "Status", "Joined"].map(h => (
                            <span key={h} style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
                          ))}
                        </div>
                        {group.map((u, i) => (
                          <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "0.65rem 1.25rem", borderBottom: i < group.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: 700, color, flexShrink: 0 }}>
                                {u.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{u.name}</span>
                            </div>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                              {u.grade ? `G${u.grade}` : u.grade_taught ? `T:G${u.grade_taught}` : "—"}
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{u.language}</span>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: u.is_active ? "var(--success)" : "var(--danger)" }}>
                              {u.is_active ? "Active" : "Inactive"}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{new Date(u.created_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── CURRICULUM TAB ────────────────────────────────────────────────── */}
          {tab === "curriculum" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Curriculum loaded in the AI knowledge base across all grades.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                {(data?.curriculumByGrade || []).map(c => {
                  const color = c.grade === "6" ? "var(--primary)" : c.grade === "8" ? "var(--secondary)" : "var(--accent)";
                  const lang = c.grade === "12" ? "English" : "Afaan Oromo";
                  const maxChunks = Math.max(...(data?.curriculumByGrade || []).map(x => x.chunks), 1);
                  return (
                    <div key={c.grade} className="glass-panel" style={{ padding: "1.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                        <div>
                          <h3 style={{ fontWeight: 700, fontSize: "1.1rem", margin: 0, color }}>Grade {c.grade}</h3>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{lang}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "1.4rem", fontWeight: 800, color }}>{c.chunks.toLocaleString()}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>chunks</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: "0.75rem" }}>
                        <div style={{ height: "6px", background: "var(--glass-border)", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(c.chunks / maxChunks) * 100}%`, background: color, borderRadius: "3px", transition: "width 0.5s" }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        <span><strong style={{ color: "var(--text-primary)" }}>{c.subjects}</strong> subjects</span>
                        <span style={{ color: c.chunks > 100 ? "var(--success)" : "var(--warning)" }}>
                          {c.chunks > 100 ? "✓ Complete" : "⚠ Partial"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total summary */}
              <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--primary)" }}>
                    {(data?.curriculumByGrade || []).reduce((s, c) => s + c.chunks, 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Total chunks across all grades</div>
                </div>
                <div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--secondary)" }}>
                    {(data?.curriculumByGrade || []).reduce((s, c) => s + c.subjects, 0)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Total subjects covered</div>
                </div>
                <div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--success)" }}>3 / 3</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Grades with curriculum</div>
                </div>
              </div>
            </div>
          )}

          {/* ── REPORTS TAB ──────────────────────────────────────────────────── */}
          {tab === "reports" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

              {/* Students per grade bar chart */}
              <div className="glass-panel" style={{ padding: "1.75rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <GraduationCap size={16} style={{ color: "var(--primary)" }} /> Students per Grade
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {(data?.gradeBreakdown || []).map((g: any) => {
                    const maxStudents = Math.max(...(data?.gradeBreakdown || []).map((x: any) => x.students), 1);
                    const color = g.grade === "6" ? "var(--primary)" : g.grade === "8" ? "var(--secondary)" : "var(--accent)";
                    return (
                      <div key={g.grade}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                          <span style={{ fontWeight: 600 }}>Grade {g.grade} <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.78rem" }}>({g.grade === "12" ? "English" : "Afaan Oromo"})</span></span>
                          <span style={{ fontWeight: 700, color }}>{g.students} students</span>
                        </div>
                        <div style={{ height: "10px", background: "var(--glass-border)", borderRadius: "5px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(g.students / maxStudents) * 100}%`, background: color, borderRadius: "5px", transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Usage per grade */}
              <div className="glass-panel" style={{ padding: "1.75rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <BarChart2 size={16} style={{ color: "var(--secondary)" }} /> Platform Usage by Grade
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                  {(data?.gradeBreakdown || []).map((g: any) => {
                    const color = g.grade === "6" ? "var(--primary)" : g.grade === "8" ? "var(--secondary)" : "var(--accent)";
                    return (
                      <div key={g.grade} className="glass-panel" style={{ padding: "1.25rem", borderLeft: `3px solid ${color}` }}>
                        <h4 style={{ fontWeight: 700, fontSize: "1rem", color, marginBottom: "1rem" }}>Grade {g.grade}</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                          {[
                            { label: "Students",      value: g.students,  icon: <GraduationCap size={13} /> },
                            { label: "Teachers",      value: g.teachers,  icon: <BookOpen size={13} /> },
                            { label: "Tutor Sessions",value: g.sessions,  icon: <MessageSquare size={13} /> },
                            { label: "Exams Taken",   value: g.exams,     icon: <Award size={13} /> },
                            { label: "Avg Score",     value: g.avgScore !== null ? `${g.avgScore}%` : "—", icon: <TrendingUp size={13} /> },
                          ].map((row, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
                              <span style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                <span style={{ color }}>{row.icon}</span>{row.label}
                              </span>
                              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{fetching ? "—" : row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Schools list */}
              <div className="glass-panel" style={{ padding: "1.75rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Shield size={16} style={{ color: "var(--accent)" }} /> Schools Registered
                  <span style={{ fontSize: "0.78rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.25rem" }}>({data?.schools.length || 0})</span>
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                  Schools provided by students at signup via the School Name field.
                </p>
                {(data?.schools || []).length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontStyle: "italic" }}>
                    No school names recorded yet. Students must include their school when signing up.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {(data?.schools || []).map((school, i) => (
                      <span key={i} style={{ fontSize: "0.82rem", padding: "0.35rem 0.875rem", borderRadius: "20px", background: "rgba(99,102,241,0.1)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.2)" }}>
                        {school}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignment completion report */}
              <div className="glass-panel" style={{ padding: "1.75rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ClipboardList size={16} style={{ color: "var(--warning)" }} /> Assignment Completion Report
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
                  {[
                    { label: "Published",       value: data?.assignmentStats.published,     color: "var(--primary)",   bg: "rgba(14,165,233,0.08)" },
                    { label: "Submitted",        value: data?.stats.submissions,             color: "var(--secondary)", bg: "rgba(20,184,166,0.08)" },
                    { label: "Pending Grading",  value: data?.assignmentStats.pending_grade, color: "var(--warning)",   bg: "rgba(245,158,11,0.08)" },
                    { label: "Graded",           value: data?.assignmentStats.graded,        color: "var(--success)",   bg: "rgba(34,197,94,0.08)" },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: "1.1rem", borderRadius: "10px", background: item.bg, border: `1px solid ${item.color}22`, textAlign: "center" }}>
                      <div style={{ fontSize: "1.75rem", fontWeight: 800, color: item.color }}>{fetching ? "—" : (item.value ?? 0)}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                {/* Completion rate bar */}
                {(data?.stats.submissions || 0) > 0 && (data?.assignmentStats.published || 0) > 0 && (
                  <div style={{ marginTop: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "0.5rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Grading completion rate</span>
                      <span style={{ fontWeight: 700, color: "var(--success)" }}>
                        {Math.round(((data?.assignmentStats.graded || 0) / Math.max(data?.stats.submissions || 1, 1)) * 100)}%
                      </span>
                    </div>
                    <div style={{ height: "8px", background: "var(--glass-border)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.round(((data?.assignmentStats.graded || 0) / Math.max(data?.stats.submissions || 1, 1)) * 100)}%`,
                        background: "var(--success)", borderRadius: "4px", transition: "width 0.6s ease"
                      }} />
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Read-only notice */}
          <div style={{ padding: "0.75rem 1.25rem", borderRadius: "var(--radius-sm)", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.82rem", color: "var(--warning)" }}>
            <Eye size={14} />
            Director access is read-only. Contact an administrator to manage users or content.
          </div>

        </main>
      </div>
    </AuthGuard>
  );
}
