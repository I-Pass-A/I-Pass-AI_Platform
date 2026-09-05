/**
 * I-Pass-A Structured Textbook Uploader
 * ======================================
 * Supports .pdf, .txt, and .docx files.
 * Subject-aware extraction with chunk typing.
 * Embeds with Gemini gemini-embedding-2 (1024 dims).
 * Stores documents → chapters → chunks in Supabase.
 *
 * Usage:
 *   node scripts/upload_textbooks.mjs              → all grades, all files
 *   node scripts/upload_textbooks.mjs Biology       → Biology only
 *   node scripts/upload_textbooks.mjs Biology,Mathematics
 *   node scripts/upload_textbooks.mjs grade12       → all Grade 12
 *   node scripts/upload_textbooks.mjs grade6        → all Grade 6
 */

import {
  readFileSync, readdirSync, existsSync,
  mkdirSync, writeFileSync, unlinkSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import { execSync } from "child_process";
import { getDocument } from "../node_modules/pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ────────────────────────────────────────────────────────────
function loadEnv() {
  try {
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
  } catch {
    console.error("❌  Could not read .env.local");
    process.exit(1);
  }
}
loadEnv();

// ── Config ─────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Key rotation — when one key hits the daily limit, automatically switch to the next
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean);

let currentKeyIndex = 0;
let consecutiveFailures = 0;
let keysExhausted = new Set();

function getActiveKey() {
  return GEMINI_KEYS[currentKeyIndex];
}

function rotateKey() {
  keysExhausted.add(currentKeyIndex);
  const prev = currentKeyIndex;

  // Find next non-exhausted key
  let next = (currentKeyIndex + 1) % GEMINI_KEYS.length;
  let attempts = 0;
  while (keysExhausted.has(next) && attempts < GEMINI_KEYS.length) {
    next = (next + 1) % GEMINI_KEYS.length;
    attempts++;
  }

  if (keysExhausted.size >= GEMINI_KEYS.length) {
    // All keys exhausted — reset and wait 2 minutes for quotas to partially recover
    console.log(`\n   ⏳  All ${GEMINI_KEYS.length} keys exhausted — waiting 2 minutes for quota recovery...`);
    keysExhausted.clear();
    return new Promise(r => setTimeout(r, 120000));
  }

  currentKeyIndex = next;
  consecutiveFailures = 0;
  console.log(`\n   🔄  Key ${prev + 1} exhausted → switching to key ${currentKeyIndex + 1}`);
  return Promise.resolve();
}

const CHUNK_SIZE    = 400;
const OVERLAP       = 60;
const BATCH_SIZE    = 50;

// Grade folders
const GRADE_CONFIGS = {
  grade12: { dir: join(__dirname, "textbooks", "grade12"), grade: "12", language: "English" },
  grade6:  { dir: join(__dirname, "textbooks", "grade6"),  grade: "6",  language: "Afaan Oromo" },
  grade8:  { dir: join(__dirname, "textbooks", "grade8"),  grade: "8",  language: "Afaan Oromo" },
  entrance12: { dir: join(__dirname, "textbooks", "entrance", "grade12"), grade: "entrance_12", language: "English" },
  entrance6:  { dir: join(__dirname, "textbooks", "entrance", "grade6"),  grade: "entrance_6",  language: "Afaan Oromo" },
  entrance8:  { dir: join(__dirname, "textbooks", "entrance", "grade8"),  grade: "entrance_8",  language: "Afaan Oromo" },
};

