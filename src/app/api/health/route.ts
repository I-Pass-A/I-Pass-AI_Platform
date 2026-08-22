import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Test database connection
    const { error: dbError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    // Test OpenRouter key with a minimal call
    let openrouterStatus = "❌ Not tested";
    const orKey = process.env.OPENROUTER_API_KEY;
    if (orKey) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { "Authorization": `Bearer ${orKey}` }
        });
        openrouterStatus = res.ok ? "✅ Key valid" : `❌ HTTP ${res.status}`;
      } catch {
        openrouterStatus = "❌ Network error";
      }
    } else {
      openrouterStatus = "❌ Key missing";
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: {
        supabase_url:     process.env.NEXT_PUBLIC_SUPABASE_URL     ? "✅ Set" : "❌ Missing",
        supabase_anon:    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing",
        supabase_service: process.env.SUPABASE_SERVICE_ROLE_KEY     ? "✅ Set" : "❌ Missing",
        openrouter_key:   orKey ? "✅ Set" : "❌ Missing",
        openrouter_api:   openrouterStatus,
        app_url:          process.env.NEXT_PUBLIC_APP_URL || "Not set"
      },
      database: dbError ? `❌ Error: ${dbError.message}` : "✅ Connected"
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
