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

  // Early returns for auth checks
  if (loading || !user) return null;
  if (user.role !== "admin") return null;

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

      const analytics: Analytics = {
        totalUsers: profiles.length,
        activeUsers: profiles.filter(p => p.is_active).length,
        verifiedUsers: profiles.filter(p => p.email_verified).length,
        weeklyActiveUsers: profiles.filter(p => 
          p.last_login_at && new Date(p.last_login_at) > weekAgo
        ).length,
        monthlyActiveUsers: profiles.filter(p => 
          p.last_login_at && new Date(p.last_login_at) > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        ).length,
        roleDistribution: profiles.reduce((acc, p) => {
          acc[p.role] = (acc[p.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        gradeDistribution: profiles.reduce((acc, p) => {
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

  const fetchChunks = async () => {
    setFetchingChunks(true);
    try {
      const { data, error } = await supabase
        .from("curriculum_chunks")
        .select(
          "id, subject, topic, grade, language, source_document, content, version, uploaded_by, created_at"
        )
        .order("created_at", { ascending: false });

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
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setUploadSuccess(data.detail || "Upload successful!");
        setFile(null);
        setSubject("");
        setTopic("");
        fetchChunks();
      } else {
        throw new Error(data.detail || "Upload failed");
      }
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteChunk = async (chunkId: number) => {
    if (!confirm("Delete this curriculum chunk? It will be removed from AI grounding immediately.")) return;
    try {
      const { error } = await supabase.from("curriculum_chunks").delete().eq("id", chunkId);
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

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-8 md:ml-64">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <img src="/logo.png" alt="I-Pass-A" className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-2 md:gap-3">
                  <Shield className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
                  System Administration
                </h1>
                <p className="text-sm md:text-base text-gray-300">Platform management, user oversight, and system analytics</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-col sm:flex-row gap-2 mb-6 md:mb-8 overflow-x-auto">
            {[
              { id: "upload", label: "Content Upload", icon: Upload },
              { id: "users", label: "User Management", icon: Users },
              { id: "analytics", label: "System Analytics", icon: Activity },
              { id: "security", label: "Security & Auth", icon: Shield }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                <tab.icon size={16} className="md:w-[18px] md:h-[18px]" />
                <span className="text-sm md:text-base">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content Upload Tab */}
          {activeTab === "upload" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
              
              {/* Upload Form */}
              <div className="lg:col-span-2">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
                    <Upload size={18} className="md:w-5 md:h-5" />
                    Upload Curriculum
                  </h2>

                  {uploadSuccess && (
                    <div className="bg-green-500/20 border border-green-400/30 text-green-200 p-3 rounded-lg mb-4 flex items-start gap-2">
                      <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{uploadSuccess}</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="bg-red-500/20 border border-red-400/30 text-red-200 p-3 rounded-lg mb-4">
                      <span className="text-sm">{uploadError}</span>
                    </div>
                  )}

                  <form onSubmit={handleUploadSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">File</label>
                      <input
                        type="file"
                        accept=".pdf,.txt,.docx"
                        required
                        onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                        className="w-full p-2 md:p-3 bg-white/5 border border-white/20 rounded-lg text-white text-sm file:mr-2 md:file:mr-4 file:py-1 md:file:py-2 file:px-2 md:file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer file:text-sm"
                      />
                      {file && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <BookOpen size={12} />
                          {file.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Mathematics, Biology"
                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Topic</label>
                      <input
                        type="text"
                        required
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Chapter 5, Algebra"
                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Grade</label>
                      <select
                        value={gradeBand}
                        onChange={(e) => handleGradeBandChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                      >
                        <option value="6">Grade 6 (Afaan Oromo)</option>
                        <option value="8">Grade 8 (Afaan Oromo)</option>
                        <option value="12">Grade 12 (English)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                      <input
                        type="text"
                        value={language}
                        disabled
                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-gray-400 cursor-not-allowed text-sm md:text-base"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={uploading || !file || !subject || !topic}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2.5 md:py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          Upload & Process
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
              {/* Chunks Library */}
              <div className="lg:col-span-3">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
                    <Database size={18} className="md:w-5 md:h-5" />
                    Vector Database ({chunks.length} chunks)
                  </h2>

                  <div className="max-h-80 md:max-h-96 overflow-y-auto space-y-3">
                    {fetchingChunks ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-white mx-auto"></div>
                      </div>
                    ) : chunks.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <FileText size={20} className="md:w-6 md:h-6 mx-auto mb-2" />
                        <p className="text-sm md:text-base">No content uploaded yet</p>
                      </div>
                    ) : (
                      chunks.map((chunk) => (
                        <div key={chunk.id} className="bg-black/20 border border-white/10 rounded-lg p-3 md:p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                                Grade {chunk.grade}
                              </span>
                              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                                {chunk.subject}
                              </span>
                              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                                {chunk.topic}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteChunk(chunk.id)}
                              className="text-red-400 hover:text-red-300 p-1 rounded transition-colors flex-shrink-0"
                              title="Delete chunk"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p className="text-gray-300 text-sm mb-2">{chunk.content_preview}</p>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs text-gray-500">
                            <span>Source: {chunk.source_document}</span>
                            <span>By: {chunk.uploaded_by}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === "users" && (
            <div className="space-y-6">
              
              {/* Filters */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 md:p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Search size={16} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 sm:w-64 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full sm:w-auto bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Students</option>
                    <option value="teacher">Teachers</option>
                    <option value="director">Directors</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-white/20">
                  <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <Users size={18} className="md:w-5 md:h-5" />
                    User Management ({filteredUsers.length})
                  </h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left p-3 md:p-4 text-gray-300 font-medium text-sm">User</th>
                        <th className="text-left p-3 md:p-4 text-gray-300 font-medium text-sm">Role</th>
                        <th className="text-left p-3 md:p-4 text-gray-300 font-medium text-sm hidden sm:table-cell">Grade</th>
                        <th className="text-left p-3 md:p-4 text-gray-300 font-medium text-sm">Status</th>
                        <th className="text-left p-3 md:p-4 text-gray-300 font-medium text-sm hidden md:table-cell">Last Login</th>
                        <th className="text-left p-3 md:p-4 text-gray-300 font-medium text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={6} className="text-center p-8">
                            <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-white mx-auto"></div>
                          </td>
                        </tr>
                      ) : filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="p-3 md:p-4">
                            <div>
                              <div className="text-white font-medium text-sm">{user.name}</div>
                              <div className="text-gray-400 text-xs flex items-center gap-2">
                                {user.email_verified ? (
                                  <CheckCircle2 size={10} className="text-green-400" />
                                ) : (
                                  <AlertTriangle size={10} className="text-yellow-400" />
                                )}
                                {user.email_verified ? "Verified" : "Unverified"}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 md:p-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              user.role === "admin" ? "bg-red-500/20 text-red-300" :
                              user.role === "director" ? "bg-purple-500/20 text-purple-300" :
                              user.role === "teacher" ? "bg-blue-500/20 text-blue-300" :
                              "bg-green-500/20 text-green-300"
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="p-3 md:p-4 text-gray-300 text-sm hidden sm:table-cell">
                            {user.grade || "—"}
                          </td>
                          <td className="p-3 md:p-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              user.is_active
                                ? "bg-green-500/20 text-green-300"
                                : "bg-red-500/20 text-red-300"
                            }`}>
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="p-3 md:p-4 text-gray-300 text-xs hidden md:table-cell">
                            {user.last_login_at
                              ? new Date(user.last_login_at).toLocaleDateString()
                              : "Never"
                            }
                          </td>
                          <td className="p-3 md:p-4">
                            <div className="flex items-center gap-2">
                              {user.role !== "admin" && (
                                <>
                                  <button
                                    onClick={() => handleUserAction(
                                      user.id,
                                      user.is_active ? "deactivate" : "activate"
                                    )}
                                    className={`p-2 rounded-lg transition-colors ${
                                      user.is_active
                                        ? "text-red-400 hover:bg-red-500/20"
                                        : "text-green-400 hover:bg-green-500/20"
                                    }`}
                                    title={user.is_active ? "Deactivate" : "Activate"}
                                  >
                                    {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                                  </button>
                                  
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                                    title="Delete User"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              
              {loadingAnalytics ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                  <p className="text-gray-300 mt-4">Loading analytics...</p>
                </div>
              ) : analytics && (
                <>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[
                      { label: "Total Users", value: analytics.totalUsers, icon: Users, color: "blue" },
                      { label: "Active Users", value: analytics.activeUsers, icon: TrendingUp, color: "green" },
                      { label: "Weekly Active", value: analytics.weeklyActiveUsers, icon: Clock, color: "purple" },
                      { label: "Verified", value: analytics.verifiedUsers, icon: CheckCircle2, color: "yellow" }
                    ].map((metric, idx) => (
                      <div key={idx} className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 md:p-6">
                        <div className="flex items-center justify-between mb-2 md:mb-4">
                          <metric.icon className={`w-6 h-6 md:w-8 md:h-8 text-${metric.color}-400`} />
                          <span className="text-xl md:text-2xl font-bold text-white">{metric.value}</span>
                        </div>
                        <p className="text-gray-300 font-medium text-sm md:text-base">{metric.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Distribution Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Role Distribution */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 md:p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Users size={18} />
                        Role Distribution
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(analytics.roleDistribution).map(([role, count]) => (
                          <div key={role} className="flex items-center justify-between">
                            <span className="text-gray-300 capitalize text-sm md:text-base">{role}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 md:w-20 bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full" 
                                  style={{ width: `${(count / analytics.totalUsers) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-white font-medium text-sm md:text-base w-8 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Grade Distribution */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 md:p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={18} />
                        Grade Distribution
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(analytics.gradeDistribution).map(([grade, count]) => (
                          <div key={grade} className="flex items-center justify-between">
                            <span className="text-gray-300 text-sm md:text-base">Grade {grade}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 md:w-20 bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full" 
                                  style={{ width: `${(count / analytics.totalUsers) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-white font-medium text-sm md:text-base w-8 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* System Health */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 md:p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Activity size={18} />
                      System Overview
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-xl md:text-2xl font-bold text-blue-400">{chunks.length}</div>
                        <div className="text-xs md:text-sm text-gray-400">Content Chunks</div>
                      </div>
                      <div>
                        <div className="text-xl md:text-2xl font-bold text-green-400">{analytics.verifiedUsers}</div>
                        <div className="text-xs md:text-sm text-gray-400">Verified Users</div>
                      </div>
                      <div>
                        <div className="text-xl md:text-2xl font-bold text-purple-400">{analytics.weeklyActiveUsers}</div>
                        <div className="text-xs md:text-sm text-gray-400">Weekly Active</div>
                      </div>
                      <div>
                        <div className="text-xl md:text-2xl font-bold text-yellow-400">
                          {Math.round((analytics.verifiedUsers / analytics.totalUsers) * 100)}%
                        </div>
                        <div className="text-xs md:text-sm text-gray-400">Verification Rate</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Security & Auth Tab */}
          {activeTab === "security" && (
            <div className="space-y-6">
              
              {/* Migration Section */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 md:p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Shield size={20} />
                  Authentication Security Migration
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-300 mb-2">What this migration includes:</h4>
                    <ul className="text-sm text-blue-200 space-y-1">
                      <li>• Email verification system</li>
                      <li>• Role-based access control (directors cannot see admin activities)</li>
                      <li>• Admin audit logging</li>
                      <li>• User management functions (deactivate/reactivate)</li>
                      <li>• Security enhancements and COPPA compliance</li>
                    </ul>
                  </div>
                  
                  {migrationError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-300 font-semibold mb-2">
                        <AlertTriangle size={16} />
                        Migration Error
                      </div>
                      <p className="text-red-200 text-sm">{migrationError}</p>
                    </div>
                  )}
                  
                  {migrationResult && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-300 font-semibold mb-3">
                        <CheckCircle2 size={16} />
                        Migration Completed Successfully!
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {Object.entries(migrationResult.summary || {}).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-300">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                            <span className="text-green-200">{value}</span>
                          </div>
                        ))}
                      </div>
                      
                      {migrationResult.results && (
                        <div className="mt-3 pt-3 border-t border-green-500/20">
                          <p className="text-green-200 text-xs">
                            Migration steps completed: {migrationResult.results.filter((r: any) => r.status === 'success').length} / {migrationResult.results.length}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={applySecurityMigration}
                      disabled={migrating}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        migrating
                          ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {migrating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Applying Migration...
                        </>
                      ) : (
                        <>
                          <Shield size={16} />
                          Apply Security Migration
                        </>
                      )}
                    </button>
                    
                    {migrationResult && (
                      <button
                        onClick={() => {
                          setMigrationResult(null);
                          setMigrationError("");
                        }}
                        className="px-4 py-2 rounded-lg font-medium bg-gray-600 hover:bg-gray-700 text-white"
                      >
                        Clear Results
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Current Security Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 md:p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Users size={18} />
                    User Security Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Email Verification</span>
                      <span className="text-green-400 font-semibold">Enabled ✓</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Role-Based Access</span>
                      <span className="text-green-400 font-semibold">Active ✓</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Admin Audit Trail</span>
                      <span className="text-green-400 font-semibold">Enabled ✓</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Password Security</span>
                      <span className="text-green-400 font-semibold">Enhanced ✓</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 md:p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Activity size={18} />
                    Security Recommendations
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Regular password updates for staff accounts</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Monitor audit logs for unusual activity</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Verify parent consent for minor students</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Regular security reviews and updates</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}