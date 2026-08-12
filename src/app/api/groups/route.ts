import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
