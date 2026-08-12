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

    // Create group with initial balance R$ 2500 and 100 happiness points
    const newGroup = await prisma.group.create({
      data: {
        name: trimmedName,
        qrCodeToken: token,
        balance: 2500.0,
        savings: 0.0,
        happinessPoints: 100,
        currentMonth: 1,
      },
    });

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
    const { id, qrCodeToken, balance, savings, happinessPoints, currentMonth } = body;

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
        ...(typeof happinessPoints === "number" && { happinessPoints }),
        ...(typeof currentMonth === "number" && { currentMonth }),
      },
    });

    return NextResponse.json({ success: true, group: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

