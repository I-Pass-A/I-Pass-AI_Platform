import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAuthError, requireRole } from "@/lib/api-auth";

// POST /api/assignments/submit
// Student submits answers for a teacher-published assignment.
// Auto-scores MC and T/F questions; open-ended items set raw_score to null
// and wait for teacher manual grading.

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ["student"], "student");
  if (isAuthError(auth)) return auth;
  const studentId = auth.id;

  try {
    const { assignment_id, answers } = await req.json();

    if (!assignment_id || !answers) {
      return NextResponse.json({ detail: "assignment_id and answers are required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch the assignment to get exam_id and check due_date
    const { data: assignment, error: aErr } = await supabaseAdmin
      .from("teacher_assignments")
      .select("exam_id, due_date, published")
      .eq("id", assignment_id)
      .single();

    if (aErr || !assignment) {
      return NextResponse.json({ detail: "Assignment not found" }, { status: 404 });
    }

    if (!assignment.published) {
      return NextResponse.json({ detail: "This assignment has not been published yet." }, { status: 400 });
    }

    if (new Date(assignment.due_date) < new Date()) {
      return NextResponse.json({ detail: "The due date for this assignment has passed." }, { status: 400 });
    }

    // 2. Check student hasn't already submitted
    const { data: existing } = await supabaseAdmin
      .from("assignment_submissions")
      .select("id")
      .eq("assignment_id", assignment_id)
      .eq("student_id", studentId)
      .single();

    if (existing) {
      return NextResponse.json({ detail: "You have already submitted this assignment." }, { status: 400 });
    }

    // 3. Auto-score: fetch answer key
    const { data: examData } = await supabaseAdmin
      .from("exams")
      .select("answer_key, questions")
      .eq("id", assignment.exam_id)
      .single();

    let rawScore: number | null = null;

    if (examData?.answer_key && examData?.questions) {
      const questions: any[] = examData.questions;
      const answerKey: any[] = examData.answer_key;

      // Only auto-score MC and T/F — open-ended types need teacher review
      const autoScorable = questions.filter((q: any) =>
        ["multiple_choice", "true_false"].includes(q.type)
      );

      if (autoScorable.length > 0) {
        const keyMap: Record<number, string> = {};
        for (const k of answerKey) {
          keyMap[k.id] = String(k.correct_answer || "").trim().toLowerCase();
        }

        let correct = 0;
        for (const q of autoScorable) {
          const submitted = answers.find((a: any) => a.id === q.id);
          if (submitted) {
            const studentVal = String(submitted.answer || "").trim().toLowerCase();
            if (studentVal === keyMap[q.id]) correct++;
          }
        }
        rawScore = Math.round((correct / autoScorable.length) * 100);
      }
    }

    // 4. Determine if fully auto-graded (no open-ended questions)
    const hasOpenEnded = (examData?.questions || []).some((q: any) =>
      ["blank_space", "definition"].includes(q.type)
    );

    const isFullyGraded = !hasOpenEnded && rawScore !== null;

    // 5. Save submission
    const { data: submission, error: subErr } = await supabaseAdmin
      .from("assignment_submissions")
      .insert({
        assignment_id,
        exam_id: assignment.exam_id,
        student_id: studentId,
        answers,
        raw_score: rawScore,
        teacher_score: isFullyGraded ? rawScore : null,
        graded: isFullyGraded,
        graded_at: isFullyGraded ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (subErr) throw subErr;

    return NextResponse.json({
      submission_id: submission.id,
      raw_score: rawScore,
      graded: isFullyGraded,
      message: isFullyGraded
        ? "Submission received and auto-graded."
        : "Submission received. Your teacher will review and grade it.",
    });
  } catch (err: any) {
    console.error("Assignment submit error:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
