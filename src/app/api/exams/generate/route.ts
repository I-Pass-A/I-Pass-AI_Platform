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

    // Get authenticated user
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.substring(7));
      userId = user?.id ?? null;
    }

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
    const systemPrompt = `You are an exam generator. Output ONLY raw JSON with no explanation, no markdown, no preamble.

EXAM SPEC:
- Subject: ${subject}
- Topic: ${topic}
- Grade: ${gradeBand}
- Language: ${language}
- Difficulty: ${difficulty || "medium"}
- Total questions: ${totalQuestions} (distribution: ${typeDist})

${contextBlock ? `CURRICULUM CONTEXT:\n${contextBlock}\n` : ""}

CRITICAL RULES:
1. Every answer_key entry MUST have a non-empty explanation (1-2 sentences saying WHY the answer is correct)
2. Explanations must be educational and reference the subject matter
3. Never leave explanation as empty string ""

OUTPUT FORMAT (raw JSON only, nothing else before or after):
{
  "questions": [
    {"id": 1, "type": "multiple_choice", "question_text": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."]},
    {"id": 2, "type": "true_false", "question_text": "...", "options": ["True", "False"]},
    {"id": 3, "type": "blank_space", "question_text": "The ___ is responsible for ..."},
    {"id": 4, "type": "definition", "question_text": "Define: photosynthesis"}
  ],
  "answer_key": [
    {"id": 1, "correct_answer": "A. ...", "explanation": "This is correct because [reason from curriculum]."},
    {"id": 2, "correct_answer": "True", "explanation": "This is true because [reason from curriculum]."},
    {"id": 3, "correct_answer": "mitochondria", "explanation": "The mitochondria is responsible for [reason]."},
    {"id": 4, "correct_answer": "Photosynthesis is the process by which...", "explanation": "Photosynthesis converts light energy into chemical energy stored in glucose."}
  ]
}`;

    const userPrompt = `Generate ${totalQuestions} exam questions about "${topic}" for Grade ${gradeBand} in ${language}. Distribution: ${typeDist}.`;

    // 3. Call AI with JSON mode enabled
    const raw = await generateWithMultiProvider(systemPrompt, userPrompt, true);

    // 4. Parse JSON (handle markdown fences, extract JSON from anywhere in response)
    let examData: { questions: any[]; answer_key: any[] };
    try {
      // Strip markdown fences
      let cleaned = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
      
      // Try direct parse first
      try {
        examData = JSON.parse(cleaned);
      } catch {
        // Extract JSON object from within the response text
        const jsonMatch = cleaned.match(/\{[\s\S]*"questions"[\s\S]*"answer_key"[\s\S]*\}/);
        if (jsonMatch) {
          examData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No valid JSON found in AI response");
        }
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response. Raw response (first 500 chars):", raw.slice(0, 500));
      return NextResponse.json({
        detail: language === "Afaan Oromo"
          ? "Deebii AI sirrii hin taane. Maaloo irra deebi'ii yaali."
          : "AI returned an invalid response. Please try again.",
      }, { status: 503 });
    }

    if (!Array.isArray(examData.questions) || examData.questions.length === 0) {
      return NextResponse.json({ detail: "AI returned no questions. Please try again." }, { status: 503 });
    }

    // Post-process: fill any empty explanations so students always see feedback
    const answerKey = (examData.answer_key || []).map((item: any, idx: number) => {
      const q = examData.questions.find((q: any) => q.id === item.id) || examData.questions[idx];
      if (!item.explanation || item.explanation.trim() === "") {
        item.explanation = language === "Afaan Oromo"
          ? `Deebiin sirrii "${item.correct_answer}" dha. ${q?.question_text ? `Gaaffii "${q.question_text.slice(0, 60)}" irratti.' ` : ""}`
          : `The correct answer is "${item.correct_answer}". Review your ${subject} notes on "${topic}" for more details.`;
      }
      return item;
    });
    examData.answer_key = answerKey;

    // 5. Save exam to DB
    const { data: savedExam, error: saveErr } = await supabaseAdmin
      .from("exams")
      .insert({
        subject,
        topic,
        difficulty: difficulty || "medium",
        grade:       gradeBand,
        questions:   examData.questions,
        answer_key:  examData.answer_key || [],
        created_by:  userId,
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
