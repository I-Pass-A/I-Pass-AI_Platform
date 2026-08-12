import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { session_id, query, grade } = await req.json();

    if (!session_id || !query) {
      return NextResponse.json({ detail: "session_id and query are required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Get tutor session details to find subject
    const { data: sessionData, error: sessionErr } = await supabaseAdmin
      .from("tutor_sessions")
      .select("subject, user_id")
      .eq("id", session_id)
      .single();

    if (sessionErr || !sessionData) {
      return NextResponse.json({ detail: "Tutor session not found" }, { status: 404 });
    }

    const subject = sessionData.subject;

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

    const apiKey = process.env.GEMINI_API_KEY;
    let ai: GoogleGenAI | null = null;
    if (apiKey) {
      ai = new GoogleGenAI({ apiKey });
    }

    // 2. Generate embedding for current query
    let queryVector: number[] = [];
    if (ai) {
      try {
        const embedRes = await ai.models.embedContent({
          model: "text-embedding-004",
          contents: query
        });
        if (embedRes.embeddings && embedRes.embeddings[0] && embedRes.embeddings[0].values) {
          queryVector = embedRes.embeddings[0].values;
        }
      } catch (e) {
        console.error("Error generating query embedding:", e);
      }
    }

    // Mock vector if embedding failed or no api key
    if (queryVector.length === 0) {
      queryVector = Array.from({ length: 1536 }, (_, idx) => Math.sin(query.length + idx) * 0.1);
    }

    // 3. Call match_chunks RPC on Supabase
    const { data: retrievedChunks, error: rpcErr } = await supabaseAdmin.rpc("match_chunks", {
      query_embedding: queryVector,
      match_threshold: 0.1,
      match_count: 3,
      filter_subject: subject,
      filter_grade: gradeBand,
      filter_language: language
    });

    if (rpcErr) {
      console.error("RPC match_chunks failed:", rpcErr);
    }

    const chunks = retrievedChunks || [];
    const contextTexts = chunks.map((c: any) => c.content);

    // 4. Out-of-scope check
    let outOfScope = false;
    let explanation = "";

    if (ai) {
      const scopePrompt = `
You are a curriculum gatekeeper for I-Pass-A, an educational tutoring system.
Your job is to determine if the student's question is OUT OF SCOPE for Grade ${gradeBand} ${subject}.

Curriculum Grounding context:
${contextTexts.slice(0, 3).join("\n---\n")}

Student Query: "${query}"

Analyze if the query is relevant to Grade ${gradeBand} ${subject} or school syllabus for this subject.
If it is clearly unrelated (e.g. asking for coding in an English class, asking for unrelated personal advice, or adult topics), classify it as OUT OF SCOPE.
Otherwise, classify it as IN SCOPE.

Respond in JSON format:
{
  "out_of_scope": true/false,
  "explanation": "Brief explanation of why it is out of scope and redirect to the correct topic, or empty if in scope. Write explanation in the language of the subject (English for Grade 12, Afaan Oromo for Grade 6 & 8)."
}
`;
      try {
        const scopeRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: scopePrompt,
          config: { responseMimeType: "application/json" }
        });
        const parsedScope = JSON.parse(scopeRes.text || "{}");
        outOfScope = parsedScope.out_of_scope;
        explanation = parsedScope.explanation;
      } catch (e) {
        console.error("Scope verification failed:", e);
      }
    } else {
      // Mock scope check fallback
      const codingKeywords = ["python", "javascript", "code", "programming", "sql", "html"];
      if (["english", "biology", "maths"].includes(subject.toLowerCase()) && codingKeywords.some(kw => query.toLowerCase().includes(kw))) {
        outOfScope = true;
        explanation = `This question is about coding/programming, which is outside the scope of Grade ${gradeBand} ${subject}.`;
      }
    }

    let answer = "";
    if (outOfScope) {
      answer = explanation || `This question falls outside the curriculum scope of Grade ${grade} ${subject}.`;
    } else if (!ai) {
      // Mock answer fallback
      const sources = Array.from(new Set(chunks.map((c: any) => c.source_document)));
      answer = `**(Mock AI Tutor)** Thank you for asking about **${query}**.\n\nHere is a step-by-step explanation:\n1. Since the Gemini API key is not configured, this is a simulated response.\n2. In a live system, this response would be generated using your curriculum documents: *${sources.length > 0 ? sources.join(", ") : 'No documents uploaded yet'}*.\n3. Make sure to upload curriculum text files in the admin dashboard and configure your \`GEMINI_API_KEY\`.`;
    } else {
      // Get session history
      const { data: history } = await supabaseAdmin
        .from("tutor_messages")
        .select("sender, content")
        .eq("session_id", session_id)
        .order("timestamp", { ascending: true })
        .limit(5);

      const historyBlock = (history || []).map((m: any) => 
        `${m.sender === "student" ? "Student" : "Tutor"}: ${m.content}`
      ).join("\n");

      const systemInstruction = `
You are an expert, friendly AI Tutor for Grade ${gradeBand} in ${subject}. The language of instruction is ${language}.
All your explanations must be:
1. Grounded in the provided curriculum content. Do not make up facts not mentioned in context unless it's basic background math/grammar.
2. Formatted step-by-step, making it easy for a student to follow.
3. Engaging, clear, and age-appropriate (Grade ${grade} level).
4. Written entirely in ${language}.
`;

      const mainPrompt = `
Curriculum Context Chunks:
${contextTexts.join("\n---\n")}

Recent Chat History:
${historyBlock}

Current Question: "${query}"

Provide your step-by-step tutoring explanation below in ${language}:
`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: mainPrompt,
          config: {
            systemInstruction
          }
        });
        answer = response.text || "";
      } catch (err: any) {
        console.error("AI Generation failed:", err);
        answer = `Sorry, there was an error generating the tutoring response. Please try again. (${err.message})`;
      }
    }

    // 5. Save student message and tutor message to database
    await supabaseAdmin.from("tutor_messages").insert([
      { session_id, sender: "student", content: query },
      { session_id, sender: "tutor", content: answer }
    ]);

    return NextResponse.json({
      response: answer,
      sources: chunks.map((c: any) => ({
        source: c.source_document,
        content: c.content,
        similarity: c.similarity
      })),
      out_of_scope: outOfScope
    });

  } catch (error: any) {
    console.error("Tutor chat endpoint failed:", error);
    return NextResponse.json({ detail: error.message || "An error occurred during chat processing" }, { status: 500 });
  }
}
