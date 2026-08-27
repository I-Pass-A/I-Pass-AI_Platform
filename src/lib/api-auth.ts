import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export type AppRole = "student" | "teacher" | "admin";

export type AuthenticatedUser = {
  id: string;
  role: AppRole;
};

const hasRealSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && url !== "https://placeholder-project-id.supabase.co");
};

/**
 * Verifies the bearer token with Supabase and obtains the role from the
 * server-controlled profile row. JWT payloads must not be decoded and trusted
 * here because their claims can be stale or forged when verification is skipped.
 */
export async function requireRole(
  request: NextRequest,
  roles: readonly AppRole[],
  mockRole: AppRole = "student",
): Promise<AuthenticatedUser | NextResponse> {
  if (!hasRealSupabaseConfig()) {
    if (process.env.NODE_ENV !== "production") {
      return { id: `mock-${mockRole}-id`, role: mockRole };
    }
    return NextResponse.json({ detail: "Authentication is not configured" }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role as AppRole | undefined;

  if (profileError || !role || !roles.includes(role)) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }

  return { id: user.id, role };
}

export function isAuthError(value: AuthenticatedUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
