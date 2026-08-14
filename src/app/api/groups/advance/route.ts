import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";

// POST /api/groups/advance - Advance month for all active groups
export async function POST() {
  try {
    const groups = await prisma.group.findMany({
      where: { isStarted: true, isGameFinished: false },
    });

    const now = new Date();
    let targetMonth = 1;

    for (const group of groups) {
      const nextMonth = group.currentMonth < 7 ? group.currentMonth + 1 : 7;
      targetMonth = nextMonth;
      const isFinished = nextMonth >= 7 && group.currentMonth === 7;

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
    }

    return NextResponse.json({
      success: true,
      message: `Mês avançado com sucesso para o Mês ${targetMonth}.`,
      currentMonth: targetMonth,
      monthStartedAt: now,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
