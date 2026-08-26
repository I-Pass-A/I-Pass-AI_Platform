"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Award, FileText, HelpCircle, CheckCircle, XCircle,
  Download, Play, Plus, ListFilter, Send, Clock,
  ClipboardList, BookOpen, Users, Star, AlertCircle,
} from "lucide-react";
import { getSubjectsForGrade, isAfaanOromo } from "@/lib/subjects";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Question {
  id: number;
  type: "multiple_choice" | "true_false" | "blank_space" | "definition";
  question_text: string;
  options?: string[];
}

interface SavedExam {
  id: number;
  subject: string;
  topic: string;
  difficulty: string;
  grade: string;
  question_count: number;
  created_at: string;
}

interface AttemptResult {
  score: number;
  results: { id: number; student_answer: string; correct_answer: string; is_correct: boolean; explanation: string }[];
}

interface Assignment {
  id: number;
  title: string;
  assignment_type: "quiz" | "homework" | "assignment";
  target_grade: string;
  due_date: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  exams: { id: number; subject: string; topic: string; difficulty: string; questions: Question[] };
}

interface Submission {
  id: number;
  assignment_id: number;
  student_id: string;
  answers: any[];
  raw_score: number | null;
  teacher_score: number | null;
  teacher_feedback: string | null;
  graded: boolean;
  submitted_at: string;
  student_name?: string;
}

// ─── Tab type ────────────────────────────────────────────────────────────────
type Tab = "my-exams" | "generator" | "from-teacher" | "my-assignments";

// ─── Shared exam-taking component ────────────────────────────────────────────

