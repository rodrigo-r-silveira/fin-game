import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { getAuthSession } from "@/utils/auth";

// POST /api/groups/advance - Advance month for groups in a specific session
export async function POST(req: Request) {
  try {
    let sessionId: string | null = null;

    try {
      const body = await req.json();
      if (body && body.sessionId) sessionId = body.sessionId;
    } catch (_) {}

    // Fallback: Resolve facilitator's active session
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

    let sessionTotalMonths = 7;
    if (sessionId) {
      const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
      if (session && session.totalMonths) sessionTotalMonths = session.totalMonths;
    }

    const whereClause: any = { isStarted: true, isGameFinished: false };
    if (sessionId) whereClause.sessionId = sessionId;

    const groups = await prisma.group.findMany({
      where: whereClause,
    });

    const now = new Date();
    let targetMonth = 1;

    for (const group of groups) {
      const nextMonth = group.currentMonth < sessionTotalMonths ? group.currentMonth + 1 : sessionTotalMonths;
      targetMonth = nextMonth;
      const isFinished = nextMonth >= sessionTotalMonths && group.currentMonth === sessionTotalMonths;

      // Apply 2% monthly yield on investments for transitions from Month 1 onwards
      let updatedInvestments = group.investments || 0;
      if (group.currentMonth > 0 && updatedInvestments > 0) {
        updatedInvestments = Math.round(updatedInvestments * 1.02 * 100) / 100;
      }

      await prisma.group.update({
        where: { id: group.id },
        data: {
          currentMonth: nextMonth,
          investments: updatedInvestments,
          monthStartedAt: now,
          isGameFinished: isFinished,
        },
      });

      try {
        await prisma.gameLog.create({
          data: {
            sessionId: group.sessionId,
            groupId: group.id,
            groupName: group.name,
            qrCodeToken: group.qrCodeToken,
            action: "MONTH_ADVANCE",
            details: `Avanço de mês para o Mês ${nextMonth}. Investimentos atualizados (+2% CDB): R$ ${updatedInvestments.toFixed(2)}.`,
            currentMonth: nextMonth,
            balance: group.balance,
            savings: group.savings,
            investments: updatedInvestments,
            happinessPoints: group.happinessPoints,
          },
        });
      } catch (_) {}
    }

    if (sessionId) {
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          currentMonth: targetMonth,
          monthStartedAt: now,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Mês avançado com sucesso para o Mês ${targetMonth}.`,
      currentMonth: targetMonth,
      monthStartedAt: now,
      sessionId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
