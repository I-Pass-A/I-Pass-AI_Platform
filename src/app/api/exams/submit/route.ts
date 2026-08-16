import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { exam_id, answers, student_id } = await req.json();

    if (!exam_id || answers === undefined) {
      return NextResponse.json({ detail: "exam_id and answers are required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch exam answer key
    const { data: examData, error: examErr } = await supabaseAdmin
      .from("exams")
      .select("answer_key")
      .eq("id", exam_id)
      .single();

    if (examErr || !examData) {
      return NextResponse.json({ detail: "Exam not found" }, { status: 404 });
    }

    const answerKey: Array<{ id: number; correct_answer: string; explanation: string }> = examData.answer_key;
    const correctMap: Record<number, { id: number; correct_answer: string; explanation: string }> = {};
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

      if (correctVal === studentVal || studentVal.includes(correctVal) || correctVal.includes(studentVal)) {
        isCorrect = true;
        score += 1;
      }

      results.push({
        id: qId,
        student_answer: ans.answer,
        correct_answer: keyItem.correct_answer,
        is_correct: isCorrect,
        explanation: keyItem.explanation
      });
    }

    const finalScore = total > 0 ? (score / total) * 100 : 0;

    // 2. Save the attempt
    // Set student_id if provided (we'll pass it from frontend Client Session)
    if (student_id) {
      await supabaseAdmin.from("exam_attempts").insert({
        exam_id,
        student_id,
        answers,
        score: finalScore
      });
    }

    return NextResponse.json({
      score: finalScore,
      results
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "An error occurred during grading";
    console.error("Submit exam endpoint error:", error);
    return NextResponse.json({ detail: errMsg }, { status: 500 });
  }
}
