import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateWithMultiProvider } from "@/lib/ai/multi-provider";

export async function POST(req: NextRequest) {
  try {
    const { subject, topic, difficulty, grade, question_types, question_count } = await req.json();

    if (!subject || !topic) {
      return NextResponse.json({ detail: "subject and topic are required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Resolve grade band
    const gradeNum = parseInt(grade?.replace("Grade", "").trim() || "12");
    const gradeBand = gradeNum <= 6 ? "6" : gradeNum <= 8 ? "8" : "12";
    const language   = gradeNum <= 8 ? "Afaan Oromo" : "English";

    const allowedTypes: string[] = (Array.isArray(question_types) && question_types.length > 0)
      ? question_types
      : ["multiple_choice"];

    const totalQuestions = [5, 10, 15, 20].includes(Number(question_count))
      ? Number(question_count)
      : 10;

    // Distribute question count across selected types evenly
    const perType  = Math.floor(totalQuestions / allowedTypes.length);
    const remainder = totalQuestions % allowedTypes.length;
    const typeDist  = allowedTypes.map((t, i) => `${perType + (i < remainder ? 1 : 0)}x ${t}`).join(", ");

    // 1. Fetch curriculum chunks for context
    let contextBlock = "";
    try {
      const { data: chunks } = await supabaseAdmin
        .from("curriculum_chunks")
        .select("content, topic")
        .eq("subject", subject)
        .eq("grade", gradeBand)
        .eq("language", language)
        .limit(6);

      if (chunks && chunks.length > 0) {
        contextBlock = chunks.map((c: any) => c.content).join("\n---\n");
      }
    } catch (e) {
      console.warn("Chunk fetch failed, generating without context:", e);
    }

    // 2. Build prompt
    const systemPrompt = `You are an expert exam generator for the Ethiopian school curriculum.

REQUIREMENTS:
- Subject: ${subject}
- Topic: ${topic}
- Grade: ${gradeBand}
- Language: ${language}
- Difficulty: ${difficulty || "medium"}
- Total questions: ${totalQuestions}
- Distribution: ${typeDist}

${contextBlock ? `CURRICULUM CONTEXT:\n${contextBlock}\n` : ""}

RULES:
1. Generate EXACTLY ${totalQuestions} questions total
2. Use ONLY the specified question types
3. For multiple_choice: always provide exactly 4 options array
4. For true_false: provide options ["True","False"] (or ["Dhugaa","Soba"] for Afaan Oromo)
5. For blank_space / definition: no options field needed
6. All text must be in ${language}
7. Answer key must have one entry per question

Return ONLY valid JSON (no markdown, no explanation) in EXACTLY this format:
{
  "questions": [
    {"id": 1, "type": "multiple_choice", "question_text": "...", "options": ["A","B","C","D"]},
    {"id": 2, "type": "true_false",      "question_text": "...", "options": ["True","False"]},
    {"id": 3, "type": "blank_space",     "question_text": "Complete: ___ is ..."},
    {"id": 4, "type": "definition",      "question_text": "Define: ..."}
  ],
  "answer_key": [
    {"id": 1, "correct_answer": "B", "explanation": "Because..."},
    {"id": 2, "correct_answer": "True", "explanation": "Because..."},
    {"id": 3, "correct_answer": "photosynthesis", "explanation": "Because..."},
    {"id": 4, "correct_answer": "The process of ...", "explanation": ""}
  ]
}`;

    const userPrompt = `Generate ${totalQuestions} exam questions about "${topic}" for Grade ${gradeBand} in ${language}. Distribution: ${typeDist}.`;

    // 3. Call AI
    const raw = await generateWithMultiProvider(systemPrompt, userPrompt);

    // 4. Parse JSON (strip markdown fences if present)
    let examData: { questions: any[]; answer_key: any[] };
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      examData = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", raw.slice(0, 300));
      return NextResponse.json({
        detail: language === "Afaan Oromo"
          ? "Deebii AI sirrii hin taane. Maaloo irra deebi'ii yaali."
          : "AI returned an invalid response. Please try again.",
      }, { status: 503 });
    }

    if (!Array.isArray(examData.questions) || examData.questions.length === 0) {
      return NextResponse.json({ detail: "AI returned no questions. Please try again." }, { status: 503 });
    }

    // 5. Save exam to DB
    const { data: savedExam, error: saveErr } = await supabaseAdmin
      .from("exams")
      .insert({
        subject,
        topic,
        difficulty: difficulty || "medium",
        grade: gradeBand,
        questions:   examData.questions,
        answer_key:  examData.answer_key || [],
      })
      .select("id, subject, topic, difficulty, grade, questions, created_at")
      .single();

    if (saveErr || !savedExam) {
      console.error("Failed to save exam:", saveErr);
      return NextResponse.json({ detail: "Failed to save exam to database." }, { status: 500 });
    }

    return NextResponse.json({
      id:                 savedExam.id,
      subject:            savedExam.subject,
      topic:              savedExam.topic,
      difficulty:         savedExam.difficulty,
      grade:              savedExam.grade,
      questions:          savedExam.questions,
      curriculum_grounded: contextBlock.length > 0,
      created_at:         savedExam.created_at,
    });

  } catch (error: any) {
    console.error("Exam generation error:", error);
    return NextResponse.json({ detail: error.message || "Internal server error" }, { status: 500 });
  }
}
