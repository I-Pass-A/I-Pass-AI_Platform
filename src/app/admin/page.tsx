"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Upload, Trash2, Database, FileText, CheckCircle2, ShieldAlert, BookOpen, Lock,
  Users, Activity, Settings, Shield, Eye, EyeOff, UserCheck, UserX, Search,
  Filter, TrendingUp, Clock, AlertTriangle, MoreVertical, ChevronDown
} from "lucide-react";

interface ChunkInfo {
  id: number;
  subject: string;
  topic: string;
  grade: string;
  language: string;
  source_document: string;
  content_preview: string;
  version: number;
  uploaded_by?: string;
  created_at: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  grade: string;
  language: string;
  email_verified: boolean;
  is_active: boolean;
  last_login_at: string | null;
  login_count: number;
  created_at: string;
}

interface Analytics {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  roleDistribution: Record<string, number>;
  gradeDistribution: Record<string, number>;
}

export default function AdminPage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  const isAdmin = user?.role === "admin";
  const isAO = user?.language === "Afaan Oromo";

  // Early returns for auth checks
  if (loading || !user) return null;
  if (user.role !== "admin" && user.role !== "teacher") return null;

  // Tab state
  const [activeTab, setActiveTab] = useState<"upload" | "users" | "analytics" | "security">("upload");
  
  // Migration state
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [migrationError, setMigrationError] = useState("");
  
  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [gradeBand, setGradeBand] = useState("12");
  const [language, setLanguage] = useState("English");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadError, setUploadError] = useState("");

  // Chunks state
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [fetchingChunks, setFetchingChunks] = useState(false);
  
  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  
  // Analytics state
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Auth check
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  // Load data based on active tab
  useEffect(() => {
    if (user?.role === "admin") {
      if (activeTab === "upload") {
        fetchChunks();
      } else if (activeTab === "users") {
        fetchUsers();
      } else if (activeTab === "analytics") {
        fetchAnalytics();
      }
      // Security tab doesn't need data loading
    }
  }, [activeTab, user]);

  const fetchChunks = async () => {
    setFetchingChunks(true);
    try {
      const { data, error } = await supabase
        .from("curriculum_chunks")
        .select("id, subject, topic, grade, language, source_document, content, version, uploaded_by, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const formatted: ChunkInfo[] = (data || []).map((c: any) => ({
        id: c.id,
        subject: c.subject,
        topic: c.topic,
        grade: c.grade,
        language: c.language,
        source_document: c.source_document,
        content_preview: c.content.slice(0, 120) + "...",
        version: c.version,
        uploaded_by: c.uploaded_by || "System",
        created_at: c.created_at,
      }));

      setChunks(formatted);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingChunks(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      let query = supabase
        .from("profiles")
        .select(`
          id, name, role, grade, language, 
          email_verified, is_active, last_login_at, 
          login_count, created_at
        `)
        .order("created_at", { ascending: false });

      if (roleFilter !== "all") {
        query = query.eq("role", roleFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("role, grade, language, email_verified, is_active, last_login_at, created_at");

      if (error) throw error;

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const profilesList = (profiles || []) as any[];
      const analytics: Analytics = {
        totalUsers: profilesList.length,
        activeUsers: profilesList.filter((p: any) => p.is_active).length,
        verifiedUsers: profilesList.filter((p: any) => p.email_verified).length,
        weeklyActiveUsers: profilesList.filter((p: any) => 
          p.last_login_at && new Date(p.last_login_at) > weekAgo
        ).length,
        monthlyActiveUsers: profilesList.filter((p: any) => 
          p.last_login_at && new Date(p.last_login_at) > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        ).length,
        roleDistribution: profilesList.reduce((acc: any, p: any) => {
          acc[p.role] = (acc[p.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        gradeDistribution: profilesList.reduce((acc: any, p: any) => {
          if (p.grade) acc[p.grade] = (acc[p.grade] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      setAnalytics(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Apply security migration
  const applySecurityMigration = async () => {
    if (!session?.access_token) {
      setMigrationError("No valid session token");
      return;
    }
    
    setMigrating(true);
    setMigrationError("");
    setMigrationResult(null);
    
    try {
      const response = await fetch("/api/admin/migrate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMigrationResult(data);
      } else {
        setMigrationError(data.error || "Migration failed");
      }
    } catch (error: any) {
      setMigrationError(error.message || "Network error");
    } finally {
      setMigrating(false);
    }
  };

  const handleUserAction = async (userId: string, action: "activate" | "deactivate") => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_active: action === "activate",
          deactivated_at: action === "deactivate" ? new Date().toISOString() : null
        })
        .eq("id", userId);

      if (error) throw error;
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      // First check if it's an admin
      const user = users.find(u => u.id === userId);
      if (user?.role === "admin") {
        alert("Cannot delete admin users");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const t = {
    headerTitle: isAdmin
      ? (isAO ? "Bulchiinsa Barnootaa" : "Curriculum Administration")
      : (isAO ? "Kuusaa Barnootaa" : "Curriculum Library"),
    headerDesc: isAdmin
      ? (isAO
          ? "PDF ykn kitaaba barumsaa ol-kaasi, gosa barnootaafi kutaadhaan mallatteessi."
          : "Upload textbooks, tag them by grade and subject, manage the RAG vector store.")
      : (isAO
          ? "Kuusaa barnoota Vector DB keessa jiru ilaali."
          : "Browse the curriculum materials loaded into the AI knowledge base."),
    uploadHeading: isAO ? "Kitaaba Barnootaa Ol-kaasi" : "Upload Textbook",
    labelFile: isAO ? "Faayilii PDF ykn TXT filadhu" : "Select PDF or Text File",
    labelSubject: isAO ? "Gosa Barnootaa" : "Subject",
    placeholderSubject: isAO ? "fkn. Saayinsii, Afaan Oromo" : "e.g. Biology, English",
    labelTopic: isAO ? "Mata-duree / Boqonnaa" : "Topic / Unit",
    placeholderTopic: isAO ? "fkn. Boqonnaa 2, Caasluga" : "e.g. Cell Structure, Tenses",
    labelGrade: isAO ? "Kutaa Barnootaa" : "Grade Band",
    optGrade6: isAO ? "Kutaa 6 (Afaan Oromoo)" : "Grade 6 (Afaan Oromo)",
    optGrade8: isAO ? "Kutaa 8 (Afaan Oromoo)" : "Grade 8 (Afaan Oromo)",
    optGrade12: isAO ? "Kutaa 12 (Ingiliffa)" : "Grade 12 (English)",
    labelLanguage: isAO ? "Afaan Kuusaa (RAG)" : "Grounding Language",
    btnSubmit: isAO ? "Vector DBtti Kuusi" : "Process & Save to Vector DB",
    uploadingBtn: isAO ? "Ol-kaasaa jira..." : "Uploading & Chunking...",
    successMsg: isAO
      ? "Kitaabni barumsaa ol-kaafamee milkiin kuusameera!"
      : "Textbook uploaded and processed successfully!",
    errorMsg: isAO
      ? "Faayilii ol-kaasuun hin danda'amne."
      : "Failed to upload document. Ensure file format is valid.",
    dbHeading: isAO ? "Haala Vector Database" : "Vector Database Status",
    chunksCount: isAO ? "Kutaa Kuusaa" : "Chunks",
    loadingDB: isAO ? "Haala database fiduu jira..." : "Loading database status...",
    emptyDB: isAO
      ? "Vector database duwwaa dha."
      : "Vector database is empty. Upload a textbook to get started.",
    sourceLabel: isAO ? "Madda" : "Source",
    uploadedByLabel: isAO ? "Uploader" : "Uploaded By",
    confirmRetract: isAO
      ? "Faayilii kana haquu mirkaneessi?"
      : "Retract this curriculum chunk? It removes the source from AI grounding immediately.",
    teacherReadOnly: isAO
      ? "Barsiisaan kitaaba barumsaa ol-kaasuu hin danda'u — kun bulchaa qofaaf."
      : "Teachers cannot upload textbooks — that is restricted to administrators.",
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !subject || !topic || uploading) return;

    setUploading(true);
    setUploadSuccess("");
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject", subject);
    formData.append("topic", topic);
    formData.append("grade", gradeBand);
    formData.append("language", language);
    formData.append("uploaded_by", `${user.name} (Admin)`);

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadSuccess(data.detail || t.successMsg);
        setFile(null);
        setSubject("");
        setTopic("");
        fetchChunks();
      } else {
        throw new Error(data.detail || t.errorMsg);
      }
    } catch (err: any) {
      setUploadError(err.message || t.errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteChunk = async (chunkId: number) => {
    if (!confirm(t.confirmRetract)) return;
    try {
      const { error } = await supabase
        .from("curriculum_chunks")
        .delete()
        .eq("id", chunkId);
      if (error) throw error;
      setChunks((prev) => prev.filter((c) => c.id !== chunkId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleGradeBandChange = (val: string) => {
    setGradeBand(val);
    setLanguage(val === "6" || val === "8" ? "Afaan Oromo" : "English");
  };

  return (
    <AuthGuard>
      <div className="app-container">
        <Sidebar />

        <main
          className="main-content"
          style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
        >
        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <img
            src="/logo.png"
            alt="I-Pass-A"
            style={{ width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover" }}
          />
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              {t.headerTitle}
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>{t.headerDesc}</p>
          </div>
        </div>

        {/* Teacher read-only notice */}
        {!isAdmin && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius-sm)",
              background: "rgba(99, 102, 241, 0.07)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              color: "var(--accent)",
              fontSize: "0.9rem",
            }}
          >
            <Lock size={18} />
            <span>{t.teacherReadOnly}</span>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isAdmin ? "1fr 1.8fr" : "1fr",
            gap: "2rem",
          }}
        >
          {/* Upload Form — admin only */}
          {isAdmin && (
            <div className="glass-panel" style={{ padding: "2rem", height: "fit-content" }}>
              <h2
                style={{
                  fontSize: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                <Upload size={20} style={{ color: "var(--primary)" }} /> {t.uploadHeading}
              </h2>

              {uploadSuccess && (
                <div
                  style={{
                    background: "rgba(34, 197, 94, 0.1)",
                    border: "1px solid rgba(34, 197, 94, 0.2)",
                    color: "var(--success)",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.85rem",
                    marginBottom: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {uploadError && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    color: "var(--danger)",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.85rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleUploadSubmit}>
                <div className="form-group">
                  <label className="form-label">{t.labelFile}</label>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    required
                    onChange={(e) =>
                      e.target.files?.[0] && setFile(e.target.files[0])
                    }
                    style={{
                      border: "1px dashed var(--glass-border)",
                      padding: "1rem",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  />
                  {file && (
                    <span style={{ fontSize: "0.8rem", color: "var(--secondary)", marginTop: "0.35rem", display: "block" }}>
                      <BookOpen size={12} style={{ display: "inline", marginRight: "4px" }} />
                      {file.name}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">{t.labelSubject}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t.placeholderSubject}
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t.labelTopic}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t.placeholderTopic}
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t.labelGrade}</label>
                  <select
                    className="form-select"
                    value={gradeBand}
                    onChange={(e) => handleGradeBandChange(e.target.value)}
                  >
                    <option value="6">{t.optGrade6}</option>
                    <option value="8">{t.optGrade8}</option>
                    <option value="12">{t.optGrade12}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t.labelLanguage}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={language}
                    disabled
                    style={{ background: "rgba(255,255,255,0.02)", cursor: "not-allowed" }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading || !file || !subject || !topic}
                  style={{ width: "100%", marginTop: "1rem" }}
                >
                  {uploading ? t.uploadingBtn : t.btnSubmit}
                </button>
              </form>
            </div>
          )}

          {/* Vector DB Status — both roles */}
          <div
            className="glass-panel"
            style={{
              padding: "2rem",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              minHeight: "500px",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <Database size={20} style={{ color: "var(--secondary)" }} />
              {t.dbHeading} ({chunks.length} {t.chunksCount})
            </h2>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {fetchingChunks ? (
                <p style={{ color: "var(--text-secondary)" }}>{t.loadingDB}</p>
              ) : chunks.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "4rem 1rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <FileText
                    size={32}
                    style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }}
                  />
                  <p>{t.emptyDB}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {chunks.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: "1rem",
                        borderRadius: "8px",
                        border: "1px solid var(--glass-border)",
                        background: "rgba(0,0,0,0.15)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              background: "rgba(14, 165, 233, 0.1)",
                              color: "var(--primary)",
                              padding: "0.15rem 0.4rem",
                              borderRadius: "4px",
                            }}
                          >
                            Grade {c.grade}
                          </span>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              background: "rgba(20, 184, 166, 0.1)",
                              color: "var(--secondary)",
                              padding: "0.15rem 0.4rem",
                              borderRadius: "4px",
                            }}
                          >
                            {c.subject}
                          </span>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              background: "rgba(99, 102, 241, 0.1)",
                              color: "var(--accent)",
                              padding: "0.15rem 0.4rem",
                              borderRadius: "4px",
                            }}
                          >
                            {c.topic}
                          </span>
                        </div>

                        {isAdmin ? (
                          <button
                            onClick={() => handleDeleteChunk(c.id)}
                            style={{
                              border: "none",
                              background: "none",
                              color: "var(--danger)",
                              cursor: "pointer",
                              padding: "0.25rem",
                              borderRadius: "4px",
                            }}
                            className="glass-panel-hover"
                            title="Retract Chunk"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <span
                            style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}
                          >
                            v{c.version}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "0.825rem",
                            color: "var(--text-secondary)",
                            fontStyle: "italic",
                            margin: 0,
                          }}
                        >
                          {t.sourceLabel}: {c.source_document}
                        </p>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--secondary)",
                            background: "rgba(20, 184, 166, 0.05)",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "4px",
                            border: "1px solid rgba(20, 184, 166, 0.1)",
                          }}
                        >
                          {t.uploadedByLabel}: <strong>{c.uploaded_by}</strong>
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: "#fff",
                          lineHeight: 1.4,
                          margin: 0,
                        }}
                      >
                        {c.content_preview}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isAdmin && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  background: "rgba(245, 158, 11, 0.05)",
                  border: "1px solid rgba(245, 158, 11, 0.15)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--warning)",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <ShieldAlert size={16} />
                <span>{t.teacherReadOnly}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
