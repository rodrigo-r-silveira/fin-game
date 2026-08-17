import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { getAuthSession } from "@/utils/auth";

// GET /api/catalog - List catalog items & unforeseen events for a facilitator or session
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const sessionId = searchParams.get("sessionId");
    const requestedUserId = searchParams.get("userId");
    const forceReset = searchParams.get("reset") === "true";

    let targetUserId: string | null = requestedUserId || null;

    // Resolve facilitator ID from token (used by participant in dashboard)
    if (!targetUserId && token) {
      const group = await prisma.group.findUnique({
        where: { qrCodeToken: token },
        include: { session: true },
      });
      if (group?.session?.facilitatorId) {
        targetUserId = group.session.facilitatorId;
      }
    }

    // Resolve facilitator ID from sessionId
    if (!targetUserId && sessionId) {
      const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
      if (session?.facilitatorId) {
        targetUserId = session.facilitatorId;
      }
    }

    // If still not resolved, check authenticated session
    if (!targetUserId) {
      const authSession = await getAuthSession();
      if (authSession) {
        targetUserId = authSession.id;
      }
    }

    if (forceReset && targetUserId) {
      await prisma.expenseOption.deleteMany({ where: { userId: targetUserId } });
      await prisma.unforeseenEvent.deleteMany({ where: { userId: targetUserId } });
    }

    // Filter by targetUserId or fallback to global template items (userId is null)
    let expenses = await prisma.expenseOption.findMany({
      where: targetUserId ? { OR: [{ userId: targetUserId }, { userId: null }] } : {},
      orderBy: { title: "asc" },
    });

    // If facilitator has their own items, prioritize them over null templates
    if (targetUserId) {
      const userExpenses = expenses.filter((e) => e.userId === targetUserId);
      if (userExpenses.length > 0) {
        expenses = userExpenses;
      }
    }

    let unforeseen = await prisma.unforeseenEvent.findMany({
      where: targetUserId ? { OR: [{ userId: targetUserId }, { userId: null }] } : {},
      orderBy: { createdAt: "asc" },
    });

    if (targetUserId) {
      const userUnforeseen = unforeseen.filter((u) => u.userId === targetUserId);
      if (userUnforeseen.length > 0) {
        unforeseen = userUnforeseen;
      }
    }

    return NextResponse.json({ success: true, expenses, unforeseen, targetUserId });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/catalog - Create new catalog expense or unforeseen event for logged-in facilitator
export async function POST(req: Request) {
  try {
    const authSession = await getAuthSession();
    if (!authSession) {
      return NextResponse.json({ success: false, error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { targetTable, title, cost, happinessPoints, type, category, description, isRPGChoice, costToFix, penaltyIfNotFixedPoints, restoredPointsIfFixed } = body;

    // Handle Unforeseen Event creation
    if (targetTable === "UNFORESEEN" || type === "UNFORESEEN") {
      if (!title || costToFix === undefined || penaltyIfNotFixedPoints === undefined) {
        return NextResponse.json(
          { success: false, error: "Título, custo de reparo e penalidade são obrigatórios." },
          { status: 400 }
        );
      }

      const newUnforeseen = await prisma.unforeseenEvent.create({
        data: {
          userId: authSession.id,
          title: title.trim(),
          description: description?.trim() || "",
          costToFix: Number(costToFix),
          penaltyIfNotFixedPoints: Number(penaltyIfNotFixedPoints),
          restoredPointsIfFixed: Number(restoredPointsIfFixed || 0),
        },
      });

      return NextResponse.json({ success: true, item: newUnforeseen, targetTable: "UNFORESEEN" });
    }

    // Handle Expense Option creation
    if (!title || cost === undefined || happinessPoints === undefined || !type) {
      return NextResponse.json(
        { success: false, error: "Título, custo, pontos e tipo são obrigatórios." },
        { status: 400 }
      );
    }

    const newItem = await prisma.expenseOption.create({
      data: {
        userId: authSession.id,
        title: title.trim(),
        cost: Number(cost),
        happinessPoints: Number(happinessPoints),
        type,
        category: category?.trim() || "Geral",
        description: description?.trim() || "",
        isRPGChoice: Boolean(isRPGChoice),
      },
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/catalog - Update existing item or unforeseen event
export async function PUT(req: Request) {
  try {
    const authSession = await getAuthSession();
    if (!authSession) {
      return NextResponse.json({ success: false, error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { id, targetTable, title, cost, happinessPoints, type, category, description, isRPGChoice, costToFix, penaltyIfNotFixedPoints, restoredPointsIfFixed } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do item é obrigatório." },
        { status: 400 }
      );
    }

    if (targetTable === "UNFORESEEN" || type === "UNFORESEEN") {
      const updatedUnforeseen = await prisma.unforeseenEvent.update({
        where: { id },
        data: {
          ...(title && { title: title.trim() }),
          ...(description !== undefined && { description: description.trim() }),
          ...(costToFix !== undefined && { costToFix: Number(costToFix) }),
          ...(penaltyIfNotFixedPoints !== undefined && { penaltyIfNotFixedPoints: Number(penaltyIfNotFixedPoints) }),
          ...(restoredPointsIfFixed !== undefined && { restoredPointsIfFixed: Number(restoredPointsIfFixed) }),
        },
      });

      return NextResponse.json({ success: true, item: updatedUnforeseen, targetTable: "UNFORESEEN" });
    }

    const updatedItem = await prisma.expenseOption.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(cost !== undefined && { cost: Number(cost) }),
        ...(happinessPoints !== undefined && { happinessPoints: Number(happinessPoints) }),
        ...(type && { type }),
        ...(category !== undefined && { category: category.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(isRPGChoice !== undefined && { isRPGChoice: Boolean(isRPGChoice) }),
      },
    });

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/catalog - Delete item or unforeseen event by ID
export async function DELETE(req: Request) {
  try {
    const authSession = await getAuthSession();
    if (!authSession) {
      return NextResponse.json({ success: false, error: "Acesso não autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const targetTable = searchParams.get("targetTable");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID é obrigatório." },
        { status: 400 }
      );
    }

    if (targetTable === "UNFORESEEN") {
      await prisma.unforeseenEvent.delete({ where: { id } });
    } else {
      await prisma.expenseOption.delete({ where: { id } });
    }

    return NextResponse.json({ success: true, message: "Item excluído com sucesso." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
