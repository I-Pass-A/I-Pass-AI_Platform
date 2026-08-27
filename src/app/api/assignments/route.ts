import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAuthError, requireRole } from "@/lib/api-auth";

// GET  /api/assignments  — list assignments visible to the current user
// POST /api/assignments  — teacher publishes a generated exam as an assignment

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ["student", "teacher", "admin"], "student");
  if (isAuthError(auth)) return auth;
  const supabaseAdmin = getSupabaseAdmin();
  let callerGrade: string | null = null;
  if (auth.role === "student") {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("grade")
      .eq("id", auth.id)
      .single();
    callerGrade = profile?.grade ?? null;
  }

  try {
    let query = supabaseAdmin
      .from("teacher_assignments")
      .select(`
        id, title, assignment_type, target_grade, due_date, published, published_at, created_at,
        teacher_id,
        exams ( id, subject, topic, difficulty, questions )
      `)
      .order("created_at", { ascending: false });

    if (auth.role === "teacher") {
      // Teachers see their own assignments regardless of publish state
      query = query.eq("teacher_id", auth.id);
    } else if (auth.role === "student") {
      // Students see only published assignments for their grade that are not past due
      query = query
        .eq("published", true)
        .eq("target_grade", callerGrade ?? "");
    } else if (auth.role === "admin") {
      // Admins see everything — no filter
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ assignments: data || [] });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ["teacher", "admin"], "teacher");
  if (isAuthError(auth)) return auth;
  try {
    const body = await req.json();
    const { exam_id, title, assignment_type, target_grade, due_date, publish_now } = body;

    if (!exam_id || !title || !assignment_type || !target_grade || !due_date) {
      return NextResponse.json({ detail: "Missing required fields: exam_id, title, assignment_type, target_grade, due_date" }, { status: 400 });
    }

    if (!["quiz", "homework", "assignment"].includes(assignment_type)) {
      return NextResponse.json({ detail: "assignment_type must be quiz, homework, or assignment" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("teacher_assignments")
      .insert({
        exam_id,
        teacher_id: auth.id,
        title,
        assignment_type,
        target_grade,
        due_date,
        published: publish_now === true,
        published_at: publish_now === true ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    // Fire assignment notification email to students (non-blocking)
    if (publish_now === true && data) {
      // Get exam subject/topic for the email
      const { data: examData } = await supabaseAdmin
        .from("exams")
        .select("subject, topic")
        .eq("id", exam_id)
        .single();

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://i-pass-ai-platform.vercel.app";

      // Fire and forget — don't block the response
      fetch(`${appUrl}/api/notifications/assignment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": req.headers.get("authorization") || "",
        },
        body: JSON.stringify({
          assignment_id: data.id,
          title,
          subject: examData?.subject || "",
          topic: examData?.topic || "",
          due_date,
          target_grade,
          assignment_type,
        }),
      }).then(r => r.json())
        .then(r => console.log(`📧 Notifications: ${r.message || r.error}`))
        .catch(e => console.error("Notification dispatch failed:", e.message));
    }

    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
