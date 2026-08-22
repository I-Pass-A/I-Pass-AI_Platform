"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TutorResponse from "@/components/TutorResponse";
import {
  MessageSquare,
  Send,
  BookOpen,
  AlertTriangle, 
  Bot, 
  PlusCircle, 
  History 
} from "lucide-react";
import { getSubjectsForGrade } from "@/lib/subjects";

interface Message {
  id?: number;
  sender: "student" | "tutor";
  content: string;
  timestamp: string;
  sources?: any[];
  out_of_scope?: boolean;
}

interface SessionInfo {
  id: number;
  subject: string;
  started_at: string;
  last_message: string;
}

export default function TutorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [fetchingSessions, setFetchingSessions] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // Load user sessions when user changes
  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user?.language, user?.grade, user?.id]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading || !user) return null;

  // Determine subject list: teachers use their grade_taught, students use their grade
  const activeGrade = user.role === "teacher"
    ? (user.grade_taught ?? user.grade ?? "12")
    : (user.grade ?? "12");
  const subjects = getSubjectsForGrade(activeGrade);
  const isAO = user.language === "Afaan Oromo";

  // Dynamic Translations (No mixed bilingual labels)
  const t = {
    activeSessions: isAO ? "Haasawa Ol-kaayame" : "Active Sessions",
    newChat: isAO ? "Haasawa Haaraa Eegali" : "Start New Chat",
    loading: isAO ? "Fidaa jira..." : "Loading...",
    noActiveSessions: isAO ? "Haasawa ol-kaayame hin jiru." : "No active sessions.",
    selectSession: isAO ? "Mata-duree Haasawa filadhu ykn jalqabi." : "Select or start a session on the left to begin.",
    curriculumBanner: isAO ? "Seera Caasluga Kuusaa (RAG)" : "Curriculum Grounded (RAG)",
    noActiveSessionHeader: isAO ? "Haasawa Eegaluu" : "No Active Session",
    noActiveSessionDesc: isAO 
      ? `Gosa barnootaa bitaa irraa filachuudhaan haasawa haaraa kutaa ${activeGrade} jalqabi.`
      : `Select a subject on the left to start a new chat session grounded in your Grade ${activeGrade} curriculum.`,
    newChatHeader: isAO ? `Tutor ${selectedSubject} Haaraa` : `New ${selectedSubject} Chat`,
    newChatDesc: isAO
      ? "Gaaffii kee barreessi (fkn, yaad-rimee ibsi, caasluga qoradhu) gargaarsa argachuuf!"
      : "Type your question below (e.g., explain a topic, clarify tenses, or ask grammar rules) to get step-by-step guidance!",
    placeholderInput: isAO ? "Gaaffii kee barreessi..." : "Ask your AI Tutor a question...",
    outOfScope: isAO ? "Yaada Dabalataa (Curriculum Ala)" : "Out of Curriculum Scope",
    similarityText: isAO ? "Wal-fakkeenya" : "Similarity",
    tutorTitleSuffix: isAO ? "Tutor (Kutaa" : "Tutor (Grade",
    errorConnect: isAO
      ? "Gargaarsa AI argachuu hin dandeenye. Maaloo api server Next.js oofuu kee mirkaneessi."
      : "Error: Could not connect to AI Tutor. Please check that Next.js Server API is active."
  };

  const fetchSessions = async () => {
    if (!user) return;
    setFetchingSessions(true);
    try {
      const { data, error } = await supabase
        .from("tutor_sessions")
        .select(`
          id, 
          subject, 
          started_at,
          tutor_messages (
            content,
            timestamp
          )
        `)
        .eq("user_id", user.id);
        
      if (error) throw error;
      
      const formattedSessions: SessionInfo[] = (data || []).map((s: any) => {
        // Sort messages locally to find the latest
        const sortedMsgs = [...s.tutor_messages].sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const lastMsg = sortedMsgs[0]?.content || (isAO ? "Haasawa jalqabi..." : "Start chatting...");
        
        return {
          id: s.id,
          subject: s.subject,
          started_at: s.started_at,
          last_message: lastMsg
        };
      });

      // Sort sessions by date descending
      formattedSessions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
      
      setSessions(formattedSessions);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingSessions(false);
    }
  };

  const loadSession = async (sessionId: number) => {
    setFetchingMessages(true);
    setActiveSessionId(sessionId);
    
    // Find subject for this session
    const matched = sessions.find(s => s.id === sessionId);
    if (matched) {
      setSelectedSubject(matched.subject);
    }

    try {
      const { data, error } = await supabase
        .from("tutor_messages")
        .select("sender, content, timestamp, sources, out_of_scope")
        .eq("session_id", sessionId)
        .order("timestamp", { ascending: true });

      if (error) throw error;

      const formattedMsgs: Message[] = (data || []).map((m: any) => ({
        sender: m.sender,
        content: m.content,
        timestamp: m.timestamp,
        sources: m.sources || [],
        out_of_scope: m.out_of_scope
      }));

      setMessages(formattedMsgs);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingMessages(false);
    }
  };

  const startNewSession = async (subjectName: string) => {
    if (!user) return;
    setSelectedSubject(subjectName);
    setMessages([]);
    
    try {
      const { data, error } = await supabase
        .from("tutor_sessions")
        .insert({
          user_id: user.id,
          subject: subjectName
        })
        .select()
        .single();

      if (error) throw error;
      
      setActiveSessionId(data.id);
      fetchSessions(); // Refresh sidebar list
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeSessionId || sending) return;

    const studentText = inputText.trim();
    setInputText("");
    setSending(true);

    // Append student message instantly to UI
    const studentMsg: Message = {
      sender: "student",
      content: studentText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, studentMsg]);

    try {
      const response = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSessionId,
          query: studentText,
          grade: user.grade
        })
      });

      if (response.ok) {
        const data = await response.json();
        const tutorMsg: Message = {
          sender: "tutor",
          content: data.response,
          timestamp: new Date().toISOString(),
          sources: data.sources,
          out_of_scope: data.out_of_scope
        };
        setMessages(prev => [...prev, tutorMsg]);
        fetchSessions(); // Refresh session last_message text
      } else {
        throw new Error("Failed to generate response");
      }
    } catch (err: any) {
      const errorMsg: Message = {
        sender: "tutor",
        content: t.errorConnect,
        timestamp: new Date().toISOString(),
        out_of_scope: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthGuard>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-gradient)" }}>
        <Sidebar />

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", height: "100vh", overflow: "hidden" }}>

          {/* Chat History Panel */}
          <div style={{
            width: "260px",
            flexShrink: 0,
            borderRight: "1px solid var(--glass-border)",
            background: "rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflow: "hidden"
          }}>
            <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--glass-border)", flexShrink: 0 }}>
              <h3 style={{ fontSize: "0.875rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-primary)" }}>
                <History size={16} /> {t.activeSessions}
              </h3>
            </div>

            <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", flexShrink: 0 }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>
                {t.newChat}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {subjects.map((sub) => (
                  <button key={sub} onClick={() => startNewSession(sub)} style={{
                    width: "100%", textAlign: "left", padding: "0.45rem 0.75rem",
                    fontSize: "0.8rem", background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--glass-border)", borderRadius: "8px",
                    color: "var(--text-primary)", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "0.4rem"
                  }}>
                    <PlusCircle size={12} /> {sub}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
              {fetchingSessions ? (
                <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem" }}>{t.loading}</p>
              ) : sessions.length === 0 ? (
                <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem" }}>{t.noActiveSessions}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {sessions.map((s) => (
                    <button key={s.id} onClick={() => loadSession(s.id)} style={{
                      width: "100%", padding: "0.75rem", borderRadius: "8px", textAlign: "left",
                      background: activeSessionId === s.id ? "rgba(14,165,233,0.12)" : "transparent",
                      border: activeSessionId === s.id ? "1px solid rgba(14,165,233,0.3)" : "1px solid transparent",
                      cursor: "pointer"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 500, color: activeSessionId === s.id ? "var(--primary)" : "var(--text-primary)" }}>
                          {s.subject}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {new Date(s.started_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.last_message}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Interface */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
            {/* Top bar */}
            <div style={{
              height: "64px", flexShrink: 0,
              borderBottom: "1px solid var(--glass-border)",
              padding: "0 1.5rem", display: "flex",
              alignItems: "center", justifyContent: "space-between",
              background: "rgba(0,0,0,0.2)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                {selectedSubject ? (
                  <>
                    <MessageSquare size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <h1 style={{ fontSize: "1rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedSubject} {t.tutorTitleSuffix} {activeGrade})
                    </h1>
                  </>
                ) : (
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{t.selectSession}</span>
                )}
              </div>
              <div style={{
                fontSize: "0.72rem", background: "rgba(20,184,166,0.1)", color: "var(--secondary)",
                padding: "0.3rem 0.75rem", borderRadius: "20px",
                border: "1px solid rgba(20,184,166,0.2)", whiteSpace: "nowrap", flexShrink: 0
              }}>
                {t.curriculumBanner}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {!activeSessionId ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem", margin: "auto" }}>
                  <Bot size={40} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>{t.noActiveSessionHeader}</h3>
                  <p style={{ color: "var(--text-secondary)", maxWidth: "400px" }}>{t.noActiveSessionDesc}</p>
                </div>
              ) : messages.length === 0 && !fetchingMessages ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem", margin: "auto" }}>
                  <MessageSquare size={32} style={{ color: "var(--primary)", marginBottom: "1rem" }} />
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>{t.newChatHeader}</h3>
                  <p style={{ color: "var(--text-secondary)", maxWidth: "400px" }}>{t.newChatDesc}</p>
                </div>
              ) : fetchingMessages ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", margin: "auto" }}>
                  <div style={{ width: "32px", height: "32px", border: "2px solid var(--glass-border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => {
                    const isStudent = msg.sender === "student";
                    return (
                      <div key={index} style={{ display: "flex", flexDirection: "column", maxWidth: "70%", alignSelf: isStudent ? "flex-end" : "flex-start" }}>
                        <div style={{
                          padding: "0.875rem 1rem",
                          borderRadius: isStudent ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                          background: isStudent ? "rgba(14,165,233,0.12)" : "rgba(255,255,255,0.04)",
                          border: isStudent ? "1px solid rgba(14,165,233,0.25)" : "1px solid var(--glass-border)"
                        }}>
                          {msg.out_of_scope && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", padding: "0.4rem 0.75rem", borderRadius: "8px", color: "var(--warning)", fontSize: "0.78rem", marginBottom: "0.75rem" }}>
                              <AlertTriangle size={13} /><span>{t.outOfScope}</span>
                            </div>
                          )}
                          {msg.sender === "tutor" ? (
                            <TutorResponse content={msg.content} />
                          ) : (
                            <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>{msg.content}</p>
                          )}
                        </div>
                        {!isStudent && msg.sources && msg.sources.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.4rem" }}>
                            {msg.sources.map((src, sIdx) => {
                              const chapterLabel = src.chapter ? src.chapter.slice(0, 35) + (src.chapter.length > 35 ? "..." : "") : src.source?.replace(/\.[^.]+$/, "");
                              const similarityPct = src.similarity > 0 ? ` Â· ${Math.round(src.similarity * 100)}%` : "";
                              return (
                                <div key={sIdx} style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)", padding: "0.2rem 0.5rem", borderRadius: "4px", color: "var(--secondary)" }}>
                                  <BookOpen size={8} /><span>{chapterLabel}{similarityPct}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {sending && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", alignSelf: "flex-start" }}>
                      <Bot size={16} style={{ color: "var(--primary)" }} />
                      <div style={{ display: "flex", gap: "4px" }}>
                        {[0, 0.2, 0.4].map((delay, i) => (
                          <span key={i} style={{ width: "6px", height: "6px", background: "var(--text-muted)", borderRadius: "50%", display: "inline-block", animation: `bounce 1.4s ${delay}s infinite` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            {activeSessionId && (
              <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.1)", flexShrink: 0 }}>
                <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "0.75rem" }}>
                  <input
                    type="text"
                    placeholder={t.placeholderInput}
                    required
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={sending}
                    style={{
                      flex: 1, padding: "0.75rem 1rem",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: "24px", color: "var(--text-primary)",
                      fontSize: "0.9rem", outline: "none"
                    }}
                  />
                  <button type="submit" disabled={sending || !inputText.trim()} style={{
                    width: "44px", height: "44px", flexShrink: 0,
                    background: sending || !inputText.trim() ? "rgba(255,255,255,0.08)" : "var(--primary)",
                    border: "none", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: sending || !inputText.trim() ? "not-allowed" : "pointer"
                  }}>
                    <Send size={16} style={{ color: "#fff" }} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
        `}</style>
      </div>
    </AuthGuard>
  );
}
        
