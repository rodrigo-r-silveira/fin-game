import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";

// POST /api/groups/start - Start game for all registered groups
export async function POST() {
  try {
    const groups = await prisma.group.findMany();
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

    return NextResponse.json({ success: true, message: "Partida iniciada para todos os grupos." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
