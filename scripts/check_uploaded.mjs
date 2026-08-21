/**
 * Check which subjects have already been uploaded to the database
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
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
    console.error("❌ Could not read .env.local");
    process.exit(1);
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function checkUploaded() {
  console.log("📊 Checking uploaded subjects in database...\n");

  const supaUrl = new URL(SUPABASE_URL);
  
  // Check documents table
  const res = await httpsRequest({
    hostname: supaUrl.hostname,
    path: "/rest/v1/documents?select=subject,grade,language,title",
    method: "GET",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
    },
  });

  if (res.status < 200 || res.status >= 300) {
    console.error(`❌ Failed to query database: ${res.body}`);
    return;
  }

  const documents = JSON.parse(res.body);
  
  // Check curriculum_chunks for detailed stats
  const chunkRes = await httpsRequest({
    hostname: supaUrl.hostname,
    path: "/rest/v1/curriculum_chunks?select=subject,grade,language&limit=10000",
    method: "GET",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
    },
  });

  // Check curriculum_chunks for detailed stats - get count by subject
  const countRes = await httpsRequest({
    hostname: supaUrl.hostname,
    path: "/rest/v1/rpc/count_chunks_by_subject",
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
    },
  }, JSON.stringify({}));

  let chunkCounts = {};
  if (countRes.status >= 200 && countRes.status < 300) {
    try {
      const counts = JSON.parse(countRes.body);
      counts.forEach(item => {
        const key = `${item.subject}-Grade${item.grade}`;
        chunkCounts[key] = item.count;
      });
    } catch (e) {
      // Fallback to direct query with higher limit
      const chunkRes = await httpsRequest({
        hostname: supaUrl.hostname,
        path: "/rest/v1/curriculum_chunks?select=subject,grade",
        method: "GET",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: "Bearer " + SERVICE_KEY,
          "Content-Type": "application/json",
          Range: "0-2000"
        },
      });
      
      const chunks = JSON.parse(chunkRes.body);
      chunks.forEach(chunk => {
        const key = `${chunk.subject}-Grade${chunk.grade}`;
        chunkCounts[key] = (chunkCounts[key] || 0) + 1;
      });
    }
  }

  console.log("📚 Uploaded Documents:");
  console.log("═".repeat(60));
  
  const byGrade = {};
  documents.forEach(doc => {
    if (!byGrade[doc.grade]) byGrade[doc.grade] = [];
    byGrade[doc.grade].push(doc);
  });

  Object.keys(byGrade).sort().forEach(grade => {
    console.log(`\n🎓 Grade ${grade}:`);
    byGrade[grade].forEach(doc => {
      const key = `${doc.subject}-Grade${grade}`;
      const chunkCount = chunkCounts[key] || 0;
      console.log(`   ✓ ${doc.subject.padEnd(12)} (${doc.language}) - ${chunkCount} chunks`);
    });
  });

  console.log("\n" + "═".repeat(60));
  console.log(`📊 Total: ${documents.length} subjects across ${Object.keys(byGrade).length} grades`);
  console.log(`📄 Total chunks: ${Object.values(chunkCounts).reduce((a, b) => a + b, 0)}`);

  // Check what's missing for Grade 12
  const grade12Subjects = [
    "Mathematics", "Physics", "English", "Biology", "Chemistry", 
    "IT", "Geography", "History", "Economics", "Agriculture"
  ];
  
  const uploaded12 = byGrade["12"] ? byGrade["12"].map(d => d.subject) : [];
  const missing12 = grade12Subjects.filter(s => !uploaded12.includes(s));
  
  if (missing12.length > 0) {
    console.log(`\n⚠️  Missing Grade 12 subjects: ${missing12.join(", ")}`);
  } else {
    console.log(`\n✅ All Grade 12 subjects uploaded!`);
  }
}

checkUploaded().catch(console.error);