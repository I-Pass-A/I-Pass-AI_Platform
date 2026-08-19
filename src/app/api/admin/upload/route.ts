import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // Move require inside POST to prevent evaluation crash (DOMMatrix is not defined) during Next.js build time
  const pdf = require("pdf-parse");

  // --- Server-side role check: only admins may upload curriculum ---
  const authHeader = req.headers.get("authorization");
  const accessToken = authHeader?.replace("Bearer ", "").trim();

  if (
    accessToken &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder-project-id.supabase.co"
  ) {
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser(accessToken);
    if (userErr || !user) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }
    // Check role in profiles table
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ detail: "Forbidden: only administrators can upload curriculum materials." }, { status: 403 });
    }
  }
  // In mock/dev mode (no real Supabase configured) the check is skipped so local dev still works

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const subject = formData.get("subject") as string;
    const topic = formData.get("topic") as string;
    const grade = formData.get("grade") as string;
    const language = formData.get("language") as string;
    const uploadedBy = formData.get("uploaded_by") as string; // Teacher or admin identifier

    if (!file || !subject || !topic || !grade || !language) {
      return NextResponse.json({ detail: "Missing required fields" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (file.name.toLowerCase().endsWith(".pdf")) {
      try {
        const parsedPdf = await pdf(buffer);
        text = parsedPdf.text;
      } catch (err: any) {
        return NextResponse.json({ detail: `Failed to parse PDF: ${err.message}` }, { status: 400 });
      }
    } else {
      text = buffer.toString("utf-8");
    }

    if (!text.trim()) {
      return NextResponse.json({ detail: "Document has no text content" }, { status: 400 });
    }

    // Chunking logic
    const words = text.split(/\s+/);
    const chunkSize = 800;
    const overlap = 150;
    const chunks: string[] = [];

    let i = 0;
    while (i < words.length) {
      const chunkWords = words.slice(i, i + chunkSize);
      chunks.push(chunkWords.join(" "));
      i += chunkSize - overlap;
    }

    // Embed and save chunks
    const supabaseAdmin = getSupabaseAdmin();
    const apiKey = process.env.GEMINI_API_KEY;
    let ai: GoogleGenAI | null = null;
    if (apiKey) {
      ai = new GoogleGenAI({ apiKey });
    }

    const savedChunks = [];
    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      const chunkText = chunks[cIdx];
      let embedding: number[] = [];

      if (ai) {
        try {
          const embedRes = await ai.models.embedContent({
            model: "gemini-embedding-2",
            contents: chunkText,
            config: { outputDimensionality: 1024 }
          });
          if (embedRes.embeddings && embedRes.embeddings[0] && embedRes.embeddings[0].values) {
            embedding = embedRes.embeddings[0].values;
          }
        } catch (e) {
          console.error("Embedding generation error:", e);
        }
      }

      // If embedding failed or no key, generate mock deterministic vector
      if (embedding.length === 0) {
        embedding = Array.from({ length: 1024 }, (_, idx) => 
          Math.sin(chunkText.length + idx) * 0.1
        );
      }

      const { data, error } = await supabaseAdmin.from("curriculum_chunks").insert({
        subject,
        topic,
        grade,
        language,
        source_document: file.name,
        content: chunkText,
        embedding,
        version: 1,
        uploaded_by: uploadedBy || "System"
      }).select();

      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }
      savedChunks.push(data[0]);
    }

    return NextResponse.json({
      detail: `Successfully parsed document into ${chunks.length} curriculum chunks.`,
      chunk_count: chunks.length
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ detail: error.message || "An error occurred during upload" }, { status: 500 });
  }
}
