import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateWithMultiProvider, getFallbackResponse } from "@/lib/ai/multi-provider";

export async function POST(req: NextRequest) {
  try {
    const { subject, topic, difficulty, grade, question_types } = await req.json();

    if (!subject || !topic) {
      return NextResponse.json({ detail: "subject and topic are required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const gradeNum = parseInt(grade?.replace("Grade", "").trim() || "12");
    let gradeBand = "12";
    if (gradeNum <= 6) gradeBand = "6";
    else if (gradeNum <= 8) gradeBand = "8";
    else gradeBand = "12";

    const language = (gradeNum <= 8) ? "Afaan Oromo" : "English";

    const allowedTypes = question_types && Array.isArray(question_types) && question_types.length > 0 
      ? question_types 
      : ["multiple_choice"];

    // 1. Fetch relevant chunks for grounding
    let queryVector: number[] = [];
    
    // TODO: Implement embedding with OpenRouter
    // For now, use dummy vector for search
    let embeddingSucceeded = false;

    if (queryVector.length === 0) {
      queryVector = Array.from({ length: 1024 }, (_, idx) => Math.sin(topic.length + idx) * 0.1);
    }

    const matchThreshold = embeddingSucceeded ? 0.5 : 0.1;

    const { data: rawChunks, error: rpcErr } = await supabaseAdmin.rpc("match_chunks", {
      query_embedding: queryVector,
      match_threshold: matchThreshold,
      match_count: 8,
      filter_subject: subject,
      filter_grade: gradeBand,
      filter_language: language
    });

    if (rpcErr) {
      console.error("match_chunks RPC failed:", rpcErr);
    }

    // Expand chunks for better context
    const allChunkIds = rawChunks ? rawChunks.map((c: any) => c.id) : [];
    const expandedChunkIds: number[] = [];

    for (const chunkId of allChunkIds) {
      expandedChunkIds.push(chunkId - 1, chunkId, chunkId + 1);
    }

    const { data: chunks } = await supabaseAdmin
      .from("chunks")
      .select("content")
      .in("id", expandedChunkIds)
      .order("id");

    const contextBlock = chunks?.map((c: any) => c.content).join("\n---\n") || "";

    // Generate exam using OpenRouter
    try {
      const systemPrompt = `You are an expert exam generator for Ethiopian curriculum (Grades 1-12). Generate exactly ${allowedTypes.length} questions based on the provided curriculum context.

Requirements:
- Subject: ${subject}
- Topic: ${topic}  
- Grade: ${gradeBand}
- Language: ${language}
- Question types: ${allowedTypes.join(", ")}
- Difficulty: ${difficulty || "medium"}

Context from curriculum:
${contextBlock}

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice", 
      "question_text": "Question text here",
      "options": ["A", "B", "C", "D"]
    }
  ],
  "answer_key": [
    {
      "id": 1,
      "correct_answer": "A",
      "explanation": "Why this is correct"
    }
  ]
}`;

      const userPrompt = `Generate ${allowedTypes.length} exam questions about "${topic}" for Grade ${gradeBand} students in ${language}.`;

      const response = await generateWithMultiProvider(systemPrompt, userPrompt);
      
      // Try to parse the AI response
      const examData = JSON.parse(response);
      
      return NextResponse.json({
        questions: examData.questions || [],
        answer_key: examData.answer_key || [],
        context_used: contextBlock.length > 0,
        curriculum_grounded: chunks && chunks.length > 0
      });

    } catch (error) {
      console.error("Exam generation failed:", error);
      
      // Return fallback response
      return NextResponse.json({
        detail: language === "Afaan Oromo"
          ? "Yeroo ammaa tajaajilli AI hin jiru. Maaloo yeroo muraasa booda yaali."
          : "AI service temporarily unavailable. Please try again in a moment.",
        fallback: true
      }, { status: 503 });
    }

  } catch (error) {
    console.error("Exam generation error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}