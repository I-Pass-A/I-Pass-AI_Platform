/**
 * Amharic PDF OCR Uploader
 * ========================
 * Uses Gemini Vision to extract Amharic text from scanned PDFs
 * then chunks, embeds, and uploads to Supabase.
 *
 * Requires: pip install pymupdf
 *
 * Usage:
 *   node scripts/ocr_amharic_upload.mjs
 *   node scripts/ocr_amharic_upload.mjs "scripts/textbooks/grade8/g8-afaan-amaharaa.pdf"
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { execSync, spawnSync } from "child_process";
import https from "https";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ────────────────────────────────────────────────────────────
function loadEnv() {
  const raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ── Config ─────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean);

let keyIndex = 0;
let exhausted = new Set();

function getKey() { return GEMINI_KEYS[keyIndex]; }

async function rotateKey(label) {
  exhausted.add(keyIndex);
  if (exhausted.size >= GEMINI_KEYS.length) {
    console.log(`\n   ⏳  All keys exhausted at ${label} — waiting 90s...`);
    exhausted.clear();
    await sleep(90000);
  }
  keyIndex = (keyIndex + 1) % GEMINI_KEYS.length;
  while (exhausted.has(keyIndex)) keyIndex = (keyIndex + 1) % GEMINI_KEYS.length;
  console.log(`\n   🔄  Switched to key ${keyIndex + 1}/${GEMINI_KEYS.length}`);
}

const CHUNK_SIZE = 350;
const OVERLAP    = 50;
const TMP_DIR    = join(__dirname, "_ocr_tmp");

// ── HTTP helper ────────────────────────────────────────────────────────────────
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body), "utf8");
    const req = https.request(
      { hostname, path, method: "POST", headers: { ...headers, "Content-Length": bodyBuf.length } },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
      }
    );
    req.on("error", reject);
    req.write(bodyBuf);
    req.end();
  });
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Step 1: Convert PDF pages to images using PyMuPDF ─────────────────────────
function convertPdfToImages(pdfPath, tmpDir) {
  console.log(`\n   📄 Converting PDF to images...`);
  mkdirSync(tmpDir, { recursive: true });

  const script = `
import sys, os
import pymupdf

pdf_path = sys.argv[1]
out_dir  = sys.argv[2]
dpi      = 150  # good balance of quality vs size

doc = pymupdf.open(pdf_path)
print(f"Pages: {len(doc)}", flush=True)

for i, page in enumerate(doc):
    mat = pymupdf.Matrix(dpi/72, dpi/72)
    pix = page.get_pixmap(matrix=mat, colorspace=pymupdf.csRGB)
    out_path = os.path.join(out_dir, f"page_{i+1:04d}.png")
    pix.save(out_path)
    if (i+1) % 10 == 0:
        print(f"Converted {i+1}/{len(doc)} pages", flush=True)

print(f"Done: {len(doc)} pages saved to {out_dir}", flush=True)
doc.close()
`.trim();

  const tmpScript = join(__dirname, "_pdf2img.py");
  writeFileSync(tmpScript, script, "utf8");

  try {
    const result = spawnSync("python", [tmpScript, pdfPath, tmpDir], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    if (result.status !== 0) throw new Error(result.stderr || "PDF conversion failed");
    console.log(`   ${result.stdout.trim().split("\n").pop()}`);
    const images = readdirSync(tmpDir)
      .filter(f => f.endsWith(".png"))
      .sort()
      .map(f => join(tmpDir, f));
    return images;
  } finally {
    try { unlinkSync(tmpScript); } catch {}
  }
}

// ── Step 2: OCR each image with Gemini Vision ──────────────────────────────────
async function ocrPageWithGemini(imagePath, pageNum) {
  const imageData = readFileSync(imagePath);
  const base64    = imageData.toString("base64");

  const prompt = `This is page ${pageNum} of an Ethiopian Grade 8 Amharic (Afaan Amaharaa) textbook.

Extract ALL text from this image exactly as written in Amharic (Ethiopic script).
- Keep the original Amharic text
- Preserve paragraph breaks with blank lines
- Do NOT translate anything
- Do NOT add explanations
- If a section has a heading, keep it
- Output ONLY the extracted text, nothing else`;

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/png", data: base64 } }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
  };

  while (true) {
    const key = getKey();
    const res = await httpsPost(
      "generativelanguage.googleapis.com",
      `/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      { "Content-Type": "application/json" },
      body
    );

    const parsed = JSON.parse(res.body);

    if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
      return parsed.candidates[0].content.parts[0].text.trim();
    }

    const errMsg = (parsed.error?.message || "").toLowerCase();
    if (res.status === 429 || errMsg.includes("quota") || errMsg.includes("resource_exhausted")) {
      await rotateKey(`page ${pageNum}`);
      await sleep(1000);
    } else if (parsed.candidates?.[0]?.finishReason === "SAFETY") {
      return ""; // skip blocked pages
    } else {
      throw new Error(`Gemini OCR failed (${res.status}): ${res.body.slice(0, 200)}`);
    }
  }
}

// ── Step 3: Chunk text ─────────────────────────────────────────────────────────
function chunkText(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const end   = Math.min(i + CHUNK_SIZE, words.length);
    const chunk = words.slice(i, end).join(" ");
    if (chunk.trim().length > 60) chunks.push(chunk);
    i += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}

// ── Step 4: Embed with Gemini embedding-2 ─────────────────────────────────────
async function embedText(text) {
  const body = JSON.stringify({
    model: "models/gemini-embedding-2",
    content: { parts: [{ text: text.slice(0, 3000) }] },
    outputDimensionality: 1024,
  });

  while (true) {
    const key = getKey();
    const res = await httpsRequest({
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-embedding-2:embedContent?key=${key}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, body);

    const parsed = JSON.parse(res.body);
    if (parsed.embedding?.values) return parsed.embedding.values;

    const errMsg = (parsed.error?.message || "").toLowerCase();
    if (res.status === 429 || errMsg.includes("quota") || errMsg.includes("resource_exhausted")) {
      await rotateKey("embedding");
      await sleep(500);
    } else {
      throw new Error(`Embedding failed (${res.status}): ${res.body.slice(0, 150)}`);
    }
  }
}

// ── Step 5: Save to Supabase ───────────────────────────────────────────────────
async function saveChunks(chunks) {
  const supaUrl = new URL(SUPABASE_URL);
  const body = JSON.stringify(chunks);
  const res = await httpsRequest({
    hostname: supaUrl.hostname,
    path: "/rest/v1/curriculum_chunks",
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Supabase insert failed (${res.status}): ${res.body.slice(0, 150)}`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY || GEMINI_KEYS.length === 0) {
    console.error("❌  Missing env vars."); process.exit(1);
  }

  const pdfPath = process.argv[2] ||
    join(__dirname, "textbooks", "grade8", "g8-afaan-amaharaa.pdf");

  if (!existsSync(pdfPath)) {
    console.error(`❌  File not found: ${pdfPath}`); process.exit(1);
  }

  const filename = basename(pdfPath);
  console.log(`\n🚀  Amharic OCR Pipeline`);
  console.log(`   File    : ${filename}`);
  console.log(`   Keys    : ${GEMINI_KEYS.length} Gemini keys with rotation`);
  console.log(`   Subject : Afaan Amaharaa | Grade 8 | Language: Amharic\n`);

  // Convert PDF to images
  const images = convertPdfToImages(pdfPath, TMP_DIR);
  console.log(`   Total pages: ${images.length}`);

  // OCR each page
  console.log(`\n📖  Running Gemini Vision OCR on ${images.length} pages...`);
  const pageTexts = [];
  let skipped = 0;

  for (let i = 0; i < images.length; i++) {
    process.stdout.write(`\r   Page ${i + 1}/${images.length} (key ${keyIndex + 1})...`);
    try {
      const text = await ocrPageWithGemini(images[i], i + 1);
      if (text.length > 20) {
        pageTexts.push(`--- Page ${i + 1} ---\n${text}`);
      } else {
        skipped++;
      }
    } catch (e) {
      console.error(`\n   ❌ Page ${i + 1} failed: ${e.message}`);
      skipped++;
    }
    await sleep(200); // be nice to the API
  }

  console.log(`\n   ✅ OCR complete: ${pageTexts.length} pages extracted, ${skipped} skipped`);

  // Save combined text for inspection
  const fullText = pageTexts.join("\n\n");
  const txtPath  = pdfPath.replace(".pdf", "_ocr.txt");
  writeFileSync(txtPath, fullText, "utf8");
  console.log(`   💾 Full OCR text saved: ${basename(txtPath)}`);

  // Chunk
  const chunks = chunkText(fullText);
  console.log(`\n📦  Chunking: ${chunks.length} chunks (${CHUNK_SIZE}w / ${OVERLAP}w overlap)`);

  // Embed and upload in batches of 10
  console.log(`\n🔢  Embedding and uploading...`);
  let saved = 0;
  const BATCH = 10;

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const rows  = [];

    for (let j = 0; j < batch.length; j++) {
      const embedding = await embedText(batch[j]);
      rows.push({
        subject:         "Afaan Amaharaa",
        topic:           "Afaan Amaharaa",
        grade:           "8",
        language:        "Amharic",
        source_document: filename,
        content:         batch[j].replace(/---\s*Page\s+\d+\s*---/gi, "").trim(),
        chunk_index:     i + j,
        chunk_type:      "text",
        chapter:         null,
        page_number:     0,
        embedding:       `[${embedding.join(",")}]`,
        version:         1,
        uploaded_by:     "Admin (OCR upload)",
      });
      await sleep(80);
    }

    await saveChunks(rows);
    saved += rows.length;
    const pct = Math.round(((i + batch.length) / chunks.length) * 100);
    process.stdout.write(`\r   [${String(pct).padStart(3)}%] Saved ${saved}/${chunks.length} chunks (key ${keyIndex + 1})...`);
  }

  // Cleanup temp images
  console.log(`\n\n🧹  Cleaning up temp images...`);
  for (const img of images) { try { unlinkSync(img); } catch {} }
  try { require("fs").rmdirSync(TMP_DIR); } catch {}

  console.log(`\n${"─".repeat(55)}`);
  console.log(`✅  Amharic upload complete!`);
  console.log(`   Pages OCR'd : ${pageTexts.length}`);
  console.log(`   Chunks saved: ${saved}`);
  console.log(`   Subject     : Afaan Amaharaa — Grade 8 (Amharic)`);
  console.log(`   Curriculum is live in Supabase!\n`);
}

main().catch(e => { console.error("\nFatal:", e.message); process.exit(1); });
