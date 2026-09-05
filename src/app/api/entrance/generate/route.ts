import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateWithMultiProvider } from "@/lib/ai/multi-provider";
import { requireRole, isAuthError } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ["student", "teacher", "admin"], "student");
    if (isAuthError(auth)) return auth;

    const { subject, grade, question_count = 10, difficulty = "mixed" } = await req.json();

    if (!subject || !grade) {
      return NextResponse.json({ detail: "subject and grade are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const entranceGrade = `entrance_${grade}`;
    const language = grade === "12" ? "English" : "Afaan Oromo";
    const isAO = language === "Afaan Oromo";

    // Fetch entrance exam chunks for this subject (real past exam patterns)
    const { data: chunks } = await supabase
      .from("curriculum_chunks")
      .select("content, topic, source_document")
      .eq("grade", entranceGrade)
      .eq("subject", subject)
      .limit(12);

    // Also get some general entrance chunks if subject-specific not enough
    let allChunks = chunks || [];
    if (allChunks.length < 4) {
      const { data: generalChunks } = await supabase
        .from("curriculum_chunks")
        .select("content, topic, source_document")
        .eq("grade", entranceGrade)
        .limit(8);
      allChunks = [...allChunks, ...(generalChunks || [])];
    }

    const contextBlock = allChunks.map((c: any) => c.content).join("\n---\n");
    const sources = [...new Set(allChunks.map((c: any) => c.source_document))].filter(Boolean);

    const systemPrompt = isAO
      ? `Ati qormaata seennaa (entrance exam) Oromiyaa Kutaa ${grade} uumtu. 
        
        SEERA MURTEESSAA:
        - Gaaffilee armaan gadii irratti hundaa'uun hojjedhu: ${JSON.stringify(allChunks.slice(0, 6).map((c:any) => c.content.slice(0, 200)))}
        - Gaaffilee akka qormaata seennaa dhugaa fakkaatan uumi
        - Sadarkaa gaaffii: Salphaa 30%, Giddu-galeessa 40%, Cimaa 30%
        - Gaaffiiwwan ${question_count} uumi
        - Deebii sirrii fi ibsa Afaan Oromootiin barreessi
        
        CAASAA JSON qofa deebisi:
        {"questions":[{"id":1,"type":"multiple_choice","question_text":"...","options":["A. ...","B. ...","C. ...","D. ..."]}],"answer_key":[{"id":1,"correct_answer":"A. ...","explanation":"Deebiin kun sirrii dha sababni isaa..."}]}`
      : `You are generating a Grade ${grade} University Entrance Examination (UEE) style exam for ${subject}.
        
        CRITICAL RULES:
        - Study these REAL past exam questions and patterns: ${JSON.stringify(allChunks.slice(0, 6).map((c:any) => c.content.slice(0, 300)))}
        - Generate questions that MATCH the exact style, difficulty, and format of Ethiopian UEE
        - Mix difficulty: 30% easy (knowledge), 40% medium (application), 30% hard (analysis)
        - Generate exactly ${question_count} questions
        - Every explanation must state WHY the answer is correct, referencing the concept
        - Questions should test understanding not just memorization
        
        Return ONLY valid JSON:
        {"questions":[{"id":1,"type":"multiple_choice","question_text":"...","options":["A. ...","B. ...","C. ...","D. ..."]}],"answer_key":[{"id":1,"correct_answer":"A. ...","explanation":"This is correct because..."}]}`;

    const raw = await generateWithMultiProvider(systemPrompt,
      isAO
        ? `Gaaffilee ${question_count} ${subject} Kutaa ${grade} seennaa irratti hojjedhu.`
        : `Generate ${question_count} UEE-style questions for Grade ${grade} ${subject}. Match the real exam pattern.`,
      true
    );

    // Parse JSON
    let examData: any;
    try {
      const cleaned = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
      try { examData = JSON.parse(cleaned); }
      catch {
        const match = cleaned.match(/\{[\s\S]*"questions"[\s\S]*"answer_key"[\s\S]*\}/);
        if (match) examData = JSON.parse(match[0]);
        else throw new Error("No valid JSON");
      }
    } catch {
      return NextResponse.json({ detail: isAO ? "Deebii AI sirrii hin taane. Irra deebi'ii yaali." : "AI returned invalid response. Please try again." }, { status: 503 });
    }

    if (!examData?.questions?.length) {
      return NextResponse.json({ detail: "No questions generated." }, { status: 503 });
    }

    // Save to exams table
    const { data: saved, error: saveErr } = await supabase
      .from("exams")
      .insert({
        subject,
        topic: isAO ? `Qormaata Seennaa — ${subject}` : `Entrance Exam Practice — ${subject}`,
        difficulty: "mixed",
        grade: grade,
        questions: examData.questions,
        answer_key: examData.answer_key || [],
        created_by: auth.id,
      })
      .select("id, subject, topic, questions, created_at")
      .single();

    if (saveErr || !saved) {
      return NextResponse.json({ detail: "Failed to save exam." }, { status: 500 });
    }

    return NextResponse.json({
      id: saved.id,
      subject: saved.subject,
      topic: saved.topic,
      questions: saved.questions,
      answer_key: examData.answer_key || [],
      sources,
      entrance_grade: entranceGrade,
    });

  } catch (error: any) {
    console.error("Entrance generate error:", error);
    return NextResponse.json({ detail: error.message || "Internal server error" }, { status: 500 });
  }
}
