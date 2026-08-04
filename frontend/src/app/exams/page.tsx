"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { 
  Award, 
  FileText, 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  Download, 
  Play, 
  Plus, 
  ListFilter 
} from "lucide-react";

interface Question {
  id: number;
  type: "multiple_choice" | "short_answer";
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
  results: {
    id: number;
    student_answer: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
  }[];
}

export default function ExamsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const englishSubjects = ["English", "Biology", "Chemistry", "Physics", "Maths"];
  const oromoSubjects = ["Afaan Oromo", "Saayinsii", "Hawaasummaa", "Herrega"];

  // States
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
  
  const [activeExam, setActiveExam] = useState<{ id: number; subject: string; topic: string; questions: Question[] } | null>(null);
  const [answers, setAnswers] = useState<Dict<number, string>>({});
  
  const [assessment, setAssessment] = useState<AttemptResult | null>(null);
  
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingSaved, setFetchingSaved] = useState(false);
  const [viewingSaved, setViewingSaved] = useState(true); // Toggle between generator and saved list

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token) {
      fetchSavedExams();
    }
  }, [token]);

  if (loading || !user) return null;

  const subjects = user.language === "Afaan Oromo" ? oromoSubjects : englishSubjects;

  const fetchSavedExams = async () => {
    setFetchingSaved(true);
    try {
      const response = await fetch(`http://localhost:8000/api/exams/saved?grade=${user.grade}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSavedExams(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingSaved(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !topic || generating) return;

    setGenerating(true);
    setAssessment(null);
    setAnswers({});

    try {
      const response = await fetch("http://localhost:8000/api/exams/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subject,
          topic,
          difficulty,
          grade: user.grade
        })
      });

      if (response.ok) {
        const data = await response.json();
        setActiveExam(data);
        setViewingSaved(false);
        fetchSavedExams(); // Refresh saved list in background
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const loadSavedExam = async (examId: number) => {
    setAssessment(null);
    setAnswers({});
    
    try {
      const response = await fetch(`http://localhost:8000/api/exams/${examId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActiveExam(data);
        setViewingSaved(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOptionChange = (questionId: number, optionValue: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionValue
    }));
  };

  const handleTextChange = (questionId: number, textValue: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: textValue
    }));
  };

  const handleSubmitExam = async () => {
    if (!activeExam || submitting) return;

    setSubmitting(true);
    
    // Format answers payload
    const formattedAnswers = Object.keys(answers).map((qId) => ({
      id: parseInt(qId),
      answer: answers[parseInt(qId)]
    }));

    try {
      const response = await fetch("http://localhost:8000/api/exams/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          exam_id: activeExam.id,
          answers: formattedAnswers
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAssessment(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content" style={{ display: "flex", flexDirection: "column" }}>
        
        {/* Printable View Styles */}
        <style jsx global>{`
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            .app-container aside {
              display: none !important;
            }
            .main-content {
              padding: 0 !important;
              height: auto !important;
              overflow: visible !important;
            }
            .no-print {
              display: none !important;
            }
            .print-exam-header {
              display: block !important;
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 1rem;
              margin-bottom: 2rem;
              color: black;
            }
            .print-exam-header h1 {
              font-size: 20pt;
              margin-bottom: 0.25rem;
            }
            .print-question {
              margin-bottom: 1.5rem;
              page-break-inside: avoid;
              color: black;
            }
            .print-question h4 {
              font-size: 12pt;
              font-weight: bold;
              margin-bottom: 0.5rem;
            }
            .print-option {
              margin-left: 1.5rem;
              margin-bottom: 0.25rem;
              font-size: 11pt;
            }
            .glass-panel {
              background: transparent !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
            }
            p, span, div, h1, h2, h3, h4, h5, h6 {
              color: black !important;
            }
          }
          .print-exam-header {
            display: none;
          }
        `}</style>

        {/* Top Header - Hidden in Print */}
        <div className="no-print" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2.5rem"
        }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              Exam Preparation Module
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Generate custom practice tests or review saved exams.
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button 
              onClick={() => { setViewingSaved(true); setActiveExam(null); setAssessment(null); }}
              className={`btn ${viewingSaved ? "btn-primary" : "btn-outline"}`}
            >
              <ListFilter size={16} /> Saved Exams
            </button>
            <button 
              onClick={() => { setViewingSaved(false); setActiveExam(null); setAssessment(null); }}
              className={`btn ${!viewingSaved && !activeExam ? "btn-primary" : "btn-outline"}`}
            >
              <Plus size={16} /> New Exam
            </button>
          </div>
        </div>

        {/* PRINT HEADER */}
        {activeExam && (
          <div className="print-exam-header">
            <h1>I-Pass-A Practice Exam Prep</h1>
            <div>
              <strong>Subject:</strong> {activeExam.subject} | 
              <strong> Topic:</strong> {activeExam.topic} | 
              <strong> Grade:</strong> {user.grade}
            </div>
            <div style={{ marginTop: "0.5rem" }}>
              <strong>Student Name:</strong> ________________________ | 
              <strong> Date:</strong> _________________ | 
              <strong> Score:</strong> ________
            </div>
          </div>
        )}

        {/* Content Section */}
        <div style={{ display: "grid", gridTemplateColumns: activeExam ? "1fr" : "1fr 1fr", gap: "2rem" }}>
          
          {/* 1. Exam Generator Form - Hidden if active exam is showing */}
          {!activeExam && !viewingSaved && (
            <div className="glass-panel no-print animate-fade-in" style={{ padding: "2rem" }}>
              <h2 style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                <Plus size={20} style={{ color: "var(--primary)" }} /> Generate Practice Exam
              </h2>

              <form onSubmit={handleGenerate}>
                <div className="form-group">
                  <label className="form-label">Subject / Gosa Barnootaa</label>
                  <select 
                    className="form-select" 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Topic / Mata-duree</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Tenses, Cell Structure, Caasluga"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Difficulty / Saffata</label>
                  <select 
                    className="form-select"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="easy">Easy / Salphaa</option>
                    <option value="medium">Medium / Giddu-galeessa</option>
                    <option value="hard">Hard / Jabaa</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={generating || !subject || !topic}
                  style={{ width: "100%", marginTop: "1rem" }}
                >
                  {generating ? "Generating..." : "Generate Practice Exam"}
                </button>
              </form>
            </div>
          )}

          {/* 2. Saved Exams List - Show if toggle active and no active exam */}
          {!activeExam && viewingSaved && (
            <div className="glass-panel no-print animate-fade-in" style={{ padding: "2rem", gridColumn: "1 / -1" }}>
              <h2 style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                <FileText size={20} style={{ color: "var(--secondary)" }} /> Saved Exams for Grade {user.grade}
              </h2>

              {fetchingSaved ? (
                <p>Loading saved exams...</p>
              ) : savedExams.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
                  <HelpCircle size={32} style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }} />
                  <p>No exams have been generated yet for Grade {user.grade}.</p>
                  <button 
                    onClick={() => setViewingSaved(false)}
                    className="btn btn-outline"
                    style={{ marginTop: "1rem" }}
                  >
                    Generate First Exam
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
                  {savedExams.map((ex) => (
                    <div 
                      key={ex.id} 
                      className="glass-panel glass-panel-hover" 
                      style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}
                    >
                      <div>
                        <span style={{
                          fontSize: "0.7rem",
                          background: "rgba(20, 184, 166, 0.1)",
                          color: "var(--secondary)",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "10px",
                          fontWeight: 600
                        }}>
                          {ex.subject}
                        </span>
                        <h4 style={{ fontSize: "1.1rem", marginTop: "0.35rem", marginBottom: "0.15rem" }}>{ex.topic}</h4>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          Difficulty: <strong style={{ textTransform: "capitalize" }}>{ex.difficulty}</strong>
                        </span>
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem", borderTop: "1px solid var(--glass-border)" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {ex.question_count} Questions
                        </span>
                        
                        <button 
                          onClick={() => loadSavedExam(ex.id)}
                          className="btn btn-primary"
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                        >
                          <Play size={12} /> Take Exam
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Take Active Exam / Assessment results */}
          {activeExam && (
            <div className="glass-panel animate-fade-in" style={{ padding: "2rem" }}>
              {/* Header inside exam page */}
              <div className="no-print" style={{
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                borderBottom: "1px solid var(--glass-border)",
                paddingBottom: "1rem",
                marginBottom: "2rem"
              }}>
                <div>
                  <span style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase" }}>
                    {activeExam.subject} Practice test
                  </span>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Topic: {activeExam.topic}</h2>
                </div>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={handlePrint} className="btn btn-outline">
                    <Download size={16} /> Print / Export
                  </button>
                  <button 
                    onClick={() => { setActiveExam(null); setAssessment(null); }}
                    className="btn btn-outline"
                    style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.2)" }}
                  >
                    Close Exam
                  </button>
                </div>
              </div>

              {/* Exam Scoring Summary */}
              {assessment && (
                <div style={{
                  background: "rgba(20, 184, 166, 0.08)",
                  border: "1px solid rgba(20, 184, 166, 0.2)",
                  padding: "1.5rem",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "2rem",
                  textAlign: "center"
                }}>
                  <Award size={40} style={{ color: "var(--secondary)", marginBottom: "0.5rem" }} />
                  <h3 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Exam Completed!</h3>
                  <p style={{ fontSize: "1.1rem", color: "#fff", marginTop: "0.25rem" }}>
                    Your Score: <strong style={{ color: "var(--secondary)", fontSize: "1.75rem" }}>{assessment.score.toFixed(1)}%</strong>
                  </p>
                </div>
              )}

              {/* Questions List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                {activeExam.questions.map((q, idx) => {
                  const qResult = assessment?.results.find(r => r.id === q.id);
                  const isCorrect = qResult?.is_correct;
                  
                  return (
                    <div 
                      key={q.id} 
                      className="print-question"
                      style={{
                        paddingBottom: "1.5rem",
                        borderBottom: idx === activeExam.questions.length - 1 ? "none" : "1px solid var(--glass-border)"
                      }}
                    >
                      {/* Question Header & Correctness indicators */}
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                        <span style={{ fontWeight: "bold", color: "var(--primary)" }}>Q{idx + 1}.</span>
                        <h4 style={{ fontSize: "1.05rem", fontWeight: 600, flex: 1 }}>{q.question_text}</h4>
                        
                        {assessment && (
                          <div className="no-print">
                            {isCorrect ? (
                              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--success)", fontSize: "0.85rem", fontWeight: 600 }}>
                                <CheckCircle size={16} /> Correct
                              </span>
                            ) : (
                              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--danger)", fontSize: "0.85rem", fontWeight: 600 }}>
                                <XCircle size={16} /> Incorrect
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Options or text input field */}
                      <div style={{ marginTop: "1rem" }}>
                        {q.type === "multiple_choice" && q.options ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {q.options.map((opt, oIdx) => {
                              const isChecked = answers[q.id] === opt;
                              return (
                                <label 
                                  key={oIdx} 
                                  className="print-option"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.75rem",
                                    padding: "0.75rem 1rem",
                                    borderRadius: "8px",
                                    border: "1px solid",
                                    borderColor: isChecked ? "var(--primary)" : "var(--glass-border)",
                                    background: isChecked ? "rgba(14, 165, 233, 0.05)" : "rgba(0,0,0,0.1)",
                                    cursor: assessment ? "default" : "pointer"
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={`q-${q.id}`}
                                    value={opt}
                                    checked={isChecked}
                                    onChange={() => !assessment && handleOptionChange(q.id, opt)}
                                    disabled={!!assessment}
                                    className="no-print"
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="form-group" style={{ margin: 0 }}>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Write your short answer here..."
                              value={answers[q.id] || ""}
                              onChange={(e) => handleTextChange(q.id, e.target.value)}
                              disabled={!!assessment}
                              style={{ width: "100%" }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Score Explanation details */}
                      {assessment && qResult && (
                        <div style={{
                          marginTop: "1.25rem",
                          padding: "1rem",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px dashed var(--glass-border)",
                          borderRadius: "8px"
                        }}>
                          <div style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                            <strong>Correct Answer:</strong> <span style={{ color: "var(--secondary)" }}>{qResult.correct_answer}</span>
                          </div>
                          {qResult.student_answer && (
                            <div style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                              <strong>Your Answer:</strong> <span>{qResult.student_answer}</span>
                            </div>
                          )}
                          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                            <strong>Explanation:</strong> {qResult.explanation}
                          </p>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

              {/* Submit Buttons */}
              {!assessment && (
                <div className="no-print" style={{ marginTop: "2.5rem", borderTop: "1px solid var(--glass-border)", paddingTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={handleSubmitExam}
                    className="btn btn-primary"
                    disabled={submitting || Object.keys(answers).length < activeExam.questions.length}
                  >
                    {submitting ? "Scoring..." : "Submit Exam Answers"}
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

      </main>
    </div>
  );
}
