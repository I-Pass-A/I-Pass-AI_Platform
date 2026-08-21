/**
 * Run migration script against Supabase database
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

async function runMigration(migrationFile) {
  console.log(`🔄 Running migration: ${migrationFile}`);
  
  try {
    const sql = readFileSync(join(__dirname, "..", "supabase", migrationFile), "utf8");
    console.log(`📄 SQL loaded (${sql.length} chars)`);
    
    const supaUrl = new URL(SUPABASE_URL);
    
    const res = await httpsRequest({
      hostname: supaUrl.hostname,
      path: "/rest/v1/rpc/exec_sql",
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: "Bearer " + SERVICE_KEY,
        "Content-Type": "application/json",
      },
    }, JSON.stringify({ sql }));

    if (res.status >= 200 && res.status < 300) {
      console.log("✅ Migration completed successfully");
      console.log("Response:", res.body);
    } else {
      console.error("❌ Migration failed:", res.body);
    }
  } catch (error) {
    console.error("❌ Error running migration:", error.message);
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2] || "migration_005_auth_improvements.sql";
runMigration(migrationFile);