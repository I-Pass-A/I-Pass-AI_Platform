import { NextRequest, NextResponse } from "next/server";

// DISABLED: Migration route temporarily disabled to prevent schema conflicts
export async function POST(req: NextRequest) {
  return NextResponse.json({
    error: "Migration endpoint disabled",
    message: "This endpoint has been disabled to prevent schema conflicts. Use manual database migrations instead."
  }, { status: 503 });
}