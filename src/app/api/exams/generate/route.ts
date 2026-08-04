import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { subject, topic, difficulty, grade } = await req.json();

    if (!subject || !topic) {
      return NextResponse.json({ detail: "subject and topic are required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const gradeNum = parseInt(grade?.replace("Grade", "").trim() || "9");
    let gradeBand = "9-12";
    let language = "English";

    if (gradeNum >= 1 && gradeNum <= 6) {
      gradeBand = "1-6";
      language = "Afaan Oromo";
    } else if (gradeNum >= 7 && gradeNum <= 8) {
      gradeBand = "7-8";
      language = "Afaan Oromo";
    }

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

    const contextBlock = (chunks || []).map((c: any) => c.content).join("\n---\n");

    let questions: any[] = [];
    let answerKey: any[] = [];

    if (!ai) {
      // Mock exam fallback
      if (language === "Afaan Oromo") {
        questions = [
          {
            id: 1,
            type: "multiple_choice",
            question_text: `Qormaata Mock ${subject} - Gaafilee 1: Hiika jecha '${topic}' maali?`,
            options: ["Deebii A", "Deebii B", "Deebii C", "Deebii D"]
          },
          {
            id: 2,
            type: "short_answer",
            question_text: `Gaafilee 2: '${topic}' irratti ibsa gabaabaa barreessi.`
          }
        ];
        answerKey = [
          {
            id: 1,
            correct_answer: "Deebii A",
            explanation: `Jechi '${topic}' hiika garii qaba sababa kanaan Deebii A dha.`
          },
          {
            id: 2,
            correct_answer: `Ibsa '${topic}'`,
            explanation: `Ibsi guutuun '${topic}' haala kanaan ta'a.`
          }
        ];
      } else {
        questions = [
          {
            id: 1,
            type: "multiple_choice",
            question_text: `Mock Exam ${subject} - Question 1: What is the main concept of ${topic}?`,
            options: ["Option A", "Option B", "Option C", "Option D"]
          },
          {
            id: 2,
            type: "short_answer",
            question_text: `Question 2: Briefly explain the importance of ${topic}.`
          }
        ];
        answerKey = [
          {
            id: 1,
            correct_answer: "Option A",
            explanation: `Option A is correct based on the mock curriculum for ${topic}.`
          },
          {
            id: 2,
            correct_answer: `Importance of ${topic}`,
            explanation: `The main importance of ${topic} is to understand its fundamentals.`
          }
        ];
      }
    } else {
      const systemInstruction = `
You are an expert curriculum test designer. Generate a school exam for Grade ${grade} students in ${subject}.
The exam must be generated entirely in the instruction language: ${language}.
Format the output as a strict JSON object with two fields: 'questions' and 'answer_key'.
Ensure questions are:
- Strictly grounded in the provided curriculum context. Do not ask general knowledge questions that are not mentioned or implied by the context.
- Age-appropriate (Grade ${grade} level).
- Divided equally between 'multiple_choice' and 'short_answer' question types.
- Multiple-choice questions must have exactly 4 choices under 'options'.
`;

      const prompt = `
Curriculum Context:
${contextBlock}

Exam Request:
- Subject: ${subject}
- Topic: ${topic}
- Difficulty: ${difficulty}
- Language: ${language}
- Number of questions: 6

Generate the exam. Output MUST be valid JSON matching this schema:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question_text": "text of the question",
      "options": ["choice 1", "choice 2", "choice 3", "choice 4"]
    },
    {
      "id": 2,
      "type": "short_answer",
      "question_text": "text of the question"
    }
  ],
  "answer_key": [
    {
      "id": 1,
      "correct_answer": "choice 1",
      "explanation": "step-by-step explanation why this is correct in ${language}"
    },
    {
      "id": 2,
      "correct_answer": "expected key phrases or answer model",
      "explanation": "step-by-step explanation of what content is required in ${language}"
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
      } catch (err: any) {
        console.error("AI exam generation failed:", err);
        return NextResponse.json({ detail: `AI Exam generation failed: ${err.message}` }, { status: 500 });
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
