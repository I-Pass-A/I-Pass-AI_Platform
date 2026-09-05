import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateWithMultiProvider, quickScopeCheck, getFallbackResponse } from "@/lib/ai/multi-provider";

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

    // Debug: confirm env vars are present server-side
    console.log("🔑 OPENROUTER_API_KEY loaded:", !!process.env.OPENROUTER_API_KEY);
    console.log("🌐 SUPABASE_SERVICE_ROLE_KEY loaded:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

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

    // 2. Get curriculum chunks using Supabase RPC (semantic search)
    let chunks: any[] = [];
    try {
      const { data: semanticResults } = await supabaseAdmin.rpc("match_chunks", {
        query_embedding: Array(1024).fill(0), // Placeholder - using text search instead
        filter_subject: subject,
        filter_grade: gradeBand,
        filter_language: language,
        match_threshold: 0.1,
        match_count: 8
      });

      if (semanticResults && semanticResults.length > 0) {
        chunks = semanticResults.map((chunk: any) => ({
          ...chunk,
          similarity: 0.8 // Default similarity for text-based search
        }));
      } else {
        // Fallback to direct text search
        const { data: textResults } = await supabaseAdmin
          .from("curriculum_chunks")
          .select("id, subject, topic, grade, language, source_document, content, chunk_index")
          .eq("subject", subject)
          .eq("grade", gradeBand)
          .eq("language", language)
          .textSearch("content", query.split(" ").join(" | "))
          .limit(6);

        chunks = (textResults || []).map((chunk: any) => ({
          ...chunk,
          similarity: 0.7
        }));
      }
    } catch (e) {
      console.log("Semantic search failed, using basic text search");
      
      // Basic fallback search
      const { data: basicResults } = await supabaseAdmin
        .from("curriculum_chunks")
        .select("id, subject, topic, grade, language, source_document, content")
        .eq("subject", subject)
        .eq("grade", gradeBand)
        .limit(4);

      chunks = (basicResults || []).map((chunk: any) => ({
        ...chunk,
        similarity: 0.6
      }));
    }

    // 3. Scope check — only block clearly unrelated topics, not educational questions
    let outOfScope = false;
    let explanation = "";

    // Simple keyword-based check instead of AI scope check (AI was too aggressive)
    const offTopicKeywords = ['bitcoin', 'cryptocurrency', 'crypto', 'forex', 'stock market', 'gambling', 'adult', 'weapon', 'drug', 'violence'];
    const queryLower = query.toLowerCase();
    if (offTopicKeywords.some(kw => queryLower.includes(kw))) {
      outOfScope = true;
      explanation = `This topic is not part of the Grade ${gradeBand} ${subject} curriculum.`;
    }

    // 4. Handle no curriculum content case
    if (chunks.length === 0) {
      const noContentMsg = language === "Afaan Oromo"
        ? `Maxxansa barnootaa **${subject}** (Kutaa ${gradeBand}) kuusaa koo keessatti hin argamne. Barsiisaa ykn bulchaa kee gaafadhu akka kitaaba ${subject} ol-kaasan. Erga ol-kaafameen booda deebii sirritti itti hirmaadha.`
        : `I don't have curriculum materials for **${subject}** (Grade ${gradeBand}) in my knowledge base yet. Please ask your teacher or administrator to upload the ${subject} textbook through the Admin Panel. Once uploaded, I can give you curriculum-grounded answers.`;

      // Save conversation to database
      await supabaseAdmin.from("tutor_messages").insert([
        { session_id, sender: "student", content: query, sources: null, out_of_scope: false },
        { session_id, sender: "tutor", content: noContentMsg, sources: [], out_of_scope: false }
      ]);

      return NextResponse.json({
        response: noContentMsg,
        sources: [],
        out_of_scope: false
      });
    }

    // 5. Generate AI response with multi-provider fallback
    const contextTexts = chunks.map((c: any) => c.content).join("\n\n");
    
    const systemPrompt = language === "Afaan Oromo"
      ? `Ati barsiisaa AI Afaan Oromootiin dubbattu. Mata-duree: ${subject}, Kutaa: ${gradeBand}.
        
        SEERA CIMAA:
        - Curriculum Kutaa ${gradeBand} ${subject} irratti deebii kenni
        - Gaaffii qormaataa, shaakala, fi ibsa barumsa ${subject} irratti gargaari
        - Gaaffiin walqabata hin qabne (fkn. daldala maallaqaa dijitaalaa) yoo dhufee: "Gaaffiin kee mata-duree ${subject} Kutaa ${gradeBand} ala dha. Barumsa kee irratti xiyyeeffadhu." jedhi
        - Afaan Oromo qulqulluu itti fayyadami
        - Akkaataa barsiisaa tokkoo fakkaattee deebii kenni
        
        Meeshaalee curriculum:
        ${contextTexts}`
      : `You are an AI tutor STRICTLY for ${subject} (Grade ${gradeBand} Ethiopian curriculum).
        
        STRICT RULES:
        1. ONLY answer questions directly related to Grade ${gradeBand} ${subject} curriculum
        2. You CAN help with: explaining topics, sample questions, practice problems, page references, exam preparation for this subject
        3. If asked about completely unrelated topics (cryptocurrency, politics, other subjects not in this grade), politely redirect: "I can only help with Grade ${gradeBand} ${subject} topics. Please ask me something related to what you're studying."
        4. Always base answers on the provided curriculum materials below
        5. Use clear, age-appropriate language for Grade ${gradeBand} students
        6. Be encouraging and supportive
        7. Sample exams, practice questions, and study help for this subject ARE allowed
        
        Curriculum materials for Grade ${gradeBand} ${subject}:
        ${contextTexts}`;

    let answer: string;
    
    try {
      // Use multi-provider system (Groq -> OpenAI -> Claude)
      answer = await generateWithMultiProvider(systemPrompt, query);
      
      console.log("✅ AI response generated successfully with multi-provider system");
      
    } catch (error: any) {
      console.error("❌ All AI providers failed:", error.message);
      
      // Use fallback response
      answer = getFallbackResponse(query, subject, language);
    }

    // 6. Save conversation to database
    const sources = chunks.slice(0, 5).map((c: any) => ({
      id: c.id,
      source: c.source_document,
      chapter: c.topic,
      similarity: c.similarity,
      page_number: c.chunk_index || 0
    }));

    try {
      await supabaseAdmin.from("tutor_messages").insert([
        { session_id, sender: "student", content: query, sources: null, out_of_scope: false },
        { session_id, sender: "tutor", content: answer, sources, out_of_scope: outOfScope }
      ]);
    } catch (dbError) {
      console.error("Failed to save to database:", dbError);
      // Continue anyway - don't fail the request due to DB issues
    }

    // 7. Return response
    return NextResponse.json({
      response: answer,
      sources,
      out_of_scope: outOfScope,
      explanation: outOfScope ? explanation : null
    });

  } catch (error: any) {
    console.error("Tutor chat error:", error);
    
    return NextResponse.json(
      { 
        detail: "Failed to generate response",
        error: error.message 
      },
      { status: 500 }
    );
  }
}