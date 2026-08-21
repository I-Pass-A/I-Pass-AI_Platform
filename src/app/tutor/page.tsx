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
  const activeGrade = user.role === "teacher" ? (user.grade_taught ?? user.grade) : user.grade;
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
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
        <Sidebar />
      
      <main className="flex-1 flex flex-col md:flex-row">
        
        {/* Chat History Panel (Mobile: Hidden by default, Desktop: Always visible) */}
        <div className="hidden md:flex w-64 border-r border-white/20 bg-black/15 flex-col h-screen">
          <div className="p-4 md:p-6 border-b border-white/20">
            <h3 className="text-sm md:text-base font-semibold flex items-center gap-2">
              <History size={16} /> {t.activeSessions}
            </h3>
          </div>
          
          {/* New Session Options */}
          <div className="p-3 md:p-4 border-b border-white/20">
            <span className="text-xs text-gray-400 uppercase block mb-2">
              {t.newChat}
            </span>
            <div className="space-y-2">
              {subjects.map((sub) => (
                <button
                  key={sub}
                  onClick={() => startNewSession(sub)}
                  className="w-full text-left px-3 py-2 text-xs md:text-sm bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <PlusCircle size={12} /> {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-3">
            {fetchingSessions ? (
              <p className="text-center text-xs text-gray-500 mt-4">{t.loading}</p>
            ) : sessions.length === 0 ? (
              <p className="text-center text-xs text-gray-500 mt-4">{t.noActiveSessions}</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      activeSessionId === s.id
                        ? 'bg-blue-600/20 border border-blue-500/30'
                        : 'bg-transparent hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-medium ${
                        activeSessionId === s.id ? 'text-blue-400' : 'text-white'
                      }`}>
                        {s.subject}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(s.started_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {s.last_message}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Interface Panel */}
        <div className="flex-1 flex flex-col h-screen">
          {/* Top Navbar */}
          <div className="h-16 md:h-18 border-b border-white/20 px-4 md:px-8 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2 min-w-0">
              {selectedSubject ? (
                <>
                  <MessageSquare size={18} className="text-blue-400 flex-shrink-0" />
                  <h1 className="text-sm md:text-lg font-bold truncate">
                    {selectedSubject} {t.tutorTitleSuffix} {user.grade})
                  </h1>
                </>
              ) : (
                <span className="text-gray-400 text-sm">{t.selectSession}</span>
              )}
            </div>

            <div className="hidden sm:flex text-xs bg-teal-500/10 text-teal-400 px-3 py-1.5 rounded-full font-medium border border-teal-500/20">
              {t.curriculumBanner}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6">
            {!activeSessionId ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Bot size={32} className="md:w-12 md:h-12 text-gray-500 mb-4" />
                <h3 className="text-lg md:text-xl font-semibold mb-2">{t.noActiveSessionHeader}</h3>
                <p className="text-sm md:text-base text-gray-400 max-w-md">{t.noActiveSessionDesc}</p>
                
                {/* Mobile: Show subject selection */}
                <div className="md:hidden mt-6 w-full max-w-sm space-y-2">
                  <p className="text-xs text-gray-500 uppercase mb-3">{t.newChat}</p>
                  {subjects.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => startNewSession(sub)}
                      className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <PlusCircle size={16} /> {sub}
                    </button>
                  ))}
                </div>
              </div>
            ) : messages.length === 0 && !fetchingMessages ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <MessageSquare size={24} className="md:w-8 md:h-8 text-blue-400 mb-4" />
                <h3 className="text-lg md:text-xl font-semibold mb-2">{t.newChatHeader}</h3>
                <p className="text-sm md:text-base text-gray-400 max-w-md">{t.newChatDesc}</p>
              </div>
            ) : fetchingMessages ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const isStudent = msg.sender === "student";
                  return (
                    <div 
                      key={index} 
                      className={`flex flex-col max-w-[85%] md:max-w-[70%] ${
                        isStudent ? 'self-end' : 'self-start'
                      }`}
                    >
                      <div 
                        className={`p-3 md:p-4 rounded-2xl ${
                          isStudent 
                            ? 'bg-blue-600/20 border border-blue-500/30 rounded-br-sm' 
                            : 'bg-white/5 border border-white/10 rounded-bl-sm'
                        }`}
                      >
                        {/* Out of Scope Banner */}
                        {msg.out_of_scope && (
                          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 p-2 md:p-3 rounded-lg text-yellow-400 text-xs md:text-sm mb-3">
                            <AlertTriangle size={14} className="flex-shrink-0" />
                            <span>{t.outOfScope}</span>
                          </div>
                        )}
                        
                        {/* Message content */}
                        {msg.sender === "tutor" ? (
                          <TutorResponse content={msg.content} />
                        ) : (
                          <p className="text-sm md:text-base text-white leading-relaxed">
                            {msg.content}
                          </p>
                        )}
                      </div>

                      {/* Source Citations */}
                      {!isStudent && msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1 md:gap-2 mt-2">
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
                                className="flex items-center gap-1 text-xs bg-teal-500/10 border border-teal-500/20 px-2 py-1 rounded text-teal-400 max-w-full"
                                title={`${src.source}${src.chapter ? ` — ${src.chunk_type}` : ""}`}
                              >
                                <BookOpen size={8} className="flex-shrink-0" />
                                <span className="truncate">
                                  {chapterLabel}
                                  {pageLabel && <span className="text-gray-500"> · {pageLabel}</span>}
                                  {similarityPct && <span className="text-gray-500"> · {similarityPct}</span>}
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
                  <div className="flex items-center gap-2 self-start">
                    <Bot size={16} className="text-blue-400" />
                    <div className="flex gap-1">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <span 
                          key={i}
                          className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: `${delay}s`, animationDuration: '1.4s' }}
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
            <div className="p-4 md:p-6 border-t border-white/20 bg-black/10">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  placeholder={t.placeholderInput}
                  required
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="w-11 h-11 md:w-12 md:h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors"
                >
                  <Send size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
