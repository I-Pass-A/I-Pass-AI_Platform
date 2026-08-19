import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";
import { generateWithFallback } from "@/lib/ai/generate";

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
    let embeddingSucceeded = false;

    if (ai) {
      try {
        const embedRes = await ai.models.embedContent({
          model: "gemini-embedding-2",
          contents: query,
          config: { outputDimensionality: 1024 }
        });
        if (embedRes.embeddings && embedRes.embeddings[0] && embedRes.embeddings[0].values) {
          queryVector = embedRes.embeddings[0].values;
          embeddingSucceeded = true;
        }
      } catch (e) {
        console.error("Error generating query embedding:", e);
      }
    }

    // Fallback vector when embedding fails (API quota exhausted etc.)
    // Use a lower threshold so at least some chunks are returned
    if (queryVector.length === 0) {
      queryVector = Array.from({ length: 1024 }, (_, idx) => Math.sin(query.length + idx) * 0.1);
    }

    // Use strict threshold only when we have a real embedding
    // When embedding failed, lower threshold so students still get curriculum context
    const matchThreshold = embeddingSucceeded ? 0.5 : 0.1;

    // 3. Call match_chunks RPC — higher threshold filters weak matches,
    //    more results give neighbor expansion enough to work with
    const { data: retrievedChunks, error: rpcErr } = await supabaseAdmin.rpc("match_chunks", {
      query_embedding: queryVector,
      match_threshold: matchThreshold,
      match_count: 8,
      filter_subject: subject,
      filter_grade: gradeBand,
      filter_language: language
    });

    if (rpcErr) {
      console.error("RPC match_chunks failed:", rpcErr);
    }

    // 4. Neighbor expansion — for each matched chunk, also fetch the chunk
    //    immediately before and after it (same source_document, adjacent chunk_index).
    //    This recovers the second half of explanations that similarity search misses.
    let chunks = retrievedChunks || [];

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
            // Add with a synthetic similarity slightly below the lowest match
            chunks.push({ ...neighbor, similarity: 0.0 });
          }
        }
      }
      // Sort by source_document + chunk_index so context reads naturally
      chunks.sort((a: any, b: any) => {
        if (a.source_document !== b.source_document)
          return a.source_document.localeCompare(b.source_document);
        return (a.chunk_index ?? 0) - (b.chunk_index ?? 0);
      });
    }
    const contextTexts = chunks.map((c: any) => c.content);

    // Guard: only block when we had a real embedding AND no chunks matched.
    // If embedding failed (quota exhausted), skip guard and let Gemini do its best.
    if (chunks.length === 0 && embeddingSucceeded && ai) {
      const noContextMsg = gradeBand === "12"
        ? `I don't have curriculum materials for **${subject}** (Grade ${gradeBand}) in my knowledge base yet. Please ask your teacher or administrator to upload the ${subject} textbook through the Admin Panel. Once uploaded, I can give you curriculum-grounded answers.`
        : `Maxxansa barnootaa **${subject}** (Kutaa ${gradeBand}) kuusaa kiyya keessatti hin argamne. Barsiisaa ykn bulchaa kee gaafadhu akka kitaaba ${subject} ol-kaasan. Erga ol-kaafameen booda deebii sirritti itti hirmaadha.`;

      // Still save to DB so history works
      await supabaseAdmin.from("tutor_messages").insert([
        { session_id, sender: "student", content: query, sources: null, out_of_scope: false },
        { session_id, sender: "tutor", content: noContextMsg, sources: [], out_of_scope: false }
      ]);

      return NextResponse.json({
        response: noContextMsg,
        sources: [],
        out_of_scope: false
      });
    }

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
        const scopeText = await generateWithFallback({
          prompt: scopePrompt,
          systemInstruction: "You are a curriculum scope checker. Respond ONLY with valid JSON.",
          jsonMode: true,
        });
        const parsedScope = JSON.parse(scopeText || "{}");
        outOfScope = parsedScope.out_of_scope;
        explanation = parsedScope.explanation;
      } catch (e) {
        console.error("Scope verification failed:", e);
        // Default to in-scope on failure so students aren't blocked
        outOfScope = false;
      }
    } else {
      // Mock scope check — basic keyword detection when no AI available
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
      const sources = Array.from(new Set(chunks.map((c: any) => c.source_document)));
      answer = `**(Mock AI Tutor)** Thank you for asking about **${query}**.\n\nHere is a step-by-step explanation:\n1. Since the Gemini API key is not configured, this is a simulated response.\n2. In a live system, this response would be generated using your curriculum documents: *${sources.length > 0 ? sources.join(", ") : 'No documents uploaded yet'}*.\n3. Make sure to upload curriculum text files in the admin dashboard and configure your \`GEMINI_API_KEY\`.`;
    } else {
      const { data: history } = await supabaseAdmin
        .from("tutor_messages")
        .select("sender, content")
        .eq("session_id", session_id)
        .order("timestamp", { ascending: true })
        .limit(5);

      const historyBlock = (history || []).map((m: any) =>
        `${m.sender === "student" ? "Student" : "Tutor"}: ${m.content}`
      ).join("\n");

      const systemInstruction = `You are an expert, friendly AI Tutor for Grade ${gradeBand} ${subject}. Instruction language: ${language}.

RESPONSE FORMAT RULES — follow these exactly so the UI renders your answer beautifully:
- Use ## for main topic headings, ### for sub-sections
- Use **bold** for key terms, formulas, and important values
- Use > blockquote for critical warnings or common mistakes
- Use emoji callout prefixes on their own line:
    📌 for key definitions or principles
    💡 for tips and helpful insights
    📝 for worked examples
    ✅ for summary points
    ⚠️ for common mistakes or warnings
- Use numbered lists for step-by-step processes
- Use bullet lists for related concepts or properties
- Use \`inline code\` for chemical formulas, math expressions, or technical terms
- Use markdown tables for comparisons or data
- Write LaTeX inline as $formula$ and block as $$formula$$
- Keep each section focused and scannable — avoid large walls of text

CONTENT RULES:
1. Ground every answer strictly in the provided curriculum context
2. Be engaging and age-appropriate for Grade ${gradeBand} students
3. Write entirely in ${language}
4. If context is limited, say so clearly and explain what you do know`;

      const mainPrompt = `## Curriculum Context
${contextTexts.join("\n---\n")}

## Recent Conversation
${historyBlock}

## Student Question
${query}

Provide a well-structured, step-by-step tutoring answer in ${language}. Use the formatting rules from your instructions.`;

      try {
        answer = await generateWithFallback({
          prompt: mainPrompt,
          systemInstruction,
          jsonMode: false,
        });
      } catch (err: any) {
        if (err.message === "AI_UNAVAILABLE") {
          answer = language === "Afaan Oromo"
            ? "Dhiifama, yeroo ammaa tajaajilli AI argachuu hin dandeenye. Daqiiqaa muraasa booda irra deebii yaalaa."
            : "Sorry, the AI tutor is temporarily unavailable. Please try again in a moment.";
        } else {
          answer = language === "Afaan Oromo"
            ? "Dogoggora hin eegamne uumame. Irra deebii yaalaa."
            : "An unexpected error occurred. Please try again.";
        }
      }
    }

    // 5. Save messages + build rich sources payload with chapter/page info
    const sourcesPayload = chunks.map((c: any) => ({
      source: c.source_document,
      content: c.content,
      similarity: c.similarity,
      chapter: c.chapter ?? null,
      page_number: c.page_number ?? null,
      chunk_type: c.chunk_type ?? "text",
    }));

    await supabaseAdmin.from("tutor_messages").insert([
      { session_id, sender: "student", content: query, sources: null, out_of_scope: false },
      { session_id, sender: "tutor",   content: answer, sources: sourcesPayload, out_of_scope: outOfScope }
    ]);

    return NextResponse.json({
      response: answer,
      sources: chunks.map((c: any) => ({
        source: c.source_document,
        content: c.content,
        similarity: c.similarity,
        chapter: c.chapter ?? null,
        page_number: c.page_number ?? null,
        chunk_type: c.chunk_type ?? "text",
      })),
      out_of_scope: outOfScope
    });

  } catch (error: any) {
    console.error("Tutor chat endpoint failed:", error);
    return NextResponse.json({ detail: error.message || "An error occurred during chat processing" }, { status: 500 });
  }
}
