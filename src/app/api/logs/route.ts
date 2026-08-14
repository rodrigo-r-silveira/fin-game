import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";

// GET /api/logs - Retrieve audit logs for a group or all groups
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const groupId = searchParams.get("groupId");

    let whereClause: any = {};
    if (token) {
      whereClause.qrCodeToken = token;
    } else if (groupId) {
      whereClause.groupId = groupId;
    }

    const logs = await prisma.gameLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/logs - Create an audit log entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      groupId,
      groupName,
      qrCodeToken,
      action,
      details,
      currentMonth = 0,
      balance = 0,
      savings = 0,
      investments = 0,
      happinessPoints = 0,
    } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Action is required" },
        { status: 400 }
      );
    }

    const newLog = await prisma.gameLog.create({
      data: {
        groupId: groupId || null,
        groupName: groupName || null,
        qrCodeToken: qrCodeToken || null,
        action,
        details: typeof details === "object" ? JSON.stringify(details) : String(details || ""),
        currentMonth: Number(currentMonth) || 0,
        balance: Number(balance) || 0,
        savings: Number(savings) || 0,
        investments: Number(investments) || 0,
        happinessPoints: Number(happinessPoints) || 0,
      },
    });

    return NextResponse.json({
      success: true,
      log: newLog,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
