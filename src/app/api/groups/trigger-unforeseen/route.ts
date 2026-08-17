import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { getAuthSession } from "@/utils/auth";

// POST /api/groups/trigger-unforeseen - Remotely trigger Imprevisto for groups in a session
export async function POST(req: Request) {
  try {
    let sessionId: string | null = null;

    try {
      const body = await req.json();
      if (body && body.sessionId) sessionId = body.sessionId;
    } catch (_) {}

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

    const whereClause: any = { isStarted: true, isGameFinished: false };
    if (sessionId) whereClause.sessionId = sessionId;

    const groups = await prisma.group.findMany({ where: whereClause });
    const now = new Date();

    for (const group of groups) {
      await prisma.group.update({
        where: { id: group.id },
        data: {
          unforeseenTriggeredAt: now,
        },
      });
    }

    if (sessionId) {
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { unforeseenTriggeredAt: now },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "⚡ Imprevisto disparado com sucesso para os grupos da sala!",
      unforeseenTriggeredAt: now,
      sessionId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
