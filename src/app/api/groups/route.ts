import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { getAuthSession } from "@/utils/auth";

// GET /api/groups - List groups (filterable by sessionId, sessionCode or token)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const sessionCode = searchParams.get("sessionCode");
    const token = searchParams.get("token");

    // Specific group query by token
    if (token) {
      const group = await prisma.group.findUnique({
        where: { qrCodeToken: token },
        include: {
          session: true,
        },
      });

      if (!group) {
        return NextResponse.json({ success: false, error: "Grupo não encontrado." }, { status: 404 });
      }

      return NextResponse.json({ success: true, group, session: group.session });
    }

    // Query by session ID or Code
    let targetSessionId = sessionId;
    if (!targetSessionId && sessionCode) {
      const session = await prisma.gameSession.findUnique({
        where: { code: sessionCode.trim().toUpperCase() },
      });
      if (session) targetSessionId = session.id;
    }

    // If still no sessionId and user is authenticated as Facilitator/Admin
    if (!targetSessionId) {
      const authSession = await getAuthSession();
      if (authSession) {
        // Look up latest active session of this facilitator
        const latestSession = await prisma.gameSession.findFirst({
          where: authSession.role === "SUPER_ADMIN" ? {} : { facilitatorId: authSession.id },
          orderBy: { createdAt: "desc" },
        });
        if (latestSession) {
          targetSessionId = latestSession.id;
        }
      }
    }

    const whereClause: any = {};
    if (targetSessionId) {
      whereClause.sessionId = targetSessionId;
    }

    const groups = await prisma.group.findMany({
      where: whereClause,
      include: {
        session: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let currentSession = null;
    if (targetSessionId) {
      currentSession = await prisma.gameSession.findUnique({
        where: { id: targetSessionId },
      });
    }

    return NextResponse.json({ success: true, groups, session: currentSession });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/groups - Register a new group in a session
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, sessionId, sessionCode } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "O nome do grupo/personagem é obrigatório." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // 1. Resolve Target Game Session
    let session = null;
    if (sessionId) {
      session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
    } else if (sessionCode) {
      session = await prisma.gameSession.findUnique({ where: { code: sessionCode.trim().toUpperCase() } });
    }

    // Fallback: Find the latest active session
    if (!session) {
      session = await prisma.gameSession.findFirst({
        where: { isGameFinished: false },
        orderBy: { createdAt: "desc" },
      });
    }

    // Fallback 2: Find any session or create a default one
    if (!session) {
      session = await prisma.gameSession.create({
        data: {
          code: "FIN-2026",
          title: "Partida Principal",
          monthDurationSeconds: 120,
          totalMonths: 7,
          monthlyAllowance: 1560.0,
        },
      });
    }

    const initialAllowance = session.monthlyAllowance || 1560.0;
    const token = `GRUPO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Create group with session's configured initial allowance and 100 happiness points
    const newGroup = await prisma.group.create({
      data: {
        sessionId: session.id,
        name: trimmedName,
        qrCodeToken: token,
        balance: initialAllowance,
        savings: 0.0,
        investments: 0.0,
        happinessPoints: 100,
        currentMonth: 0,
        isStarted: session.isStarted,
      },
      include: {
        session: true,
      },
    });

    try {
      await prisma.gameLog.create({
        data: {
          sessionId: session.id,
          groupId: newGroup.id,
          groupName: newGroup.name,
          qrCodeToken: newGroup.qrCodeToken,
          action: "GROUP_REGISTERED",
          details: `Grupo "${newGroup.name}" cadastrado com sucesso na sala ${session.code}.`,
          currentMonth: 0,
          balance: initialAllowance,
          savings: 0.0,
          investments: 0.0,
          happinessPoints: 100,
        },
      });
    } catch (_) {}

    return NextResponse.json({ success: true, group: newGroup, session });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/groups - Delete single group by id or clear groups of a session
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const sessionId = searchParams.get("sessionId");
    const clearAll = searchParams.get("all") === "true";

    if (clearAll) {
      const whereClause = sessionId ? { sessionId } : {};
      await prisma.group.deleteMany({ where: whereClause });
      return NextResponse.json({ success: true, message: "Grupos excluídos com sucesso." });
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
      include: {
        session: true,
      },
    });

    try {
      await prisma.gameLog.create({
        data: {
          sessionId: updated.sessionId,
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

    // Check if all started groups in Mês 0 of this session have confirmed their character choices
    if (isRPGConfirmed && updated.sessionId) {
      const activeGroups = await prisma.group.findMany({
        where: { sessionId: updated.sessionId, isStarted: true, isGameFinished: false },
      });
      const allConfirmed = activeGroups.length > 0 && activeGroups.every((g) => g.isRPGConfirmed || g.currentMonth > 0);
      if (allConfirmed) {
        const groupsToAdvance = await prisma.group.findMany({
          where: { sessionId: updated.sessionId, isStarted: true, currentMonth: 0 },
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
        await prisma.gameSession.update({
          where: { id: updated.sessionId },
          data: { currentMonth: 1, monthStartedAt: now, status: "RUNNING" },
        }).catch(() => {});
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
