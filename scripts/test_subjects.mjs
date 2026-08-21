/**
 * Test the uploaded subjects by querying directly
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

async function testSubjects() {
  console.log("🧪 Testing uploaded subjects...\n");

  const supaUrl = new URL(SUPABASE_URL);
  
  // Test each subject individually
  const subjects = [
    "Mathematics", "Physics", "English", "Biology", "Chemistry", 
    "IT", "Geography", "History", "Economics", "Agriculture"
  ];

  console.log("📊 Subject chunk counts:");
  console.log("═".repeat(40));
  
  let totalChunks = 0;
  
  for (const subject of subjects) {
    const res = await httpsRequest({
      hostname: supaUrl.hostname,
      path: `/rest/v1/curriculum_chunks?select=id&subject=eq.${encodeURIComponent(subject)}&grade=eq.12`,
      method: "GET",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: "Bearer " + SERVICE_KEY,
        "Content-Type": "application/json",
        "Prefer": "count=exact"
      },
    });

    const count = res.headers && res.headers["content-range"] 
      ? parseInt(res.headers["content-range"].split("/")[1]) 
      : JSON.parse(res.body).length;
    
    const status = count > 0 ? "✅" : "❌";
    console.log(`${status} ${subject.padEnd(12)} - ${count.toString().padStart(3)} chunks`);
    totalChunks += count;
  }
  
  console.log("═".repeat(40));
  console.log(`📄 Total chunks: ${totalChunks}`);
  
  // Test a sample query
  console.log("\n🔍 Testing sample queries:");
  
  const testQueries = [
    { subject: "Mathematics", query: "quadratic equation" },
    { subject: "Physics", query: "Newton's law" },
    { subject: "Chemistry", query: "periodic table" },
    { subject: "Biology", query: "photosynthesis" }
  ];
  
  for (const test of testQueries) {
    const res = await httpsRequest({
      hostname: supaUrl.hostname,
      path: `/rest/v1/curriculum_chunks?select=content&subject=eq.${encodeURIComponent(test.subject)}&content=ilike.*${encodeURIComponent(test.query)}*&limit=1`,
      method: "GET",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: "Bearer " + SERVICE_KEY,
        "Content-Type": "application/json",
      },
    });
    
    const results = JSON.parse(res.body);
    const status = results.length > 0 ? "✅" : "❌";
    console.log(`${status} ${test.subject}: "${test.query}" - ${results.length > 0 ? "Found" : "Not found"}`);
  }
}

testSubjects().catch(console.error);