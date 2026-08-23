"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { useRouter, useSearchParams } from "next/navigation";
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
import { getSubjectsForGrade, isAfaanOromo } from "@/lib/subjects";

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

function TutorPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectParam = searchParams.get("subject");
  
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

  // Load session or start new one from query param
  useEffect(() => {
    if (!loading && user && !fetchingSessions && subjectParam) {
      // Clear the query parameter so it doesn't trigger again on subsequent renders
      const currentUrl = window.location.pathname;
      router.replace(currentUrl);

      // Check if session for this subject already exists
      const existing = sessions.find(s => s.subject.toLowerCase() === subjectParam.toLowerCase());
      if (existing) {
        loadSession(existing.id);
      } else {
        startNewSession(subjectParam);
      }
    }
  }, [loading, user, fetchingSessions, subjectParam, sessions]);

  // Load most recent session by default if none is active
  useEffect(() => {
    if (sessions.length > 0 && activeSessionId === null && !subjectParam) {
      loadSession(sessions[0].id);
    }
  }, [sessions, activeSessionId, subjectParam]);

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
  const activeGrade = user.role === "teacher" ? (user.grade_taught ?? user.grade) : user.grade;
  const subjects = getSubjectsForGrade(activeGrade);
  const isAO = isAfaanOromo(user);

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
          grade: activeGrade
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
      <div className="app-container">
        <Sidebar />
      
        <main className="main-content" style={{ padding: 0, height: "100vh" }}>
          <div style={{ display: "flex", height: "100%" }}>
        
        {/* Chat History Panel (Mobile: Hidden by default, Desktop: Always visible) */}
        <div className="glass-panel" style={{
          width: "280px",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--glass-border)",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          borderRadius: 0
        }}>
          <div style={{
            padding: "1.5rem",
            borderBottom: "1px solid var(--glass-border)"
          }}>
            <h3 style={{
              fontSize: "1rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--text-primary)"
            }}>
              <History size={16} /> {t.activeSessions}
            </h3>
          </div>
          {/* New Session Options */}
          <div style={{
            padding: "1rem",
            borderBottom: "1px solid var(--glass-border)"
          }}>
            <span style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "0.75rem"
            }}>
              {t.newChat}
            </span>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              maxHeight: "180px",
              overflowY: "auto",
              paddingRight: "0.25rem"
            }}>
              {subjects.map((sub) => (
                <button
                  key={sub}
                  onClick={() => startNewSession(sub)}
                  className="glass-panel glass-panel-hover"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.75rem 1rem",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    border: "1px solid var(--glass-border)",
                    background: "var(--glass-bg)",
                    color: "var(--text-primary)"
                  }}
                >
                  <PlusCircle size={14} style={{ color: "var(--primary)" }} /> {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Session List */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem"
          }}>
            {fetchingSessions ? (
              <p style={{
                textAlign: "center",
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                marginTop: "2rem"
              }}>{t.loading}</p>
            ) : sessions.length === 0 ? (
              <p style={{
                textAlign: "center",
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                marginTop: "2rem"
              }}>{t.noActiveSessions}</p>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
              }}>
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className={`glass-panel ${activeSessionId === s.id ? "" : "glass-panel-hover"}`}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      textAlign: "left",
                      cursor: "pointer",
                      background: activeSessionId === s.id ? "var(--glass-active)" : "var(--glass-bg)",
                      border: activeSessionId === s.id 
                        ? "1px solid var(--primary)" 
                        : "1px solid var(--glass-border)"
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.5rem"
                    }}>
                      <span style={{
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: activeSessionId === s.id ? "var(--primary)" : "var(--text-primary)"
                      }}>
                        {s.subject}
                      </span>
                      <span style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)"
                      }}>
                        {new Date(s.started_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
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
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Top Navbar */}
          <div style={{
            height: "4rem",
            borderBottom: "1px solid var(--glass-border)",
            padding: "0 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--glass-bg)",
            backdropFilter: "blur(16px)"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              minWidth: 0
            }}>
              {selectedSubject ? (
                <>
                  <MessageSquare size={20} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  <h1 style={{
                    fontSize: "1.125rem",
                    fontWeight: "700",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--text-primary)"
                  }}>
                    {selectedSubject} {t.tutorTitleSuffix} {user.grade})
                  </h1>
                </>
              ) : (
                <span style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.875rem"
                }}>{t.selectSession}</span>
              )}
            </div>

            <div style={{
              fontSize: "0.75rem",
              background: "rgba(20, 184, 166, 0.1)",
              color: "var(--secondary)",
              padding: "0.375rem 0.75rem",
              borderRadius: "9999px",
              fontWeight: "500",
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
                textAlign: "center",
                padding: "1rem"
              }}>
                <Bot size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
                <h3 style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: "var(--text-primary)"
                }}>{t.noActiveSessionHeader}</h3>
                <p style={{
                  fontSize: "1rem",
                  color: "var(--text-secondary)",
                  maxWidth: "28rem"
                }}>{t.noActiveSessionDesc}</p>
                
                {/* Mobile: Show subject selection */}
                <div 
                  className="md:hidden"
                  style={{
                    marginTop: "1.5rem",
                    width: "100%",
                    maxWidth: "24rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem"
                  }}
                >
                  <p style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    marginBottom: "0.75rem"
                  }}>{t.newChat}</p>
                  {subjects.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => startNewSession(sub)}
                      className="glass-panel glass-panel-hover"
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "1rem 1.25rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer"
                      }}
                    >
                      <PlusCircle size={16} style={{ color: "var(--primary)" }} /> {sub}
                    </button>
                  ))}
                </div>
              </div>
            ) : messages.length === 0 && !fetchingMessages ? (
              <div style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "1rem"
              }}>
                <MessageSquare size={32} style={{ color: "var(--primary)", marginBottom: "1rem" }} />
                <h3 style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: "var(--text-primary)"
                }}>{t.newChatHeader}</h3>
                <p style={{
                  fontSize: "1rem",
                  color: "var(--text-secondary)",
                  maxWidth: "28rem"
                }}>{t.newChatDesc}</p>
              </div>
            ) : fetchingMessages ? (
              <div style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <div style={{
                  width: "2rem",
                  height: "2rem",
                  border: "3px solid var(--glass-border)",
                  borderTopColor: "var(--primary)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}></div>
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
                        maxWidth: "70%",
                        alignSelf: isStudent ? "flex-end" : "flex-start"
                      }}
                    >
                      <div 
                        className="glass-panel"
                        style={{
                          padding: "1rem 1.25rem",
                          background: isStudent 
                            ? "rgba(14, 165, 233, 0.1)" 
                            : "var(--glass-bg)",
                          border: isStudent
                            ? "1px solid rgba(14, 165, 233, 0.3)"
                            : "1px solid var(--glass-border)",
                          borderBottomRightRadius: isStudent ? "0.25rem" : "1rem",
                          borderBottomLeftRadius: isStudent ? "1rem" : "0.25rem"
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
                            padding: "0.75rem",
                            borderRadius: "0.5rem",
                            color: "var(--warning)",
                            fontSize: "0.875rem",
                            marginBottom: "0.75rem"
                          }}>
                            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                            <span>{t.outOfScope}</span>
                          </div>
                        )}
                        
                        {/* Message content */}
                        {msg.sender === "tutor" ? (
                          <TutorResponse content={msg.content} />
                        ) : (
                          <p style={{
                            fontSize: "1rem",
                            color: "var(--text-primary)",
                            lineHeight: "1.6"
                          }}>
                            {msg.content}
                          </p>
                        )}
                      </div>

                      {/* Source Citations */}
                      {!isStudent && msg.sources && msg.sources.length > 0 && (
                        <div style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                          marginTop: "0.75rem"
                        }}>
                          {msg.sources.map((src, sIdx) => {
                            const chapterLabel = src.chapter
                              ? src.chapter.slice(0, 40) + (src.chapter.length > 40 ? "..." : "")
                              : src.source?.replace(/\.[^.]+$/, "");

                            const pageLabel = src.page_number && src.page_number > 0
                              ? (isAO ? `Fuula ${src.page_number}` : `p.${src.page_number}`)
                              : null;

                            const similarityPct = src.similarity > 0
                              ? `${Math.round(src.similarity * 100)}%`
                              : null;

                            return (
                              <div
                                key={sIdx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  fontSize: "0.75rem",
                                  background: "rgba(20, 184, 166, 0.1)",
                                  border: "1px solid rgba(20, 184, 166, 0.2)",
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "0.25rem",
                                  color: "var(--secondary)",
                                  maxWidth: "100%"
                                }}
                                title={`${src.source}${src.chapter ? ` — ${src.chunk_type}` : ""}`}
                              >
                                <BookOpen size={8} style={{ flexShrink: 0 }} />
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {chapterLabel}
                                  {pageLabel && <span style={{ color: "var(--text-muted)" }}> · {pageLabel}</span>}
                                  {similarityPct && <span style={{ color: "var(--text-muted)" }}> · {similarityPct}</span>}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {sending && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    alignSelf: "flex-start"
                  }}>
                    <Bot size={16} style={{ color: "var(--primary)" }} />
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <span 
                          key={i}
                          style={{
                            width: "0.375rem",
                            height: "0.375rem",
                            background: "var(--text-muted)",
                            borderRadius: "50%",
                            animation: `bounce 1.4s infinite`,
                            animationDelay: `${delay}s`
                          }}
                        />
                      ))}
                    </div>
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
              background: "var(--glass-bg)",
              backdropFilter: "blur(16px)"
            }}>
              <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "0.75rem" }}>
                <input
                  type="text"
                  placeholder={t.placeholderInput}
                  required
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending}
                  className="form-input"
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    borderRadius: "1.5rem",
                    fontSize: "1rem"
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="btn btn-primary"
                  style={{
                    width: "3rem",
                    height: "3rem",
                    borderRadius: "50%",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      </main>
    </div>
    </AuthGuard>
  );
}

export default function TutorPage() {
  return (
    <React.Suspense fallback={
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "1rem",
        background: "var(--bg-gradient)"
      }}>
        <div style={{
          width: "50px",
          height: "50px",
          border: "3px solid var(--glass-border)",
          borderTopColor: "var(--primary)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
      </div>
    }>
      <TutorPageContent />
    </React.Suspense>
  );
}
