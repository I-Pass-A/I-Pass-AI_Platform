import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    // Test database connection
    const { data: healthData, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    const healthCheck = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing",
        supabase_anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing", 
        supabase_service: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Set" : "❌ Missing",
        openrouter: process.env.OPENROUTER_API_KEY ? "✅ Set" : "❌ Missing",
        app_url: process.env.NEXT_PUBLIC_APP_URL || "Not set"
      },
      database: error ? `❌ Error: ${error.message}` : "✅ Connected"
    };

    return NextResponse.json(healthCheck);
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}