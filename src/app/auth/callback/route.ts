import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Auth Callback Handler
 * Handles PKCE code exchange and redirects to the correct page
 * based on the type of auth flow (recovery, signup, etc.)
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Determine where to redirect based on session type
      // recovery = password reset, email = email confirmation
      const amrMethods = data.session.user?.app_metadata?.amr || [];
      const isRecovery = amrMethods.some((m: any) => m.method === "recovery") ||
                         type === "recovery";

      if (isRecovery) {
        // Password reset flow - redirect to reset password page with code
        const response = NextResponse.redirect(`${origin}/auth/reset-password`);
        // Set the session cookie so reset page can use it
        response.cookies.set("sb-access-token", data.session.access_token, {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 3600
        });
        return response;
      }

      // Email confirmation or other flow - go to dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Error or no code - redirect to home
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
