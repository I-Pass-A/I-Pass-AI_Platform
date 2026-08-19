import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";
import { generateWithFallback } from "@/lib/ai/generate";

export async function POST(req: NextRequest) {
  try {
    const { subject, topic, difficulty, grade, question_types } = await req.json();

    if (!subject || !topic) {
      return NextResponse.json({ detail: "subject and topic are required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const gradeNum = parseInt(grade?.replace("Grade", "").trim() || "12");
    let gradeBand = "12";
    let language: string = "English";

    if (gradeNum === 6) {
      gradeBand = "6";
      language = "Afaan Oromo";
    } else if (gradeNum === 8) {
      gradeBand = "8";
      language = "Afaan Oromo";
    }

    const allowedTypes = question_types && Array.isArray(question_types) && question_types.length > 0 
      ? question_types 
      : ["multiple_choice"];

    // 1. Fetch relevant chunks for grounding
    let queryVector: number[] = [];
    const apiKey = process.env.GEMINI_API_KEY;
    let ai: GoogleGenAI | null = null;
    if (apiKey) {
      ai = new GoogleGenAI({ apiKey });
    }

    let embeddingSucceeded = false;
    if (ai) {
      try {
        const embedRes = await ai.models.embedContent({
          model: "gemini-embedding-2",
          contents: topic,
          config: { outputDimensionality: 1024 }
        });
        if (embedRes.embeddings && embedRes.embeddings[0] && embedRes.embeddings[0].values) {
          queryVector = embedRes.embeddings[0].values;
          embeddingSucceeded = true;
        }
      } catch (e) {
        console.error("Embedding generation error:", e);
      }
    }

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

    // Neighbor expansion — pull chunk before/after each match so exam questions
    // aren't based on a concept that was split across a chunk boundary
    let chunks = rawChunks || [];

    if (chunks.length > 0) {
      const seen = new Set(chunks.map((c: any) => c.id));
      const neighborPromises = chunks.map((c: any) =>
        supabaseAdmin
          .from("curriculum_chunks")
          .select("id, subject, topic, grade, language, source_document, content, chunk_index")
          .eq("source_document", c.source_document)
          .in("chunk_index", [c.chunk_index - 1, c.chunk_index + 1])
      );
      const neighborResults = await Promise.all(neighborPromises);
      for (const result of neighborResults) {
        for (const neighbor of result.data || []) {
          if (!seen.has(neighbor.id)) {
            seen.add(neighbor.id);
            chunks.push({ ...neighbor, similarity: 0.0 });
          }
        }
      }
      // Keep natural reading order
      chunks.sort((a: any, b: any) => {
        if (a.source_document !== b.source_document)
          return a.source_document.localeCompare(b.source_document);
        return (a.chunk_index ?? 0) - (b.chunk_index ?? 0);
      });
    }

    const contextBlock = chunks.map((c: any) => c.content).join("\n---\n");

    // Guard: only block when embedding actually worked AND no chunks found.
    // If embedding failed (quota exhausted), allow through with fallback context.
    if (chunks.length === 0 && embeddingSucceeded && ai) {
      return NextResponse.json({
        detail: `No curriculum materials found for ${subject} (Grade ${gradeBand}). Please ask an administrator to upload the ${subject} textbook through the Admin Panel before generating exams.`
      }, { status: 422 });
    }

    let questions: any[] = [];
    let answerKey: any[] = [];

    if (!ai) {
      // Mock exam fallback based on chosen types
      const mockQuestions: any[] = [];
      const mockAnswerKey: any[] = [];

      allowedTypes.forEach((t, index) => {
        const qId = index + 1;
        if (t === "multiple_choice") {
          mockQuestions.push({
            id: qId,
            type: "multiple_choice",
            question_text: language === "Afaan Oromo" 
              ? `[MC] Yaad-rimee '${topic}' ilaalchisee deebii sirrii filadhu:` 
              : `[MC] Choose the statement that best describes '${topic}':`,
            options: language === "Afaan Oromo" 
              ? ["Filannoo A", "Filannoo B", "Filannoo C", "Filannoo D"] 
              : ["Option A", "Option B", "Option C", "Option D"]
          });
          mockAnswerKey.push({
            id: qId,
            type: t,
            correct_answer: language === "Afaan Oromo" ? "Filannoo A" : "Option A",
            explanation: language === "Afaan Oromo" ? "Ibsa: Filannoon A caasaa barumsaatiin sirriidha." : "Explanation: Option A is correct based on the curriculum."
          });
        } else if (t === "true_false") {
          mockQuestions.push({
            id: qId,
            type: "true_false",
            question_text: language === "Afaan Oromo"
              ? `[T/F] Yaadni '${topic}' jedhu bu'uura barumsaa kutaati.`
              : `[T/F] The statement regarding '${topic}' is historically correct.`,
            options: language === "Afaan Oromo" ? ["Dhugaa", "Soba"] : ["True", "False"]
          });
          mockAnswerKey.push({
            id: qId,
            type: t,
            correct_answer: language === "Afaan Oromo" ? "Dhugaa" : "True",
            explanation: language === "Afaan Oromo" ? "Ibsa: Eeyyee, yaadni kun dhugaa dha." : "Explanation: Yes, this fact is verified."
          });
        } else if (t === "blank_space") {
          mockQuestions.push({
            id: qId,
            type: "blank_space",
            question_text: language === "Afaan Oromo"
              ? `[Fill-in] Kutaa barumsa kanaan, yaad-rimeen '${topic}' bakka _______________ bu'a.`
              : `[Fill-in] In this chapter, the primary classification of '${topic}' is _______________.`
          });
          mockAnswerKey.push({
            id: qId,
            type: t,
            correct_answer: language === "Afaan Oromo" ? "caasaa" : "essential",
            explanation: language === "Afaan Oromo" ? "Jechi kun iddoo duudaa sirriitti guuta." : "This fits the statement model."
          });
        } else if (t === "definition") {
          mockQuestions.push({
            id: qId,
            type: "definition",
            question_text: language === "Afaan Oromo"
              ? `[Define] Yaad-rimee '${topic}' jedhamu maali? Gabaabsi hiika isaa barreessi.`
              : `[Define] What is '${topic}'? Write a brief definition.`
          });
          mockAnswerKey.push({
            id: qId,
            type: t,
            correct_answer: language === "Afaan Oromo" ? `Hiika ${topic}` : `Definition of ${topic}`,
            explanation: language === "Afaan Oromo" ? "Hiikni kun yaada guutuu ibsuu qaba." : "The definition must cover the main curriculum concept."
          });
        }
      });

      questions = mockQuestions;
      answerKey = mockAnswerKey;
    } else {
      const systemInstruction = `You are an expert curriculum test designer for Ethiopian Grade ${grade} ${subject}.
Generate exams ONLY from the provided curriculum context. Output valid JSON only.
Language: ${language}. Never include content outside the curriculum context.`;

      const prompt = `Curriculum Context:
${contextBlock}

Generate a ${difficulty} difficulty exam for Grade ${grade} ${subject}.
Topic: ${topic}
Language: ${language}
Question types: ${allowedTypes.join(", ")}
Number of questions: 6 (distributed evenly across requested types)

Output ONLY this JSON structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice" | "true_false" | "blank_space" | "definition",
      "question_text": "...",
      "options": ["A","B","C","D"]  // only for multiple_choice and true_false
    }
  ],
  "answer_key": [
    {
      "id": 1,
      "type": "multiple_choice" | "true_false" | "blank_space" | "definition",
      "correct_answer": "...",
      "explanation": "step-by-step explanation in ${language}"
    }
  ]
}`;

      try {
        const raw = await generateWithFallback({
          prompt,
          systemInstruction,
          jsonMode: true,
        });
        const data = JSON.parse(raw || "{}");
        questions = data.questions;
        answerKey = data.answer_key;
      } catch (err: any) {
        console.error("AI exam generation failed:", err);
        return NextResponse.json({
          detail: err.message === "AI_UNAVAILABLE"
            ? "AI service temporarily unavailable. Please try again in a moment."
            : `Exam generation failed: ${err.message}`
        }, { status: 503 });
      }
    }

    // 2. Save exam to database
    const { data: examData, error: examErr } = await supabaseAdmin.from("exams").insert({
      subject,
      topic,
      difficulty,
      grade,
      questions,
      answer_key: answerKey
    }).select().single();

    if (examErr) {
      throw new Error(`Failed to save exam: ${examErr.message}`);
    }

    return NextResponse.json({
      id: examData.id,
      subject: examData.subject,
      topic: examData.topic,
      difficulty: examData.difficulty,
      grade: examData.grade,
      questions: examData.questions
    });

  } catch (error: any) {
    console.error("Generate exam API error:", error);
    return NextResponse.json({ detail: error.message || "An error occurred during exam generation" }, { status: 500 });
  }
}
