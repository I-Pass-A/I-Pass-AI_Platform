"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isAfaanOromo } from "@/lib/subjects";
import {
  Award, CheckCircle, XCircle, Clock,
  MessageSquare, TrendingUp, Star, ChevronDown, ChevronUp,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExamAttempt {
  id: number;
  score: number;
  submitted_at: string;
  answers: any[];
  exam: {
    id: number;
    subject: string;
    topic: string;
    difficulty: string;
    questions: any[];
  };
}

interface AssignmentSubmission {
  id: number;
  raw_score: number | null;
  teacher_score: number | null;
  teacher_feedback: string | null;
  graded: boolean;
  submitted_at: string;
  graded_at: string | null;
  answers: any[];
  assignment: {
    title: string;
    assignment_type: string;
    due_date: string;
    exam: {
      subject: string;
      topic: string;
      questions: any[];
    };
  };
}

export default function ResultsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<"practice" | "assigned">("practice");
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [fetching, setFetching] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadResults();
  }, [user]);

  const loadResults = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const [attRes, subRes] = await Promise.all([
        supabase
          .from("exam_attempts")
          .select("id, score, submitted_at, answers, exams(id, subject, topic, difficulty, questions)")
          .eq("student_id", user.id)
          .order("submitted_at", { ascending: false }),
        supabase
          .from("assignment_submissions")
          .select(`
            id, raw_score, teacher_score, teacher_feedback,
            graded, submitted_at, graded_at, answers,
            teacher_assignments(
              title, assignment_type, due_date,
              exams(subject, topic, questions)
            )
          `)
          .eq("student_id", user.id)
          .order("submitted_at", { ascending: false }),
      ]);

      setAttempts(
        (attRes.data || []).map((a: any) => ({
          ...a,
          exam: a.exams,
        }))
      );
      setSubmissions(
        (subRes.data || []).map((s: any) => ({
          ...s,
          assignment: {
            ...s.teacher_assignments,
            exam: s.teacher_assignments?.exams,
          },
        }))
      );
    } catch (e) {
      console.error("Results load error:", e);
    } finally {
      setFetching(false);
    }
  };

  if (loading || !user) return null;

  const isAO = isAfaanOromo(user);

  const scoreColor = (s: number) =>
    s >= 80 ? "var(--success)" : s >= 50 ? "var(--warning)" : "var(--danger)";

  const scoreBg = (s: number) =>
    s >= 80 ? "rgba(34,197,94,0.08)" : s >= 50 ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)";

  const typeColor = (t: string) =>
    t === "quiz" ? "var(--primary)" : t === "homework" ? "var(--secondary)" : "var(--accent)";

  const typeLabel = (t: string) =>
    isAO
      ? (t === "quiz" ? "Gaaffii" : t === "homework" ? "Hojii Mana" : "Hojii Kutaa")
      : (t === "quiz" ? "Quiz" : t === "homework" ? "Homework" : "Assignment");

  const toggle = (id: number) => setExpandedId(expandedId === id ? null : id);

  // Overall stats
  const practiceScores = attempts.map((a) => a.score);
  const practiceAvg = practiceScores.length
    ? Math.round(practiceScores.reduce((a, b) => a + b, 0) / practiceScores.length)
    : null;

  const gradedSubs = submissions.filter((s) => s.graded && s.teacher_score !== null);
  const assignedAvg = gradedSubs.length
    ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.teacher_score ?? 0), 0) / gradedSubs.length)
    : null;

  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-content" style={{ gap: "2rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.25rem" }}>
              {isAO ? "Bu'aa fi Seenaa Qormaataa" : "My Results"}
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              {isAO
                ? "Qormaata hunda fi bu'aa barumsa keessan as argachu dandeessu."
                : "All your practice exams and teacher assignment results in one place."}
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {[
            { icon: <Award size={18} style={{ color: "var(--primary)" }} />, value: attempts.length, label: isAO ? "Qormaata Fudhatame" : "Practice Exams", color: "var(--primary)" },
            { icon: <TrendingUp size={18} style={{ color: "var(--secondary)" }} />, value: practiceAvg !== null ? `${practiceAvg}%` : "—", label: isAO ? "Giddugaleessa (Practice)" : "Practice Avg", color: "var(--secondary)" },
            { icon: <CheckCircle size={18} style={{ color: "var(--accent)" }} />, value: submissions.length, label: isAO ? "Hojii Kenniname" : "Assignments Submitted", color: "var(--accent)" },
            { icon: <Star size={18} style={{ color: "var(--warning)" }} />, value: assignedAvg !== null ? `${assignedAvg}%` : "—", label: isAO ? "Giddugaleessa (Ramaddii)" : "Assignment Avg", color: "var(--warning)" },
          ].map((s, i) => (
            <div key={i} className="glass-panel" style={{ padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "9px", background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.35rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: 0 }}>
          {[
            { id: "practice" as const, label: isAO ? "Qormaata Shaakala" : "Practice Exams", count: attempts.length },
            { id: "assigned" as const, label: isAO ? "Hojii Barsiisaa" : "Teacher Assignments", count: submissions.length },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.65rem 1.1rem", fontSize: "0.88rem",
              fontWeight: tab === t.id ? 600 : 400, background: "transparent", border: "none",
              cursor: "pointer", color: tab === t.id ? "var(--primary)" : "var(--text-secondary)",
              borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: "-1px",
            }}>
              {t.label}
              <span style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.07)", padding: "0.1rem 0.4rem", borderRadius: "8px" }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* ── PRACTICE EXAMS TAB ── */}
        {tab === "practice" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {fetching ? (
              <p style={{ color: "var(--text-secondary)" }}>{isAO ? "Fidaa jira..." : "Loading..."}</p>
            ) : attempts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-secondary)" }}>
                <Award size={36} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
                <p>{isAO ? "Ammaaf qormaata hin fudhanne." : "No practice exams yet."}</p>
              </div>
            ) : attempts.map((a) => {
              const expanded = expandedId === a.id;
              return (
                <div key={a.id} className="glass-panel" style={{ overflow: "hidden" }}>
                  {/* Row */}
                  <div
                    onClick={() => toggle(a.id)}
                    style={{ padding: "1.1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ width: "46px", height: "46px", borderRadius: "10px", background: scoreBg(a.score), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: scoreColor(a.score) }}>{Math.round(a.score)}%</span>
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.15rem" }}>{a.exam?.subject ?? "—"}</p>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{a.exam?.topic} · <span style={{ textTransform: "capitalize" }}>{a.exam?.difficulty}</span></p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {new Date(a.submitted_at).toLocaleDateString()}
                      </span>
                      {expanded ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
                    </div>
                  </div>

                  {/* Expanded breakdown */}
                  {expanded && a.exam?.questions && (
                    <div style={{ borderTop: "1px solid var(--glass-border)", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {a.exam.questions.map((q: any, qi: number) => {
                        const submitted = (a.answers || []).find((ans: any) => ans.id === q.id);
                        const correct = submitted?.is_correct;
                        return (
                          <div key={q.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.6rem 0", borderBottom: qi < a.exam.questions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                            <div style={{ flexShrink: 0, marginTop: "2px" }}>
                              {correct ? <CheckCircle size={16} style={{ color: "var(--success)" }} /> : <XCircle size={16} style={{ color: "var(--danger)" }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}><strong>Q{qi + 1}.</strong> {q.question_text}</p>
                              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                {isAO ? "Deebii" : "Your answer"}: <span style={{ color: correct ? "var(--success)" : "var(--danger)" }}>{submitted?.answer ?? "—"}</span>
                                {!correct && submitted?.correct_answer && (
                                  <span style={{ color: "var(--success)", marginLeft: "0.5rem" }}>✓ {submitted.correct_answer}</span>
                                )}
                              </p>
                              {submitted?.explanation && (
                                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem", fontStyle: "italic" }}>{submitted.explanation}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── ASSIGNMENT SUBMISSIONS TAB ── */}
        {tab === "assigned" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {fetching ? (
              <p style={{ color: "var(--text-secondary)" }}>{isAO ? "Fidaa jira..." : "Loading..."}</p>
            ) : submissions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-secondary)" }}>
                <CheckCircle size={36} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
                <p>{isAO ? "Ammaaf hojii hin kennine." : "No assignment submissions yet."}</p>
              </div>
            ) : submissions.map((s) => {
              const expanded = expandedId === s.id;
              const displayScore = s.teacher_score ?? s.raw_score;
              return (
                <div key={s.id} className="glass-panel" style={{ overflow: "hidden" }}>
                  <div
                    onClick={() => toggle(s.id)}
                    style={{ padding: "1.1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      {/* Score badge */}
                      <div style={{ width: "46px", height: "46px", borderRadius: "10px", background: !s.graded ? "rgba(255,255,255,0.04)" : scoreBg(displayScore ?? 0), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {s.graded && displayScore !== null
                          ? <span style={{ fontSize: "0.9rem", fontWeight: 800, color: scoreColor(displayScore) }}>{Math.round(displayScore)}%</span>
                          : <Clock size={18} style={{ color: "var(--text-muted)" }} />}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: typeColor(s.assignment?.assignment_type ?? ""), background: `${typeColor(s.assignment?.assignment_type ?? "")}15`, padding: "0.1rem 0.4rem", borderRadius: "4px", textTransform: "capitalize" }}>
                            {typeLabel(s.assignment?.assignment_type ?? "")}
                          </span>
                          {s.graded
                            ? <span style={{ fontSize: "0.7rem", color: "var(--success)", fontWeight: 600 }}>● {isAO ? "Madaalamee jira" : "Graded"}</span>
                            : <span style={{ fontSize: "0.7rem", color: "var(--warning)", fontWeight: 600 }}>● {isAO ? "Eeggachaa jira" : "Awaiting grade"}</span>}
                        </div>
                        <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.15rem" }}>{s.assignment?.title ?? "—"}</p>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{s.assignment?.exam?.subject} · {s.assignment?.exam?.topic}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {new Date(s.submitted_at).toLocaleDateString()}
                      </span>
                      {expanded ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
                    </div>
                  </div>

                  {/* Expanded: teacher feedback + answer breakdown */}
                  {expanded && (
                    <div style={{ borderTop: "1px solid var(--glass-border)", padding: "1.25rem 1.5rem" }}>
                      {/* Teacher feedback block */}
                      {s.graded && (
                        <div style={{ marginBottom: "1.25rem", padding: "0.9rem 1rem", borderRadius: "var(--radius-sm)", background: displayScore !== null && displayScore >= 50 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${displayScore !== null && displayScore >= 50 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                            <Star size={14} style={{ color: "var(--warning)" }} />
                            <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>
                              {isAO ? "Bu'aa Barsiisaa" : "Teacher Grade"}: {displayScore !== null ? `${Math.round(displayScore)}%` : "—"}
                            </span>
                          </div>
                          {s.teacher_feedback && (
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                              <MessageSquare size={13} style={{ color: "var(--text-muted)", marginTop: "2px", flexShrink: 0 }} />
                              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic" }}>"{s.teacher_feedback}"</p>
                            </div>
                          )}
                        </div>
                      )}

                      {!s.graded && (
                        <div style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", fontSize: "0.85rem", color: "var(--warning)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Clock size={14} />
                          {isAO ? "Barsiisaan ammaaf qabxii hin kennine — turaa jira." : "Your teacher hasn't graded this yet. Check back soon."}
                        </div>
                      )}

                      {/* Answer list */}
                      {(s.assignment?.exam?.questions || []).map((q: any, qi: number) => {
                        const ans = (s.answers || []).find((a: any) => a.id === q.id);
                        return (
                          <div key={q.id} style={{ padding: "0.6rem 0", borderBottom: qi < (s.assignment?.exam?.questions?.length ?? 0) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                            <p style={{ fontSize: "0.875rem", marginBottom: "0.2rem" }}><strong>Q{qi + 1}.</strong> {q.question_text}</p>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                              {isAO ? "Deebii" : "Your answer"}: <span style={{ color: "var(--text-primary)" }}>{ans?.answer ?? "—"}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
