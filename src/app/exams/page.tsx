"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";
import { getSubjectsForGrade, getGradeBand } from "@/lib/subjects";
import {
  Award, ClipboardList, Loader2, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Clock, AlertCircle, Send,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Question {
  id: number;
  type: "multiple_choice" | "true_false" | "fill_in_blank" | "definition";
  question_text: string;
  options?: string[];
}

interface AnswerKey {
  id: number;
  correct_answer: string;
  explanation: string;
}

interface GeneratedExam {
  exam_id: number | null;
  questions: Question[];
  answer_key: AnswerKey[];
}

interface SubmitResult {
  score: number;
  results: Array<{
    id: number;
    student_answer: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
  }>;
}

interface Assignment {
  id: number;
  title: string;
  assignment_type: string;
  due_date: string;
  published: boolean;
  exam: {
    id: number;
    subject: string;
    topic: string;
    difficulty: string;
    questions: Question[];
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExamsPage() {
  const { user, session } = useAuth();

  const [tab, setTab] = useState<"practice" | "assignments">("practice");

  // ── Practice state
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [exam, setExam] = useState<GeneratedExam | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // ── Assignment state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [expandedAssign, setExpandedAssign] = useState<number | null>(null);
  const [assignAnswers, setAssignAnswers] = useState<Record<string, Record<number, string>>>({});
  const [assignSubmitting, setAssignSubmitting] = useState<number | null>(null);
  const [assignResults, setAssignResults] = useState<Record<number, { score: number }>>({});

  const isAO = user?.language === "Afaan Oromo";
  const activeGrade = user?.role === "teacher"
    ? (user.grade_taught ?? user.grade ?? "12")
    : (user?.grade ?? "12");
  const gradeBand = getGradeBand(activeGrade);
  const subjects = getSubjectsForGrade(activeGrade);

  // Load assignments when tab switches
  useEffect(() => {
    if (tab === "assignments") loadAssignments();
  }, [tab, user]);

  const loadAssignments = async () => {
    if (!user) return;
    setLoadingAssign(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch("/api/assignments", { headers });
      if (res.ok) {
        const data = await res.json();
        const mapped: Assignment[] = (data.assignments || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          assignment_type: a.assignment_type,
          due_date: a.due_date,
          published: a.published,
          exam: {
            id: a.exams?.id,
            subject: a.exams?.subject ?? "",
            topic: a.exams?.topic ?? "",
            difficulty: a.exams?.difficulty ?? "",
            questions: a.exams?.questions ?? [],
          },
        }));
        setAssignments(mapped);
      }
    } catch (e) {
      console.error("Failed to load assignments:", e);
    } finally {
      setLoadingAssign(false);
    }
  };

  // ── Generate exam ──────────────────────────────────────────────────────────

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !topic) return;
    setGenerating(true);
    setGenError("");
    setExam(null);
    setResult(null);
    setAnswers({});

    try {
      const res = await fetch("/api/exams/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic, difficulty, grade: gradeBand }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGenError(data.detail ?? (isAO ? "Dogoggora!" : "An error occurred."));
        return;
      }

      // Save exam record to supabase so we have an exam_id for submission
      const { data: savedExam, error: saveErr } = await supabase
        .from("exams")
        .insert({
          subject,
          topic,
          difficulty,
          grade: gradeBand,
          language: user?.language ?? "English",
          questions: data.questions,
          answer_key: data.answer_key,
        })
        .select("id")
        .single();

      setExam({
        exam_id: savedExam?.id ?? null,
        questions: data.questions ?? [],
        answer_key: data.answer_key ?? [],
      });
    } catch {
      setGenError(isAO ? "Tajaajila AI waliin walqunnamuu hin dandeenye." : "Could not connect to AI service.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Submit practice exam ───────────────────────────────────────────────────

  const handleSubmitPractice = async () => {
    if (!exam) return;
    setSubmitting(true);
    try {
      const answersArr = (exam.questions || []).map((q) => ({
        id: q.id,
        answer: answers[q.id] ?? "",
      }));

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch("/api/exams/submit", {
        method: "POST",
        headers,
        body: JSON.stringify({ exam_id: exam.exam_id ?? 0, answers: answersArr }),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
    } catch {
      // silently fail — show nothing
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit assignment ──────────────────────────────────────────────────────

  const handleSubmitAssignment = async (assignId: number, examId: number, questions: Question[]) => {
    setAssignSubmitting(assignId);
    try {
      const answersArr = questions.map((q) => ({
        id: q.id,
        answer: (assignAnswers[assignId] ?? {})[q.id] ?? "",
      }));

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch("/api/assignments/submit", {
        method: "POST",
        headers,
        body: JSON.stringify({ assignment_id: assignId, exam_id: examId, answers: answersArr }),
      });
      const data = await res.json();
      if (res.ok) {
        setAssignResults((prev) => ({ ...prev, [assignId]: { score: data.raw_score ?? 0 } }));
      }
    } catch {
      // silently fail
    } finally {
      setAssignSubmitting(null);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const scoreColor = (s: number) =>
    s >= 80 ? "var(--success)" : s >= 50 ? "var(--warning)" : "var(--danger)";

  const typeColor = (t: string) =>
    t === "quiz" ? "var(--primary)" : t === "homework" ? "var(--secondary)" : "var(--accent)";

  const typeLabel = (t: string) =>
    isAO
      ? t === "quiz" ? "Gaaffii" : t === "homework" ? "Hojii Mana" : "Hojii Kutaa"
      : t === "quiz" ? "Quiz" : t === "homework" ? "Homework" : "Assignment";

  const daysLeft = (due: string) => {
    const diff = new Date(due).getTime() - Date.now();
    const d = Math.ceil(diff / 86400000);
    if (d < 0) return isAO ? "Yeroon darbee jira" : "Overdue";
    if (d === 0) return isAO ? "Har'a" : "Due today";
    if (d === 1) return isAO ? "Boru" : "Due tomorrow";
    return isAO ? `Guyyaa ${d} booda` : `${d} days left`;
  };

  const practiceAnswered = exam ? Object.keys(answers).length : 0;
  const practiceTotal = exam?.questions?.length ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthGuard>
      <div className="app-container">
        <Sidebar />

        <main className="main-content" style={{ gap: "2rem" }}>

          {/* Header */}
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.25rem" }}>
              {isAO ? "Qophii Qormaataa" : "Exam Centre"}
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              {isAO
                ? "Qormaata AI-n Uumame fi Ramaddii Barsiisaa"
                : "AI-generated practice exams and teacher assignments"}
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.35rem", borderBottom: "1px solid var(--glass-border)" }}>
            {[
              { id: "practice" as const, label: isAO ? "Qormaata Shaakala" : "Practice Exam", icon: <Award size={15} /> },
              { id: "assignments" as const, label: isAO ? "Ramaddii Barsiisaa" : "Assignments", icon: <ClipboardList size={15} /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.65rem 1.1rem", fontSize: "0.88rem",
                  fontWeight: tab === t.id ? 600 : 400,
                  background: "transparent", border: "none", cursor: "pointer",
                  color: tab === t.id ? "var(--primary)" : "var(--text-secondary)",
                  borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── PRACTICE TAB ── */}
          {tab === "practice" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

              {/* Generation form */}
              {!exam && (
                <div className="glass-panel" style={{ padding: "1.75rem" }}>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Award size={17} style={{ color: "var(--primary)" }} />
                    {isAO ? "Qormaata Haaraa Uumi" : "Generate New Practice Exam"}
                  </h2>

                  <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      {/* Subject */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">{isAO ? "Gosa Barnootaa" : "Subject"}</label>
                        <select
                          className="form-select"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          required
                        >
                          <option value="">{isAO ? "Filadhu..." : "Select..."}</option>
                          {subjects.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Difficulty */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">{isAO ? "Sadarkaa Rakkina" : "Difficulty"}</label>
                        <select
                          className="form-select"
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                        >
                          <option value="easy">{isAO ? "Salphaa" : "Easy"}</option>
                          <option value="medium">{isAO ? "Giddu-galeessa" : "Medium"}</option>
                          <option value="hard">{isAO ? "Rakkisaa" : "Hard"}</option>
                        </select>
                      </div>
                    </div>

                    {/* Topic */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">{isAO ? "Mata-duree" : "Topic"}</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder={isAO ? "fkn: Lakkoofsa Guutuu" : "e.g. Quadratic Equations"}
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        required
                      />
                    </div>

                    {genError && (
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: "0.875rem" }}>
                        <AlertCircle size={15} /> {genError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={generating}
                      style={{ alignSelf: "flex-start", minWidth: "160px" }}
                    >
                      {generating
                        ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> {isAO ? "Uumaa jira..." : "Generating..."}</>
                        : <><Award size={15} /> {isAO ? "Qormaata Uumi" : "Generate Exam"}</>
                      }
                    </button>
                  </form>
                </div>
              )}

              {/* Exam questions */}
              {exam && !result && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Progress bar */}
                  <div className="glass-panel" style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {isAO ? "Deebii kenname" : "Answered"}: {practiceAnswered}/{practiceTotal}
                    </span>
                    <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.07)" }}>
                      <div style={{ height: "100%", borderRadius: "3px", background: "var(--primary)", width: `${practiceTotal > 0 ? (practiceAnswered / practiceTotal) * 100 : 0}%`, transition: "width 0.3s" }} />
                    </div>
                    <button
                      className="btn btn-outline"
                      onClick={() => { setExam(null); setAnswers({}); setGenError(""); }}
                      style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
                    >
                      {isAO ? "Haaromsi" : "Reset"}
                    </button>
                  </div>

                  {exam.questions.map((q, qi) => (
                    <div key={q.id} className="glass-panel" style={{ padding: "1.25rem 1.5rem" }}>
                      <p style={{ fontWeight: 600, marginBottom: "0.9rem", lineHeight: 1.5 }}>
                        <span style={{ color: "var(--primary)", marginRight: "0.5rem" }}>Q{qi + 1}.</span>
                        {q.question_text}
                      </p>

                      {/* Multiple choice / True-False */}
                      {(q.type === "multiple_choice" || q.type === "true_false") && q.options && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {q.options.map((opt) => {
                            const selected = answers[q.id] === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                style={{
                                  textAlign: "left", padding: "0.65rem 1rem",
                                  borderRadius: "var(--radius-sm)", fontSize: "0.875rem",
                                  background: selected ? "rgba(14,165,233,0.12)" : "rgba(255,255,255,0.03)",
                                  border: selected ? "1px solid rgba(14,165,233,0.4)" : "1px solid var(--glass-border)",
                                  color: selected ? "var(--primary)" : "var(--text-primary)",
                                  cursor: "pointer", transition: "all 0.15s",
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Fill-in-blank / Definition */}
                      {(q.type === "fill_in_blank" || q.type === "definition") && (
                        <input
                          className="form-input"
                          type="text"
                          placeholder={isAO ? "Deebii barreessi..." : "Type your answer..."}
                          value={answers[q.id] ?? ""}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}

                  <button
                    className="btn btn-primary"
                    onClick={handleSubmitPractice}
                    disabled={submitting || practiceAnswered === 0}
                    style={{ alignSelf: "flex-end" }}
                  >
                    {submitting
                      ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> {isAO ? "Erga..." : "Submitting..."}</>
                      : <><Send size={15} /> {isAO ? "Deebii Ergi" : "Submit Answers"}</>
                    }
                  </button>
                </div>
              )}

              {/* Results */}
              {result && exam && (
                <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Score summary */}
                  <div className="glass-panel" style={{ padding: "1.75rem", textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", fontWeight: 800, color: scoreColor(result.score), lineHeight: 1 }}>
                      {Math.round(result.score)}%
                    </div>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", fontSize: "0.95rem" }}>
                      {result.score >= 80
                        ? (isAO ? "Baay'ee Gaarii! 🎉" : "Excellent work! 🎉")
                        : result.score >= 50
                          ? (isAO ? "Cimsadhu! 💪" : "Good effort! Keep going 💪")
                          : (isAO ? "Itti fufi hojjedhu 📚" : "More practice needed 📚")}
                    </p>
                    <button
                      className="btn btn-outline"
                      onClick={() => { setExam(null); setResult(null); setAnswers({}); }}
                      style={{ marginTop: "1rem" }}
                    >
                      {isAO ? "Qormaata Haaraa Fudhadi" : "Take Another Exam"}
                    </button>
                  </div>

                  {/* Per-question breakdown */}
                  {exam.questions.map((q, qi) => {
                    const r = result.results.find((x) => x.id === q.id);
                    if (!r) return null;
                    return (
                      <div key={q.id} className="glass-panel" style={{ padding: "1.1rem 1.5rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                        <div style={{ flexShrink: 0, marginTop: "2px" }}>
                          {r.is_correct
                            ? <CheckCircle size={17} style={{ color: "var(--success)" }} />
                            : <XCircle size={17} style={{ color: "var(--danger)" }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "0.9rem", marginBottom: "0.3rem" }}>
                            <strong>Q{qi + 1}.</strong> {q.question_text}
                          </p>
                          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                            {isAO ? "Deebii kee" : "Your answer"}:{" "}
                            <span style={{ color: r.is_correct ? "var(--success)" : "var(--danger)" }}>
                              {r.student_answer || "—"}
                            </span>
                            {!r.is_correct && (
                              <span style={{ color: "var(--success)", marginLeft: "0.75rem" }}>
                                ✓ {r.correct_answer}
                              </span>
                            )}
                          </p>
                          {r.explanation && (
                            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem", fontStyle: "italic" }}>
                              {r.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ASSIGNMENTS TAB ── */}
          {tab === "assignments" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {loadingAssign ? (
                <p style={{ color: "var(--text-secondary)" }}>{isAO ? "Fidaa jira..." : "Loading..."}</p>
              ) : assignments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-secondary)" }}>
                  <ClipboardList size={36} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
                  <p>{isAO ? "Ammaaf ramaddii hin jiru." : "No assignments available yet."}</p>
                </div>
              ) : assignments.map((a) => {
                const expanded = expandedAssign === a.id;
                const submitted = assignResults[a.id] !== undefined;
                const questions = a.exam?.questions ?? [];

                return (
                  <div key={a.id} className="glass-panel" style={{ overflow: "hidden" }}>
                    {/* Row */}
                    <div
                      onClick={() => setExpandedAssign(expanded ? null : a.id)}
                      style={{ padding: "1.1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: `${typeColor(a.assignment_type)}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <ClipboardList size={18} style={{ color: typeColor(a.assignment_type) }} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: typeColor(a.assignment_type), background: `${typeColor(a.assignment_type)}15`, padding: "0.1rem 0.4rem", borderRadius: "4px", textTransform: "capitalize" }}>
                              {typeLabel(a.assignment_type)}
                            </span>
                            {submitted && (
                              <span style={{ fontSize: "0.7rem", color: "var(--success)", fontWeight: 600 }}>
                                ● {isAO ? "Galmeeffame" : "Submitted"} — {Math.round(assignResults[a.id].score)}%
                              </span>
                            )}
                          </div>
                          <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.1rem" }}>{a.title}</p>
                          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            {a.exam?.subject} · {a.exam?.topic}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "var(--warning)" }}>
                          <Clock size={12} /> {daysLeft(a.due_date)}
                        </div>
                        {expanded ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
                      </div>
                    </div>

                    {/* Expanded questions */}
                    {expanded && (
                      <div style={{ borderTop: "1px solid var(--glass-border)", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {questions.length === 0 ? (
                          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                            {isAO ? "Gaaffiin hin jiru." : "No questions available."}
                          </p>
                        ) : (
                          <>
                            {questions.map((q, qi) => {
                              const curAns = (assignAnswers[a.id] ?? {})[q.id] ?? "";
                              return (
                                <div key={q.id} style={{ borderBottom: qi < questions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", paddingBottom: "0.9rem" }}>
                                  <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.6rem", lineHeight: 1.5 }}>
                                    <span style={{ color: "var(--primary)", marginRight: "0.4rem" }}>Q{qi + 1}.</span>
                                    {q.question_text}
                                  </p>

                                  {(q.type === "multiple_choice" || q.type === "true_false") && q.options && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                      {q.options.map((opt) => {
                                        const sel = curAns === opt;
                                        return (
                                          <button
                                            key={opt}
                                            disabled={submitted}
                                            onClick={() => setAssignAnswers((prev) => ({
                                              ...prev,
                                              [a.id]: { ...(prev[a.id] ?? {}), [q.id]: opt },
                                            }))}
                                            style={{
                                              textAlign: "left", padding: "0.55rem 0.9rem",
                                              borderRadius: "var(--radius-sm)", fontSize: "0.85rem",
                                              background: sel ? "rgba(14,165,233,0.12)" : "rgba(255,255,255,0.03)",
                                              border: sel ? "1px solid rgba(14,165,233,0.4)" : "1px solid var(--glass-border)",
                                              color: sel ? "var(--primary)" : "var(--text-primary)",
                                              cursor: submitted ? "default" : "pointer",
                                            }}
                                          >
                                            {opt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {(q.type === "fill_in_blank" || q.type === "definition") && (
                                    <input
                                      className="form-input"
                                      type="text"
                                      placeholder={isAO ? "Deebii barreessi..." : "Type your answer..."}
                                      value={curAns}
                                      disabled={submitted}
                                      onChange={(e) => setAssignAnswers((prev) => ({
                                        ...prev,
                                        [a.id]: { ...(prev[a.id] ?? {}), [q.id]: e.target.value },
                                      }))}
                                    />
                                  )}
                                </div>
                              );
                            })}

                            {!submitted && (
                              <button
                                className="btn btn-primary"
                                onClick={() => handleSubmitAssignment(a.id, a.exam.id, questions)}
                                disabled={assignSubmitting === a.id}
                                style={{ alignSelf: "flex-end" }}
                              >
                                {assignSubmitting === a.id
                                  ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> {isAO ? "Erga..." : "Submitting..."}</>
                                  : <><Send size={14} /> {isAO ? "Galchi" : "Submit"}</>
                                }
                              </button>
                            )}

                            {submitted && (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--success)" }}>
                                <CheckCircle size={15} />
                                {isAO
                                  ? `Galmeeffame! Qabxii: ${Math.round(assignResults[a.id].score)}%`
                                  : `Submitted! Auto-score: ${Math.round(assignResults[a.id].score)}%`}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </main>
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AuthGuard>
  );
}
