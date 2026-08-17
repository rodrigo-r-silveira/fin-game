import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import {
  hashPassword,
  verifyPassword,
  setAuthSession,
  getAuthSession,
  clearAuthSession,
  getOrCreateSuperAdmin,
} from "@/utils/auth";

const DEFAULT_ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
const DEFAULT_ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "fingame2026").trim();

// POST /api/admin/login
export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const cleanUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
    const cleanPassword = typeof password === "string" ? password.trim() : "";

    if (!cleanUsername || !cleanPassword) {
      return NextResponse.json(
        { success: false, error: "Usuário e senha são obrigatórios." },
        { status: 400 }
      );
    }

    // 1. Look for user in database
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanUsername, mode: "insensitive" } },
          { email: { equals: cleanUsername, mode: "insensitive" } },
        ],
      },
    });

    // 2. If not found, check if it matches environment super admin
    if (!user) {
      if (cleanUsername === DEFAULT_ADMIN_USERNAME && cleanPassword === DEFAULT_ADMIN_PASSWORD) {
        user = await getOrCreateSuperAdmin();
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário ou senha incorretos." },
        { status: 401 }
      );
    }

    // 3. Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "Este usuário está desativado pelo Super Administrador." },
        { status: 403 }
      );
    }

    // 4. Verify password
    let passwordValid = false;
    if (user.passwordHash.includes(":")) {
      passwordValid = verifyPassword(cleanPassword, user.passwordHash);
    } else {
      // Legacy plaintext check & auto-upgrade to salt:hash
      passwordValid = user.passwordHash === cleanPassword || (cleanUsername === DEFAULT_ADMIN_USERNAME && cleanPassword === DEFAULT_ADMIN_PASSWORD);
      if (passwordValid) {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: hashPassword(cleanPassword) },
        });
      }
    }

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: "Usuário ou senha incorretos." },
        { status: 401 }
      );
    }

    // 5. Store session in cookie
    const sessionData = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };
    await setAuthSession(sessionData);

    return NextResponse.json({
      success: true,
      user: sessionData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/admin/login / GET /api/admin/check - Verify session status
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
    return NextResponse.json({ isAuthenticated: false, user: null });
  }
}

// DELETE /api/admin/login - Logout
export async function DELETE() {
  try {
    await clearAuthSession();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
