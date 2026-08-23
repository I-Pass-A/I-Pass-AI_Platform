"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Users, LayoutDashboard, BookOpen, Trash2, Search,
  Shield, GraduationCap, MessageSquare, Award,
  CheckCircle, XCircle, AlertCircle, RefreshCw,
  ChevronDown, UserX, UserCheck, Mail, Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  name: string;
  role: string;
  grade: string | null;
  grade_taught: string | null;
  language: string;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
  email?: string;
}

interface PlatformStats {
  totalUsers: number;
  students: number;
  teachers: number;
  directors: number;
  admins: number;
  totalSessions: number;
  totalExams: number;
  totalChunks: number;
  gradeBreakdown: Record<string, number>;
}

type Tab = "overview" | "users" | "curriculum";

// ── Admin Page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Users state
  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null);

  // Curriculum state
  const [chunks, setChunks] = useState<any[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "admin") {
      if (tab === "overview") fetchStats();
      else if (tab === "users") fetchUsers();
      else if (tab === "curriculum") fetchChunks();
    }
  }, [tab, user]);

  // ── Data Fetching ────────────────────────────────────────────────────────────

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [profilesRes, sessionsRes, examsRes, chunksRes] = await Promise.all([
        supabase.from("profiles").select("role, grade, grade_taught"),
        supabase.from("tutor_sessions").select("id", { count: "exact", head: true }),
        supabase.from("exams").select("id", { count: "exact", head: true }),
        supabase.from("curriculum_chunks").select("id", { count: "exact", head: true }),
      ]);

      const profiles = profilesRes.data || [];
      const gradeBreakdown: Record<string, number> = {};
      profiles.forEach((p: any) => {
        const g = p.grade || p.grade_taught;
        if (g) gradeBreakdown[g] = (gradeBreakdown[g] || 0) + 1;
      });

      setStats({
        totalUsers: profiles.length,
        students: profiles.filter((p: any) => p.role === "student").length,
        teachers: profiles.filter((p: any) => p.role === "teacher").length,
        directors: profiles.filter((p: any) => p.role === "director").length,
        admins: profiles.filter((p: any) => p.role === "admin").length,
        totalSessions: sessionsRes.count || 0,
        totalExams: examsRes.count || 0,
        totalChunks: chunksRes.count || 0,
        gradeBreakdown,
      });
    } catch (e) { console.error(e); }
    finally { setLoadingStats(false); }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      let q = supabase
        .from("profiles")
        .select("id, name, role, grade, grade_taught, language, email_verified, is_active, created_at")
        .order("created_at", { ascending: false });
      if (roleFilter !== "all") q = q.eq("role", roleFilter);
      const { data, error } = await q;
      if (error) throw error;
      setUsers(data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingUsers(false); }
  };

  const fetchChunks = async () => {
    setLoadingChunks(true);
    try {
      let q = supabase
        .from("curriculum_chunks")
        .select("id, subject, grade, language, source_document, chunk_index, created_at")
        .order("grade")
        .order("subject");
      if (gradeFilter !== "all") q = q.eq("grade", gradeFilter);
      const { data } = await q;

      // Group by subject + grade
      const grouped: Record<string, any> = {};
      (data || []).forEach((c: any) => {
        const key = `${c.grade}-${c.subject}`;
        if (!grouped[key]) grouped[key] = { grade: c.grade, subject: c.subject, language: c.language, source: c.source_document, count: 0 };
        grouped[key].count++;
      });
      setChunks(Object.values(grouped));
    } catch (e) { console.error(e); }
    finally { setLoadingChunks(false); }
  };

  // ── Actions ──────────────────────────────────────────────────────────────────

  const toggleActive = async (profile: Profile) => {
    if (profile.role === "admin") return;
    setActionLoading(profile.id);
    try {
      await supabase
        .from("profiles")
        .update({ is_active: !profile.is_active })
        .eq("id", profile.id);
      setUsers(prev => prev.map(u => u.id === profile.id ? { ...u, is_active: !u.is_active } : u));
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const deleteUser = async (profile: Profile) => {
    if (profile.role === "admin") return;
    setActionLoading(profile.id);
    try {
      // Delete via service role through API
      const res = await fetch(`/api/admin/users?userId=${profile.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== profile.id));
        if (stats) setStats({ ...stats, totalUsers: stats.totalUsers - 1 });
      }
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); setConfirmDelete(null); }
  };

  const deleteSubjectChunks = async (grade: string, subject: string) => {
    if (!confirm(`Delete ALL chunks for ${subject} (Grade ${grade})? This removes it from AI knowledge.`)) return;
    try {
      await supabase.from("curriculum_chunks").delete().eq("grade", grade).eq("subject", subject);
      fetchChunks();
    } catch (e) { console.error(e); }
  };

  if (loading || !user || user.role !== "admin") return null;

  // ── Filtered users ────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    (u.name?.toLowerCase().includes(search.toLowerCase()) ||
     u.role?.toLowerCase().includes(search.toLowerCase()))
  );

  const roleColor = (role: string) => ({
    student: "var(--primary)", teacher: "var(--secondary)",
    admin: "var(--danger)", director: "var(--accent)"
  }[role] || "var(--text-muted)");

  const tabs = [
    { id: "overview" as Tab, label: "Overview", icon: <LayoutDashboard size={15} /> },
    { id: "users" as Tab, label: "Users", icon: <Users size={15} /> },
    { id: "curriculum" as Tab, label: "Curriculum", icon: <BookOpen size={15} /> },
  ];

  return (
    <AuthGuard>
      <div className="app-container">
        <Sidebar />
        <main className="main-content" style={{ display: "flex", flexDirection: "column" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ fontSize: "2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Shield size={28} style={{ color: "var(--primary)" }} /> Admin Panel
              </h1>
              <p style={{ color: "var(--text-secondary)" }}>Full platform control — users, curriculum, and activity</p>
            </div>
            <button onClick={() => { if (tab === "overview") fetchStats(); else if (tab === "users") fetchUsers(); else fetchChunks(); }}
              className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Tab Bar */}
          <div style={{ display: "flex", gap: "0.25rem", borderBottom: "1px solid var(--glass-border)", marginBottom: "2rem" }}>
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

          {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
          {tab === "overview" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {loadingStats ? (
                <p style={{ color: "var(--text-secondary)" }}>Loading stats...</p>
              ) : stats && (
                <>
                  {/* Stats Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    {[
                      { label: "Total Users", value: stats.totalUsers, icon: <Users size={20} />, color: "var(--primary)" },
                      { label: "Students", value: stats.students, icon: <GraduationCap size={20} />, color: "var(--secondary)" },
                      { label: "Teachers", value: stats.teachers, icon: <Shield size={20} />, color: "var(--accent)" },
                      { label: "Tutor Sessions", value: stats.totalSessions, icon: <MessageSquare size={20} />, color: "var(--primary)" },
                      { label: "Exams Generated", value: stats.totalExams, icon: <Award size={20} />, color: "var(--secondary)" },
                      { label: "Curriculum Chunks", value: stats.totalChunks, icon: <BookOpen size={20} />, color: "var(--accent)" },
                    ].map((s, i) => (
                      <div key={i} className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, flexShrink: 0 }}>
                          {s.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: "1.75rem", fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{s.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Role & Grade Breakdown */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
                    <div className="glass-panel" style={{ padding: "1.5rem" }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Users by Role</h3>
                      {[
                        { role: "student", count: stats.students, color: "var(--primary)" },
                        { role: "teacher", count: stats.teachers, color: "var(--secondary)" },
                        { role: "director", count: stats.directors, color: "var(--accent)" },
                        { role: "admin", count: stats.admins, color: "var(--danger)" },
                      ].map(r => (
                        <div key={r.role} style={{ marginBottom: "0.75rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                            <span style={{ textTransform: "capitalize", color: "var(--text-secondary)" }}>{r.role}</span>
                            <span style={{ fontWeight: 700, color: r.color }}>{r.count}</span>
                          </div>
                          <div style={{ height: "6px", background: "var(--glass-border)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: stats.totalUsers ? `${(r.count / stats.totalUsers) * 100}%` : "0%", background: r.color, borderRadius: "3px", transition: "width 0.5s" }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="glass-panel" style={{ padding: "1.5rem" }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Students by Grade</h3>
                      {["6", "8", "12"].map(g => {
                        const count = stats.gradeBreakdown[g] || 0;
                        return (
                          <div key={g} style={{ marginBottom: "0.75rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                              <span style={{ color: "var(--text-secondary)" }}>Grade {g}</span>
                              <span style={{ fontWeight: 700, color: "var(--primary)" }}>{count}</span>
                            </div>
                            <div style={{ height: "6px", background: "var(--glass-border)", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: stats.students ? `${(count / stats.students) * 100}%` : "0%", background: "var(--primary)", borderRadius: "3px", transition: "width 0.5s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── USERS TAB ────────────────────────────────────────────────────── */}
          {tab === "users" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

              {/* Search & Filter */}
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
                  <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: "2.25rem", width: "100%" }}
                  />
                </div>
                <select
                  className="form-select"
                  value={roleFilter}
                  onChange={e => { setRoleFilter(e.target.value); setTimeout(fetchUsers, 0); }}
                  style={{ minWidth: "150px" }}
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="director">Directors</option>
                  <option value="admin">Admins</option>
                </select>
              </div>

              {/* User Count */}
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Showing <strong style={{ color: "var(--text-primary)" }}>{filteredUsers.length}</strong> users
              </p>

              {/* Users Table */}
              {loadingUsers ? (
                <p style={{ color: "var(--text-secondary)" }}>Loading users...</p>
              ) : filteredUsers.length === 0 ? (
                <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                  <Users size={32} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
                  <p>No users found.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {filteredUsers.map(u => (
                    <div key={u.id} className="glass-panel" style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", opacity: u.is_active ? 1 : 0.6 }}>
                      
                      {/* Left: User info */}
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: "200px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `${roleColor(u.role)}18`, border: `1px solid ${roleColor(u.role)}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: roleColor(u.role), flexShrink: 0 }}>
                          {u.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{u.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: roleColor(u.role), background: `${roleColor(u.role)}12`, padding: "0.1rem 0.45rem", borderRadius: "6px", textTransform: "capitalize" }}>
                              {u.role}
                            </span>
                            {(u.grade || u.grade_taught) && (
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                                <GraduationCap size={10} /> Grade {u.grade || u.grade_taught}
                              </span>
                            )}
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <Clock size={10} /> {new Date(u.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Status badges */}
                      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                        <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: "6px", fontWeight: 600, background: u.email_verified ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: u.email_verified ? "var(--success)" : "var(--warning)", border: `1px solid ${u.email_verified ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <Mail size={10} /> {u.email_verified ? "Verified" : "Unverified"}
                        </span>
                        <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: "6px", fontWeight: 600, background: u.is_active ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: u.is_active ? "var(--success)" : "var(--danger)", border: `1px solid ${u.is_active ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          {u.is_active ? <><CheckCircle size={10} /> Active</> : <><XCircle size={10} /> Inactive</>}
                        </span>
                      </div>

                      {/* Right: Actions — can't touch other admins */}
                      {u.role !== "admin" && (
                        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={actionLoading === u.id}
                            className="btn btn-outline"
                            style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", color: u.is_active ? "var(--warning)" : "var(--success)", borderColor: u.is_active ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)" }}
                            title={u.is_active ? "Deactivate user" : "Reactivate user"}
                          >
                            {u.is_active ? <><UserX size={13} /> Deactivate</> : <><UserCheck size={13} /> Activate</>}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(u)}
                            disabled={actionLoading === u.id}
                            className="btn btn-outline"
                            style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--danger)", borderColor: "rgba(239,68,68,0.3)" }}
                            title="Delete user permanently"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                      {u.role === "admin" && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", flexShrink: 0 }}>
                          Admin — protected
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CURRICULUM TAB ──────────────────────────────────────────────── */}
          {tab === "curriculum" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Curriculum in Vector DB</h3>
                <select
                  className="form-select"
                  value={gradeFilter}
                  onChange={e => { setGradeFilter(e.target.value); setTimeout(fetchChunks, 0); }}
                  style={{ minWidth: "140px" }}
                >
                  <option value="all">All Grades</option>
                  <option value="6">Grade 6</option>
                  <option value="8">Grade 8</option>
                  <option value="12">Grade 12</option>
                </select>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {chunks.reduce((s, c) => s + c.count, 0).toLocaleString()} total chunks
                </span>
              </div>

              {loadingChunks ? (
                <p style={{ color: "var(--text-secondary)" }}>Loading curriculum...</p>
              ) : chunks.length === 0 ? (
                <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                  <BookOpen size={32} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
                  <p>No curriculum chunks found.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                  {chunks.map((c, i) => (
                    <div key={i} className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.35rem" }}>
                            <span style={{ fontSize: "0.7rem", background: "rgba(14,165,233,0.1)", color: "var(--primary)", padding: "0.15rem 0.45rem", borderRadius: "5px" }}>Grade {c.grade}</span>
                            <span style={{ fontSize: "0.7rem", background: "rgba(20,184,166,0.1)", color: "var(--secondary)", padding: "0.15rem 0.45rem", borderRadius: "5px" }}>{c.language}</span>
                          </div>
                          <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>{c.subject}</h4>
                        </div>
                        <button
                          onClick={() => deleteSubjectChunks(c.grade, c.subject)}
                          className="btn btn-outline"
                          style={{ padding: "0.3rem 0.5rem", color: "var(--danger)", borderColor: "rgba(239,68,68,0.3)" }}
                          title={`Delete all ${c.subject} chunks`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        <strong style={{ color: "var(--text-primary)", fontSize: "1.1rem" }}>{c.count.toLocaleString()}</strong> chunks
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DELETE CONFIRM MODAL ─────────────────────────────────────────── */}
          {confirmDelete && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
              <div className="glass-panel animate-fade-in" style={{ maxWidth: "420px", width: "100%", padding: "2rem", textAlign: "center" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                  <AlertCircle size={30} style={{ color: "var(--danger)" }} />
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Delete User?</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  You are about to permanently delete:
                </p>
                <p style={{ fontWeight: 700, marginBottom: "1.5rem" }}>
                  {confirmDelete.name} <span style={{ color: roleColor(confirmDelete.role), fontSize: "0.85rem", textTransform: "capitalize" }}>({confirmDelete.role})</span>
                </p>
                <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginBottom: "1.75rem" }}>
                  This will delete their account, all exam attempts, tutor sessions, and submissions. This cannot be undone.
                </p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={() => setConfirmDelete(null)} className="btn btn-outline" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteUser(confirmDelete)}
                    disabled={actionLoading === confirmDelete.id}
                    className="btn btn-primary"
                    style={{ flex: 1, background: "var(--danger)", boxShadow: "none" }}
                  >
                    {actionLoading === confirmDelete.id ? "Deleting..." : "Delete Permanently"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </AuthGuard>
  );
}