// Entrance exam files (UEE past papers + model exams)
const ENTRANCE_SUBJECT_MAP = {
  "entrance-g12-biology-2015":    "Biology",
  "entrance-g12-chemistry-2015":  "Chemistry",
  "entrance-g12-mathematics-2015":"Mathematics",
  "entrance-g12-physics-2015":    "Physics",
  "entrance-g12-sat-2015":        "SAT",
  "entrance-g12-english-2015":    "English",
  "entrance-g12-biology-2017":    "Biology",
  "entrance-g12-chemistry-2017":  "Chemistry",
  "entrance-g12-geography-2017":  "Geography",
  "entrance-g12-aptitude-2017":   "Aptitude",
  "entrance-g12-economics-2017":  "Economics",
  "entrance-g12-english-2017":    "English",
  "entrance-g12-history-2017":    "History",
  "entrance-g12-mathematics-2017":"Mathematics",
  "entrance-g12-physics-2017":    "Physics",
};
const SUBJECT_MAP = {
  "g12-agriculture":      "Agriculture",
  "g12-biology":          "Biology", 
  "g12-chemistry":        "Chemistry",
  "g12-economics":        "Economics",
  "g12-english":          "English",
  "g12-geography":        "Geography",
  "g12-history":          "History",
  "g12-it":               "IT",
  "g12-mathematics":      "Mathematics",
  "g12-physics":          "Physics",
  "g6-afaan-oromo":       "Afaan Oromo",
  "g6-barnoota-safuu":    "Barnoota Safuu",
  "g6-afaan-ingiliffaa":  "Afaan Ingiliffaa",
  "g6-fjq":               "FJQ",
  "g6-gada":              "Gada",
  "g6-herrega":           "Herrega",
  "g6-og-aartiiwwan":     "Og-Aartiiwwan",
  "g6-saayinsii":         "Saayinsii",
  "g8-afaan-amaharaa":    "Afaan Amaharaa",
  "g8-afaan-oromo":       "Afaan Oromo",
  "g8-hawaasummaa":       "Hawaasummaa",
  "g8-afaan-ingiliffaa":  "Afaan Ingiliffaa",
  "g8-fjq":               "FJQ",
  "g8-herrega":           "Herrega",
  "g8-it":                "IT",
  "g8-lammummaa":         "Lammummaa",
  "g8-og-aartiiwwan":     "Og-Aartiiwwan",
  "g8-saayinsii":         "Saayinsii",
};

