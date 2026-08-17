import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { getAuthSession } from "@/utils/auth";

// POST /api/groups/finish - Finish game for groups in a specific session
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

    let sessionTotalMonths = 7;
    if (sessionId) {
      const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
      if (session && session.totalMonths) sessionTotalMonths = session.totalMonths;
    }

    const whereClause: any = { isStarted: true };
    if (sessionId) whereClause.sessionId = sessionId;

    const groups = await prisma.group.findMany({
      where: whereClause,
    });

    for (const group of groups) {
      let finalPoints = group.happinessPoints;
      let finalSavings = group.savings;
      let finalInvestments = group.investments;

      // If group still has unredeemed CDB investments in DB, auto-redeem with +150 bonus
      if (group.investments > 0) {
        finalPoints += 150;
        finalSavings += group.investments;
        finalInvestments = 0;
      }

      await prisma.group.update({
        where: { id: group.id },
        data: {
          isGameFinished: true,
          currentMonth: sessionTotalMonths,
          happinessPoints: finalPoints,
          savings: finalSavings,
          investments: finalInvestments,
        },
      });

      try {
        await prisma.gameLog.create({
          data: {
            sessionId: group.sessionId,
            groupId: group.id,
            groupName: group.name,
            qrCodeToken: group.qrCodeToken,
            action: "GAME_FINISHED",
            details: `🏆 Dinâmica finalizada pelo facilitador. Pontuação final consolidada em ${finalPoints} pts | Poupança final: R$ ${finalSavings.toFixed(2)}.`,
            currentMonth: sessionTotalMonths,
            balance: 0,
            savings: finalSavings,
            investments: finalInvestments,
            happinessPoints: finalPoints,
          },
        });
      } catch (_) {}
    }

    if (sessionId) {
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          isGameFinished: true,
          status: "FINISHED",
          currentMonth: sessionTotalMonths,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "🏆 Dinâmica finalizada com sucesso! Todos os grupos foram consolidados e redirecionados para o Ranking Final.",
      redirectUrl: sessionId ? `/final-ranking?sessionId=${sessionId}` : "/final-ranking",
      sessionId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
