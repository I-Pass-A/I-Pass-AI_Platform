import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Only admins can call this
async function verifyAdmin(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data: { user } } = await supabase.auth.getUser(auth.substring(7));
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

export async function DELETE(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

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
