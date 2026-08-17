import { NextResponse } from "next/server";
import { getAuthSession } from "@/utils/auth";

// GET /api/admin/check - Verify session status and return user details
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ isAuthenticated: false, user: null });
    }

    return NextResponse.json({
      isAuthenticated: true,
      user: session,
    });
  } catch (error: any) {
    return NextResponse.json({ isAuthenticated: false, user: null }, { status: 500 });
  }
}