function ExamTaker({
  exam, isAO, session, onClose, onSubmitted, assignmentId,
}: {
  exam: { id: number; subject: string; topic: string; questions: Question[] };
  isAO: boolean;
  session: any;
  onClose: () => void;
  onSubmitted?: (result: AttemptResult) => void;
  assignmentId?: number; // if set, submits to assignment endpoint
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [assessment, setAssessment] = useState<AttemptResult | null>(null);
  const [assignmentResult, setAssignmentResult] = useState<{ graded: boolean; raw_score: number | null; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const formattedAnswers = Object.keys(answers).map((qId) => ({ id: parseInt(qId), answer: answers[parseInt(qId)] }));
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

    try {
      if (assignmentId) {
        const res = await fetch("/api/assignments/submit", {
          method: "POST", headers,
          body: JSON.stringify({ assignment_id: assignmentId, answers: formattedAnswers }),
        });
        const data = await res.json();
        if (res.ok) {
          setAssignmentResult(data);
        } else {
          console.error("Assignment submit failed:", data);
          // Show error to user
          setAssignmentResult({
            graded: false,
            raw_score: null,
            message: data.detail || "Submission failed. Please try again.",
          });
        }
      } else {
        const res = await fetch("/api/exams/submit", {
          method: "POST", headers,
          body: JSON.stringify({ exam_id: exam.id, answers: formattedAnswers }),
        });
        const data = await res.json();
        if (res.ok) { setAssessment(data); onSubmitted?.(data); }
        else { console.error("Exam submit failed:", data); }
      }
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  const allAnswered = exam.questions.every((q) => {
    const ans = answers[q.id];
    return ans !== undefined && ans.toString().trim() !== "";
  });

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "1rem", marginBottom: "2rem" }}>
        <div>
          <span style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase" }}>{exam.subject}</span>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>{exam.topic}</h2>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => window.print()} className="btn btn-outline"><Download size={15} /> {isAO ? "Printi" : "Print"}</button>
          <button onClick={onClose} className="btn btn-outline" style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.2)" }}>{isAO ? "Cufi" : "Close"}</button>
        </div>
      </div>

      {/* Score summary for self-practice */}
      {assessment && (
        <div style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)", padding: "1.5rem", borderRadius: "var(--radius-md)", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <Award size={36} style={{ color: "var(--secondary)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>{isAO ? "Qormaanni Xumurameera!" : "Exam Completed!"}</h3>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, color: assessment.score >= 80 ? "var(--success)" : assessment.score >= 50 ? "var(--warning)" : "var(--danger)", marginTop: "0.25rem" }}>
                {assessment.score.toFixed(1)}%
              </p>
            </div>
            <div style={{ display: "flex", gap: "1.5rem", flexShrink: 0 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--success)" }}>
                  {assessment.results.filter(r => r.is_correct).length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{isAO ? "Sirrii" : "Correct"}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)" }}>
                  {assessment.results.filter(r => !r.is_correct).length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{isAO ? "Dogoggora" : "Wrong"}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-secondary)" }}>
                  {assessment.results.length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{isAO ? "Waliigala" : "Total"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment submission result */}
      {assignmentResult && (
        <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", padding: "1.5rem", borderRadius: "var(--radius-md)", marginBottom: "2rem", textAlign: "center" }}>
          <CheckCircle size={36} style={{ color: "var(--accent)", marginBottom: "0.5rem" }} />
          <h3 style={{ fontSize: "1.3rem", fontWeight: 700 }}>{isAO ? "Ergameera!" : "Submitted!"}</h3>
          <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>{assignmentResult.message}</p>
          {assignmentResult.raw_score !== null && (
            <p style={{ marginTop: "0.5rem" }}>{isAO ? "Qabxii:" : "Auto-score:"} <strong style={{ color: "var(--accent)" }}>{assignmentResult.raw_score}%</strong></p>
          )}
        </div>
      )}

      {/* Questions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {exam.questions.map((q, idx) => {
          const qResult = assessment?.results.find((r) => r.id === q.id);
          const isChoice = q.type === "multiple_choice" || q.type === "true_false";
          const options = q.options || (q.type === "true_false" ? (isAO ? ["Dhugaa", "Soba"] : ["True", "False"]) : []);
          const disabled = !!assessment || !!assignmentResult;

          return (
            <div key={q.id} style={{ paddingBottom: "1.5rem", borderBottom: idx === exam.questions.length - 1 ? "none" : "1px solid var(--glass-border)" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <span style={{ fontWeight: "bold", color: "var(--primary)" }}>Q{idx + 1}.</span>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 600, flex: 1 }}>{q.question_text}</h4>
                {assessment && qResult && (
                  qResult.is_correct
                    ? <span style={{ color: "var(--success)", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}><CheckCircle size={15} /> {isAO ? "Sirrii" : "Correct"}</span>
                    : <span style={{ color: "var(--danger)", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}><XCircle size={15} /> {isAO ? "Sirrii miti" : "Incorrect"}</span>
                )}
              </div>
              <div style={{ marginTop: "1rem" }}>
                {isChoice && options.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {options.map((opt, oIdx) => {
                      const isChecked = answers[q.id] === opt;
                      const isCorrectOpt = qResult?.correct_answer === opt;
                      const isWrongSelected = isChecked && qResult && !qResult.is_correct;

                      let bg = "rgba(0,0,0,0.1)";
                      let border = "var(--glass-border)";
                      let labelColor = "var(--text-primary)";

                      if (qResult) {
                        if (isCorrectOpt) { bg = "rgba(34,197,94,0.1)"; border = "rgba(34,197,94,0.5)"; labelColor = "var(--success)"; }
                        else if (isWrongSelected) { bg = "rgba(239,68,68,0.1)"; border = "rgba(239,68,68,0.5)"; labelColor = "var(--danger)"; }
                      } else if (isChecked) {
                        bg = "rgba(14,165,233,0.05)"; border = "var(--primary)";
                      }

                      return (
                        <label key={oIdx} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderRadius: "8px", border: `1px solid ${border}`, background: bg, cursor: disabled ? "default" : "pointer", color: labelColor }}>
                          <input type="radio" name={`q-${q.id}`} value={opt} checked={isChecked} onChange={() => !disabled && setAnswers((p) => ({ ...p, [q.id]: opt }))} disabled={disabled} />
                          <span>{opt}</span>
                          {qResult && isCorrectOpt && <CheckCircle size={14} style={{ marginLeft: "auto", color: "var(--success)", flexShrink: 0 }} />}
                          {qResult && isWrongSelected && <XCircle size={14} style={{ marginLeft: "auto", color: "var(--danger)", flexShrink: 0 }} />}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <input type="text" className="form-input" placeholder={q.type === "definition" ? (isAO ? "Hiika barreessi..." : "Write definition...") : (isAO ? "Deebii gabaabaa..." : "Short answer...")} value={answers[q.id] || ""} onChange={(e) => !disabled && setAnswers((p) => ({ ...p, [q.id]: e.target.value }))} disabled={disabled} style={{ width: "100%", borderColor: qResult ? (qResult.is_correct ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)") : undefined }} />
                )}
              </div>

              {/* Result feedback box */}
              {qResult && (
                <div style={{ marginTop: "1rem", borderRadius: "10px", overflow: "hidden", border: `1px solid ${qResult.is_correct ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}` }}>
                  {/* Header */}
                  <div style={{ padding: "0.6rem 1rem", background: qResult.is_correct ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {qResult.is_correct
                      ? <><CheckCircle size={15} style={{ color: "var(--success)" }} /><span style={{ color: "var(--success)", fontWeight: 700, fontSize: "0.85rem" }}>{isAO ? "Sirrii!" : "Correct!"}</span></>
                      : <><XCircle size={15} style={{ color: "var(--danger)" }} /><span style={{ color: "var(--danger)", fontWeight: 700, fontSize: "0.85rem" }}>{isAO ? "Sirrii miti" : "Incorrect"}</span></>}
                  </div>
                  {/* Body */}
                  <div style={{ padding: "0.875rem 1rem", background: "rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
                    {!qResult.is_correct && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{isAO ? "Deebii Sirrii:" : "Correct answer:"}</span>
                        <span style={{ color: "var(--success)", fontWeight: 600 }}>{qResult.correct_answer}</span>
                      </div>
                    )}
                    {!qResult.is_correct && qResult.student_answer && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{isAO ? "Deebii Kee:" : "Your answer:"}</span>
                        <span style={{ color: "var(--danger)" }}>{qResult.student_answer}</span>
                      </div>
                    )}
                    {qResult.explanation && (
                      <div style={{ display: "flex", gap: "0.5rem", paddingTop: qResult.is_correct ? 0 : "0.25rem", borderTop: qResult.is_correct ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>💡 {isAO ? "Ibsa:" : "Why:"}</span>
                        <span style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{qResult.explanation}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!assessment && !assignmentResult && (
        <div style={{ marginTop: "2rem", borderTop: "1px solid var(--glass-border)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: allAnswered ? "var(--success)" : "var(--text-secondary)" }}>
            {allAnswered
              ? (isAO ? "✓ Gaaffilee hunda deebiste" : "✓ All questions answered")
              : (isAO
                  ? `Gaaffilee ${exam.questions.filter(q => !answers[q.id]?.toString().trim()).length} hin deebifne`
                  : `${exam.questions.filter(q => !answers[q.id]?.toString().trim()).length} question${exam.questions.filter(q => !answers[q.id]?.toString().trim()).length !== 1 ? "s" : ""} remaining`)}
          </span>
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={submitting || !allAnswered}
            style={{ minWidth: "160px", opacity: allAnswered ? 1 : 0.5 }}
          >
            {submitting
              ? <><span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> {isAO ? "Ergamaa..." : "Submitting..."}</>
              : <><Send size={15} /> {isAO ? "Qormaata Ergi" : "Submit Answers"}</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ExamsPage() {
  const { user, loading, session } = useAuth();
  const router = useRouter();

  const activeGrade = user?.role === "teacher"
    ? (user?.grade_taught ?? user?.grade)
    : user?.grade ?? "12";

  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const isAdminOrDirector = user?.role === "admin" || user?.role === "director";

  // Tab state
  const [tab, setTab] = useState<Tab>("my-exams");

  // AI Generator state
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(10);
  const [examTypes, setExamTypes] = useState<string[]>(["multiple_choice"]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatedExam, setGeneratedExam] = useState<{ id: number; subject: string; topic: string; questions: Question[] } | null>(null);

  // My Exams tab
  const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
  const [fetchingSaved, setFetchingSaved] = useState(false);
  const [takingExam, setTakingExam] = useState<{ id: number; subject: string; topic: string; questions: Question[] } | null>(null);

  // Assignments (student view)
  const [studentAssignments, setStudentAssignments] = useState<Assignment[]>([]);
  const [fetchingStudentAssignments, setFetchingStudentAssignments] = useState(false);
  const [takingAssignment, setTakingAssignment] = useState<{ assignment: Assignment } | null>(null);
  // Map of assignment_id → student's own submission (for feedback display)
  const [mySubmissions, setMySubmissions] = useState<Record<number, {
    graded: boolean; raw_score: number | null; teacher_score: number | null;
    teacher_feedback: string | null; submitted_at: string;
  }>>({});

  // Teacher Assignments tab
  const [teacherAssignments, setTeacherAssignments] = useState<Assignment[]>([]);
  const [fetchingTeacherAssignments, setFetchingTeacherAssignments] = useState(false);
  // Publish modal state
  const [publishingFor, setPublishingFor] = useState<{ exam_id: number; subject: string; topic: string } | null>(null);
  const [pubTitle, setPubTitle] = useState("");
  const [pubType, setPubType] = useState<"quiz" | "homework" | "assignment">("homework");
  const [pubGrade, setPubGrade] = useState(activeGrade ?? "12");
  const [pubDueDate, setPubDueDate] = useState("");
  const [pubDueTime, setPubDueTime] = useState("23:59");
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState("");
  const [publishError, setPublishError] = useState("");

  // Grading state
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [fetchingSubmissions, setFetchingSubmissions] = useState(false);
  const [gradingSubId, setGradingSubId] = useState<number | null>(null);
  const [gradeInput, setGradeInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => { if (!loading && !user) router.push("/"); }, [user, loading, router]);
  useEffect(() => { if (user) { fetchSavedExams(); fetchAssignments(); } }, [user?.id]);

  if (!user) return null;

  const subjects = getSubjectsForGrade(activeGrade);
  const isAO = isAfaanOromo(user);

  const authHeaders = (extra?: Record<string, string>) => ({
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...extra,
  });

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchSavedExams = async () => {
    if (!user) return;
    setFetchingSaved(true);
    try {
      let query = supabase
        .from("exams")
        .select("id, subject, topic, difficulty, grade, questions, created_at, created_by")
        .order("created_at", { ascending: false });

      if (isAdminOrDirector) {
        // Admin/Director see all exams across all grades
      } else if (isTeacher) {
        // Teachers see only their own exams for their grade
        query = query.eq("grade", activeGrade ?? "12").eq("created_by", user.id);
      } else {
        // Students see all exams for their grade only
        query = query.eq("grade", activeGrade ?? "12");
      }

      const { data } = await query;
      setSavedExams((data || []).map((ex: any) => ({
        ...ex,
        question_count: Array.isArray(ex.questions) ? ex.questions.length : 0
      })));
    } catch (e) { console.error(e); } finally { setFetchingSaved(false); }
  };

  const fetchAssignments = async () => {
    if (!user) return;
    if (isTeacher) {
      setFetchingTeacherAssignments(true);
      try {
        const res = await fetch("/api/assignments", { headers: authHeaders() });
        if (res.ok) { const d = await res.json(); setTeacherAssignments(d.assignments || []); }
      } catch (e) { console.error(e); } finally { setFetchingTeacherAssignments(false); }
    } else {
      setFetchingStudentAssignments(true);
      try {
        const res = await fetch("/api/assignments", { headers: authHeaders() });
        if (res.ok) {
          const d = await res.json();
          const assignments: Assignment[] = d.assignments || [];
          setStudentAssignments(assignments);

          // Load this student's own submissions for all these assignments
          if (assignments.length > 0) {
            const ids = assignments.map((a) => a.id);
            const { data: subs } = await supabase
              .from("assignment_submissions")
              .select("assignment_id, graded, raw_score, teacher_score, teacher_feedback, submitted_at")
              .eq("student_id", user.id)
              .in("assignment_id", ids);

            const subMap: Record<number, any> = {};
            for (const s of subs || []) subMap[s.assignment_id] = s;
            setMySubmissions(subMap);
          }
        }
      } catch (e) { console.error(e); } finally { setFetchingStudentAssignments(false); }
    }
  };

  const fetchSubmissions = async (assignment: Assignment) => {
    setGradingAssignment(assignment);
    setFetchingSubmissions(true);
    try {
      const { data } = await supabase
        .from("assignment_submissions")
        .select(`
          id, student_id, answers, raw_score, teacher_score,
          teacher_feedback, graded, submitted_at,
          profiles ( name )
        `)
        .eq("assignment_id", assignment.id)
        .order("submitted_at", { ascending: true });

      const enriched: Submission[] = (data || []).map((sub: any) => ({
        ...sub,
        student_name: sub.profiles?.name ?? sub.student_id.slice(0, 8),
      }));
      setSubmissions(enriched);
    } catch (e) { console.error(e); } finally { setFetchingSubmissions(false); }
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !topic || generating || examTypes.length === 0) return;
    setGenerating(true); setGeneratedExam(null); setGenerateError("");
    try {
      const res = await fetch("/api/exams/generate", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ subject, topic, difficulty, grade: activeGrade ?? "12", question_types: examTypes, question_count: questionCount }),
      });
      const data = await res.json();
      if (res.ok) { setGeneratedExam(data); fetchSavedExams(); }
      else { setGenerateError(data.detail || (isAO ? "Qormaata uumuun hin danda'amne." : "Failed to generate exam.")); }
    } catch (e) { console.error(e); setGenerateError(isAO ? "Dhaabbatni hin argamne." : "Network error. Please try again."); } finally { setGenerating(false); }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishingFor || publishing) return;

    // Validate due date is in the future
    const dueDateTime = new Date(`${pubDueDate}T${pubDueTime}:00`);
    if (dueDateTime <= new Date()) {
      setPublishError(isAO ? "Guyyaan xumuraa fuulduraa ta'uu qaba." : "Due date must be in the future.");
      return;
    }

    setPublishing(true);
    setPublishError("");
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          exam_id: publishingFor.exam_id, title: pubTitle,
          assignment_type: pubType, target_grade: pubGrade,
          due_date: dueDateTime.toISOString(), publish_now: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPublishSuccess(isAO ? "Qormaanni barattoota irratti maxxanfameera!" : "Assignment published to students!");
        setPublishingFor(null); setPubTitle(""); setPubDueDate(""); setPubDueTime("23:59"); setPublishError("");
        fetchAssignments();
        setTimeout(() => setPublishSuccess(""), 4000);
      } else {
        setPublishError(data.detail || (isAO ? "Maxxansuun hin danda'amne." : "Failed to publish. Please try again."));
      }
    } catch (e) {
      setPublishError(isAO ? "Dhaabbatni hin argamne." : "Network error. Please try again.");
    } finally { setPublishing(false); }
  };

  const handleSaveGrade = async (subId: number) => {
    const score = parseFloat(gradeInput);
    if (isNaN(score) || score < 0 || score > 100 || savingGrade) return;
    setSavingGrade(true);
    try {
      const res = await fetch("/api/assignments/grade", {
        method: "PATCH", headers: authHeaders(),
        body: JSON.stringify({ submission_id: subId, teacher_score: score, teacher_feedback: feedbackInput }),
      });
      if (res.ok) {
        setSubmissions((prev) => prev.map((s) => s.id === subId ? { ...s, teacher_score: score, teacher_feedback: feedbackInput, graded: true } : s));
        setGradingSubId(null); setGradeInput(""); setFeedbackInput("");
      }
    } catch (e) { console.error(e); } finally { setSavingGrade(false); }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const typeColor = (t: string) => t === "quiz" ? "var(--primary)" : t === "homework" ? "var(--secondary)" : "var(--accent)";
  const typeLabel = (t: string) => isAO ? (t === "quiz" ? "Gaaffii" : t === "homework" ? "Hojii Mana" : "Hojii") : t.charAt(0).toUpperCase() + t.slice(1);
  const isPastDue = (d: string) => new Date(d) < new Date();
  const toggleType = (type: string) => setExamTypes((p) => p.includes(type) ? p.filter((x) => x !== type) : [...p, type]);

  // ── Tab nav items ──────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "my-exams",  label: isAO ? "Qormaata Koo"   : "My Exams",       icon: <FileText size={15} /> },
    { id: "generator", label: isAO ? "AI Uumi"         : "AI Generator",   icon: <Plus size={15} /> },
    ...(isTeacher
      ? [{ id: "my-assignments" as Tab, label: isAO ? "Ramaddii Koo" : "My Assignments", icon: <ClipboardList size={15} /> }]
      : [{ id: "from-teacher"   as Tab, label: isAO ? "Barsiisaa Irraa" : "From Teacher", icon: <BookOpen size={15} /> }]
    ),
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  // If taking an exam from saved list or from assignment, show ExamTaker full-screen
  if (takingExam) {
    return (
      <AuthGuard>
        <div className="app-container"><Sidebar />
          <main className="main-content" style={{ display: "flex", flexDirection: "column" }}>
            <ExamTaker exam={takingExam} isAO={isAO} session={session} onClose={() => setTakingExam(null)} />
          </main>
        </div>
      </AuthGuard>
    );
  }

  if (takingAssignment) {
    const asgn = takingAssignment.assignment;
    return (
      <AuthGuard>
        <div className="app-container"><Sidebar />
          <main className="main-content" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {typeLabel(asgn.assignment_type)} — {isAO ? "Xumura" : "Due"}: {new Date(asgn.due_date).toLocaleDateString()}
              </span>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>{asgn.title}</h2>
            </div>
            <ExamTaker exam={asgn.exams} isAO={isAO} session={session} onClose={() => setTakingAssignment(null)} assignmentId={asgn.id} />
          </main>
        </div>
      </AuthGuard>
    );
  }

  // Full grading view
  if (gradingAssignment) {
    return (
      <AuthGuard>
        <div className="app-container"><Sidebar />
          <main className="main-content" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>{isAO ? "Deebii Barataa Madaali" : "Grade Submissions"}</h1>
              <p style={{ color: "var(--text-secondary)" }}>{gradingAssignment.title}</p>
            </div>
            <button onClick={() => setGradingAssignment(null)} className="btn btn-outline">{isAO ? "Duubatti" : "Back"}</button>
          </div>

          {fetchingSubmissions ? (
            <p style={{ color: "var(--text-secondary)" }}>{isAO ? "Fidaa jira..." : "Loading submissions..."}</p>
          ) : submissions.length === 0 ? (
            <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <Users size={36} style={{ marginBottom: "0.75rem", color: "var(--text-muted)" }} />
              <p>{isAO ? "Barattoonni ammaatti deebii hin ergin." : "No submissions yet."}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {submissions.map((sub) => (
                <div key={sub.id} className="glass-panel" style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <div>
                      <strong>{sub.student_name}</strong>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{isAO ? "Ergame" : "Submitted"}: {new Date(sub.submitted_at).toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {sub.graded ? (
                        <span style={{ color: "var(--success)", fontWeight: 700, fontSize: "1.1rem" }}>{sub.teacher_score}%</span>
                      ) : (
                        <span style={{ color: "var(--warning)", fontSize: "0.85rem" }}>{isAO ? "Madaalamuu hin qabu" : "Needs grading"}</span>
                      )}
                    </div>
                  </div>

                  {sub.teacher_feedback && (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic", marginBottom: "0.75rem" }}>{isAO ? "Yaada" : "Feedback"}: {sub.teacher_feedback}</p>
                  )}

                  {/* Show student answers with question text */}
                  {Array.isArray(sub.answers) && sub.answers.length > 0 && (
                    <div style={{ marginBottom: "1rem", padding: "0.875rem 1rem", background: "rgba(0,0,0,0.15)", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                      <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
                        {isAO ? "Deebii Barataa" : "Student Answers"}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {sub.answers.map((ans: any, idx: number) => {
                          const question = gradingAssignment?.exams?.questions?.find((q: any) => q.id === ans.id);
                          return (
                            <div key={idx} style={{ display: "flex", gap: "0.75rem", fontSize: "0.82rem" }}>
                              <span style={{ color: "var(--primary)", fontWeight: 700, flexShrink: 0 }}>Q{idx + 1}.</span>
                              <div style={{ minWidth: 0 }}>
                                {question && <p style={{ color: "var(--text-muted)", margin: 0, marginBottom: "0.15rem", fontSize: "0.78rem" }}>{question.question_text?.slice(0, 80)}{(question.question_text?.length || 0) > 80 ? "..." : ""}</p>}
                                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{ans.answer || <em style={{ color: "var(--text-muted)" }}>No answer</em>}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {gradingSubId === sub.id ? (
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end", marginTop: "0.5rem" }}>
                      <div className="form-group" style={{ margin: 0, flex: "0 0 120px" }}>
                        <label className="form-label" style={{ fontSize: "0.8rem" }}>{isAO ? "Qabxii (0-100)" : "Score (0–100)"}</label>
                        <input type="number" min={0} max={100} className="form-input" style={{ padding: "0.4rem 0.6rem" }} value={gradeInput} onChange={(e) => setGradeInput(e.target.value)} placeholder="e.g. 85" />
                      </div>
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label className="form-label" style={{ fontSize: "0.8rem" }}>{isAO ? "Yaada Dabalataa" : "Feedback (optional)"}</label>
                        <input type="text" className="form-input" style={{ padding: "0.4rem 0.6rem" }} value={feedbackInput} onChange={(e) => setFeedbackInput(e.target.value)} placeholder={isAO ? "Yaada..." : "Comment..."} />
                      </div>
                      <button onClick={() => handleSaveGrade(sub.id)} className="btn btn-primary" disabled={savingGrade} style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}>
                        {savingGrade ? "..." : (isAO ? "Kuusi" : "Save")}
                      </button>
                      <button onClick={() => { setGradingSubId(null); setGradeInput(""); setFeedbackInput(""); }} className="btn btn-outline" style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem" }}>
                        {isAO ? "Haqi" : "Cancel"}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setGradingSubId(sub.id); setGradeInput(sub.teacher_score?.toString() ?? ""); setFeedbackInput(sub.teacher_feedback ?? ""); }} className="btn btn-outline" style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}>
                      <Star size={13} /> {sub.graded ? (isAO ? "Madaali Irra-deebisi" : "Re-grade") : (isAO ? "Madaali" : "Grade")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      </AuthGuard>
    );
  }

  // ── Main tabbed layout ────────────────────────────────────────────────────

  return (
    <AuthGuard>
      <div className="app-container">
        <Sidebar />
        <main className="main-content" style={{ display: "flex", flexDirection: "column" }}>

        {/* Print styles - no hidden class overrides */}

        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              {isAO ? "Wiirtuu Qophii Qormaataa" : "Exam Centre"}
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              {isAO ? "Qormaata uumi, fudhadhu, ykn barsiisaa irraa fudhadhu." : "Generate practice exams, take AI-powered tests, or complete assignments from your teacher."}
            </p>
          </div>
          {publishSuccess && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "var(--success)", padding: "0.6rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }}>
              <CheckCircle size={15} /> {publishSuccess}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div style={{
          display: "flex",
          gap: "0",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--glass-border)",
          flexShrink: 0,
        }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.7rem 0.85rem",
                fontSize: "0.82rem",
                fontWeight: tab === t.id ? 600 : 400,
                background: tab === t.id ? "rgba(14,165,233,0.08)" : "transparent",
                border: "none",
                cursor: "pointer",
                color: tab === t.id ? "var(--primary)" : "var(--text-secondary)",
                borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: "-1px",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
                flexShrink: 0,
                flex: 1,
                justifyContent: "center",
                borderRadius: "8px 8px 0 0",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: MY EXAMS ────────────────────────────────────────────────── */}
        {tab === "my-exams" && (
          <div className="animate-fade-in">
            {fetchingSaved ? (
              <p style={{ color: "var(--text-secondary)" }}>{isAO ? "Fidaa jira..." : "Loading..."}</p>
            ) : savedExams.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-secondary)" }}>
                <HelpCircle size={36} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
                <p>{isAO ? "Qormaanni ol-kaayame hin jiru." : "No saved exams yet. Use the AI Generator tab to create one."}</p>
                <button onClick={() => setTab("generator")} className="btn btn-outline" style={{ marginTop: "1rem" }}>
                  <Plus size={14} /> {isAO ? "Qormaata Uumi" : "Generate Exam"}
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: "1.25rem" }}>
                {savedExams.map((ex) => (
                  <div key={ex.id} className="glass-panel glass-panel-hover" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div>
                      <span style={{ fontSize: "0.7rem", background: "rgba(20,184,166,0.1)", color: "var(--secondary)", padding: "0.15rem 0.5rem", borderRadius: "10px", fontWeight: 600 }}>{ex.subject}</span>
                      <h4 style={{ fontSize: "1.05rem", marginTop: "0.4rem", marginBottom: "0.15rem" }}>{ex.topic}</h4>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>{ex.difficulty}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem", borderTop: "1px solid var(--glass-border)" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{ex.question_count} {isAO ? "Gaaffilee" : "Questions"}</span>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button onClick={() => setTakingExam(ex as any)} className="btn btn-primary" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}>
                          <Play size={12} /> <span>{isAO ? "Fudhadhu" : "Take"}</span>
                        </button>
                        {isTeacher && (
                          <button
                            onClick={() => { setPublishingFor({ exam_id: ex.id, subject: ex.subject, topic: ex.topic }); setPubTitle(`${ex.subject} — ${ex.topic}`); setPubGrade(activeGrade ?? "12"); setTab("my-assignments"); }}
                            className="btn btn-outline" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                          >
                            <Send size={12} /> <span>{isAO ? "Maxxansi" : "Publish"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: AI GENERATOR ───────────────────────────────────────────── */}
        {tab === "generator" && !generatedExam && (
          <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
            {/* Back button — mobile prominent */}
            <button
              onClick={() => { setTab("my-exams"); setSubject(""); setTopic(""); setGenerateError(""); setDifficulty("medium"); setQuestionCount(10); setExamTypes(["multiple_choice"]); }}
              className="btn btn-outline"
              style={{ width: "fit-content", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}
            >
              ← {isAO ? "Gara Qormaata Duubatti" : "Back to My Exams"}
            </button>
            {/* Mobile-first: Stack form and info vertically */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-panel" style={{ padding: "2rem" }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Plus size={18} style={{ color: "var(--primary)" }} /> {isAO ? "Qormaata Haaraa Uumi" : "Generate New Practice Exam"}
                </h2>
                <form onSubmit={handleGenerate}>
                  <div className="form-group">
                    <label className="form-label">{isAO ? "Gosa Barnootaa" : "Subject"}</label>
                    <select className="form-select" value={subject} onChange={(e) => setSubject(e.target.value)} required>
                      <option value="">-- {isAO ? "Filadhu" : "Choose"} --</option>
                      {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{isAO ? "Mata-duree" : "Topic / Chapter"}</label>
                    <input type="text" className="form-input" required value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={isAO ? "fkn. Boqonnaa 2" : "e.g. Chapter 2, Cell Division"} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{isAO ? "Sadarkaa" : "Difficulty"}</label>
                    <select className="form-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                      <option value="easy">{isAO ? "Salphaa" : "Easy"}</option>
                      <option value="medium">{isAO ? "Giddu-galeessa" : "Medium"}</option>
                      <option value="hard">{isAO ? "Jabaa" : "Hard"}</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{isAO ? "Lakkoofsa Gaaffilee" : "Number of Questions"}</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
                      {[5, 10, 15, 20].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setQuestionCount(n)}
                          style={{
                            padding: "0.6rem",
                            borderRadius: "8px",
                            border: "1px solid",
                            borderColor: questionCount === n ? "var(--primary)" : "var(--glass-border)",
                            background: questionCount === n ? "rgba(14,165,233,0.12)" : "var(--glass-bg)",
                            color: questionCount === n ? "var(--primary)" : "var(--text-secondary)",
                            fontWeight: questionCount === n ? 700 : 400,
                            fontSize: "1rem",
                            cursor: "pointer",
                            transition: "all 0.15s"
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                    <label className="form-label">{isAO ? "Gosa Gaaffilee" : "Question Types"}</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem", marginTop: "0.25rem" }}>
                      {[["multiple_choice", isAO ? "Filannoo" : "Multiple Choice"], ["true_false", isAO ? "Dhugaa/Soba" : "True or False"], ["blank_space", isAO ? "Iddoo Duudaa" : "Fill in Blank"], ["definition", isAO ? "Hiika" : "Definition"]].map(([key, label]) => (
                        <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", padding: "0.45rem 0.75rem", borderRadius: "6px", border: "1px solid", borderColor: examTypes.includes(key) ? "var(--primary)" : "transparent", background: examTypes.includes(key) ? "rgba(14,165,233,0.05)" : "transparent" }}>
                          <input type="checkbox" checked={examTypes.includes(key)} onChange={() => toggleType(key)} style={{ width: "15px", height: "15px" }} />
                          <span style={{ fontSize: "0.88rem" }}>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={generating || !subject || !topic || examTypes.length === 0} style={{ width: "100%" }}>
                    {generating
                      ? <><span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginRight: "0.5rem" }} />{isAO ? "Uumamaa jira..." : "Generating..."}</>
                      : (isAO ? "Qormaata Uumi" : "Generate Exam")}
                  </button>
                  {/* Cancel button */}
                  <button
                    type="button"
                    onClick={() => { setTab("my-exams"); setSubject(""); setTopic(""); setGenerateError(""); setDifficulty("medium"); setQuestionCount(10); setExamTypes(["multiple_choice"]); }}
                    className="btn btn-outline"
                    style={{ width: "100%", marginTop: "0.75rem" }}
                    disabled={generating}
                  >
                    {isAO ? "Haqi / Duubatti" : "Cancel & Go Back"}
                  </button>
                  {generateError && (
                    <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: "0.85rem" }}>
                      {generateError}
                    </div>
                  )}
                </form>
              </div>
              <div className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", textAlign: "center" }}>
                <Award size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
                <h3 style={{ marginBottom: "0.5rem" }}>{isAO ? "Qormaata Barumsa Keetiif" : "AI-Powered Exam Generation"}</h3>
                <p style={{ fontSize: "0.9rem", maxWidth: "320px" }}>{isAO ? "AI-n qormaata kuusaa barnoota irratti hundaa'e uuma." : "The AI generates questions grounded in your uploaded curriculum documents."}</p>
              </div>
            </div>
          </div>
        )}

        {tab === "generator" && generatedExam && (
          <div className="animate-fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <span style={{ color: "var(--success)", fontSize: "0.85rem", fontWeight: 600 }}>✓ {isAO ? "Qormaanni uumame!" : "Exam generated!"}</span>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>{generatedExam.subject} — {generatedExam.topic}</h2>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {isTeacher && (
                  <button onClick={() => { setPublishingFor({ exam_id: generatedExam.id, subject: generatedExam.subject, topic: generatedExam.topic }); setPubTitle(`${generatedExam.subject} — ${generatedExam.topic}`); setPubGrade(activeGrade ?? "12"); setTab("my-assignments"); setGeneratedExam(null); }} className="btn btn-primary">
                    <Send size={14} /> <span>{isAO ? "Barattoota Ramaddi" : "Assign to Students"}</span>
                  </button>
                )}
                {/* Print exam without taking it — teacher can print a physical copy */}
                <button onClick={() => window.print()} className="btn btn-outline">
                  <Download size={14} /> <span>{isAO ? "Maxxansi" : "Print"}</span>
                </button>
                <button onClick={() => { setTakingExam(generatedExam); setGeneratedExam(null); }} className="btn btn-outline">
                  <Play size={14} /> <span>{isAO ? "Amma Fudhadhu" : "Take Now"}</span>
                </button>
                <button onClick={() => setGeneratedExam(null)} className="btn btn-outline">{isAO ? "Haaraa Uumi" : "Generate Another"}</button>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              {generatedExam.questions.map((q, i) => (
                <div key={q.id} style={{ paddingBottom: "1rem", marginBottom: "1rem", borderBottom: i === generatedExam.questions.length - 1 ? "none" : "1px solid var(--glass-border)" }}>
                  <span style={{ fontWeight: 700, color: "var(--primary)" }}>Q{i + 1}. </span>
                  <span style={{ fontSize: "0.95rem" }}>{q.question_text}</span>
                  {q.options && <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>{q.options.map((o, oi) => <span key={oi} style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)" }}>{o}</span>)}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: FROM TEACHER (students only) ───────────────────────────── */}
        {tab === "from-teacher" && !isTeacher && (
          <div className="animate-fade-in">
            {fetchingStudentAssignments ? (
              <p style={{ color: "var(--text-secondary)" }}>{isAO ? "Fidaa jira..." : "Loading assignments..."}</p>
            ) : studentAssignments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-secondary)" }}>
                <BookOpen size={36} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
                <p>{isAO ? "Barsiisaan ammaatti hojii hin kennine." : "No assignments from your teacher yet."}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {studentAssignments.map((a) => {
                  const past = isPastDue(a.due_date);
                  const mySub = mySubmissions[a.id];
                  const submitted = !!mySub;
                  const displayScore = mySub?.teacher_score ?? mySub?.raw_score;

                  return (
                    <div key={a.id} className="glass-panel" style={{ padding: "1.25rem 1.5rem", opacity: past && !submitted ? 0.65 : 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: "200px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, background: `rgba(${typeColor(a.assignment_type) === "var(--primary)" ? "14,165,233" : typeColor(a.assignment_type) === "var(--secondary)" ? "20,184,166" : "99,102,241"},0.12)`, color: typeColor(a.assignment_type), padding: "0.15rem 0.5rem", borderRadius: "8px", textTransform: "capitalize" }}>
                              {typeLabel(a.assignment_type)}
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Clock size={11} /> {isAO ? "Xumura" : "Due"}: {new Date(a.due_date).toLocaleDateString()}
                            </span>
                            {past && !submitted && <span style={{ fontSize: "0.7rem", color: "var(--danger)", fontWeight: 600 }}>● {isAO ? "Darbeera" : "Closed"}</span>}
                            {submitted && !mySub.graded && <span style={{ fontSize: "0.7rem", color: "var(--warning)", fontWeight: 600 }}>● {isAO ? "Ergameera — Eeggachaa" : "Submitted — Awaiting grade"}</span>}
                            {submitted && mySub.graded && <span style={{ fontSize: "0.7rem", color: "var(--success)", fontWeight: 600 }}>● {isAO ? "Madaalamee jira" : "Graded"}</span>}
                          </div>
                          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.15rem" }}>{a.title}</h3>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{a.exams?.subject} — {a.exams?.topic}</span>
                        </div>

                        {/* Right side: score badge OR action button */}
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          {submitted && displayScore !== null ? (
                            <div style={{ padding: "0.35rem 0.85rem", borderRadius: "8px", background: displayScore >= 80 ? "rgba(34,197,94,0.1)" : displayScore >= 50 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)", color: displayScore >= 80 ? "var(--success)" : displayScore >= 50 ? "var(--warning)" : "var(--danger)", fontWeight: 800, fontSize: "1.1rem" }}>
                              {Math.round(displayScore)}%
                            </div>
                          ) : submitted ? (
                            <div style={{ padding: "0.35rem 0.85rem", borderRadius: "8px", background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                              <Clock size={13} style={{ display: "inline", marginRight: "4px" }} />{isAO ? "Eeggachaa" : "Pending"}
                            </div>
                          ) : (
                            <button
                              onClick={() => !past && setTakingAssignment({ assignment: a })}
                              className={`btn ${past ? "btn-outline" : "btn-primary"}`}
                              disabled={past}
                              style={{ minWidth: "100px" }}
                            >
                              {past ? (isAO ? "Darbeera" : "Closed") : <><Play size={14} /> <span>{isAO ? "Eegali" : "Start"}</span></>}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Teacher feedback block — shown when graded */}
                      {submitted && mySub.graded && mySub.teacher_feedback && (
                        <div style={{ marginTop: "0.85rem", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                          <Star size={14} style={{ color: "var(--accent)", marginTop: "2px", flexShrink: 0 }} />
                          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                            "{mySub.teacher_feedback}"
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: MY ASSIGNMENTS (teachers only) ─────────────────────────── */}
        {tab === "my-assignments" && isTeacher && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

            {/* Publish modal */}
            {publishingFor && (
              <div className="glass-panel" style={{ padding: "2rem", border: "1px solid rgba(99,102,241,0.3)" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Send size={17} style={{ color: "var(--accent)" }} /> {isAO ? "Hojii Ramaddi" : "Publish Assignment"} — {publishingFor.subject} / {publishingFor.topic}
                </h2>
                <form onSubmit={handlePublish} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                  {publishError && (
                    <div style={{ gridColumn: "1 / -1", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: "0.85rem" }}>
                      {publishError}
                    </div>
                  )}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{isAO ? "Mata-duree Ramaddii" : "Assignment Title"}</label>
                    <input type="text" className="form-input" required value={pubTitle} onChange={(e) => setPubTitle(e.target.value)} placeholder={isAO ? "fkn. Hojii Mana 3" : "e.g. Week 3 Homework"} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{isAO ? "Gosa" : "Type"}</label>
                    <select className="form-select" value={pubType} onChange={(e) => setPubType(e.target.value as any)}>
                      <option value="quiz">{isAO ? "Gaaffii (Quiz)" : "Quiz"}</option>
                      <option value="homework">{isAO ? "Hojii Mana" : "Homework"}</option>
                      <option value="assignment">{isAO ? "Hojii Kutaa" : "Assignment"}</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{isAO ? "Kutaa Barataa" : "Target Grade"}</label>
                    <select className="form-select" value={pubGrade} onChange={(e) => setPubGrade(e.target.value)}>
                      <option value="6">{isAO ? "Kutaa 6" : "Grade 6"}</option>
                      <option value="8">{isAO ? "Kutaa 8" : "Grade 8"}</option>
                      <option value="12">{isAO ? "Kutaa 12" : "Grade 12"}</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{isAO ? "Guyyaa Xumuraa" : "Due Date"}</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input type="date" className="form-input" required value={pubDueDate} onChange={(e) => setPubDueDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} style={{ flex: 1 }} />
                      <input type="time" className="form-input" required value={pubDueTime} onChange={(e) => setPubDueTime(e.target.value)} style={{ width: "110px" }} />
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.75rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setPublishingFor(null)} className="btn btn-outline">{isAO ? "Haqi" : "Cancel"}</button>
                    <button type="submit" className="btn btn-primary" disabled={publishing}>
                      {publishing ? "..." : <><Send size={14} /> <span>{isAO ? "Maxxansi" : "Publish to Students"}</span></>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Published assignments list */}
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ClipboardList size={17} style={{ color: "var(--secondary)" }} /> {isAO ? "Ramaddii Maxxanfame" : "Published Assignments"}
              </h2>
              {fetchingTeacherAssignments ? (
                <p style={{ color: "var(--text-secondary)" }}>{isAO ? "Fidaa jira..." : "Loading..."}</p>
              ) : teacherAssignments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                  <AlertCircle size={32} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
                  <p>{isAO ? "Ramaddii maxxanfame hin jiru. Qormaata uumii Publish godhii." : "No assignments published yet. Generate an exam and publish it."}</p>
                  <button onClick={() => setTab("generator")} className="btn btn-outline" style={{ marginTop: "1rem" }}>
                    <Plus size={14} /> {isAO ? "Qormaata Uumi" : "Go to Generator"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {teacherAssignments.map((a) => {
                    const past = isPastDue(a.due_date);
                    return (
                      <div key={a.id} className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                        <div style={{ flex: 1, minWidth: "200px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: typeColor(a.assignment_type), textTransform: "capitalize" }}>● {typeLabel(a.assignment_type)}</span>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Grade {a.target_grade}</span>
                            <span style={{ fontSize: "0.72rem", color: past ? "var(--danger)" : "var(--success)" }}>
                              <Clock size={11} style={{ display: "inline" }} /> {isAO ? "Xumura" : "Due"}: {new Date(a.due_date).toLocaleDateString()} {past ? `(${isAO ? "Darbeera" : "Closed"})` : ""}
                            </span>
                          </div>
                          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{a.title}</h3>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{a.exams?.subject} — {a.exams?.topic}</span>
                        </div>
                        <button onClick={() => fetchSubmissions(a)} className="btn btn-outline" style={{ fontSize: "0.82rem" }}>
                          <Users size={13} /> <span>{isAO ? "Deebii Ilaali" : "View Submissions"}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
    </AuthGuard>
  );
}
