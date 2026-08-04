"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  MessageSquare, 
  Send, 
  BookOpen, 
  AlertTriangle, 
  Bot, 
  PlusCircle, 
  History 
} from "lucide-react";

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
  
  // Subjects mapping based on language / grade
  const englishSubjects = ["English", "Biology", "Chemistry", "Physics", "Maths"];
  const oromoSubjects = ["Afaan Oromo", "Saayinsii", "Hawaasummaa", "Herrega"];
  
  const [selectedSubject, setSelectedSubject] = useState("");
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [fetchingSessions, setFetchingSessions] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  // Determine subject list based on language
  const subjects = user.language === "Afaan Oromo" ? oromoSubjects : englishSubjects;
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
      ? `Gosa barnootaa bitaa irraa filachuudhaan haasawa haaraa kutaa ${user.grade} jalqabi.`
      : `Select a subject on the left to start a new chat session grounded in your Grade ${user.grade} curriculum.`,
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
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content" style={{ padding: 0, flexDirection: "row" }}>
        
        {/* Chat History Panel (Sidebar within Tutor page) */}
        <div style={{
          width: "260px",
          borderRight: "1px solid var(--glass-border)",
          background: "rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          height: "100vh"
        }}>
          <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--glass-border)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <History size={16} /> {t.activeSessions}
            </h3>
          </div>
          
          {/* New Session Options */}
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>
              {t.newChat}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {subjects.map((sub) => (
                <button
                  key={sub}
                  onClick={() => startNewSession(sub)}
                  className="btn btn-outline"
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.8rem",
                    justifyContent: "flex-start",
                    textAlign: "left",
                    width: "100%",
                    borderRadius: "6px"
                  }}
                >
                  <PlusCircle size={12} /> {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Session List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
            {fetchingSessions ? (
              <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "1rem" }}>{t.loading}</p>
            ) : sessions.length === 0 ? (
              <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "1rem" }}>{t.noActiveSessions}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      background: activeSessionId === s.id ? "var(--glass-active)" : "transparent",
                      border: "1px solid",
                      borderColor: activeSessionId === s.id ? "rgba(14, 165, 233, 0.3)" : "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)"
                    }}
                    className={activeSessionId !== s.id ? "glass-panel-hover" : ""}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: activeSessionId === s.id ? "var(--primary)" : "#fff" }}>
                        {s.subject}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {new Date(s.started_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      margin: 0
                    }}>
                      {s.last_message}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Interface Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", background: "rgba(0, 0, 0, 0.05)" }}>
          {/* Top Navbar */}
          <div style={{
            height: "72px",
            borderBottom: "1px solid var(--glass-border)",
            padding: "0 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(10, 20, 44, 0.3)"
          }}>
            <div>
              {selectedSubject ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <MessageSquare size={20} style={{ color: "var(--primary)" }} />
                  <h1 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                    {selectedSubject} {t.tutorTitleSuffix} {user.grade})
                  </h1>
                </div>
              ) : (
                <span style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>{t.selectSession}</span>
              )}
            </div>

            <div style={{
              fontSize: "0.8rem",
              background: "rgba(20, 184, 166, 0.1)",
              color: "var(--secondary)",
              padding: "0.35rem 0.75rem",
              borderRadius: "20px",
              fontWeight: 600,
              border: "1px solid rgba(20, 184, 166, 0.2)"
            }}>
              {t.curriculumBanner}
            </div>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}>
            {!activeSessionId ? (
              <div style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                textAlign: "center",
                maxWidth: "400px",
                margin: "0 auto"
              }}>
                <Bot size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
                <h3 style={{ marginBottom: "0.5rem" }}>{t.noActiveSessionHeader}</h3>
                <p style={{ fontSize: "0.9rem" }}>{t.noActiveSessionDesc}</p>
              </div>
            ) : messages.length === 0 && !fetchingMessages ? (
              <div style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                textAlign: "center",
                maxWidth: "400px",
                margin: "0 auto"
              }}>
                <MessageSquare size={32} style={{ color: "var(--primary)", marginBottom: "1rem" }} />
                <h3 style={{ marginBottom: "0.5rem" }}>{t.newChatHeader}</h3>
                <p style={{ fontSize: "0.9rem" }}>{t.newChatDesc}</p>
              </div>
            ) : fetchingMessages ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{
                  width: "30px",
                  height: "30px",
                  border: "2px solid var(--glass-border)",
                  borderTopColor: "var(--primary)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}></div>
                <style jsx>{`
                  @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const isStudent = msg.sender === "student";
                  return (
                    <div 
                      key={index} 
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignSelf: isStudent ? "flex-end" : "flex-start",
                        maxWidth: "70%",
                        gap: "0.25rem"
                      }}
                    >
                      <div 
                        style={{
                          background: isStudent ? "var(--glass-active)" : "rgba(255, 255, 255, 0.03)",
                          border: isStudent ? "1px solid rgba(14, 165, 233, 0.3)" : "1px solid var(--glass-border)",
                          padding: "1rem 1.25rem",
                          borderRadius: isStudent ? "18px 18px 0px 18px" : "18px 18px 18px 0px",
                          position: "relative"
                        }}
                      >
                        {/* Out of Scope Banner */}
                        {msg.out_of_scope && (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            background: "rgba(245, 158, 11, 0.1)",
                            border: "1px solid rgba(245, 158, 11, 0.2)",
                            padding: "0.5rem 0.75rem",
                            borderRadius: "6px",
                            color: "var(--warning)",
                            fontSize: "0.85rem",
                            marginBottom: "0.75rem"
                          }}>
                            <AlertTriangle size={16} />
                            <span>{t.outOfScope}</span>
                          </div>
                        )}
                        
                        <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "#fff", margin: 0 }}>
                          {msg.content}
                        </p>
                      </div>

                      {/* Source Citations */}
                      {!isStudent && msg.sources && msg.sources.length > 0 && (
                        <div style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.35rem",
                          marginTop: "0.4rem"
                        }}>
                          {msg.sources.map((src, sIdx) => (
                            <div
                              key={sIdx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                fontSize: "0.7rem",
                                color: "var(--secondary)",
                                background: "rgba(20, 184, 166, 0.08)",
                                border: "1px solid rgba(20, 184, 166, 0.15)",
                                padding: "0.15rem 0.4rem",
                                borderRadius: "4px"
                              }}
                            >
                              <BookOpen size={10} />
                              <span>{src.source} ({t.similarityText}: {Math.round(src.similarity * 100)}%)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {sending && (
                  <div style={{ display: "flex", alignSelf: "flex-start", gap: "0.5rem", alignItems: "center" }}>
                    <Bot size={16} style={{ color: "var(--primary)" }} />
                    <div style={{ display: "flex", gap: "4px" }}>
                      <span className="dot" style={{ width: "6px", height: "6px", background: "var(--text-secondary)", borderRadius: "50%", animation: "bounce 1.4s infinite ease-in-out both" }}></span>
                      <span className="dot" style={{ width: "6px", height: "6px", background: "var(--text-secondary)", borderRadius: "50%", animation: "bounce 1.4s infinite ease-in-out both 0.2s" }}></span>
                      <span className="dot" style={{ width: "6px", height: "6px", background: "var(--text-secondary)", borderRadius: "50%", animation: "bounce 1.4s infinite ease-in-out both 0.4s" }}></span>
                    </div>
                    <style jsx>{`
                      @keyframes bounce {
                        0%, 80%, 100% { transform: scale(0); }
                        40% { transform: scale(1.0); }
                      }
                    `}</style>
                  </div>
                )}
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Form Box */}
          {activeSessionId && (
            <div style={{
              padding: "1.5rem 2rem",
              borderTop: "1px solid var(--glass-border)",
              background: "rgba(10, 20, 44, 0.2)"
            }}>
              <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "1rem" }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t.placeholderInput}
                  required
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending}
                  style={{ flex: 1, borderRadius: "24px", padding: "0.75rem 1.5rem" }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sending || !inputText.trim()}
                  style={{
                    borderRadius: "50%",
                    width: "46px",
                    height: "46px",
                    padding: 0,
                    minWidth: "46px"
                  }}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
