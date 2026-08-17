import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { getAuthSession, getOrCreateSuperAdmin } from "@/utils/auth";
import crypto from "crypto";

// Helper to generate a random 6-character room code
function generateRoomCode(prefix = "FIN"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

// GET /api/sessions - List or fetch game sessions
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const id = searchParams.get("id");

    // Public lookup by Room Code (used by participants joining room)
    if (code) {
      const session = await prisma.gameSession.findUnique({
        where: { code: code.trim().toUpperCase() },
        include: {
          facilitator: {
            select: { name: true, username: true },
          },
          _count: {
            select: { groups: true },
          },
        },
      });

      if (!session) {
        return NextResponse.json(
          { success: false, error: "Partida não encontrada para este código de sala." },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, session });
    }

    // Public lookup by Session ID
    if (id) {
      const session = await prisma.gameSession.findUnique({
        where: { id },
        include: {
          facilitator: {
            select: { name: true, username: true },
          },
          _count: {
            select: { groups: true },
          },
        },
      });

      if (!session) {
        return NextResponse.json({ success: false, error: "Partida não encontrada." }, { status: 404 });
      }

      return NextResponse.json({ success: true, session });
    }

    // Authenticated listing for Admin/Facilitator
    const authSession = await getAuthSession();
    if (!authSession) {
      // Fallback: If no user is logged in, return the most recent active session for participants
      const latestSession = await prisma.gameSession.findFirst({
        where: { isGameFinished: false },
        orderBy: { createdAt: "desc" },
      });

      if (latestSession) {
        return NextResponse.json({ success: true, session: latestSession });
      }

      return NextResponse.json(
        { success: false, error: "Autenticação necessária." },
        { status: 401 }
      );
    }

    // Filter sessions: Super Admin sees all, Facilitator sees only their own
    const whereClause: any = authSession.role === "SUPER_ADMIN" ? {} : { facilitatorId: authSession.id };

    let sessions = await prisma.gameSession.findMany({
      where: whereClause,
      include: {
        facilitator: {
          select: { name: true, username: true },
        },
        _count: {
          select: { groups: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Auto-create default session for facilitator if they have none
    if (sessions.length === 0) {
      const defaultCode = generateRoomCode(authSession.username.substring(0, 3).toUpperCase());
      const newSession = await prisma.gameSession.create({
        data: {
          code: defaultCode,
          title: "Partida Principal",
          facilitatorId: authSession.id,
          monthDurationSeconds: 120, // 2 minutes
          totalMonths: 7,
          monthlyAllowance: 1560.0,
          status: "WAITING",
        },
        include: {
          facilitator: {
            select: { name: true, username: true },
          },
          _count: {
            select: { groups: true },
          },
        },
      });
      sessions = [newSession];
    }

    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create new Game Session (Start new match)
export async function POST(req: Request) {
  try {
    const authSession = await getAuthSession();
    if (!authSession) {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, code, monthDurationSeconds, totalMonths, monthlyAllowance } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json(
        { success: false, error: "O título da partida é obrigatório." },
        { status: 400 }
      );
    }

    let roomCode = code ? String(code).trim().toUpperCase() : generateRoomCode(authSession.username.substring(0, 3).toUpperCase());

    // Check if code is unique, if not append random chars
    const existing = await prisma.gameSession.findUnique({
      where: { code: roomCode },
    });
    if (existing) {
      roomCode = generateRoomCode(authSession.username.substring(0, 3).toUpperCase());
    }

    const newSession = await prisma.gameSession.create({
      data: {
        code: roomCode,
        title: String(title).trim(),
        facilitatorId: authSession.id,
        monthDurationSeconds: Number(monthDurationSeconds) > 0 ? Number(monthDurationSeconds) : 120,
        totalMonths: Number(totalMonths) > 0 ? Number(totalMonths) : 7,
        monthlyAllowance: Number(monthlyAllowance) > 0 ? Number(monthlyAllowance) : 1560.0,
        status: "WAITING",
        currentMonth: 0,
        isStarted: false,
        isGameFinished: false,
      },
      include: {
        facilitator: {
          select: { name: true, username: true },
        },
        _count: {
          select: { groups: true },
        },
      },
    });

    return NextResponse.json({ success: true, session: newSession });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/sessions - Update session configuration or status
export async function PUT(req: Request) {
  try {
    const authSession = await getAuthSession();
    if (!authSession) {
      return NextResponse.json({ success: false, error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, monthDurationSeconds, totalMonths, monthlyAllowance, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID da partida é obrigatório." }, { status: 400 });
    }

    const session = await prisma.gameSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ success: false, error: "Partida não encontrada." }, { status: 404 });
    }

    // Only creator or Super Admin can edit
    if (authSession.role !== "SUPER_ADMIN" && session.facilitatorId !== authSession.id) {
      return NextResponse.json({ success: false, error: "Permissão negada." }, { status: 403 });
    }

    const updateData: any = {};
    if (title) updateData.title = String(title).trim();
    if (monthDurationSeconds !== undefined) updateData.monthDurationSeconds = Math.max(30, Number(monthDurationSeconds));
    if (totalMonths !== undefined) updateData.totalMonths = Math.max(1, Number(totalMonths));
    if (monthlyAllowance !== undefined) updateData.monthlyAllowance = Math.max(0, Number(monthlyAllowance));
    if (status) updateData.status = status;

    const updated = await prisma.gameSession.update({
      where: { id },
      data: updateData,
      include: {
        facilitator: {
          select: { name: true, username: true },
        },
        _count: {
          select: { groups: true },
        },
      },
    });

    return NextResponse.json({ success: true, session: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions - Delete Game Session
export async function DELETE(req: Request) {
  try {
    const authSession = await getAuthSession();
    if (!authSession) {
      return NextResponse.json({ success: false, error: "Acesso não autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID é obrigatório." }, { status: 400 });
    }

    const session = await prisma.gameSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ success: false, error: "Partida não encontrada." }, { status: 404 });
    }

    if (authSession.role !== "SUPER_ADMIN" && session.facilitatorId !== authSession.id) {
      return NextResponse.json({ success: false, error: "Permissão negada." }, { status: 403 });
    }

    await prisma.gameSession.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Partida excluída com sucesso." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
