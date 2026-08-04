import { createClient } from "@supabase/supabase-js";

// Make initialization resilient to empty environment variables during build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project-id.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn(
    "⚠️ WARNING: NEXT_PUBLIC_SUPABASE_URL is not set. Supabase client initialized in fallback/mock mode."
  );
}

// Client for browser-side database interactions
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for server-side endpoints bypassing RLS (e.g. seeding, admin overrides)
export const getSupabaseAdmin = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return supabase;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
