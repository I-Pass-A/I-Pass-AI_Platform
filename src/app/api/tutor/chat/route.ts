import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";

// Current Gemini models
const GENERATION_MODEL = "gemini-3.6-flash";
const EMBEDDING_MODEL = "gemini-embedding-2";

export async function POST(req: NextRequest) {
  try {
    const { session_id, query, grade } = await req.json();

    if (!session_id || !query?.trim()) {
      return NextResponse.json(
        {
          detail: "session_id and query are required",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // ============================================================
    // 1. GET TUTOR SESSION
    // ============================================================

    const { data: sessionData, error: sessionErr } =
      await supabaseAdmin
        .from("tutor_sessions")
        .select("subject, user_id")
        .eq("id", session_id)
        .single();

    if (sessionErr || !sessionData) {
      console.error("Tutor session lookup failed:", sessionErr);

      return NextResponse.json(
        {
          detail:
            sessionErr?.message ||
            "Tutor session not found",
        },
        { status: 404 }
      );
    }

    const subject = sessionData.subject;

    // ============================================================
    // 2. DETERMINE GRADE / LANGUAGE
    // ============================================================

    const gradeText = String(grade || "Grade 12");

    const gradeMatch = gradeText.match(/\d+/);
    const gradeNum = gradeMatch
      ? parseInt(gradeMatch[0], 10)
      : 12;

    let gradeBand = "12";
    let language = "English";

    if (gradeNum === 6 || gradeNum === 8) {
      gradeBand = String(gradeNum);
      language = "Afaan Oromo";
    }

    // ============================================================
    // 3. INITIALIZE GEMINI
    // ============================================================

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY is missing from .env"
      );

      return NextResponse.json(
        {
          detail:
            "GEMINI_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    // ============================================================
    // 4. CREATE QUERY EMBEDDING
    // ============================================================

    let queryVector: number[] = [];

    try {
      const embedRes = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: query.trim(),
        config: {
          outputDimensionality: 1536,
        },
      });

      const values =
        embedRes.embeddings?.[0]?.values;

      if (values && values.length > 0) {
        queryVector = values;
      }

      console.log(
        "Embedding generated:",
        queryVector.length
      );
    } catch (embeddingError) {
      console.error(
        "Embedding generation failed:",
        embeddingError
      );
    }

    // ============================================================
    // 5. RAG RETRIEVAL
    // ============================================================

    let chunks: Array<{
      source_document: string;
      content: string;
      similarity: number;
    }> = [];

    if (queryVector.length > 0) {
      try {
        const { data: retrievedChunks, error: rpcErr } =
          await supabaseAdmin.rpc(
            "match_chunks",
            {
              query_embedding: queryVector,
              match_threshold: 0.1,
              match_count: 5,
              filter_subject: subject,
              filter_grade: gradeBand,
              filter_language: language,
            }
          );

        if (rpcErr) {
          console.error(
            "match_chunks RPC error:",
            rpcErr
          );
        } else {
          chunks = retrievedChunks || [];
        }
      } catch (rpcError) {
        console.error(
          "RAG retrieval failed:",
          rpcError
        );
      }
    }

    const contextTexts = chunks
      .map((chunk) => chunk.content)
      .filter(Boolean);

    // ============================================================
    // 6. GET CHAT HISTORY
    // ============================================================

    const { data: history, error: historyError } =
      await supabaseAdmin
        .from("tutor_messages")
        .select("sender, content")
        .eq("session_id", session_id)
        .order("timestamp", {
          ascending: true,
        })
        .limit(10);

    if (historyError) {
      console.error(
        "History loading failed:",
        historyError
      );
    }

    const historyBlock = (history || [])
      .map(
        (message: {
          sender: string;
          content: string;
        }) =>
          `${
            message.sender === "student"
              ? "Student"
              : "Tutor"
          }: ${message.content}`
      )
      .join("\n");

    // ============================================================
    // 7. OUT-OF-SCOPE CHECK
    // ============================================================

    let outOfScope = false;
    let explanation = "";

    const scopePrompt = `
You are the curriculum gatekeeper for I-Pass-A.

Student level:
Grade ${gradeBand}

Subject:
${subject}

Language:
${language}

Curriculum context:
${
  contextTexts.length > 0
    ? contextTexts.join("\n---\n")
    : "No curriculum documents are currently available."
}

Student question:
"${query}"

Determine whether the question belongs to Grade ${gradeBand}
${subject} or is reasonably related to learning this subject.

Clearly unrelated questions should be OUT OF SCOPE.

Examples:
- Coding questions during English class -> OUT OF SCOPE
- Completely unrelated personal questions -> OUT OF SCOPE
- Adult/sexual topics -> OUT OF SCOPE
- Questions about the subject -> IN SCOPE
- Grammar questions in English -> IN SCOPE
- Mathematics questions in Maths -> IN SCOPE

Return ONLY valid JSON:

{
  "out_of_scope": true,
  "explanation": "short explanation"
}

If the question is in scope:

{
  "out_of_scope": false,
  "explanation": ""
}

Write the explanation in ${language}.
`;

    try {
      const scopeResponse =
        await ai.models.generateContent({
          model: GENERATION_MODEL,
          contents: scopePrompt,
          config: {
            responseMimeType:
              "application/json",
          },
        });

      const scopeText =
        scopeResponse.text?.trim() || "{}";

      const parsedScope =
        JSON.parse(scopeText);

      outOfScope =
        parsedScope.out_of_scope === true;

      explanation =
        parsedScope.explanation || "";
    } catch (scopeError) {
      console.error(
        "Scope verification failed:",
        scopeError
      );

      // Do not block the student if scope verification fails.
      outOfScope = false;
      explanation = "";
    }

    // ============================================================
    // 8. GENERATE ANSWER
    // ============================================================

    let answer = "";

    if (outOfScope) {
      answer =
        explanation ||
        `This question is outside the Grade ${gradeBand} ${subject} curriculum.`;
    } else {
      const systemInstruction = `
You are I-Pass-A, an expert AI tutor.

Student:
Grade ${gradeBand}

Subject:
${subject}

Language:
${language}

Your responsibilities:

1. Teach clearly and patiently.
2. Explain difficult ideas step by step.
3. Use examples appropriate for the student's grade.
4. Stay focused on ${subject}.
5. Use the curriculum context when available.
6. Do not invent curriculum-specific facts.
7. If the curriculum context does not contain enough information,
   clearly say that the uploaded curriculum does not provide enough
   information rather than pretending.
8. Answer entirely in ${language}.
9. Use Markdown when useful.
10. For calculations, show the steps.
11. For grammar, provide examples.
12. Encourage the student to understand rather than simply memorize.
`;

      const mainPrompt = `
CURRICULUM CONTEXT
==================

${
  contextTexts.length > 0
    ? contextTexts.join("\n\n---\n\n")
    : "No curriculum documents were retrieved for this question."
}

RECENT CHAT HISTORY
===================

${
  historyBlock ||
  "No previous conversation."
}

CURRENT STUDENT QUESTION
========================

${query}

Now answer the student's question.

Give a clear, useful, step-by-step explanation.
`;

      try {
        const response =
          await ai.models.generateContent({
            model: GENERATION_MODEL,
            contents: mainPrompt,
            config: {
              systemInstruction,
              temperature: 0.4,
              maxOutputTokens: 2048,
            },
          });

        answer =
          response.text?.trim() ||
          "I could not generate an answer. Please try again.";
      } catch (generationError) {
        console.error(
          "Gemini generation failed:",
          generationError
        );

        return NextResponse.json(
          {
            detail:
              "Gemini failed to generate the tutoring response.",
            error:
              generationError instanceof Error
                ? generationError.message
                : String(generationError),
          },
          { status: 500 }
        );
      }
    }

    // ============================================================
    // 9. SAVE MESSAGES
    // ============================================================

    const { error: saveError } =
      await supabaseAdmin
        .from("tutor_messages")
        .insert([
          {
            session_id,
            sender: "student",
            content: query.trim(),
          },
          {
            session_id,
            sender: "tutor",
            content: answer,
            sources: chunks.map((chunk) => ({
              source: chunk.source_document,
              similarity: chunk.similarity,
            })),
            out_of_scope: outOfScope,
          },
        ]);

    if (saveError) {
      console.error(
        "Saving tutor messages failed:",
        saveError
      );
    }

    // ============================================================
    // 10. RETURN RESPONSE
    // ============================================================

    return NextResponse.json({
      response: answer,

      sources: chunks.map((chunk) => ({
        source: chunk.source_document,
        content: chunk.content,
        similarity: chunk.similarity,
      })),

      out_of_scope: outOfScope,
    });
  } catch (error: unknown) {
    console.error(
      "Tutor chat endpoint failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error";

    return NextResponse.json(
      {
        detail: message,
      },
      { status: 500 }
    );
  }
}