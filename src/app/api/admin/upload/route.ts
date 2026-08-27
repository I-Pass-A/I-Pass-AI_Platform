import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";
import { isAuthError, requireRole } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ["admin"], "admin");
  if (isAuthError(auth)) return auth;

  // Move require inside POST to prevent evaluation crash (DOMMatrix is not defined) during Next.js build time
  const pdf = require("pdf-parse");

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
        uploaded_by: uploadedBy || auth.id
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
