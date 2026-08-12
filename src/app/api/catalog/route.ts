import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";

// GET /api/catalog - List all catalog expenses & options
export async function GET() {
  try {
    const expenses = await prisma.expenseOption.findMany({
      orderBy: { title: "asc" },
    });
    const unforeseen = await prisma.unforeseenEvent.findMany({
      orderBy: { title: "asc" },
    });

    return NextResponse.json({ success: true, expenses, unforeseen });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/catalog - Create new catalog expense or option
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, cost, happinessPoints, type, category, description, isRPGChoice } = body;

    if (!title || cost === undefined || happinessPoints === undefined || !type) {
      return NextResponse.json(
        { success: false, error: "Título, custo, pontos e tipo são obrigatórios." },
        { status: 400 }
      );
    }

    const newItem = await prisma.expenseOption.create({
      data: {
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

// PUT /api/catalog - Update existing item
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, title, cost, happinessPoints, type, category, description, isRPGChoice } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do item é obrigatório." },
        { status: 400 }
      );
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

// DELETE /api/catalog - Delete item by ID
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID é obrigatório." },
        { status: 400 }
      );
    }

    await prisma.expenseOption.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Item excluído com sucesso." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
