import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";

// POST /api/groups/finish - Finish game for all groups and enable final ranking safely
export async function POST() {
  try {
    const groups = await prisma.group.findMany({
      where: { isStarted: true },
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
          currentMonth: 7,
          happinessPoints: finalPoints,
          savings: finalSavings,
          investments: finalInvestments,
        },
      });

      try {
        await prisma.gameLog.create({
          data: {
            groupId: group.id,
            groupName: group.name,
            qrCodeToken: group.qrCodeToken,
            action: "GAME_FINISHED",
            details: `🏆 Dinâmica finalizada pelo facilitador. Pontuação final consolidada em ${finalPoints} pts | Poupança final: R$ ${finalSavings.toFixed(2)}.`,
            currentMonth: 7,
            balance: 0,
            savings: finalSavings,
            investments: finalInvestments,
            happinessPoints: finalPoints,
          },
        });
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: "🏆 Dinâmica finalizada com sucesso! Todos os grupos foram consolidados e redirecionados para o Ranking Final.",
      redirectUrl: "/final-ranking",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
