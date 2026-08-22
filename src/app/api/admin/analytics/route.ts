import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    // Basic analytics for now - can be expanded later
    const { data: usersData } = await supabase
      .from("profiles")
      .select("role, created_at");

    const { data: chunksData } = await supabase
      .from("curriculum_chunks")
      .select("subject, grade, created_at");

    const totalUsers = usersData?.length || 0;
    const totalContent = chunksData?.length || 0;

    return NextResponse.json({
      users: {
        total: totalUsers,
        students: usersData?.filter((u: any) => u.role === "student").length || 0,
        teachers: usersData?.filter((u: any) => u.role === "teacher").length || 0,
        admins: usersData?.filter((u: any) => u.role === "admin").length || 0,
      },
      content: {
        total: totalContent,
        subjects: chunksData?.reduce((acc: any, chunk: any) => {
          acc[chunk.subject] = (acc[chunk.subject] || 0) + 1;
          return acc;
        }, {}) || {}
      },
      activity: {
        newUsersThisMonth: 0, // Placeholder
        activeUsersThisMonth: 0, // Placeholder
      }
    });

  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}