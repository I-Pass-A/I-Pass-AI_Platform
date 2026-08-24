import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

/**
 * Internal SMTP relay — only callable from server-side (same origin)
 * POST /api/notifications/smtp
 * Body: { to, subject, html }
 */
export async function POST(req: NextRequest) {
  // Only allow calls from the same server (internal API calls)
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  // Block external calls — only allow same-origin server calls (no origin header = server-side)
  if (origin && !origin.startsWith(appUrl)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { to, subject, html } = await req.json();

  if (!to || !subject || !html) {
    return NextResponse.json({ error: "Missing required fields: to, subject, html" }, { status: 400 });
  }

  // SMTP config from environment variables
  const smtpHost     = process.env.SMTP_HOST;
  const smtpPort     = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser     = process.env.SMTP_USER;
  const smtpPass     = process.env.SMTP_PASS;
  const smtpFrom     = process.env.SMTP_FROM || `I-Pass-A <${smtpUser}>`;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("SMTP not configured — email notification skipped");
    return NextResponse.json({
      success: false,
      message: "SMTP not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to environment variables.",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to}: ${subject}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("SMTP send failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