// ── Subject-aware chunk type detection ────────────────────────────────────────
// Patterns that identify special chunk types per subject
const CHUNK_TYPE_PATTERNS = {
  // Universal
  definition: [
    /^(definition|meaning|is defined as|refers to|is the process|is a process|is an|is the)[:\s]/i,
    /\bis defined as\b/i,
    /\brefers to\b/i,
  ],
  example: [
    /^(example|for example|e\.g\.|e\.g|illustration|sample)[:\.\s]/i,
    /^example\s*\d+/i,
  ],
  question: [
    /^(exercise|question|activity|review|check your understanding|self.?test|practice)[:\s\d]/i,
    /^\d+\.\s+\w+.*\?$/m,
  ],
  equation: [
    // Math/Physics/Chemistry equations
    /[=<>≤≥±÷×∑∫∂∆√π]/,
    /\b(equation|formula|reaction|law|theorem|proof)\b/i,
    /[A-Za-z]\s*=\s*[A-Za-z0-9]/,
    /\d+[A-Z][a-z]?\d*\s*[+→←⇌]\s*/,  // chemical equations
  ],
  table: [
    /\|\s*\w+\s*\|/,  // markdown table
    /^(\w[\w\s]+)\s{2,}(\w[\w\s]+)\s{2,}/m,  // aligned columns
  ],
  code: [
    /^(def |class |import |function |var |const |let |<html|#include|public\s+class)/m,
    /```/,
    /^\s{4,}\w/m,  // indented code
  ],
  passage: [
    /^(read the following|reading passage|text [a-z]:|passage\s*\d)/i,
  ],
};

function detectChunkType(text, subject) {
  const lower = text.toLowerCase();

  // Code — IT subject only
  if (subject === "IT") {
    for (const pat of CHUNK_TYPE_PATTERNS.code) {
      if (pat.test(text)) return "code";
    }
  }

  // Passage — English subject only
  if (subject === "English") {
    for (const pat of CHUNK_TYPE_PATTERNS.passage) {
      if (pat.test(text)) return "passage";
    }
  }

  // Table
  for (const pat of CHUNK_TYPE_PATTERNS.table) {
    if (pat.test(text)) return "table";
  }

  // Equation/formula — Math, Physics, Chemistry
  if (["Mathematics", "Physics", "Chemistry"].includes(subject)) {
    for (const pat of CHUNK_TYPE_PATTERNS.equation) {
      if (pat.test(text)) return "equation";
    }
  }

  // Definition
  for (const pat of CHUNK_TYPE_PATTERNS.definition) {
    if (pat.test(text)) return "definition";
  }

  // Example
  for (const pat of CHUNK_TYPE_PATTERNS.example) {
    if (pat.test(text)) return "example";
  }

  // Question
  for (const pat of CHUNK_TYPE_PATTERNS.question) {
    if (pat.test(text)) return "question";
  }

  return "text";
}

// ── Chapter detection ──────────────────────────────────────────────────────────
const CHAPTER_PATTERNS = [
  /^chapter\s+(\d+)[:\s\.]+(.+)$/i,
  /^unit\s+(\d+)[:\s\.]+(.+)$/i,
  /^(\d+)\.\s+([A-Z][^a-z]{3,})$/,     // "1. PHOTOSYNTHESIS"
  /^section\s+(\d+)[:\s\.]+(.+)$/i,
];

function detectChapter(text) {
  const firstLine = text.split("\n")[0].trim();
  for (const pat of CHAPTER_PATTERNS) {
    const m = firstLine.match(pat);
    if (m) {
      return {
        number: parseInt(m[1]) || 1,
        title: m[2]?.trim().slice(0, 120) || firstLine.slice(0, 120),
      };
    }
  }
  return null;
}

// ── Text extraction ────────────────────────────────────────────────────────────

async function extractTextFromFile(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();

  if (ext === "txt") {
    const text = readFileSync(filePath, "utf8");
    return { text, numPages: Math.ceil(text.split(/\s+/).filter(Boolean).length / 300) };
  }

  if (ext === "docx") {
    return await extractTextFromDocx(filePath);
  }

  // PDF
  const data = new Uint8Array(readFileSync(filePath));
  const doc = await getDocument({
    data, useWorkerFetch: false, isEvalSupported: false,
    useSystemFonts: true, verbosity: 0,
  }).promise;

  let fullText = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ").trim();
    if (pageText) fullText += `\n\n--- Page ${i} ---\n${pageText}`;
  }
  return { text: fullText, numPages: doc.numPages };
}

async function extractTextFromDocx(filePath) {
  const pythonScript = `
import sys, io
from docx import Document
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
doc = Document(sys.argv[1])
parts = []
for para in doc.paragraphs:
    t = para.text.strip()
    if t: parts.append(t)
for table in doc.tables:
    for row in table.rows:
        cells = [c.text.strip() for c in row.cells if c.text.strip()]
        if cells: parts.append(' | '.join(cells))
print('\\n'.join(parts))
`.trim();

  const tmpScript = join(__dirname, "_docx_tmp.py");
  writeFileSync(tmpScript, pythonScript);
  try {
    const result = execSync(`python "${tmpScript}" "${filePath}"`, {
      maxBuffer: 50 * 1024 * 1024, encoding: "utf8",
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    const text = result.trim();
    return { text, numPages: Math.ceil(text.split(/\s+/).filter(Boolean).length / 300) };
  } finally {
    try { unlinkSync(tmpScript); } catch {}
  }
}

// ── Chunking ───────────────────────────────────────────────────────────────────

function containsOpenFormula(text) {
  const opens  = (text.match(/\\\[|\$\$|\\begin\{(equation|align|matrix)\}/g) || []).length;
  const closes = (text.match(/\\\]|\$\$|\\end\{(equation|align|matrix)\}/g) || []).length;
  return opens > closes;
}

function chunkText(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    let end = Math.min(i + CHUNK_SIZE, words.length);
    // Don't split mid-formula
    if (end < words.length) {
      const candidate = words.slice(i, end).join(" ");
      if (containsOpenFormula(candidate)) {
        let ext = end;
        while (ext < Math.min(words.length, end + 100)) {
          ext++;
          if (!containsOpenFormula(words.slice(i, ext).join(" "))) { end = ext; break; }
        }
      }
    }
    const chunk = words.slice(i, end).join(" ");
    if (chunk.trim().length > 80) chunks.push(chunk);
    i += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}

// ── Voyage AI batch embedding ──────────────────────────────────────────────────

async function embedBatch(texts) {
  // Gemini embedding-2: one request per text with key rotation on rate limit
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i++) {
    const body = JSON.stringify({
      model: "models/gemini-embedding-2",
      content: { parts: [{ text: texts[i].slice(0, 3000) }] },
      outputDimensionality: 1024,
    });

    let embedded = false;
    while (!embedded) {
      const key = getActiveKey();
      const res = await httpsRequest({
        hostname: "generativelanguage.googleapis.com",
        path: `/v1beta/models/gemini-embedding-2:embedContent?key=${key}`,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      }, body);

      const parsed = JSON.parse(res.body);

      if (parsed.embedding?.values) {
        allEmbeddings.push(parsed.embedding.values);
        consecutiveFailures = 0;
        embedded = true;
      } else if (res.status === 429 || parsed.error?.code === 429 ||
                 (parsed.error?.message || "").includes("quota") ||
                 (parsed.error?.message || "").includes("RESOURCE_EXHAUSTED")) {
        consecutiveFailures++;
        if (GEMINI_KEYS.length > 1) {
          // Immediately rotate to the next key — no waiting
          await rotateKey();
          await sleep(500);
        } else {
          // Only one key — have to wait
          const wait = Math.min(60000 * consecutiveFailures, 120000);
          process.stdout.write(`\n   ⏳  Rate limited — waiting ${wait/1000}s...\n`);
          await sleep(wait);
        }
      } else {
        throw new Error(`Gemini embedding failed (${res.status}): ${res.body.slice(0, 150)}`);
      }
    }

    // 80ms gap between requests
    await sleep(80);

    if ((i + 1) % 50 === 0) {
      process.stdout.write(`\r   Embedding: ${i + 1}/${texts.length} (key ${currentKeyIndex + 1}/${GEMINI_KEYS.length})...`);
    }
  }
  return allEmbeddings;
}

// ── Supabase helpers ───────────────────────────────────────────────────────────

async function upsertDocument(doc) {
  // Check if document already exists for this subject+grade
  const checkBody = JSON.stringify({});
  const supaUrl = new URL(SUPABASE_URL);

  // Delete existing document first (cascade deletes chapters and chunks)
  const delRes = await httpsRequest({
    hostname: supaUrl.hostname,
    path: `/rest/v1/documents?subject=eq.${encodeURIComponent(doc.subject)}&grade=eq.${encodeURIComponent(doc.grade)}`,
    method: "DELETE",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
  });

  // Insert new document
  const body = JSON.stringify(doc);
  const res = await httpsRequest({
    hostname: supaUrl.hostname,
    path: "/rest/v1/documents",
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);

  const data = JSON.parse(res.body);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Document insert failed (${res.status}): ${res.body.slice(0, 150)}`);
  }
  return Array.isArray(data) ? data[0] : data;
}

