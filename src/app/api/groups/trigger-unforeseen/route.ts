import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";

// POST /api/groups/trigger-unforeseen - Remotely trigger Imprevisto for all active groups
export async function POST() {
  try {
    const now = new Date();
    const groups = await prisma.group.findMany({
      where: { isStarted: true },
    });

    for (const group of groups) {
      await prisma.group.update({
        where: { id: group.id },
        data: {
          unforeseenTriggeredAt: now,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "⚡ Imprevisto disparado com sucesso para todos os grupos!",
      unforeseenTriggeredAt: now,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
