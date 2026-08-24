import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/notifications/assignment
 * Called when a teacher publishes an assignment.
 * Sends email notifications to all students in the target grade.
 *
 * Body: { assignment_id, title, subject, topic, due_date, target_grade, assignment_type }
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Verify caller is a teacher or admin
  const { data: { user } } = await supabase.auth.getUser(authHeader.substring(7));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, name, grade_taught")
    .eq("id", user.id)
    .single();

  if (!["teacher", "admin"].includes(callerProfile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { assignment_id, title, subject, topic, due_date, target_grade, assignment_type } = await req.json();

  if (!assignment_id || !title || !target_grade) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get all active, verified students in the target grade
  const { data: students, error: studentsError } = await supabase
    .from("profiles")
    .select("id, name, email_verified, is_active")
    .eq("role", "student")
    .eq("grade", target_grade)
    .eq("is_active", true)
    .eq("email_verified", true);

  if (studentsError) {
    console.error("Failed to fetch students:", studentsError);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }

  if (!students || students.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No verified students found in this grade",
      notified: 0,
    });
  }

  // Get email addresses from auth.users via admin API
  const dueDate = new Date(due_date).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const typeLabel = assignment_type === "quiz" ? "Quiz"
    : assignment_type === "homework" ? "Homework"
    : "Assignment";

  let notified = 0;
  const errors: string[] = [];

  for (const student of students) {
    try {
      // Get auth user to get email
      const { data: authUser } = await supabase.auth.admin.getUserById(student.id);
      const email = authUser?.user?.email;
      if (!email) continue;

      // Send email using Supabase's built-in email (via auth invite magic)
      // We use a custom email send via SMTP configured in Supabase
      await sendAssignmentEmail({
        to: email,
        studentName: student.name,
        teacherName: callerProfile?.name || "Your Teacher",
        title,
        subject: subject || "General",
        topic: topic || "",
        dueDate,
        typeLabel,
        grade: target_grade,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://i-pass-ai-platform.vercel.app",
      });

      notified++;
    } catch (e: any) {
      errors.push(`${student.name}: ${e.message}`);
      console.error(`Email failed for ${student.name}:`, e.message);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Assignment notification sent to ${notified} student${notified !== 1 ? "s" : ""}`,
    notified,
    total_students: students.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// ── Email sender using fetch to SMTP-configured Supabase ──────────────────────
async function sendAssignmentEmail(opts: {
  to: string;
  studentName: string;
  teacherName: string;
  title: string;
  subject: string;
  topic: string;
  dueDate: string;
  typeLabel: string;
  grade: string;
  appUrl: string;
}) {
  const html = `
<div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 20px; background: #060b19; border-radius: 16px; color: #f8fafc;">

  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #0ea5e9; font-size: 28px; margin: 0 0 4px; font-weight: 800;">I-Pass-A</h1>
    <p style="color: #94a3b8; margin: 0; font-size: 14px;">AI Tutor and Exam Prep</p>
  </div>

  <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 28px;">
    <p style="color: #94a3b8; font-size: 14px; margin: 0 0 4px;">Hello ${opts.studentName},</p>
    <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 20px; color: #f8fafc;">
      New ${opts.typeLabel} Published
    </h2>

    <div style="background: rgba(14,165,233,0.08); border: 1px solid rgba(14,165,233,0.2); border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 6px; font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">${opts.typeLabel}</p>
      <p style="margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #f8fafc;">${opts.title}</p>
      <p style="margin: 0; font-size: 14px; color: #94a3b8;">${opts.subject}${opts.topic ? ` — ${opts.topic}` : ""} · Grade ${opts.grade}</p>
    </div>

    <table style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Assigned by</td>
        <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #f8fafc; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">${opts.teacherName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #94a3b8;">Due date</td>
        <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #f59e0b; text-align: right;">${opts.dueDate}</td>
      </tr>
    </table>

    <div style="text-align: center;">
      <a href="${opts.appUrl}/exams"
        style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 13px 36px; border-radius: 8px;">
        View Assignment
      </a>
    </div>
  </div>

  <p style="color: #475569; font-size: 12px; text-align: center; margin-top: 24px;">
    I-Pass-A · Developed by Adama Smart City
  </p>
</div>`;

  // Use Supabase Auth admin to trigger email via their SMTP
  // Since Supabase doesn't have a direct "send custom email" endpoint,
  // we call our own SMTP relay endpoint
  const smtpUrl = process.env.NEXT_PUBLIC_APP_URL + "/api/notifications/smtp";

  const res = await fetch(smtpUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: opts.to, subject: `New ${opts.typeLabel}: ${opts.title}`, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SMTP relay failed: ${err}`);
  }
}
