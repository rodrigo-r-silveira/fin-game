import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";

// Default initial catalog items to seed database if empty
const DEFAULT_CATALOG = [
  // RPG Month 0 Choices - Moradia
  {
    title: "Quarto Compartilhado",
    cost: 500.0,
    happinessPoints: 5,
    type: "FIXED" as const,
    category: "Moradia",
    description: "Custo baixo, pouca privacidade.",
    isRPGChoice: true,
  },
  {
    title: "Kitnet Própria",
    cost: 750.0,
    happinessPoints: 10,
    type: "FIXED" as const,
    category: "Moradia",
    description: "Espaço independente e confortável.",
    isRPGChoice: true,
  },
  {
    title: "Apartamento Completo",
    cost: 1100.0,
    happinessPoints: 20,
    type: "FIXED" as const,
    category: "Moradia",
    description: "Alto conforto, condomínio e infraestrutura.",
    isRPGChoice: true,
  },

  // RPG Month 0 Choices - Alimentação
  {
    title: "Marmita & Básico",
    cost: 350.0,
    happinessPoints: 5,
    type: "FIXED" as const,
    category: "Alimentação",
    description: "Refeições essenciais preparadas em casa.",
    isRPGChoice: true,
  },
  {
    title: "Supermercado Completo",
    cost: 500.0,
    happinessPoints: 10,
    type: "FIXED" as const,
    category: "Alimentação",
    description: "Boa variedade de alimentos diários.",
    isRPGChoice: true,
  },
  {
    title: "Alimentação Gourmet",
    cost: 700.0,
    happinessPoints: 20,
    type: "FIXED" as const,
    category: "Alimentação",
    description: "Ingredientes nobres e delivery nos fins de semana.",
    isRPGChoice: true,
  },

  // RPG Month 0 Choices - Transporte
  {
    title: "Transporte Público",
    cost: 120.0,
    happinessPoints: 5,
    type: "FIXED" as const,
    category: "Transporte",
    description: "Ônibus e metrô no dia a dia.",
    isRPGChoice: true,
  },
  {
    title: "Passe Livre + Carona/App",
    cost: 200.0,
    happinessPoints: 10,
    type: "FIXED" as const,
    category: "Transporte",
    description: "Agilidade extra para se locomover.",
    isRPGChoice: true,
  },

  // RPG Month 0 Choices - Tecnologia
  {
    title: "Internet Básica",
    cost: 90.0,
    happinessPoints: 5,
    type: "FIXED" as const,
    category: "Tecnologia",
    description: "Navegação essencial para estudos.",
    isRPGChoice: true,
  },
  {
    title: "Fibra + Streamings VIP",
    cost: 150.0,
    happinessPoints: 15,
    type: "FIXED" as const,
    category: "Tecnologia",
    description: "Conexão ultra-rápida e entretenimento.",
    isRPGChoice: true,
  },

  // Despesas Fixas Padrão (Sem RPG)
  {
    title: "Aluguel & Condomínio",
    cost: 750.0,
    happinessPoints: 10,
    type: "FIXED" as const,
    category: "Moradia",
    description: "Despesa fixa obrigatória de moradia para o mês.",
    isRPGChoice: false,
  },
  {
    title: "Supermercado & Alimentação",
    cost: 500.0,
    happinessPoints: 10,
    type: "FIXED" as const,
    category: "Alimentação",
    description: "Compras essenciais para refeições diárias.",
    isRPGChoice: false,
  },
  {
    title: "Transporte & Deslocamento",
    cost: 150.0,
    happinessPoints: 5,
    type: "FIXED" as const,
    category: "Transporte",
    description: "Gastos com transporte diário e passe.",
    isRPGChoice: false,
  },
  {
    title: "Internet & Celular",
    cost: 110.0,
    happinessPoints: 10,
    type: "FIXED" as const,
    category: "Tecnologia",
    description: "Plano de internet rápida para estudos e conexão.",
    isRPGChoice: false,
  },

  // Feed de Tentações (Uso Único)
  {
    title: "Ingresso de Show no Fim de Semana",
    cost: 180.0,
    happinessPoints: 45,
    type: "TEMPTATION" as const,
    category: "Lazer",
    description: "Shows imperdíveis com a galera no sábado à noite! (Uso único)",
    isRPGChoice: false,
  },
  {
    title: "Jantar Especial em Restaurante Chique",
    cost: 140.0,
    happinessPoints: 35,
    type: "TEMPTATION" as const,
    category: "Gastronomia",
    description: "Experiência culinária única para relaxar na sexta. (Uso único)",
    isRPGChoice: false,
  },
  {
    title: "Fone de Ouvido Noise Cancelling",
    cost: 320.0,
    happinessPoints: 70,
    type: "TEMPTATION" as const,
    category: "Gadgets",
    description: "Foco total nos estudos e música sem ruídos. (Uso único)",
    isRPGChoice: false,
  },
  {
    title: "Passeio de Bate-Volta na Praia",
    cost: 120.0,
    happinessPoints: 30,
    type: "TEMPTATION" as const,
    category: "Viagem",
    description: "Sol, mar e recarga de energias com os amigos. (Uso único)",
    isRPGChoice: false,
  },
  {
    title: "Assinatura VIP de Plataforma de Games",
    cost: 65.0,
    happinessPoints: 20,
    type: "TEMPTATION" as const,
    category: "Entretenimento",
    description: "Acesso ilimitado aos jogos da temporada. (Uso único)",
    isRPGChoice: false,
  },
];

// GET /api/catalog - List catalog items (seeds database if empty or missing RPG items)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceReset = searchParams.get("reset") === "true";

    if (forceReset) {
      await prisma.expenseOption.deleteMany({});
    }

    let count = await prisma.expenseOption.count();
    let rpgCount = await prisma.expenseOption.count({ where: { isRPGChoice: true } });

    // Auto-seed database if empty or missing default RPG options
    if (count === 0 || rpgCount === 0) {
      // Upsert default catalog items
      for (const item of DEFAULT_CATALOG) {
        const existing = await prisma.expenseOption.findFirst({
          where: { title: item.title },
        });
        if (!existing) {
          await prisma.expenseOption.create({ data: item });
        } else if (!existing.isRPGChoice && item.isRPGChoice) {
          await prisma.expenseOption.update({
            where: { id: existing.id },
            data: { isRPGChoice: true },
          });
        }
      }
    }

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
