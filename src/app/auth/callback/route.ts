import { NextRequest, NextResponse } from "next/server";

/**
 * Auth callback handler — catches Supabase PKCE redirects
 * and forwards to the correct page based on auth type
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/auth/reset-password?code=${code}`);
    }
    return NextResponse.redirect(`${origin}${next}?code=${code}`);
  }

  return NextResponse.redirect(`${origin}/`);
}
