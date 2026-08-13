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
      const nextMonth = group.currentMonth < 6 ? group.currentMonth + 1 : 6;
      targetMonth = nextMonth;
      const isFinished = nextMonth >= 6 && group.currentMonth === 6;

      await prisma.group.update({
        where: { id: group.id },
        data: {
          currentMonth: nextMonth,
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
