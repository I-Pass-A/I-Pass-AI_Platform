/**
 * Batch Textbook Uploader for I-Pass-A
 * ------------------------------------
 * Run this script ONCE to process and upload all Grade 12 textbook PDFs
 * into the Supabase curriculum_chunks vector store.
 *
 * Usage:
 *   1. Place your PDF files in the folder defined by PDF_DIR below
 *      (default: scripts/textbooks/grade12/)
 *   2. Make sure SUBJECT_MAP matches your actual filenames
 *   3. Run: node scripts/upload_textbooks.js
 *
 * Requirements: node >= 18, pdfs in place, .env.local configured
 */

require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const path = require("path");
const https = require("https");

// ── Config ───────────────────────────────────────────────────────────────────

const PDF_DIR = path.join(__dirname, "textbooks", "grade12");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY   = process.env.GEMINI_API_KEY;

const GRADE      = "12";
const LANGUAGE   = "English";
const CHUNK_SIZE = 800;   // words per chunk
const OVERLAP    = 150;   // word overlap between chunks

/**
 * Map each PDF filename (without extension) to its subject name.
 * Rename your files to match these keys, OR change the values to match your filenames.
 * Keys = filename (no .pdf), Values = subject name as it appears in the app
 */
const SUBJECT_MAP = {
  "g12-mathematics":  "Mathematics",
  "g12-physics":      "Physics",
  "g12-english":      "English",
  "g12-biology":      "Biology",
  "g12-chemistry":    "Chemistry",
  "g12-it":           "IT",
  "g12-geography":    "Geography",
  "g12-history":      "History",
  "g12-economics":    "Economics",
  "g12-agriculture":  "Agriculture",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function chunkText(text, chunkWords, overlapWords) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkWords).join(" ");
    if (chunk.trim().length > 50) chunks.push(chunk);
    i += chunkWords - overlapWords;
  }
  return chunks;
}

async function getEmbedding(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text: text.slice(0, 2000) }] },
    });
    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.embedding?.values) {
            resolve(parsed.embedding.values);
          } else {
            reject(new Error("No embedding returned: " + data.slice(0, 200)));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function insertChunk(chunk) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify([chunk]);
    const options = {
      hostname: new URL(SUPABASE_URL).hostname,
      path: "/rest/v1/curriculum_chunks",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_KEY,
        "Authorization": "Bearer " + SERVICE_KEY,
        "Prefer": "return=minimal",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Insert failed (${res.statusCode}): ${data.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Validate config
  if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_KEY) {
    console.error("❌  Missing env vars. Check NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY in .env.local");
    process.exit(1);
  }

  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
    console.log(`📁  Created folder: ${PDF_DIR}`);
    console.log(`    Place your 10 Grade 12 PDF files there and re-run.`);
    console.log(`    Expected filenames (or update SUBJECT_MAP):`);
    Object.keys(SUBJECT_MAP).forEach((k) => console.log(`      ${k}.pdf  →  ${SUBJECT_MAP[k]}`));
    process.exit(0);
  }

  // Dynamically require pdf-parse (avoid build-time crash)
  let pdfParse;
  try {
    const mod = require("pdf-parse");
    // pdf-parse may export as default or as the function itself
    pdfParse = typeof mod === "function" ? mod : (mod.default ?? mod);
    if (typeof pdfParse !== "function") throw new Error("not a function");
  } catch (e) {
    console.error("❌  pdf-parse not found or broken:", e.message, "\nRun: npm install pdf-parse");
    process.exit(1);
  }

  const pdfFiles = fs.readdirSync(PDF_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));

  if (pdfFiles.length === 0) {
    console.log(`⚠️   No PDF files found in ${PDF_DIR}`);
    console.log(`    Place your textbook PDFs there and re-run.`);
    process.exit(0);
  }

  console.log(`\n🚀  I-Pass-A Textbook Uploader`);
  console.log(`    Found ${pdfFiles.length} PDF(s) in ${PDF_DIR}\n`);

  let totalChunks = 0;
  let successFiles = 0;

  for (const filename of pdfFiles) {
    const nameWithoutExt = path.basename(filename, ".pdf").toLowerCase();
    const subject = SUBJECT_MAP[nameWithoutExt];

    if (!subject) {
      console.warn(`⚠️   Skipping "${filename}" — no entry in SUBJECT_MAP for key "${nameWithoutExt}"`);
      console.warn(`    Add: "${nameWithoutExt}": "SubjectName"  to SUBJECT_MAP in this script`);
      continue;
    }

    const filePath = path.join(PDF_DIR, filename);
    console.log(`\n📖  Processing: ${filename}  →  ${subject} (Grade ${GRADE})`);

    let text = "";
    try {
      const buffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(buffer);
      text = parsed.text;
      console.log(`    Extracted ${text.split(/\s+/).length.toLocaleString()} words`);
    } catch (e) {
      console.error(`    ❌  PDF parse failed: ${e.message}`);
      continue;
    }

    const chunks = chunkText(text, CHUNK_SIZE, OVERLAP);
    console.log(`    Split into ${chunks.length} chunks (${CHUNK_SIZE}w, ${OVERLAP}w overlap)`);

    let fileChunks = 0;
    for (let i = 0; i < chunks.length; i++) {
      process.stdout.write(`    Chunk ${i + 1}/${chunks.length} — embedding...`);
      try {
        const embedding = await getEmbedding(chunks[i]);

        await insertChunk({
          subject,
          topic:           subject,
          grade:           GRADE,
          language:        LANGUAGE,
          source_document: filename,
          content:         chunks[i],
          embedding:       `[${embedding.join(",")}]`,
          version:         1,
          uploaded_by:     "Admin (batch upload)",
        });

        fileChunks++;
        totalChunks++;
        process.stdout.write(` ✓\n`);

        // Rate-limit: Gemini free tier allows ~1500 req/min — 50ms gap is safe
        await sleep(50);
      } catch (e) {
        process.stdout.write(` ❌  ${e.message}\n`);
        // On rate limit error wait longer before retrying
        if (e.message.includes("429") || e.message.includes("quota")) {
          console.log(`    ⏳  Rate limited — waiting 60s...`);
          await sleep(60000);
          i--; // retry this chunk
        }
      }
    }

    console.log(`    ✅  ${subject}: ${fileChunks}/${chunks.length} chunks uploaded`);
    successFiles++;

    // Small pause between files
    await sleep(500);
  }

  console.log(`\n────────────────────────────────────────`);
  console.log(`✅  Done!`);
  console.log(`   Files processed : ${successFiles}/${pdfFiles.length}`);
  console.log(`   Total chunks    : ${totalChunks}`);
  console.log(`   These are now live in your Supabase vector store.`);
  console.log(`   The AI tutor and exam generator will use them immediately.\n`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
