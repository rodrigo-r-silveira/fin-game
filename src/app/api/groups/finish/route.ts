import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";

// POST /api/groups/finish - Finish game for all groups and enable final ranking
export async function POST() {
  try {
    await prisma.group.updateMany({
      data: {
        isGameFinished: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "🏆 Dinâmica finalizada com sucesso! Todos os grupos foram redirecionados para o Ranking Final.",
      redirectUrl: "/final-ranking",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
