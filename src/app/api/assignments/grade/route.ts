import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAuthError, requireRole } from "@/lib/api-auth";

// PATCH /api/assignments/grade
// Teacher sets teacher_score and optional feedback on a submission.
// Only the teacher who owns the assignment may grade it.

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(req, ["teacher", "admin"], "teacher");
  if (isAuthError(auth)) return auth;

  try {
    const { submission_id, teacher_score, teacher_feedback } = await req.json();

    if (submission_id === undefined || teacher_score === undefined) {
      return NextResponse.json({ detail: "submission_id and teacher_score are required" }, { status: 400 });
    }

    if (typeof teacher_score !== "number" || teacher_score < 0 || teacher_score > 100) {
      return NextResponse.json({ detail: "teacher_score must be a number between 0 and 100" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify the submission belongs to an assignment owned by this teacher
    const { data: sub } = await supabaseAdmin
      .from("assignment_submissions")
      .select("assignment_id")
      .eq("id", submission_id)
      .single();

    if (sub) {
      const { data: assignment } = await supabaseAdmin
        .from("teacher_assignments")
        .select("teacher_id")
        .eq("id", sub.assignment_id)
        .single();

      if (assignment && assignment.teacher_id !== auth.id && auth.role !== "admin") {
        return NextResponse.json({ detail: "Forbidden: you do not own this assignment." }, { status: 403 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("assignment_submissions")
      .update({
        teacher_score,
        teacher_feedback: teacher_feedback ?? null,
        graded: true,
        graded_at: new Date().toISOString(),
      })
      .eq("id", submission_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ submission: data });
  } catch (err: any) {
    console.error("Grade submission error:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
