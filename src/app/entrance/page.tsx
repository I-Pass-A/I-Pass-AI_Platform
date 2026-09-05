"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { isAfaanOromo, getSubjectsForGrade, getActiveGrade } from "@/lib/subjects";
import {
  Award, Play, Clock, CheckCircle, XCircle, Send,
  BookOpen, RefreshCw, ChevronRight,
} from "lucide-react";

// ── Timer ──────────────────────────────────────────────────────────────────────
function ExamTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const ref = useRef<any>(null);
  useEffect(() => {
    ref.current = setInterval(() => {
      setRemaining(p => {
        if (p <= 1) { clearInterval(ref.current); onExpire(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [onExpire]);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const pct = (remaining / seconds) * 100;
  const color = pct > 50 ? "var(--success)" : pct > 20 ? "var(--warning)" : "var(--danger)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 1rem", background: "rgba(0,0,0,0.2)", borderRadius: "10px", border: `1px solid ${color}40` }}>
      <Clock size={15} style={{ color }} />
      <span style={{ fontWeight: 800, fontSize: "1rem", color, fontFamily: "monospace" }}>
        {String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
      </span>
      <div style={{ width: "50px", height: "4px", background: "var(--glass-border)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 1s linear" }} />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function EntrancePage() {
  const { user, session } = useAuth();
  const isAO = isAfaanOromo(user);
  const activeGrade = user ? getActiveGrade(user) : "12";
  const subjects = getSubjectsForGrade(activeGrade);
  const label = activeGrade === "12" ? "UEE" : isAO ? "Qormaata Seennaa Naannoo" : "Regional Entrance";

  const [phase, setPhase] = useState<"setup"|"taking"|"results">("setup");
  const [subject, setSubject] = useState("");
  const [qCount, setQCount] = useState(10);
  const [mins, setMins] = useState(20);
  const [exam, setExam] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number,string>>({});
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [expanded, setExpanded] = useState<number|null>(null);

  const headers = (extra?: any) => ({
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...extra,
  });

  const generate = async () => {
    if (!subject || generating) return;
    setGenerating(true); setGenError("");
    try {
      const res = await fetch("/api/entrance/generate", {
        method: "POST", headers: headers(),
        body: JSON.stringify({ subject, grade: activeGrade, question_count: qCount }),
      });
      const data = await res.json();
      if (!res.ok) { setGenError(data.detail || "Failed"); return; }
      setExam(data); setAnswers({}); setPhase("taking");
    } catch { setGenError(isAO ? "Dhaabbatni hin argamne." : "Network error."); }
    finally { setGenerating(false); }
  };

  const submit = useCallback(async () => {
    if (!exam || submitting) return;
    setSubmitting(true);
    try {
      const formatted = Object.keys(answers).map(id => ({ id: parseInt(id), answer: answers[parseInt(id)] }));
      const res = await fetch("/api/exams/submit", {
        method: "POST", headers: headers(),
        body: JSON.stringify({ exam_id: exam.id, answers: formatted }),
      });
      const data = await res.json();
      if (res.ok) { setResults(data); setPhase("results"); }
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  }, [exam, answers, submitting]);

  const reset = () => { setPhase("setup"); setExam(null); setAnswers({}); setResults(null); setGenError(""); setExpanded(null); };

  const sc = (s: number) => s >= 70 ? "var(--success)" : s >= 50 ? "var(--warning)" : "var(--danger)";
  const allDone = exam?.questions.every((q: any) => answers[q.id]?.trim());

  if (!user) return null;

  // Grade 6 and 8 entrance exam data not yet uploaded — show coming soon
  if (activeGrade === "6" || activeGrade === "8") {
    return (
      <AuthGuard>
        <div className="app-container">
          <Sidebar />
          <main className="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "1.5rem" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={32} style={{ color: "var(--warning)" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                Dhiyoo Dhufa — Kutaa {activeGrade}
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.7, maxWidth: "480px" }}>
                Qormaata seennaa naannoo Kutaa {activeGrade} ammaaf hin argamu. Gaaffilee qormaata seennaa dhugaa fi modela Naannoo Oromiyaa kuusaa keenya keessatti galchuun hojjechaa jirra. Dhumarratti argama — ariifannaan!
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.5rem" }}>
                <em>Regional entrance exam prep for Grade {activeGrade} is coming soon. We are uploading real Oromia Education Bureau past papers and model exams.</em>
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <a href="/tutor" className="btn btn-primary">
                {isAO ? "Barsiisaa AI Fayyadami" : "Use AI Tutor"}
              </a>
              <a href="/exams" className="btn btn-outline">
                {isAO ? "Qormaata Shaakali" : "Practice Exams"}
              </a>
            </div>
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="app-container">
        <Sidebar />
        <main className="main-content" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* ── SETUP ── */}
          {phase === "setup" && (
            <div className="animate-fade-in">
              <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "0.5rem" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Award size={24} style={{ color: "var(--warning)" }} />
                </div>
                <div>
                  <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0 }}>
                    {isAO ? "Qormaata Seennaa" : "Entrance Exam Prep"}
                  </h1>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                    {isAO ? `${label} — Kutaa ${activeGrade}` : `${label} practice — Grade ${activeGrade}`}
                  </p>
                </div>
              </div>

              <div style={{ padding: "0.875rem 1.25rem", borderRadius: "10px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", marginBottom: "2rem", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                💡 {isAO
                  ? `AI-n qormaata seennaa dhugaa (${label}) irraa barachuu fi akka sanaa gaaffilee haaraa uuma. Garagalcha miti — akkaataa fi cimina qormaata dhugaa fakkaatu.`
                  : `AI studies real ${label} past papers and generates new questions matching the exact style, difficulty, and pattern — not copies.`}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: "1.5rem" }}>
                <div className="glass-panel" style={{ padding: "2rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                    {isAO ? "Qormaata Qopheessi" : "Configure Practice"}
                  </h3>

                  <div className="form-group">
                    <label className="form-label">{isAO ? "Gosa Barnootaa" : "Subject"}</label>
                    <select className="form-select" value={subject} onChange={e => setSubject(e.target.value)}>
                      <option value="">-- {isAO ? "Filadhu" : "Select"} --</option>
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{isAO ? "Lakkoofsa Gaaffilee" : "Questions"}</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.5rem" }}>
                      {[10,20,30,50].map(n => (
                        <button key={n} type="button" onClick={() => setQCount(n)} style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid", borderColor: qCount===n ? "var(--warning)" : "var(--glass-border)", background: qCount===n ? "rgba(245,158,11,0.12)" : "var(--glass-bg)", color: qCount===n ? "var(--warning)" : "var(--text-secondary)", fontWeight: qCount===n ? 700 : 400, fontSize: "1rem", cursor: "pointer" }}>{n}</button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{isAO ? "Yeroo (daqiiqaa)" : "Time (minutes)"}</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.5rem" }}>
                      {[10,20,30,60].map(t => (
                        <button key={t} type="button" onClick={() => setMins(t)} style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid", borderColor: mins===t ? "var(--warning)" : "var(--glass-border)", background: mins===t ? "rgba(245,158,11,0.12)" : "var(--glass-bg)", color: mins===t ? "var(--warning)" : "var(--text-secondary)", fontWeight: mins===t ? 700 : 400, fontSize: "0.9rem", cursor: "pointer" }}>{t}</button>
                      ))}
                    </div>
                  </div>

                  {genError && <div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: "0.85rem", marginBottom: "1rem" }}>{genError}</div>}

                  <button onClick={generate} disabled={!subject || generating} className="btn btn-primary"
                    style={{ width: "100%", background: "linear-gradient(135deg, var(--warning) 0%, #d97706 100%)", boxShadow: "0 4px 14px rgba(245,158,11,0.3)" }}>
                    {generating
                      ? <><span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginRight: "0.5rem" }} />{isAO ? "Uumamaa jira..." : "Generating..."}</>
                      : <><Play size={15} style={{ marginRight: "0.4rem" }} />{isAO ? "Qormaata Eegali" : "Start Practice Exam"}</>}
                  </button>
                </div>

                <div className="glass-panel" style={{ padding: "2rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <BookOpen size={16} style={{ color: "var(--warning)" }} />{isAO ? "Madda Qormaataa" : "Exam Sources"}
                  </h3>
                  {[
                    { year: "2015", type: isAO ? "Qormaata UEE Dhugaa" : "Real UEE Exam Papers", note: isAO ? "MOE" : "MOE" },
                    { year: "2017", type: isAO ? "Qormaata Modela Jalqaba" : "First Round Model Exams", note: isAO ? "Model" : "Model" },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: "0.875rem 1rem", borderRadius: "8px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.9rem", margin: 0 }}>{s.year} — {s.note}</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>{s.type}</p>
                      </div>
                      <CheckCircle size={16} style={{ color: "var(--success)" }} />
                    </div>
                  ))}
                  <div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                    {isAO ? "Gaaffileen dhugaa waan hojjetame miti — AI akkaataa fi cimina qormaata dhugaa barachuu fi akka sanaa uuma." : "Not copying real questions — AI learns the pattern and generates new ones in the same style."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAKING ── */}
          {phase === "taking" && exam && (
            <div className="animate-fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>{exam.subject} — {label}</h2>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>{exam.questions.length} {isAO ? "gaaffii" : "questions"}</p>
                </div>
                <ExamTimer seconds={mins * 60} onExpire={submit} />
              </div>

              <div style={{ height: "4px", background: "var(--glass-border)", borderRadius: "2px", marginBottom: "1.5rem", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(Object.keys(answers).length / exam.questions.length) * 100}%`, background: "var(--warning)", transition: "width 0.3s" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {exam.questions.map((q: any, idx: number) => (
                  <div key={q.id} className="glass-panel" style={{ padding: "1.5rem", borderLeft: `3px solid ${answers[q.id] ? "var(--warning)" : "var(--glass-border)"}` }}>
                    <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
                      <span style={{ fontWeight: 800, color: "var(--warning)", flexShrink: 0 }}>Q{idx + 1}.</span>
                      <h4 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{q.question_text}</h4>
                    </div>
                    {q.options?.length ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {q.options.map((opt: string, oi: number) => (
                          <label key={oi} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid", borderColor: answers[q.id]===opt ? "var(--warning)" : "var(--glass-border)", background: answers[q.id]===opt ? "rgba(245,158,11,0.08)" : "rgba(0,0,0,0.1)", cursor: "pointer" }}>
                            <input type="radio" name={`q-${q.id}`} value={opt} checked={answers[q.id]===opt} onChange={() => setAnswers(p => ({...p,[q.id]:opt}))} />
                            <span style={{ fontSize: "0.925rem" }}>{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input type="text" className="form-input" style={{ width: "100%" }} placeholder={isAO ? "Deebii barreessi..." : "Write answer..."} value={answers[q.id]||""} onChange={e => setAnswers(p => ({...p,[q.id]:e.target.value}))} />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <span style={{ fontSize: "0.875rem", color: allDone ? "var(--success)" : "var(--text-secondary)" }}>
                  {allDone ? (isAO ? "✓ Gaaffiilee hunda deebisite" : "✓ All answered") : `${Object.keys(answers).length}/${exam.questions.length} ${isAO ? "deebii" : "answered"}`}
                </span>
                <button onClick={() => submit()} disabled={submitting || !allDone} className="btn btn-primary"
                  style={{ minWidth: "160px", background: "linear-gradient(135deg, var(--warning), #d97706)", opacity: allDone ? 1 : 0.5 }}>
                  {submitting ? "..." : <><Send size={15} style={{ marginRight: "0.4rem" }} />{isAO ? "Ergi" : "Submit"}</>}
                </button>
              </div>
              <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── RESULTS ── */}
          {phase === "results" && results && exam && (
            <div className="animate-fade-in">
              <div style={{ background: `${sc(results.score)}12`, border: `1px solid ${sc(results.score)}30`, borderRadius: "var(--radius-md)", padding: "2rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: `${sc(results.score)}20`, border: `3px solid ${sc(results.score)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: sc(results.score) }}>{results.score.toFixed(1)}%</span>
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontWeight: 800, fontSize: "1.3rem", margin: "0 0 0.25rem" }}>{isAO ? "Qormaanni Xumurameera!" : "Exam Complete!"}</h2>
                  <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.875rem" }}>{exam.subject} · {label}</p>
                </div>
                <div style={{ display: "flex", gap: "1.5rem" }}>
                  {[
                    { v: results.results.filter((r:any)=>r.is_correct).length, l: isAO?"Sirrii":"Correct", c:"var(--success)" },
                    { v: results.results.filter((r:any)=>!r.is_correct).length, l: isAO?"Dogoggora":"Wrong", c:"var(--danger)" },
                    { v: results.results.length, l: isAO?"Waliigala":"Total", c:"var(--text-secondary)" },
                  ].map((s,i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>{isAO ? "Sakatta'a Gaaffilee" : "Question Review"}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {exam.questions.map((q: any, idx: number) => {
                  const r = results.results.find((x:any)=>x.id===q.id) || results.results[idx];
                  const open = expanded === q.id;
                  return (
                    <div key={q.id} className="glass-panel" style={{ overflow: "hidden" }}>
                      <div onClick={() => setExpanded(open ? null : q.id)} style={{ padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                        {r?.is_correct ? <CheckCircle size={16} style={{ color: "var(--success)", flexShrink: 0 }} /> : <XCircle size={16} style={{ color: "var(--danger)", flexShrink: 0 }} />}
                        <p style={{ flex: 1, margin: 0, fontSize: "0.875rem" }}>Q{idx+1}. {q.question_text.slice(0,80)}{q.question_text.length>80?"...":""}</p>
                        <ChevronRight size={13} style={{ color: "var(--text-muted)", transform: open?"rotate(90deg)":"none", transition: "0.2s" }} />
                      </div>
                      {open && r && (
                        <div style={{ borderTop: "1px solid var(--glass-border)", padding: "1rem 1.25rem", background: "rgba(0,0,0,0.1)" }}>
                          {q.options?.map((opt:string, oi:number) => {
                            const isCorr = r.correct_answer===opt || r.correct_answer?.replace(/^[a-d]\.\s*/i,'')===opt.replace(/^[a-d]\.\s*/i,'');
                            const isStu = r.student_answer===opt;
                            return (
                              <div key={oi} style={{ padding: "0.45rem 0.75rem", marginBottom: "0.35rem", borderRadius: "6px", border: "1px solid", borderColor: isCorr?"rgba(34,197,94,0.4)":isStu&&!r.is_correct?"rgba(239,68,68,0.4)":"var(--glass-border)", background: isCorr?"rgba(34,197,94,0.08)":isStu&&!r.is_correct?"rgba(239,68,68,0.08)":"transparent", fontSize: "0.875rem", display: "flex", justifyContent: "space-between" }}>
                                <span>{opt}</span>
                                {isCorr && <CheckCircle size={13} style={{ color: "var(--success)" }} />}
                                {isStu && !r.is_correct && <XCircle size={13} style={{ color: "var(--danger)" }} />}
                              </div>
                            );
                          })}
                          {r.explanation && (
                            <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.15)", fontSize: "0.85rem" }}>
                              <span style={{ color: "var(--primary)", fontWeight: 700 }}>💡 {isAO ? "Ibsa" : "Explanation"}: </span>
                              <span style={{ color: "var(--text-secondary)" }}>{r.explanation}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap" }}>
                <button onClick={reset} className="btn btn-primary" style={{ background: "linear-gradient(135deg, var(--warning), #d97706)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <RefreshCw size={15} />{isAO ? "Qormaata Haaraa" : "New Practice Exam"}
                </button>
                <button onClick={() => { setPhase("taking"); setAnswers({}); setResults(null); }} className="btn btn-outline">
                  {isAO ? "Irra Deebi'i" : "Retake This Exam"}
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </AuthGuard>
  );
}
