import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { Prisma } from "@prisma/client";
import { getAuthSession, hashPassword, cloneDefaultCatalogForUser } from "@/utils/auth";

// GET /api/admin/users - List all users (Super Admin only)
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado. Apenas Super Administradores podem gerenciar usuários." },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sessions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new facilitator user
export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { username, name, email, password, role } = body;

    if (!username || !password || !name) {
      return NextResponse.json(
        { success: false, error: "Nome, usuário e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = email ? String(email).trim().toLowerCase() : null;

    const userOrConditions: Prisma.UserWhereInput[] = [
      { username: { equals: cleanUsername, mode: "insensitive" } },
    ];
    if (cleanEmail) {
      userOrConditions.push({ email: { equals: cleanEmail, mode: "insensitive" } });
    }

    // Check duplicate username
    const existing = await prisma.user.findFirst({
      where: {
        OR: userOrConditions,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Já existe um usuário com este login ou e-mail." },
        { status: 409 }
      );
    }

    const userRole = role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "FACILITATOR";

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        name: String(name).trim(),
        email: cleanEmail,
        passwordHash: hashPassword(String(password).trim()),
        role: userRole,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Auto-clone default catalog so the new facilitator has their own independent customizable items
    await cloneDefaultCatalogForUser(newUser.id);

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users - Edit user (Super Admin only)
export async function PUT(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, name, email, password, role, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do usuário é obrigatório." },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name) updateData.name = String(name).trim();
    if (email !== undefined) updateData.email = email ? String(email).trim().toLowerCase() : null;
    if (role && (role === "SUPER_ADMIN" || role === "FACILITATOR")) updateData.role = role;
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (password && String(password).trim().length > 0) {
      updateData.passwordHash = hashPassword(String(password).trim());
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users - Delete user (Super Admin only)
export async function DELETE(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID é obrigatório." }, { status: 400 });
    }

    if (id === session.id) {
      return NextResponse.json(
        { success: false, error: "Você não pode excluir sua própria conta de Super Administrador." },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Usuário excluído com sucesso." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
