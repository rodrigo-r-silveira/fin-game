import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { getAuthSession } from "@/utils/auth";

// POST /api/groups/start - Start game for groups in a specific session
export async function POST(req: Request) {
  try {
    let sessionId: string | null = null;

    try {
      const body = await req.json();
      if (body && body.sessionId) sessionId = body.sessionId;
    } catch (_) {}

    // Fallback: Resolve facilitator's active/latest session
    if (!sessionId) {
      const authSession = await getAuthSession();
      if (authSession) {
        const latest = await prisma.gameSession.findFirst({
          where: authSession.role === "SUPER_ADMIN" ? {} : { facilitatorId: authSession.id },
          orderBy: { createdAt: "desc" },
        });
        if (latest) sessionId = latest.id;
      }
    }

    const whereClause: any = sessionId ? { sessionId } : {};
    const groups = await prisma.group.findMany({ where: whereClause });
    const now = new Date();

    for (const group of groups) {
      await prisma.group.update({
        where: { id: group.id },
        data: {
          isStarted: true,
          monthStartedAt: now,
          currentMonth: 0,
        },
      });
    }

    if (sessionId) {
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          isStarted: true,
          status: "RUNNING",
          monthStartedAt: now,
          currentMonth: 0,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "Partida iniciada com sucesso para os grupos da sala.",
      sessionId,
      monthStartedAt: now,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
