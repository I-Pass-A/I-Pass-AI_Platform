import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const role = searchParams.get("role");
    const grade = searchParams.get("grade");
    const active = searchParams.get("active");
    
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from("profiles")
      .select(`
        id,
        name,
        role,
        grade,
        language,
        created_at
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply filters
    if (role && role !== "all") {
      query = query.eq("role", role);
    }
    
    if (grade && grade !== "all") {
      query = query.eq("grade", grade);
    }
    
    const { data: users, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // Get total count for pagination
    let countQuery = supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    
    if (role && role !== "all") {
      countQuery = countQuery.eq("role", role);
    }
    if (grade && grade !== "all") {
      countQuery = countQuery.eq("grade", grade);
    }
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      throw countError;
    }
    
    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error: any) {
    console.error("Admin users API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { userId, action, data } = await req.json();
    
    if (!userId || !action) {
      return NextResponse.json(
        { error: "Missing userId or action" },
        { status: 400 }
      );
    }
    
    let result;
    
    switch (action) {
      case "update":
        result = await supabase
          .from("profiles")
          .update(data)
          .eq("id", userId)
          .select()
          .single();
        break;
        
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
    
    if (result.error) {
      throw result.error;
    }
    
    return NextResponse.json({ user: result.data });
    
  } catch (error: any) {
    console.error("Admin user update error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }
    
    // Check if trying to delete admin user
    const { data: user } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    
    if (user?.role === "admin") {
      return NextResponse.json(
        { error: "Cannot delete admin users" },
        { status: 403 }
      );
    }
    
    // Delete from auth.users first (cascades to profiles)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      throw authError;
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error("Admin user delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}