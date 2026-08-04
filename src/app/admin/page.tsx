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

  const fetchChunks = async () => {
    setFetchingChunks(true);
    try {
      const { data, error } = await supabase
        .from("curriculum_chunks")
        .select("id, subject, topic, grade, language, source_document, content, version, created_at")
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

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setUploadSuccess(data.detail || "Curriculum material uploaded and processed successfully!");
        setFile(null);
        setSubject("");
        setTopic("");
        fetchChunks(); // Refresh chunks list
      } else {
        throw new Error(data.detail || "Failed to upload document");
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to parse and upload document. Ensure file format is valid.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteChunk = async (chunkId: number) => {
    if (user.role !== "admin") {
      alert("Only system administrators can delete/retract curriculum chunks.");
      return;
    }
    if (!confirm("Are you sure you want to retract this curriculum chunk? It will immediately remove the source from AI Tutor grounding.")) return;

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

  // Automatically update language when grade band changes
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
        
        {/* Top Navbar */}
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}>
            Curriculum Administration
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Upload PDFs/Text books, tag them by grade band/subject, and manage RAG grounding chunks.
          </p>
        </div>

        {/* Dashboard Panels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: "2rem" }}>
          
          {/* 1. Upload Form */}
          <div className="glass-panel" style={{ padding: "2rem", height: "fit-content" }}>
            <h2 style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <Upload size={20} style={{ color: "var(--primary)" }} /> Upload Material
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
                <label className="form-label">Select PDF or Text File</label>
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
                <label className="form-label">Subject (e.g. English, Afaan Oromo, Biology)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Biology"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Topic / Unit</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Cell Structure"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Grade Band</label>
                <select
                  className="form-select"
                  value={gradeBand}
                  onChange={(e) => handleGradeBandChange(e.target.value)}
                >
                  <option value="1-6">Grades 1-6 (Afaan Oromo)</option>
                  <option value="7-8">Grades 7-8 (Afaan Oromo)</option>
                  <option value="9-12">Grades 9-12 (English)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Grounding Language</label>
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
                {uploading ? "Uploading & Chunking..." : "Process & Save to Vector DB"}
              </button>
            </form>
          </div>

          {/* 2. Vector DB Chunks Table */}
          <div className="glass-panel" style={{ padding: "2rem", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: "500px" }}>
            <h2 style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <Database size={20} style={{ color: "var(--secondary)" }} /> Vector Database Status ({chunks.length} Chunks)
            </h2>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {fetchingChunks ? (
                <p>Loading database status...</p>
              ) : chunks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-secondary)" }}>
                  <FileText size={32} style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }} />
                  <p>Vector database is empty. Seed local mock chunks or upload a document to get started.</p>
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
                      
                      <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", fontStyle: "italic", margin: 0 }}>
                        Source: {c.source_document}
                      </p>
                      
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
                <span>You are logged in as a <strong>Teacher</strong>. Document deletion is restricted to Administrators.</span>
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}
