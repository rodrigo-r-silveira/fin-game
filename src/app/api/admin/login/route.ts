import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "fingame2026";

// POST /api/admin/login
export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.set("finGame_admin_authenticated", "true", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Usuário ou senha incorretos." },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/admin/check - Verify session status
export async function GET() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("finGame_admin_authenticated");
  const isAuthenticated = authCookie?.value === "true";

  return NextResponse.json({ isAuthenticated });
}

// DELETE /api/admin/login - Logout
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("finGame_admin_authenticated");
  return NextResponse.json({ success: true });
}
