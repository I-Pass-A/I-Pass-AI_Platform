"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
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
  History,
  Sparkles,
  User,
  GraduationCap,
  Clock,
  RefreshCw,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   PAGE
========================================================= */

export default function TutorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  /* =========================================================
     SUBJECTS
  ========================================================= */

  const englishSubjects = [
    "English",
    "Biology",
    "Chemistry",
    "Physics",
    "Maths",
  ];

  const oromoSubjects = [
    "Afaan Oromo",
    "Saayinsii",
    "Hawaasummaa",
    "Herrega",
  ];

  /* =========================================================
     STATE
  ========================================================= */

  const [selectedSubject, setSelectedSubject] = useState("");
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [fetchingSessions, setFetchingSessions] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  /* =========================================================
     LANGUAGE
  ========================================================= */

  const isAO = user?.language === "Afaan Oromo";

  const subjects = isAO ? oromoSubjects : englishSubjects;

  /* =========================================================
     TRANSLATIONS
  ========================================================= */

  const t = {
    activeSessions: isAO ? "Haasawa Ol-kaayame" : "Active Sessions",

    newChat: isAO
      ? "Haasawa Haaraa Eegali"
      : "Start New Chat",

    loading: isAO
      ? "Fidaa jira..."
      : "Loading...",

    noActiveSessions: isAO
      ? "Haasawa ol-kaayame hin jiru."
      : "No active sessions.",

    selectSession: isAO
      ? "Mata-duree filadhu ykn haasawa haaraa jalqabi."
      : "Select a subject to start learning.",

    curriculumBanner: isAO
      ? "RAG Curriculum"
      : "Curriculum Grounded",

    noActiveSessionHeader: isAO
      ? "AI Tutor Keessan"
      : "Your AI Tutor",

    noActiveSessionDesc: isAO
      ? `Gosa barnootaa tokko filadhuun kutaa ${user?.grade} keessatti barachuu jalqabi.`
      : `Choose a subject to start learning with your Grade ${user?.grade} AI Tutor.`,

    newChatHeader: isAO
      ? `Tutor ${selectedSubject}`
      : `${selectedSubject} Tutor`,

    newChatDesc: isAO
      ? "Gaaffii kee barreessi. Tutor AI siif ibsa tarkaanfii tarkaanfiin kenna."
      : "Ask anything about your curriculum. Your AI Tutor will guide you step-by-step.",

    placeholderInput: isAO
      ? "Gaaffii kee barreessi..."
      : "Ask your AI Tutor a question...",

    outOfScope: isAO
      ? "Curriculum Ala"
      : "Out of Curriculum",

    similarityText: isAO
      ? "Similarity"
      : "Similarity",

    errorConnect: isAO
      ? "AI Tutor waliin wal qunnamuu hin dandeenye. Backend/API kee ilaali."
      : "Could not connect to the AI Tutor. Please check your backend/API.",

    online: isAO
      ? "Online"
      : "Online",
  };

  /* =========================================================
     FETCH SESSIONS
  ========================================================= */

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

      const formattedSessions: SessionInfo[] = (data || []).map(
        (s: any) => {
          const sortedMsgs = [...(s.tutor_messages || [])].sort(
            (a: any, b: any) =>
              new Date(b.timestamp).getTime() -
              new Date(a.timestamp).getTime()
          );

          const lastMsg =
            sortedMsgs[0]?.content ||
            (isAO ? "Haasawa jalqabi..." : "Start chatting...");

          return {
            id: s.id,
            subject: s.subject,
            started_at: s.started_at,
            last_message: lastMsg,
          };
        }
      );

      formattedSessions.sort(
        (a, b) =>
          new Date(b.started_at).getTime() -
          new Date(a.started_at).getTime()
      );

      setSessions(formattedSessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setFetchingSessions(false);
    }
  };

  /* =========================================================
     LOAD SESSIONS WHEN USER CHANGES
  ========================================================= */

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user?.id, user?.language, user?.grade]);

  /* =========================================================
     AUTO SCROLL
  ========================================================= */

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, sending]);

  /* =========================================================
     LOAD SESSION
  ========================================================= */

  const loadSession = async (sessionId: number) => {
    setFetchingMessages(true);
    setActiveSessionId(sessionId);

    const matched = sessions.find(
      (session) => session.id === sessionId
    );

    if (matched) {
      setSelectedSubject(matched.subject);
    }

    try {
      const { data, error } = await supabase
        .from("tutor_messages")
        .select(
          "id, sender, content, timestamp, sources, out_of_scope"
        )
        .eq("session_id", sessionId)
        .order("timestamp", {
          ascending: true,
        });

      if (error) throw error;

      const formattedMessages: Message[] =
        (data || []).map((message: any) => ({
          id: message.id,
          sender: message.sender,
          content: message.content,
          timestamp: message.timestamp,
          sources: message.sources || [],
          out_of_scope: message.out_of_scope,
        }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error loading session:", error);
    } finally {
      setFetchingMessages(false);
    }
  };

  /* =========================================================
     START NEW SESSION
  ========================================================= */

  const startNewSession = async (subjectName: string) => {
    if (!user) return;

    setSelectedSubject(subjectName);
    setMessages([]);
    setActiveSessionId(null);

    try {
      const { data, error } = await supabase
        .from("tutor_sessions")
        .insert({
          user_id: user.id,
          subject: subjectName,
        })
        .select()
        .single();

      if (error) throw error;

      setActiveSessionId(data.id);

      await fetchSessions();
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  /* =========================================================
     SEND MESSAGE
  ========================================================= */

  const handleSendMessage = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !inputText.trim() ||
      !activeSessionId ||
      sending
    ) {
      return;
    }

    const studentText = inputText.trim();

    setInputText("");
    setSending(true);

    const studentMessage: Message = {
      sender: "student",
      content: studentText,
      timestamp: new Date().toISOString(),
    };

    setMessages((previous) => [
      ...previous,
      studentMessage,
    ]);

    try {
      const response = await fetch(
        "/api/tutor/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: activeSessionId,
            query: studentText,
            grade: user?.grade,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to generate response"
        );
      }

      const data = await response.json();

      const tutorMessage: Message = {
        sender: "tutor",
        content: data.response,
        timestamp: new Date().toISOString(),
        sources: data.sources || [],
        out_of_scope: data.out_of_scope || false,
      };

      setMessages((previous) => [
        ...previous,
        tutorMessage,
      ]);

      await fetchSessions();
    } catch (error) {
      console.error(error);

      const errorMessage: Message = {
        sender: "tutor",
        content: t.errorConnect,
        timestamp: new Date().toISOString(),
        out_of_scope: true,
      };

      setMessages((previous) => [
        ...previous,
        errorMessage,
      ]);
    } finally {
      setSending(false);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading || !user) {
    return (
      <div className="tutor-loading">
        <div className="loading-spinner" />
        <p>Loading AI Tutor...</p>

        <style jsx>{`
          .tutor-loading {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 1rem;
            background: #050b1c;
            color: white;
          }

          .loading-spinner {
            width: 35px;
            height: 35px;
            border: 3px solid rgba(255,255,255,.1);
            border-top-color: #0ea5e9;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="app-container">

      {/* =====================================================
          MAIN SIDEBAR
      ===================================================== */}

      <Sidebar />

      <main
        className="main-content tutor-main"
        style={{
          padding: 0,
          flexDirection: "row",
        }}
      >

        {/* =====================================================
            CHAT HISTORY
        ===================================================== */}

        <aside className="history-panel">

          {/* Header */}

          <div className="history-header">

            <div className="history-title">

              <div className="history-icon">
                <History size={18} />
              </div>

              <div>
                <h3>
                  {t.activeSessions}
                </h3>

                <span>
                  {sessions.length}{" "}
                  {sessions.length === 1
                    ? "conversation"
                    : "conversations"}
                </span>
              </div>

            </div>

          </div>

          {/* New Chat */}

          <div className="new-chat-section">

            <div className="section-label">
              <Sparkles size={13} />
              {t.newChat}
            </div>

            <div className="subject-list">

              {subjects.map((subject) => (

                <button
                  key={subject}
                  onClick={() =>
                    startNewSession(subject)
                  }
                  className={`subject-button ${
                    selectedSubject === subject
                      ? "selected"
                      : ""
                  }`}
                >

                  <div className="subject-icon">
                    <PlusCircle size={15} />
                  </div>

                  <span>
                    {subject}
                  </span>

                </button>

              ))}

            </div>

          </div>

          {/* Session History */}

          <div className="session-history">

            <div className="history-label">
              <Clock size={13} />
              Recent Chats
            </div>

            {fetchingSessions ? (

              <div className="history-loading">
                <div className="small-spinner" />
                <span>
                  {t.loading}
                </span>
              </div>

            ) : sessions.length === 0 ? (

              <div className="empty-history">

                <History size={30} />

                <p>
                  {t.noActiveSessions}
                </p>

                <span>
                  Start a new subject above.
                </span>

              </div>

            ) : (

              <div className="session-list">

                {sessions.map((session) => (

                  <button
                    key={session.id}
                    onClick={() =>
                      loadSession(session.id)
                    }
                    className={`session-item ${
                      activeSessionId === session.id
                        ? "active"
                        : ""
                    }`}
                  >

                    <div className="session-top">

                      <span className="session-subject">
                        {session.subject}
                      </span>

                      <span className="session-date">
                        {new Date(
                          session.started_at
                        ).toLocaleDateString()}
                      </span>

                    </div>

                    <p className="session-preview">
                      {session.last_message}
                    </p>

                  </button>

                ))}

              </div>

            )}

          </div>

        </aside>

        {/* =====================================================
            CHAT AREA
        ===================================================== */}

        <section className="chat-panel">

          {/* ===================================================
              CHAT HEADER
          =================================================== */}

          <header className="chat-header">

            <div className="chat-header-left">

              <div className="ai-avatar">
                <Bot size={23} />
              </div>

              <div>

                {selectedSubject ? (

                  <>
                    <h1>
                      {selectedSubject} Tutor
                    </h1>

                    <div className="online-status">
                      <span className="online-dot" />
                      {t.online} · Grade {user.grade}
                    </div>
                  </>

                ) : (

                  <>
                    <h1>
                      {t.noActiveSessionHeader}
                    </h1>

                    <div className="online-status">
                      <span className="online-dot" />
                      {t.online}
                    </div>
                  </>

                )}

              </div>

            </div>

            <div className="rag-badge">
              <GraduationCap size={15} />
              {t.curriculumBanner}
            </div>

          </header>

          {/* ===================================================
              MESSAGES
          =================================================== */}

          <div className="messages-container">

            {!activeSessionId ? (

              /* WELCOME */

              <div className="welcome-screen">

                <div className="welcome-icon">
                  <Bot size={46} />
                </div>

                <h2>
                  {t.noActiveSessionHeader}
                </h2>

                <p>
                  {t.noActiveSessionDesc}
                </p>

                <div className="welcome-subjects">

                  {subjects.map((subject) => (

                    <button
                      key={subject}
                      onClick={() =>
                        startNewSession(subject)
                      }
                    >
                      <BookOpen size={16} />
                      {subject}
                    </button>

                  ))}

                </div>

              </div>

            ) : fetchingMessages ? (

              /* LOADING */

              <div className="messages-loading">

                <div className="large-spinner" />

                <p>
                  Loading conversation...
                </p>

              </div>

            ) : messages.length === 0 ? (

              /* NEW CHAT */

              <div className="new-chat-screen">

                <div className="new-chat-icon">
                  <Sparkles size={32} />
                </div>

                <h2>
                  {t.newChatHeader}
                </h2>

                <p>
                  {t.newChatDesc}
                </p>

                <div className="suggestion-container">

                  <button
                    onClick={() =>
                      setInputText(
                        "Explain this topic step by step."
                      )
                    }
                  >
                    <Sparkles size={15} />
                    Explain a topic
                  </button>

                  <button
                    onClick={() =>
                      setInputText(
                        "Give me an exam question and explain the answer."
                      )
                    }
                  >
                    <GraduationCap size={15} />
                    Exam practice
                  </button>

                  <button
                    onClick={() =>
                      setInputText(
                        "Give me a simple example."
                      )
                    }
                  >
                    <BookOpen size={15} />
                    Give an example
                  </button>

                </div>

              </div>

            ) : (

              /* ACTUAL MESSAGES */

              <div className="message-list">

                {messages.map(
                  (message, index) => {

                    const isStudent =
                      message.sender === "student";

                    return (

                      <div
                        key={
                          message.id ||
                          index
                        }
                        className={`message-row ${
                          isStudent
                            ? "student-row"
                            : "tutor-row"
                        }`}
                      >

                        {/* Avatar */}

                        <div
                          className={`message-avatar ${
                            isStudent
                              ? "student-avatar"
                              : "tutor-avatar"
                          }`}
                        >
                          {isStudent ? (
                            <User size={16} />
                          ) : (
                            <Bot size={17} />
                          )}
                        </div>

                        {/* Message Content */}

                        <div className="message-content">

                          <div className="message-name">

                            {isStudent
                              ? "You"
                              : "AI Tutor"}

                            <span>
                              {new Date(
                                message.timestamp
                              ).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>

                          </div>

                          <div
                            className={`message-bubble ${
                              isStudent
                                ? "student-bubble"
                                : "tutor-bubble"
                            }`}
                          >

                            {/* Out of Scope */}

                            {message.out_of_scope && (

                              <div className="scope-warning">

                                <AlertTriangle
                                  size={15}
                                />

                                <span>
                                  {t.outOfScope}
                                </span>

                              </div>

                            )}

                            {/* Markdown */}

                            <div className="markdown-content">

                              {isStudent ? (

                                <p>
                                  {message.content}
                                </p>

                              ) : (
<ReactMarkdown
  remarkPlugins={[
    remarkGfm,
    remarkMath,
  ]}
  rehypePlugins={[
    rehypeKatex,
  ]}
  components={{
    h1: ({ children }) => (
      <div className="lesson-title">
        {children}
      </div>
    ),

    h2: ({ children }) => (
      <section className="lesson-section">
        <h2>{children}</h2>
      </section>
    ),

    h3: ({ children }) => (
      <h3 className="example-heading">
        {children}
      </h3>
    ),

    p: ({ children }) => (
      <p>{children}</p>
    ),

    strong: ({ children }) => (
      <strong>{children}</strong>
    ),

    ul: ({ children }) => (
      <ul>{children}</ul>
    ),

    ol: ({ children }) => (
      <ol>{children}</ol>
    ),

    li: ({ children }) => (
      <li>{children}</li>
    ),

    hr: () => (
      <div className="lesson-divider" />
    ),

    blockquote: ({ children }) => (
      <blockquote className="lesson-quote">
        {children}
      </blockquote>
    ),

    code: ({ children, className }) => (
      <code className={className}>
        {children}
      </code>
    ),

    table: ({ children }) => (
      <div className="table-wrapper">
        <table>{children}</table>
      </div>
    ),
  }}
>
  {message.content}
</ReactMarkdown>

                              )}

                            </div>

                          </div>

                          {/* Sources */}

                          {!isStudent &&
                            message.sources &&
                            message.sources.length >
                              0 && (

                              <div className="sources">

                                <div className="sources-title">
                                  <BookOpen
                                    size={13}
                                  />
                                  Sources
                                </div>

                                <div className="source-list">

                                  {message.sources.map(
                                    (
                                      source,
                                      sourceIndex
                                    ) => (

                                      <div
                                        key={
                                          sourceIndex
                                        }
                                        className="source-card"
                                      >

                                        <BookOpen
                                          size={12}
                                        />

                                        <span>
                                          {
                                            source.source
                                          }
                                        </span>

                                        {typeof source.similarity ===
                                          "number" && (

                                          <small>
                                            {Math.round(
                                              source.similarity *
                                                100
                                            )}
                                            %
                                          </small>

                                        )}

                                      </div>

                                    )
                                  )}

                                </div>

                              </div>

                            )}

                        </div>

                      </div>

                    );
                  }
                )}

                {/* TYPING */}

                {sending && (

                  <div className="message-row tutor-row">

                    <div className="message-avatar tutor-avatar">
                      <Bot size={17} />
                    </div>

                    <div className="message-content">

                      <div className="message-name">
                        AI Tutor
                      </div>

                      <div className="typing-bubble">

                        <span />
                        <span />
                        <span />

                      </div>

                    </div>

                  </div>

                )}

                <div ref={chatEndRef} />

              </div>

            )}

          </div>

          {/* ===================================================
              INPUT
          =================================================== */}

          {activeSessionId && (

            <div className="input-area">

              <form
                onSubmit={
                  handleSendMessage
                }
                className="input-wrapper"
              >

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) =>
                    setInputText(
                      e.target.value
                    )
                  }
                  placeholder={
                    t.placeholderInput
                  }
                  disabled={sending}
                  autoComplete="off"
                />

                <button
                  type="submit"
                  disabled={
                    sending ||
                    !inputText.trim()
                  }
                  className="send-button"
                >

                  {sending ? (
                    <RefreshCw
                      size={19}
                      className="send-loading"
                    />
                  ) : (
                    <Send size={19} />
                  )}

                </button>

              </form>

              <div className="input-footer">
                <span>
                  <Sparkles size={12} />
                  AI Tutor · Grade {user.grade}
                </span>

                <span>
                  Press Enter to send
                </span>
              </div>

            </div>

          )}

        </section>

      </main>

      {/* =======================================================
          PAGE CSS
      ======================================================= */}

      <style jsx>{`

        /* ===============================================
           MAIN
        =============================================== */

        .tutor-main {
          background:
            radial-gradient(
              circle at 80% 10%,
              rgba(14,165,233,.08),
              transparent 30%
            ),
            #050b1c;
        }

        /* ===============================================
           HISTORY PANEL
        =============================================== */

        .history-panel {
          width: 285px;
          min-width: 285px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255,255,255,.07);
          background: rgba(4,10,28,.82);
          backdrop-filter: blur(20px);
        }

        .history-header {
          padding: 20px;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .history-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .history-icon {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(14,165,233,.12);
          color: #38bdf8;
        }

        .history-title h3 {
          margin: 0;
          font-size: 14px;
          color: white;
        }

        .history-title span {
          display: block;
          margin-top: 3px;
          font-size: 11px;
          color: #64748b;
        }

        /* ===============================================
           NEW CHAT
        =============================================== */

        .new-chat-section {
          padding: 17px;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .section-label,
        .history-label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 11px;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .subject-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .subject-button {
          width: 100%;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.025);
          color: #cbd5e1;
          padding: 9px 10px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          gap: 9px;
          cursor: pointer;
          transition: .2s;
          text-align: left;
        }

        .subject-button:hover,
        .subject-button.selected {
          background: rgba(14,165,233,.12);
          border-color: rgba(14,165,233,.3);
          color: #fff;
          transform: translateX(2px);
        }

        .subject-icon {
          color: #38bdf8;
          display: flex;
        }

        /* ===============================================
           HISTORY
        =============================================== */

        .session-history {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
        }

        .history-label {
          margin-bottom: 10px;
        }

        .session-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .session-item {
          width: 100%;
          padding: 11px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          transition: .2s;
          color: white;
        }

        .session-item:hover {
          background: rgba(255,255,255,.04);
        }

        .session-item.active {
          background: linear-gradient(
            135deg,
            rgba(14,165,233,.14),
            rgba(59,130,246,.08)
          );
          border-color: rgba(14,165,233,.25);
        }

        .session-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .session-subject {
          font-size: 12px;
          font-weight: 700;
          color: #e2e8f0;
        }

        .session-item.active .session-subject {
          color: #38bdf8;
        }

        .session-date {
          font-size: 9px;
          color: #64748b;
        }

        .session-preview {
          margin: 5px 0 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          color: #64748b;
          font-size: 10px;
        }

        .empty-history,
        .history-loading {
          padding: 30px 10px;
          text-align: center;
          color: #64748b;
        }

        .empty-history svg {
          opacity: .35;
          margin-bottom: 10px;
        }

        .empty-history p {
          margin: 0;
          font-size: 12px;
        }

        .empty-history span {
          display: block;
          margin-top: 5px;
          font-size: 10px;
        }

        .history-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .small-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255,255,255,.1);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* ===============================================
           CHAT PANEL
        =============================================== */

        .chat-panel {
          flex: 1;
          min-width: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background:
            radial-gradient(
              circle at 70% 0%,
              rgba(14,165,233,.07),
              transparent 35%
            );
        }

        /* ===============================================
           HEADER
        =============================================== */

        .chat-header {
          height: 76px;
          min-height: 76px;
          padding: 0 25px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,.07);
          background: rgba(5,11,28,.65);
          backdrop-filter: blur(20px);
        }

        .chat-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ai-avatar {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #38bdf8;
          background:
            linear-gradient(
              135deg,
              rgba(14,165,233,.2),
              rgba(59,130,246,.1)
            );
          border: 1px solid rgba(14,165,233,.2);
          box-shadow: 0 0 25px rgba(14,165,233,.08);
        }

        .chat-header h1 {
          margin: 0;
          color: #f8fafc;
          font-size: 16px;
          font-weight: 700;
        }

        .online-status {
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 10px;
        }

        .online-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
        }

        .rag-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 20px;
          color: #2dd4bf;
          background: rgba(20,184,166,.08);
          border: 1px solid rgba(20,184,166,.18);
          font-size: 10px;
          font-weight: 700;
        }

        /* ===============================================
           MESSAGES
        =============================================== */

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 30px 5%;
          scroll-behavior: smooth;
        }

        .message-list {
          max-width: 950px;
          margin: auto;
          display: flex;
          flex-direction: column;
          gap: 25px;
        }

        .message-row {
          display: flex;
          gap: 11px;
          align-items: flex-start;
          width: 100%;
        }

        .student-row {
          flex-direction: row-reverse;
        }

        .message-avatar {
          width: 34px;
          height: 34px;
          min-width: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 22px;
        }

        .tutor-avatar {
          color: #38bdf8;
          background: rgba(14,165,233,.12);
          border: 1px solid rgba(14,165,233,.2);
        }

        .student-avatar {
          color: white;
          background: linear-gradient(
            135deg,
            #2563eb,
            #7c3aed
          );
        }

        .message-content {
          max-width: min(780px, 78%);
        }

        .student-row .message-content {
          text-align: right;
        }

        .message-name {
          margin-bottom: 6px;
          color: #64748b;
          font-size: 10px;
          font-weight: 600;
        }

        .message-name span {
          margin-left: 8px;
          font-weight: 400;
        }

        .student-row .message-name span {
          margin-left: 8px;
        }

        .message-bubble {
          padding: 17px 19px;
          border-radius: 17px;
          color: #e2e8f0;
          font-size: 14px;
          line-height: 1.75;
          overflow-wrap: anywhere;
        }

        .tutor-bubble {
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.045),
              rgba(255,255,255,.018)
            );
          border: 1px solid rgba(255,255,255,.08);
          border-top-left-radius: 4px;
          box-shadow: 0 10px 30px rgba(0,0,0,.12);
        }

        .student-bubble {
          background:
            linear-gradient(
              135deg,
              rgba(37,99,235,.85),
              rgba(14,165,233,.75)
            );
          border: 1px solid rgba(96,165,250,.3);
          border-top-right-radius: 4px;
          color: white;
          box-shadow: 0 10px 30px rgba(14,165,233,.12);
        }

        /* ===============================================
           MARKDOWN
        =============================================== */

        .markdown-content p {
          margin: 0 0 12px;
        }

        .markdown-content p:last-child {
          margin-bottom: 0;
        }

        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3 {
          color: #f8fafc;
          line-height: 1.35;
          margin-top: 20px;
          margin-bottom: 10px;
        }

        .markdown-content h1 {
          font-size: 22px;
        }

        .markdown-content h2 {
          font-size: 19px;
        }

        .markdown-content h3 {
          font-size: 16px;
        }

        .markdown-content strong {
          color: #fff;
          font-weight: 750;
        }

        .markdown-content ul,
        .markdown-content ol {
          padding-left: 22px;
          margin: 10px 0;
        }

        .markdown-content li {
          margin: 5px 0;
        }

        .markdown-content code {
          padding: 2px 6px;
          border-radius: 5px;
          background: rgba(0,0,0,.35);
          color: #67e8f9;
          font-size: .9em;
        }

        .markdown-content pre {
          margin: 14px 0;
          padding: 15px;
          overflow-x: auto;
          border-radius: 10px;
          background: #020617;
          border: 1px solid rgba(255,255,255,.08);
        }

        .markdown-content pre code {
          padding: 0;
          background: transparent;
          color: #cbd5e1;
        }

        .markdown-content blockquote {
          margin: 12px 0;
          padding: 10px 15px;
          border-left: 3px solid #38bdf8;
          background: rgba(14,165,233,.06);
          color: #94a3b8;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
          margin: 15px 0;
        }

        .markdown-content table {
          width: 100%;
          min-width: 500px;
          border-collapse: collapse;
          font-size: 13px;
        }

        .markdown-content th,
        .markdown-content td {
          padding: 10px;
          text-align: left;
          border: 1px solid rgba(255,255,255,.1);
        }

        .markdown-content th {
          background: rgba(14,165,233,.1);
          color: #e0f2fe;
        }

        /* ===============================================
           WARNING
        =============================================== */

        .scope-warning {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 12px;
          padding: 8px 10px;
          border-radius: 8px;
          color: #fbbf24;
          background: rgba(245,158,11,.08);
          border: 1px solid rgba(245,158,11,.15);
          font-size: 11px;
          font-weight: 600;
        }

        /* ===============================================
           SOURCES
        =============================================== */

        .sources {
          margin-top: 8px;
        }

        .sources-title {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 6px;
          color: #64748b;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 700;
        }

        .source-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .source-card {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 6px;
          color: #5eead4;
          background: rgba(20,184,166,.06);
          border: 1px solid rgba(20,184,166,.12);
          font-size: 9px;
        }

        .source-card small {
          padding-left: 4px;
          color: #64748b;
        }

        /* ===============================================
           TYPING
        =============================================== */

        .typing-bubble {
          display: flex;
          align-items: center;
          gap: 5px;
          width: fit-content;
          padding: 13px 16px;
          border-radius: 15px;
          border-top-left-radius: 4px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
        }

        .typing-bubble span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #38bdf8;
          animation: typing 1.4s infinite;
        }

        .typing-bubble span:nth-child(2) {
          animation-delay: .2s;
        }

        .typing-bubble span:nth-child(3) {
          animation-delay: .4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: .4;
          }

          30% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }

        /* ===============================================
           WELCOME
        =============================================== */

        .welcome-screen,
        .new-chat-screen {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          max-width: 650px;
          margin: auto;
        }

        .welcome-icon,
        .new-chat-icon {
          width: 82px;
          height: 82px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 25px;
          color: #38bdf8;
          background:
            linear-gradient(
              135deg,
              rgba(14,165,233,.16),
              rgba(59,130,246,.08)
            );
          border: 1px solid rgba(14,165,233,.2);
          box-shadow:
            0 0 60px rgba(14,165,233,.08);
          margin-bottom: 20px;
        }

        .welcome-screen h2,
        .new-chat-screen h2 {
          margin: 0 0 10px;
          color: white;
          font-size: 25px;
        }

        .welcome-screen p,
        .new-chat-screen p {
          max-width: 500px;
          margin: 0;
          color: #64748b;
          line-height: 1.7;
          font-size: 13px;
        }

        .welcome-subjects {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-top: 25px;
        }

        .welcome-subjects button,
        .suggestion-container button {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 13px;
          border-radius: 9px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          color: #cbd5e1;
          cursor: pointer;
          transition: .2s;
        }

        .welcome-subjects button:hover,
        .suggestion-container button:hover {
          color: white;
          border-color: rgba(14,165,233,.35);
          background: rgba(14,165,233,.08);
          transform: translateY(-2px);
        }

        .suggestion-container {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-top: 25px;
        }

        .new-chat-icon {
          width: 65px;
          height: 65px;
          border-radius: 20px;
          margin-bottom: 15px;
        }

        /* ===============================================
           LOADING
        =============================================== */

        .messages-loading {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #64748b;
          gap: 12px;
        }

        .large-spinner {
          width: 30px;
          height: 30px;
          border: 2px solid rgba(255,255,255,.08);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* ===============================================
           INPUT
        =============================================== */

        .input-area {
          padding: 15px 5% 18px;
          border-top: 1px solid rgba(255,255,255,.07);
          background: rgba(3,8,23,.78);
          backdrop-filter: blur(20px);
        }

        .input-wrapper {
          max-width: 950px;
          margin: auto;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 7px 7px 18px;
          border-radius: 17px;
          background: rgba(255,255,255,.045);
          border: 1px solid rgba(255,255,255,.1);
          box-shadow: 0 15px 40px rgba(0,0,0,.15);
          transition: .2s;
        }

        .input-wrapper:focus-within {
          border-color: rgba(14,165,233,.45);
          box-shadow:
            0 0 0 3px rgba(14,165,233,.06),
            0 15px 40px rgba(0,0,0,.2);
        }

        .input-wrapper input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: white;
          font-size: 13px;
          padding: 10px 0;
        }

        .input-wrapper input::placeholder {
          color: #64748b;
        }

        .send-button {
          width: 42px;
          height: 42px;
          min-width: 42px;
          border: none;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          background: linear-gradient(
            135deg,
            #0284c7,
            #2563eb
          );
          cursor: pointer;
          transition: .2s;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 8px 20px rgba(14,165,233,.25);
        }

        .send-button:disabled {
          opacity: .35;
          cursor: not-allowed;
        }

        .input-footer {
          max-width: 950px;
          margin: 8px auto 0;
          display: flex;
          justify-content: space-between;
          color: #475569;
          font-size: 9px;
        }

        .input-footer span {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .send-loading {
          animation: spin 1s linear infinite;
        }

        /* ===============================================
           MOBILE
        =============================================== */

        @media (max-width: 900px) {

          .history-panel {
            width: 230px;
            min-width: 230px;
          }

          .message-content {
            max-width: 85%;
          }

          .messages-container {
            padding: 25px 3%;
          }

          .input-area {
            padding-left: 3%;
            padding-right: 3%;
          }

        }

        @media (max-width: 700px) {

          .history-panel {
            display: none;
          }

          .chat-header {
            padding: 0 15px;
          }

          .rag-badge {
            display: none;
          }

          .message-content {
            max-width: 86%;
          }

          .message-bubble {
            padding: 13px 15px;
            font-size: 13px;
          }

          .messages-container {
            padding: 20px 12px;
          }

          .input-area {
            padding: 10px;
          }

          .input-footer {
            display: none;
          }

        }

      `}</style>
    </div>
  );
}