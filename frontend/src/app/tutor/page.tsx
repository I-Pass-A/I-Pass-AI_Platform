"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { 
  MessageSquare, 
  Send, 
  BookOpen, 
  AlertTriangle, 
  User, 
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
  const { user, token, loading } = useAuth();
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

  // Load user sessions when token or user language/grade change
  useEffect(() => {
    if (token) {
      fetchSessions();
    }
  }, [token, user?.language, user?.grade]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading || !user) return null;

  // Determine subject list based on language
  const subjects = user.language === "Afaan Oromo" ? oromoSubjects : englishSubjects;

  const fetchSessions = async () => {
    setFetchingSessions(true);
    try {
      const response = await fetch("http://localhost:8000/api/tutor/sessions", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        
        // If there is an active session, make sure it matches the new subjects list
        // Otherwise, select the first session or clear active session
        if (data.length > 0 && !activeSessionId) {
          loadSession(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingSessions(false);
    }
  };

  const loadSession = async (id: number) => {
    setActiveSessionId(id);
    setFetchingMessages(true);
    try {
      const response = await fetch(`http://localhost:8000/api/tutor/sessions/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setSelectedSubject(data.subject);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingMessages(false);
    }
  };

  const startNewSession = async (subject: string) => {
    if (!subject) return;
    try {
      const response = await fetch("http://localhost:8000/api/tutor/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ subject })
      });
      if (response.ok) {
        const data = await response.json();
        setActiveSessionId(data.id);
        setMessages([]);
        setSelectedSubject(subject);
        fetchSessions(); // Refresh sessions list
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeSessionId || sending) return;

    const queryText = inputText;
    setInputText("");
    setSending(true);

    // Append student message locally
    const studentMsg: Message = {
      sender: "student",
      content: queryText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, studentMsg]);

    try {
      const response = await fetch("http://localhost:8000/api/tutor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: activeSessionId,
          query: queryText,
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
        fetchSessions(); // Refresh list to show updated last message
      } else {
        throw new Error("Failed to generate response");
      }
    } catch (err: any) {
      const errorMsg: Message = {
        sender: "tutor",
        content: `Error: Could not connect to AI Tutor. Please check that the backend server is running.`,
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
              <History size={16} /> Sessions / Barnoota
            </h3>
          </div>
          
          {/* New Session Options */}
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>
              Start New / Haaraa Eegali
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
              <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "1rem" }}>Loading...</p>
            ) : sessions.length === 0 ? (
              <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "1rem" }}>No active sessions.</p>
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
                    {selectedSubject} Tutor (Grade {user.grade})
                  </h1>
                </div>
              ) : (
                <span style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Select or start a session on the left to begin.</span>
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
              Curriculum Grounded (RAG)
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
                <h3 style={{ marginBottom: "0.5rem" }}>No Active Session</h3>
                <p style={{ fontSize: "0.9rem" }}>Select a subject on the left to start a new chat session grounded in your Grade {user.grade} curriculum.</p>
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
                <h3 style={{ marginBottom: "0.5rem" }}>New {selectedSubject} Chat</h3>
                <p style={{ fontSize: "0.9rem" }}>Type your question below (e.g., explain a topic, clarify tenses, or ask grammar rules) to get step-by-step guidance!</p>
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
                        alignSelf: isStudent ? "flex-end" : "flex-start",
                        flexDirection: "column",
                        alignItems: isStudent ? "flex-end" : "flex-start",
                        maxWidth: "75%",
                        animation: "fadeIn 0.3s ease forwards"
                      }}
                    >
                      {/* Sender Tag */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                        marginBottom: "0.25rem"
                      }}>
                        {isStudent ? (
                          <>
                            <span>You</span>
                            <User size={12} />
                          </>
                        ) : (
                          <>
                            <Bot size={12} style={{ color: "var(--primary)" }} />
                            <span>AI Tutor</span>
                          </>
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className="glass-panel"
                        style={{
                          padding: "1rem 1.25rem",
                          borderRadius: isStudent 
                            ? "16px 16px 2px 16px" 
                            : "16px 16px 16px 2px",
                          background: isStudent 
                            ? "linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)"
                            : "rgba(255, 255, 255, 0.03)",
                          borderColor: isStudent
                            ? "rgba(14, 165, 233, 0.25)"
                            : "var(--glass-border)",
                          whiteSpace: "pre-line"
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
                            <span>Out of Curriculum Scope</span>
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
                              <span>{src.source} (Similarity: {Math.round(src.similarity * 100)}%)</span>
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
                  placeholder={user.language === "Afaan Oromo" ? "Gaaffii kee barreessi..." : "Ask your AI Tutor a question..."}
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
