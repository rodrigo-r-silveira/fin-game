import { PrismaClient, ExpenseType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do banco de dados...");

  // Criar Grupo de Teste
  await prisma.group.upsert({
    where: { qrCodeToken: "GRUPO-01" },
    update: {},
    create: {
      name: "Grupo 01 - Estagiários Tech",
      qrCodeToken: "GRUPO-01",
      balance: 2500,
      savings: 0,
      happinessPoints: 100,
    },
  });

  // Criar Despesas Fixas
  await prisma.expenseOption.createMany({
    data: [
      { title: "Aluguel / Condomínio", cost: 900, happinessPoints: 0, type: ExpenseType.FIXED },
      { title: "Supermercado Mensal", cost: 500, happinessPoints: 5, type: ExpenseType.FIXED },
      { title: "Conta de Luz e Água", cost: 150, happinessPoints: 0, type: ExpenseType.FIXED },
      { title: "Plano de Internet / Celular", cost: 100, happinessPoints: 5, type: ExpenseType.FIXED },
    ],
  });

  // Criar Tentações
  await prisma.expenseOption.createMany({
    data: [
      { title: "Ingresso para Show / Festival", cost: 350, happinessPoints: 40, type: ExpenseType.TEMPTATION },
      { title: "Jantar em Restaurante Famoso", cost: 180, happinessPoints: 20, type: ExpenseType.TEMPTATION },
      { title: "Fone de Ouvido Noise-Cancelling", cost: 400, happinessPoints: 35, type: ExpenseType.TEMPTATION },
      { title: "Serviços de Streaming (Todos)", cost: 80, happinessPoints: 10, type: ExpenseType.TEMPTATION },
    ],
  });

  // Criar Imprevistos
  await prisma.unforeseenEvent.createMany({
    data: [
      {
        title: "Tela do Celular Quebrou!",
        description: "Seu celular caiu no chão. Consertar vai custar R$ 350.",
        costToFix: 350,
        penaltyIfNotFixedPoints: 30,
        restoredPointsIfFixed: 10,
      },
      {
        title: "Lanche com Equipe de Emergência",
        description: "Aniversário surpresa do gestor, taxa do presente R$ 80.",
        costToFix: 80,
        penaltyIfNotFixedPoints: 15,
        restoredPointsIfFixed: 5,
      },
    ],
  });

  console.log("Seed executado com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
