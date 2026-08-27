import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAuthError, requireRole } from "@/lib/api-auth";

export async function DELETE(req: NextRequest) {
  const admin = await requireRole(req, ["admin"], "admin");
  if (isAuthError(admin)) return admin;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // Prevent deleting other admins
  const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (target?.role === "admin") return NextResponse.json({ error: "Cannot delete admin users" }, { status: 403 });

  // Delete from auth — cascades to profiles via FK
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