async function insertChapter(chapter) {
  const body = JSON.stringify(chapter);
  const supaUrl = new URL(SUPABASE_URL);
  const res = await httpsRequest({
    hostname: supaUrl.hostname,
    path: "/rest/v1/chapters",
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);
  const data = JSON.parse(res.body);
  if (res.status < 200 || res.status >= 300) throw new Error(`Chapter insert failed: ${res.body.slice(0, 100)}`);
  return Array.isArray(data) ? data[0] : data;
}

async function insertChunkBatch(chunks) {
  const body = JSON.stringify(chunks);
  const supaUrl = new URL(SUPABASE_URL);
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
    throw new Error(`Chunk batch insert failed (${res.status}): ${res.body.slice(0, 150)}`);
  }
}

// ── HTTP helper ────────────────────────────────────────────────────────────────

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

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Page number extraction ─────────────────────────────────────────────────────

function extractPageNumber(text) {
  // Look for "--- Page N ---" markers inserted during PDF extraction
  const m = text.match(/---\s*Page\s+(\d+)\s*---/i);
  return m ? parseInt(m[1]) : 0;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY || GEMINI_KEYS.length === 0) {
    console.error("❌  Missing env vars. Check .env.local");
    process.exit(1);
  }

  console.log("\n🚀  I-Pass-A Structured Textbook Uploader");
  console.log(`   Embedding: Gemini gemini-embedding-2 (1024 dims) — ${GEMINI_KEYS.length} key(s) with rotation`);
  console.log("   Pipeline: documents → chapters → typed chunks\n");

  const filterArg = process.argv[2] ?? null;
  const filterTokens = filterArg
    ? filterArg.split(",").map((s) => s.trim().toLowerCase())
    : null;

  if (filterTokens) console.log(`   Filter: ${filterArg}\n`);

  let totalChunks = 0;
  let successFiles = 0;

  for (const [gradeKey, { dir, grade, language }] of Object.entries(GRADE_CONFIGS)) {
    if (filterTokens?.some((t) => t.startsWith("grade") || t.startsWith("entrance"))) {
      if (!filterTokens.includes(gradeKey)) continue;
    }

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`📁  Created ${dir} — place textbooks there.`);
      continue;
    }

    const allFiles = readdirSync(dir).filter((f) => /\.(pdf|txt|docx)$/i.test(f));
    if (allFiles.length === 0) continue;

    const files = filterTokens && !filterTokens.some((t) => t.startsWith("grade") || t.startsWith("entrance"))
      ? allFiles.filter((f) => {
          const stem = f.replace(/\.(pdf|txt|docx)$/i, "").toLowerCase();
          const subj = (SUBJECT_MAP[stem] ?? "").toLowerCase();
          return filterTokens.some((fs) => subj.includes(fs) || stem.includes(fs));
        })
      : allFiles;

    if (files.length === 0) continue;

    console.log(`📚  Grade ${grade} (${language}) — ${files.length} file(s)`);

    for (const filename of files) {
      const stem = filename.replace(/\.(pdf|txt|docx)$/i, "").toLowerCase();
      const subject = SUBJECT_MAP[stem] || ENTRANCE_SUBJECT_MAP[stem];
      const ext = filename.split(".").pop().toLowerCase();

      if (!subject) {
        console.warn(`\n⚠️   Skipping "${filename}" — add "${stem}": "SubjectName" to SUBJECT_MAP`);
        continue;
      }

      console.log(`\n📖  ${filename}  →  ${subject} (Grade ${grade}, ${language})`);

      // ── Extract text ──────────────────────────────────────────────────────
      let text = "", numPages = 0;
      try {
        ({ text, numPages } = await extractTextFromFile(join(dir, filename)));
        const words = text.split(/\s+/).filter(Boolean).length;
        console.log(`   Format: ${ext.toUpperCase()}  |  ~Pages: ${numPages}  |  Words: ${words.toLocaleString()}`);
        if (words < 200) {
          console.warn(`   ⚠️  Too few words (${words}) — skipping.`);
          continue;
        }
      } catch (e) {
        console.error(`   ❌  Extract failed: ${e.message}`);
        continue;
      }

      // ── Create document record ────────────────────────────────────────────
      let docRecord;
      try {
        docRecord = await upsertDocument({
          title: `Grade ${grade} ${subject} Student Textbook`,
          subject, grade, language,
          curriculum_year: "2023",
          file_name: filename,
          uploaded_by: "Admin (batch upload)",
        });
        console.log(`   Document ID: ${docRecord.id}`);
      } catch (e) {
        console.error(`   ❌  Document insert failed: ${e.message}`);
        continue;
      }

      // ── Chunk text ────────────────────────────────────────────────────────
      const rawChunks = chunkText(text);
      console.log(`   Chunks: ${rawChunks.length}  (${CHUNK_SIZE}w / ${OVERLAP}w overlap)`);

      // ── Detect chapters and assign to chunks ──────────────────────────────
      const chapterMap = new Map(); // chapterKey → chapter DB id
      const chunkMeta = [];
      let currentChapterNum = 1;
      let currentChapterTitle = `${subject} — Introduction`;
      let currentChapterId = null;

      for (let i = 0; i < rawChunks.length; i++) {
        const chunk = rawChunks[i];
        const detected = detectChapter(chunk);

        if (detected) {
          const key = `${detected.number}-${detected.title}`;
          if (!chapterMap.has(key)) {
            try {
              const ch = await insertChapter({
                document_id: docRecord.id,
                chapter_number: detected.number,
                title: detected.title,
                page_start: extractPageNumber(chunk),
              });
              chapterMap.set(key, ch.id);
              currentChapterId = ch.id;
              currentChapterNum = detected.number;
              currentChapterTitle = detected.title;
            } catch {
              // Chapter insert failed — continue without it
            }
          } else {
            currentChapterId = chapterMap.get(key);
          }
        }

        chunkMeta.push({
          chapter_num: currentChapterNum,
          chapter_title: currentChapterTitle,
          chapter_id: currentChapterId,
          page_number: extractPageNumber(chunk),
          chunk_type: detectChunkType(chunk, subject),
        });
      }

      // ── Embed all chunks with Voyage AI (batched) ─────────────────────────
      console.log(`   Embedding ${rawChunks.length} chunks with Gemini gemini-embedding-2...`);
      let embeddings;
      try {
        // Clean page markers from text before embedding
        const cleanChunks = rawChunks.map((c) =>
          c.replace(/---\s*Page\s+\d+\s*---/gi, "").trim()
        );
        embeddings = await embedBatch(cleanChunks, "document");
        console.log(`   ✓ All ${embeddings.length} embeddings generated`);
      } catch (e) {
        console.error(`   ❌  Embedding failed: ${e.message}`);
        continue;
      }

      // ── Insert chunks in batches of 50 ────────────────────────────────────
      const INSERT_BATCH = 50;
      let saved = 0;

      for (let i = 0; i < rawChunks.length; i += INSERT_BATCH) {
        const batchChunks = rawChunks.slice(i, i + INSERT_BATCH);
        const batchEmbed  = embeddings.slice(i, i + INSERT_BATCH);
        const batchMeta   = chunkMeta.slice(i, i + INSERT_BATCH);
        const pct = Math.round(((i + batchChunks.length) / rawChunks.length) * 100);

        process.stdout.write(`\r   [${String(pct).padStart(3)}%] Saving chunks ${i + 1}–${i + batchChunks.length}/${rawChunks.length}...`);

        const rows = batchChunks.map((content, j) => ({
          document_id:     docRecord.id,
          chapter_id:      batchMeta[j].chapter_id ?? null,
          subject,
          topic:           subject,
          grade,
          language,
          source_document: filename,
          content:         content.replace(/---\s*Page\s+\d+\s*---/gi, "").trim(),
          chunk_index:     i + j,
          chunk_type:      batchMeta[j].chunk_type,
          chapter:         batchMeta[j].chapter_title,
          section:         null,
          page_number:     batchMeta[j].page_number,
          embedding:       `[${batchEmbed[j].join(",")}]`,
          version:         1,
          uploaded_by:     "Admin (batch upload)",
        }));

        let retries = 0;
        while (retries < 3) {
          try {
            await insertChunkBatch(rows);
            saved += rows.length;
            break;
          } catch (e) {
            retries++;
            if (retries < 3) await sleep(1000 * retries);
            else process.stdout.write(`\n   ❌  Batch ${i}–${i + INSERT_BATCH} failed: ${e.message}\n`);
          }
        }
      }

      process.stdout.write("\n");

      // ── Summary ───────────────────────────────────────────────────────────
      const typeCounts = {};
      for (const m of chunkMeta) typeCounts[m.chunk_type] = (typeCounts[m.chunk_type] || 0) + 1;
      const typeStr = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `${t}:${n}`)
        .join(" ");

      console.log(`   ✅  ${subject}: ${saved}/${rawChunks.length} chunks saved`);
      console.log(`       Types — ${typeStr}`);
      console.log(`       Chapters detected: ${chapterMap.size}`);

      totalChunks += saved;
      successFiles++;
      await sleep(300);
    }
  }

  console.log(`\n${"─".repeat(55)}`);
  console.log(`✅  Upload complete!`);
  console.log(`   Files  : ${successFiles}`);
  console.log(`   Chunks : ${totalChunks}`);
  console.log(`   Curriculum is live in Supabase vector DB.\n`);
}

main().catch((e) => {
  console.error("\nFatal error:", e.message);
  process.exit(1);
});
