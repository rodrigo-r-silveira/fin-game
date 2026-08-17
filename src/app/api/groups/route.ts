import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";

// GET /api/groups - List all registered groups
export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, groups });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/groups - Register a new group
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "O nome do grupo é obrigatório." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const token = `GRUPO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Create group with initial balance R$ 1560.0 and 100 happiness points (Starts on Mês 0 RPG)
    const newGroup = await prisma.group.create({
      data: {
        name: trimmedName,
        qrCodeToken: token,
        balance: 1560.0,
        savings: 0.0,
        happinessPoints: 100,
        currentMonth: 0,
      },
    });

    try {
      await prisma.gameLog.create({
        data: {
          groupId: newGroup.id,
          groupName: newGroup.name,
          qrCodeToken: newGroup.qrCodeToken,
          action: "GROUP_REGISTERED",
          details: `Grupo "${newGroup.name}" cadastrado com sucesso na sala.`,
          currentMonth: 0,
          balance: 1560.0,
          savings: 0.0,
          investments: 0.0,
          happinessPoints: 100,
        },
      });
    } catch (_) {}

    return NextResponse.json({ success: true, group: newGroup });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/groups - Delete single group by id or clear all groups
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clearAll = searchParams.get("all") === "true";

    if (clearAll) {
      await prisma.group.deleteMany({});
      return NextResponse.json({ success: true, message: "Todos os grupos foram excluídos." });
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do grupo não informado." },
        { status: 400 }
      );
    }

    await prisma.group.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Grupo excluído com sucesso." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/groups - Update group balance, savings, happinessPoints, currentMonth
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, qrCodeToken, balance, savings, investments, happinessPoints, currentMonth, isRPGConfirmed, updateMonthStartedAt, achievedGoal } = body;

    if (!id && !qrCodeToken) {
      return NextResponse.json(
        { success: false, error: "ID ou Token do grupo não informado." },
        { status: 400 }
      );
    }

    const whereClause = id ? { id } : { qrCodeToken };

    const updated = await prisma.group.update({
      where: whereClause,
      data: {
        ...(typeof balance === "number" && { balance }),
        ...(typeof savings === "number" && { savings }),
        ...(typeof investments === "number" && { investments }),
        ...(typeof happinessPoints === "number" && { happinessPoints }),
        ...(typeof currentMonth === "number" && { currentMonth }),
        ...(typeof isRPGConfirmed === "boolean" && { isRPGConfirmed }),
        ...(typeof achievedGoal === "string" && { achievedGoal }),
        ...(updateMonthStartedAt === true && { monthStartedAt: new Date() }),
      },
    });

    try {
      await prisma.gameLog.create({
        data: {
          groupId: updated.id,
          groupName: updated.name,
          qrCodeToken: updated.qrCodeToken,
          action: isRPGConfirmed ? "RPG_CONFIRMED" : achievedGoal ? "FINAL_GOAL_ACHIEVED" : "METRICS_SYNC",
          details: `Sync de Métricas: Saldo R$ ${updated.balance.toFixed(2)} | Poupança R$ ${updated.savings.toFixed(2)} | Investimentos R$ ${updated.investments.toFixed(2)} | Felicidade: ${updated.happinessPoints} pts | Mês: ${updated.currentMonth}${achievedGoal ? ` | Meta: ${achievedGoal}` : ""}`,
          currentMonth: updated.currentMonth,
          balance: updated.balance,
          savings: updated.savings,
          investments: updated.investments,
          happinessPoints: updated.happinessPoints,
        },
      });
    } catch (_) {}

    // Check if all started groups in Mês 0 have confirmed their character choices
    if (isRPGConfirmed) {
      const activeGroups = await prisma.group.findMany({
        where: { isStarted: true, isGameFinished: false },
      });
      const allConfirmed = activeGroups.length > 0 && activeGroups.every((g) => g.isRPGConfirmed || g.currentMonth > 0);
      if (allConfirmed) {
        const groupsToAdvance = await prisma.group.findMany({
          where: { isStarted: true, currentMonth: 0 },
        });
        const now = new Date();
        for (const g of groupsToAdvance) {
          await prisma.group.update({
            where: { id: g.id },
            data: {
              currentMonth: 1,
              monthStartedAt: now,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, group: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

