"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Upload, Trash2, Database, FileText, CheckCircle2, ShieldAlert } from "lucide-react";

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

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // File Upload Form State
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [gradeBand, setGradeBand] = useState("9-12");
  const [language, setLanguage] = useState("English");
  
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadError, setUploadError] = useState("");

  // Chunks table state
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [fetchingChunks, setFetchingChunks] = useState(false);

  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "teacher"))) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "teacher")) {
      fetchChunks();
    }
  }, [user]);

  if (loading || !user) return null;
  if (user.role !== "admin" && user.role !== "teacher") return null;

  const isAO = user.language === "Afaan Oromo";

  // Dynamic Translations (No mixed bilingual slashes)
  const t = {
    headerTitle: isAO ? "Bulchiinsa Barnootaa" : "Curriculum Administration",
    headerDesc: isAO 
      ? "PDF ykn kitaaba barumsaa ol-kaasi, gosa barnootaafi kutaadhaan mallatteessi, haala grounding RAG bulchi."
      : "Upload PDFs/Textbooks, tag them by grade band/subject, and manage vector grounding chunks.",
    uploadHeading: isAO ? "Material Ol-kaasi" : "Upload Material",
    labelFile: isAO ? "Faayilii PDF ykn TXT filadhu" : "Select PDF or Text File",
    labelSubject: isAO ? "Gosa Barnootaa" : "Subject",
    placeholderSubject: isAO ? "fkn. Saayinsii, Afaan Oromo" : "e.g. Biology, English",
    labelTopic: isAO ? "Mata-duree / Boqonnaa" : "Topic / Unit",
    placeholderTopic: isAO ? "fkn. Boqonnaa 2, Caasluga" : "e.g. Cell Structure, Tenses",
    labelGrade: isAO ? "Kutaa Barnootaa" : "Grade Band",
    optGrade1: isAO ? "Kutaa 1-6 (Afaan Oromoo)" : "Grades 1-6 (Afaan Oromo)",
    optGrade2: isAO ? "Kutaa 7-8 (Afaan Oromoo)" : "Grades 7-8 (Afaan Oromo)",
    optGrade3: isAO ? "Kutaa 9-12 (Ingiliffa)" : "Grades 9-12 (English)",
    labelLanguage: isAO ? "Afaan Kuusaa (RAG)" : "Grounding Language",
    btnSubmit: isAO ? "Vector DBtti Kuusi" : "Process & Save to Vector DB",
    dbHeading: isAO ? "Haala Vector Database" : "Vector Database Status",
    chunksCount: isAO ? "Kutaa Kuusaa" : "Chunks",
    loadingDB: isAO ? "Haala database fiduu jira..." : "Loading database status...",
    emptyDB: isAO 
      ? "Vector database duwwaa dha. Maaloo faayilii ol-kaasi ykn database seed godhi." 
      : "Vector database is empty. Seed local mock chunks or upload a document to get started.",
    warningTeacher: isAO 
      ? "Barsiisaa taate seenu keessaniif, faayilii haquun bulchaa qofaaf eeyyamama." 
      : "You are logged in as a Teacher. Document deletion is restricted to Administrators.",
    alertAdminOnly: isAO ? "Bulchaa qofatu faayilii haquu danda'a." : "Only system administrators can delete/retract curriculum chunks.",
    confirmRetract: isAO 
      ? "Faayilii kana haquu akka barbaaddu mirkaneessi? Kun grounding AI Tutor keessaa ni baha." 
      : "Are you sure you want to retract this curriculum chunk? It will immediately remove the source from AI Tutor grounding.",
    uploadingBtn: isAO ? "Ol-kaasaa jira..." : "Uploading & Chunking...",
    sourceLabel: isAO ? "Madda" : "Source",
    uploadedByLabel: isAO ? "Uploader" : "Uploaded By",
    successMsg: isAO ? "Kitaabni barumsaa ol-kaafamee milkiin kuusameera!" : "Curriculum material uploaded and processed successfully!",
    errorMsg: isAO ? "Faayilii ol-kaasuun hin danda'amne. Maaloo sirrii ta'uu isaa mirkaneessi." : "Failed to parse and upload document. Ensure file format is valid."
  };

  const fetchChunks = async () => {
    setFetchingChunks(true);
    try {
      const { data, error } = await supabase
        .from("curriculum_chunks")
        .select("id, subject, topic, grade, language, source_document, content, version, uploaded_by, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: ChunkInfo[] = (data || []).map((c: any) => ({
        id: c.id,
        subject: c.subject,
        topic: c.topic,
        grade: c.grade,
        language: c.language,
        source_document: c.source_document,
        content_preview: c.content.slice(0, 100) + "...",
        version: c.version,
        uploaded_by: c.uploaded_by || "System Seed",
        created_at: c.created_at
      }));

      setChunks(formatted);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingChunks(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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
    formData.append("uploaded_by", `${user.name} (${user.role === "admin" ? "Admin" : "Teacher"})`);

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setUploadSuccess(data.detail || t.successMsg);
        setFile(null);
        setSubject("");
        setTopic("");
        fetchChunks(); // Refresh chunks list
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
    if (user.role !== "admin") {
      alert(t.alertAdminOnly);
      return;
    }
    if (!confirm(t.confirmRetract)) return;

    try {
      const { error } = await supabase
        .from("curriculum_chunks")
        .delete()
        .eq("id", chunkId);

      if (error) throw error;
      
      setChunks(prev => prev.filter(c => c.id !== chunkId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleGradeBandChange = (val: string) => {
    setGradeBand(val);
    if (val === "1-6" || val === "7-8") {
      setLanguage("Afaan Oromo");
    } else {
      setLanguage("English");
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <img src="/logo.png" alt="I-Pass-A Logo" style={{ width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover" }} />
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              {t.headerTitle}
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              {t.headerDesc}
            </p>
          </div>
        </div>

        {/* Dashboard Panels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: "2rem" }}>
          
          {/* 1. Upload Form */}
          <div className="glass-panel" style={{ padding: "2rem", height: "fit-content" }}>
            <h2 style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <Upload size={20} style={{ color: "var(--primary)" }} /> {t.uploadHeading}
            </h2>

            {uploadSuccess && (
              <div style={{
                background: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
                color: "var(--success)",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <CheckCircle2 size={16} />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {uploadError && (
              <div style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "var(--danger)",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.85rem",
                marginBottom: "1.25rem"
              }}>
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
                  onChange={handleFileChange}
                  style={{
                    border: "1px dashed var(--glass-border)",
                    padding: "1rem",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    width: "100%"
                  }}
                />
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
                  <option value="1-6">{t.optGrade1}</option>
                  <option value="7-8">{t.optGrade2}</option>
                  <option value="9-12">{t.optGrade3}</option>
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

          {/* 2. Vector DB Chunks Table */}
          <div className="glass-panel" style={{ padding: "2rem", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: "500px" }}>
            <h2 style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <Database size={20} style={{ color: "var(--secondary)" }} /> {t.dbHeading} ({chunks.length} {t.chunksCount})
            </h2>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {fetchingChunks ? (
                <p>{t.loadingDB}</p>
              ) : chunks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-secondary)" }}>
                  <FileText size={32} style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }} />
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
                        gap: "0.5rem"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                          <span style={{ fontSize: "0.7rem", background: "rgba(14, 165, 233, 0.1)", color: "var(--primary)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                            Grade {c.grade}
                          </span>
                          <span style={{ fontSize: "0.7rem", background: "rgba(20, 184, 166, 0.1)", color: "var(--secondary)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                            {c.subject}
                          </span>
                          <span style={{ fontSize: "0.7rem", background: "rgba(99, 102, 241, 0.1)", color: "var(--accent)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                            {c.topic}
                          </span>
                        </div>
                        
                        {user.role === "admin" ? (
                          <button
                            onClick={() => handleDeleteChunk(c.id)}
                            style={{
                              border: "none",
                              background: "none",
                              color: "var(--danger)",
                              cursor: "pointer",
                              padding: "0.25rem",
                              borderRadius: "4px"
                            }}
                            className="glass-panel-hover"
                            title="Retract Chunk"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>v{c.version}</span>
                        )}
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", fontStyle: "italic", margin: 0 }}>
                          {t.sourceLabel}: {c.source_document}
                        </p>
                        <span style={{
                          fontSize: "0.72rem",
                          color: "var(--secondary)",
                          background: "rgba(20, 184, 166, 0.05)",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "4px",
                          border: "1px solid rgba(20, 184, 166, 0.1)"
                        }}>
                          {t.uploadedByLabel}: <strong>{c.uploaded_by}</strong>
                        </span>
                      </div>
                      
                      <p style={{ fontSize: "0.85rem", color: "#fff", lineHeight: 1.4, margin: 0 }}>
                        {c.content_preview}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {user.role !== "admin" && (
              <div style={{
                marginTop: "1rem",
                padding: "0.75rem",
                background: "rgba(245, 158, 11, 0.05)",
                border: "1px solid rgba(245, 158, 11, 0.15)",
                borderRadius: "var(--radius-sm)",
                color: "var(--warning)",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <ShieldAlert size={16} />
                <span>{t.warningTeacher}</span>
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}
