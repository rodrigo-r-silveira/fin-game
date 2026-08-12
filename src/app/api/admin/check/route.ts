import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET /api/admin/check - Verify session status
export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("finGame_admin_authenticated");
    const isAuthenticated = authCookie?.value === "true";

    return NextResponse.json({ isAuthenticated });
  } catch (error: any) {
    return NextResponse.json({ isAuthenticated: false }, { status: 500 });
  }
}
