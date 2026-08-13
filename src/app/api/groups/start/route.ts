import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";

// POST /api/groups/start - Start game for all registered groups
export async function POST() {
  try {
    await prisma.group.updateMany({
      data: {
        isStarted: true,
        monthStartedAt: new Date(),
        currentMonth: 0,
      },
    });

    return NextResponse.json({ success: true, message: "Partida iniciada para todos os grupos." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
