import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAuthError, requireRole } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ["student"], "student");
    if (isAuthError(auth)) return auth;
    const { exam_id, answers } = await req.json();

    if (!exam_id || answers === undefined) {
      return NextResponse.json({ detail: "exam_id and answers are required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch exam answer key
    const { data: examData, error: examErr } = await supabaseAdmin
      .from("exams")
      .select("answer_key, questions")
      .eq("id", exam_id)
      .single();

    if (examErr || !examData) {
      return NextResponse.json({ detail: "Exam not found" }, { status: 404 });
    }

    const answerKey = examData.answer_key;

    // Build question-type lookup so scoring can distinguish MC/TF from open-ended
    const questionTypeMap: Record<number, string> = {};
    for (const q of (examData.questions || [])) {
      questionTypeMap[q.id] = q.type;
    }
    const correctMap: Record<number, any> = {};
    for (const item of answerKey) {
      correctMap[item.id] = item;
    }

    let score = 0;
    const results = [];
    const total = answerKey.length;

    for (const ans of answers) {
      const qId = ans.id;
      const studentVal = String(ans.answer || "").trim().toLowerCase();

      const keyItem = correctMap[qId];
      if (!keyItem) continue;

      const correctVal = String(keyItem.correct_answer || "").trim().toLowerCase();
      let isCorrect = false;

      // Resolve type from questions array (more reliable than answer_key.type)
      const qType = questionTypeMap[qId] ?? keyItem.type ?? "multiple_choice";

      // MC and True/False: exact match only
      if (qType === "multiple_choice" || qType === "true_false") {
        isCorrect = correctVal === studentVal;
      } else {
        // Fill-in-blank and definition: partial match, but student answer
        // must be at least 3 characters to prevent single-letter false positives
        if (studentVal.length >= 3) {
          isCorrect = studentVal === correctVal ||
            studentVal.includes(correctVal) ||
            correctVal.includes(studentVal);
        }
      }

      if (isCorrect) score += 1;

      results.push({
        id: qId,
        student_answer: ans.answer,
        correct_answer: keyItem.correct_answer,
        is_correct: isCorrect,
        explanation: keyItem.explanation
      });
    }

    const finalScore = total > 0 ? (score / total) * 100 : 0;

    // 2. Save the attempt using the server-verified student id
    await supabaseAdmin.from("exam_attempts").insert({
      exam_id,
      student_id: auth.id,
      answers,
      score: finalScore
    });

    return NextResponse.json({
      score: finalScore,
      results
    });

  } catch (error: any) {
    console.error("Submit exam endpoint error:", error);
    return NextResponse.json({ detail: error.message || "An error occurred during grading" }, { status: 500 });
  }
}
