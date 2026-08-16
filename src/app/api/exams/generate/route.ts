import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { subject, topic, difficulty, grade, question_types } = await req.json();

    if (!subject || !topic) {
      return NextResponse.json({ detail: "subject and topic are required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const gradeNum = parseInt(grade?.replace("Grade", "").trim() || "12");
    let gradeBand = "12";
    let language = "English";

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

    if (ai) {
      try {
        const embedRes = await ai.models.embedContent({
          model: "text-embedding-004",
          contents: topic
        });
        if (embedRes.embeddings && embedRes.embeddings[0] && embedRes.embeddings[0].values) {
          queryVector = embedRes.embeddings[0].values;
        }
      } catch (e) {
        console.error("Embedding generation error:", e);
      }
    }

    if (queryVector.length === 0) {
      queryVector = Array.from({ length: 1536 }, (_, idx) => Math.sin(topic.length + idx) * 0.1);
    }

    const { data: chunks, error: rpcErr } = await supabaseAdmin.rpc("match_chunks", {
      query_embedding: queryVector,
      match_threshold: 0.1,
      match_count: 5,
      filter_subject: subject,
      filter_grade: gradeBand,
      filter_language: language
    });

    if (rpcErr) {
      console.error("match_chunks RPC failed:", rpcErr);
    }

    const contextBlock = (chunks || []).map((c: { content: string }) => c.content).join("\n---\n");

    interface ExamQuestion {
      id: number;
      type: string;
      question_text: string;
      options?: string[];
    }
    interface AnswerKeyItem {
      id: number;
      correct_answer: string;
      explanation: string;
    }

    let questions: ExamQuestion[] = [];
    let answerKey: AnswerKeyItem[] = [];

    if (!ai) {
      // Mock exam fallback based on chosen types
      const mockQuestions: ExamQuestion[] = [];
      const mockAnswerKey: AnswerKeyItem[] = [];

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
            correct_answer: language === "Afaan Oromo" ? `Hiika ${topic}` : `Definition of ${topic}`,
            explanation: language === "Afaan Oromo" ? "Hiikni kun yaada guutuu ibsuu qaba." : "The definition must cover the main curriculum concept."
          });
        }
      });

      questions = mockQuestions;
      answerKey = mockAnswerKey;
    } else {
      const systemInstruction = `
You are an expert curriculum test designer. Generate a school exam for Grade ${grade} students in ${subject}.
The exam must be generated entirely in the instruction language: ${language}.
Format the output as a strict JSON object with two fields: 'questions' and 'answer_key'.
Ensure questions are:
- Strictly grounded in the provided curriculum context. Do not ask general knowledge questions that are not mentioned or implied by the context.
- Age-appropriate (Grade ${grade} level).
- Generate ONLY the following question types: ${allowedTypes.join(", ")}.
- Guidelines for question types:
  - 'multiple_choice': Provide a 'question_text' and 'options' (array of exactly 4 choices).
  - 'true_false': Provide a 'question_text' and 'options' (array of exactly 2 choices: ["True", "False"] in English, or ["Dhugaa", "Soba"] in Afaan Oromo).
  - 'blank_space': Provide a 'question_text' (use blank underscores). Do NOT provide 'options'.
  - 'definition': Provide a 'question_text' asking to define or explain a term. Do NOT provide 'options'.
`;

      const prompt = `
Curriculum Context:
${contextBlock}

Exam Request:
- Subject: ${subject}
- Topic: ${topic}
- Difficulty: ${difficulty}
- Language: ${language}
- Question Types: ${allowedTypes.join(", ")}
- Number of questions: 6 (distributed evenly among the requested types)

Generate the exam. Output MUST be valid JSON matching this schema:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice" | "true_false" | "blank_space" | "definition",
      "question_text": "text of the question",
      "options": ["choice 1", "choice 2", ...] // Only include if type is 'multiple_choice' or 'true_false'
    }
  ],
  "answer_key": [
    {
      "id": 1,
      "correct_answer": "expected correct option, word, or explanation summary",
      "explanation": "step-by-step explanation why this is correct in ${language}"
    }
  ]
}
`;
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json"
          }
        });
        const data = JSON.parse(response.text || "{}");
        questions = data.questions;
        answerKey = data.answer_key;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("AI exam generation failed:", err);
        return NextResponse.json({ detail: `AI Exam generation failed: ${errMsg}` }, { status: 500 });
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

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "An error occurred during exam generation";
    console.error("Generate exam API error:", error);
    return NextResponse.json({ detail: errMsg }, { status: 500 });
  }
}
