"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Users, BookOpen, Award, ClipboardList,
  TrendingUp, Eye, GraduationCap, MessageSquare,
  ChevronDown, ChevronUp, Shield,
} from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  role: string;
  grade: string | null;
  grade_taught: string | null;
  language: string;
  created_at: string;
}

interface StatRow {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

export default function DirectorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [expandRole, setExpandRole] = useState<string | null>("student");
  const [stats, setStats] = useState({
    students: 0, teachers: 0, admins: 0,
    sessions: 0, exams: 0, assignments: 0, submissions: 0,
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== "director")) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "director") loadAll();
  }, [user]);

  const loadAll = async () => {
    setFetching(true);
    try {
      const [profilesRes, sessionsRes, examsRes, assignRes, subRes] = await Promise.all([
        supabase.from("profiles").select("id,name,role,grade,grade_taught,language,created_at").order("created_at", { ascending: false }),
        supabase.from("tutor_sessions").select("id", { count: "exact", head: true }),
        supabase.from("exam_attempts").select("id", { count: "exact", head: true }),
        supabase.from("teacher_assignments").select("id", { count: "exact", head: true }),
        supabase.from("assignment_submissions").select("id", { count: "exact", head: true }),
      ]);

      const allUsers: UserRow[] = profilesRes.data || [];
      setUsers(allUsers);

      setStats({
        students:    allUsers.filter(u => u.role === "student").length,
        teachers:    allUsers.filter(u => u.role === "teacher").length,
        admins:      allUsers.filter(u => u.role === "admin").length,
        sessions:    sessionsRes.count ?? 0,
        exams:       examsRes.count ?? 0,
        assignments: assignRes.count ?? 0,
        submissions: subRes.count ?? 0,
      });
    } catch (e) { console.error(e); }
    finally { setFetching(false); }
  };

  if (loading || !user || user.role !== "director") return null;

  const roleGroups: { role: string; label: string; color: string; icon: React.ReactNode }[] = [
    { role: "student",  label: "Students",      color: "var(--primary)",   icon: <GraduationCap size={16} /> },
    { role: "teacher",  label: "Teachers",       color: "var(--secondary)", icon: <BookOpen size={16} /> },
    { role: "admin",    label: "Administrators", color: "var(--accent)",    icon: <Shield size={16} /> },
    { role: "director", label: "Directors",      color: "var(--warning)",   icon: <Eye size={16} /> },
  ];

  const statRows: StatRow[] = [
    { label: "Total Students",  value: stats.students,    color: "var(--primary)",   icon: <GraduationCap size={20} style={{ color: "var(--primary)" }} /> },
    { label: "Total Teachers",  value: stats.teachers,    color: "var(--secondary)", icon: <BookOpen size={20} style={{ color: "var(--secondary)" }} /> },
    { label: "Tutor Sessions",  value: stats.sessions,    color: "var(--accent)",    icon: <MessageSquare size={20} style={{ color: "var(--accent)" }} /> },
    { label: "Exams Taken",     value: stats.exams,       color: "var(--success)",   icon: <Award size={20} style={{ color: "var(--success)" }} /> },
    { label: "Assignments",     value: stats.assignments, color: "var(--warning)",   icon: <ClipboardList size={20} style={{ color: "var(--warning)" }} /> },
    { label: "Submissions",     value: stats.submissions, color: "var(--danger)",    icon: <TrendingUp size={20} style={{ color: "var(--danger)" }} /> },
  ];

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content" style={{ gap: "2rem" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "12px", background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Eye size={24} style={{ color: "var(--warning)" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.25rem" }}>Director Overview</h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Read-only view of all platform activity. You cannot modify data from this panel.
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {statRows.map((s, i) => (
            <div key={i} className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, lineHeight: 1 }}>{fetching ? "—" : s.value}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Users by role */}
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Users size={18} style={{ color: "var(--primary)" }} /> All Users ({users.length})
          </h2>

          {fetching ? (
            <p style={{ color: "var(--text-secondary)" }}>Loading users...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {roleGroups.map(({ role, label, color, icon }) => {
                const group = users.filter(u => u.role === role);
                if (group.length === 0) return null;
                const isOpen = expandRole === role;
                return (
                  <div key={role} style={{ border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                    {/* Role header */}
                    <button
                      onClick={() => setExpandRole(isOpen ? null : role)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.25rem", background: `${color}08`, border: "none", cursor: "pointer", borderBottom: isOpen ? "1px solid var(--glass-border)" : "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ color }}>{icon}</span>
                        <span style={{ fontWeight: 700, color, fontSize: "0.9rem" }}>{label}</span>
                        <span style={{ fontSize: "0.72rem", background: `${color}18`, color, padding: "0.1rem 0.5rem", borderRadius: "8px", fontWeight: 700 }}>{group.length}</span>
                      </div>
                      {isOpen ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
                    </button>

                    {/* User rows */}
                    {isOpen && (
                      <div>
                        {/* Table header */}
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "0.5rem 1.25rem", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}>
                          {["Name", "Grade", "Language", "Joined"].map(h => (
                            <span key={h} style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
                          ))}
                        </div>
                        {group.map((u, i) => (
                          <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "0.7rem 1.25rem", borderBottom: i < group.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color, flexShrink: 0 }}>
                                {u.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{u.name}</span>
                            </div>
                            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                              {u.grade ? `Grade ${u.grade}` : u.grade_taught ? `Teaches G${u.grade_taught}` : "—"}
                            </span>
                            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{u.language}</span>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{new Date(u.created_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Read-only notice */}
        <div style={{ padding: "0.85rem 1.25rem", borderRadius: "var(--radius-sm)", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem", color: "var(--warning)" }}>
          <Eye size={15} />
          <span>Director access is read-only. Contact an administrator to make changes to users or content.</span>
        </div>

      </main>
    </div>
  );
}
