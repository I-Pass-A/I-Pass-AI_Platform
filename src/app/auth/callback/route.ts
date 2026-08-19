import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * /auth/callback
 *
 * Supabase redirects here after:
 *   1. Email confirmation (new signup)
 *   2. Password reset (forgot password link)
 *
 * The URL contains either:
 *   - A `code` query param (PKCE flow — newer Supabase)
 *   - A `token_hash` + `type` query param (older email OTP flow)
 *
 * After exchanging the code/token we redirect the user to the right page.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type"); // "signup" | "recovery" | "email_change"
  const next = url.searchParams.get("next") ?? "/dashboard";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Build the base origin for redirects
  const origin = url.origin;

  if (!supabaseUrl || supabaseUrl === "https://placeholder-project-id.supabase.co") {
    // Mock/dev mode — just redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    if (code) {
      // PKCE code exchange
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("Auth callback code exchange error:", error.message);
        return NextResponse.redirect(
          new URL(`/?error=${encodeURIComponent(error.message)}`, origin)
        );
      }

      // After a recovery (password reset) code, send to reset-password page
      // The session is now active so the reset-password page can call updateUser
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/auth/reset-password", origin));
      }

      // Email confirmation — send to dashboard
      return NextResponse.redirect(new URL(next, origin));
    }

    if (tokenHash && type) {
      // OTP token verification (email confirm or recovery)
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
      if (error) {
        console.error("Auth callback OTP verify error:", error.message);
        return NextResponse.redirect(
          new URL(`/?error=${encodeURIComponent(error.message)}`, origin)
        );
      }

      if (type === "recovery") {
        return NextResponse.redirect(new URL("/auth/reset-password", origin));
      }

      return NextResponse.redirect(new URL(next, origin));
    }

    // No code or token — redirect to home
    return NextResponse.redirect(new URL("/", origin));
  } catch (e: any) {
    console.error("Auth callback unexpected error:", e.message);
    return NextResponse.redirect(new URL("/", origin));
  }
}
