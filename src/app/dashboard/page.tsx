"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  Wallet,
  PiggyBank,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Home,
  TrendingUp,
  Award,
  ShieldAlert,
  Smile,
  Frown,
  Meh,
  DollarSign,
  TrendingDown,
  Percent,
  Timer,
  UserCheck,
  Zap,
  X,
} from "lucide-react";

// Types matching Prisma schema & app state
type ExpenseType = "FIXED" | "TEMPTATION" | "UNFORESEEN" | "LONG_TERM_GOAL";

interface ExpenseItem {
  id: string;
  title: string;
  cost: number;
  happinessPoints: number;
  type: ExpenseType;
  category: string;
  isPaid?: boolean;
  description?: string;
  consecutiveMonths?: number;
}

interface UnforeseenEvent {
  id: string;
  title: string;
  description: string;
  costToFix: number;
  penaltyIfNotFixedPoints: number;
  restoredPointsIfFixed: number;
  triggeredMonth: number;
}

const MONTH_DURATION_SECONDS = 300; // 5 minutos por mês
const TOTAL_MONTHS = 6;
const MONTHLY_ALLOWANCE = 1560.0; // Bolsa Auxílio ajustada para R$ 1.560,00

export default function DashboardPage() {
  const router = useRouter();
  // Game state
  const [currentMonth, setCurrentMonth] = useState<number>(0); // 0 = Mês 0 (RPG Personagem)
  const [timeLeft, setTimeLeft] = useState<number>(MONTH_DURATION_SECONDS);
  const [balance, setBalance] = useState<number>(MONTHLY_ALLOWANCE);
  const [savings, setSavings] = useState<number>(0.0);
  const [investedCapital, setInvestedCapital] = useState<number>(0.0); // Investimentos Fictícios (CDB)
  const [happinessPoints, setHappinessPoints] = useState<number>(100);
  const [groupName, setGroupName] = useState<string>("Grupo Inovadores FinTech");

  // Single-use temptations tracking
  const [boughtTemptationIds, setBoughtTemptationIds] = useState<string[]>([]);

  // Month 0 RPG character confirmation state
  const [isRPGConfirmed, setIsRPGConfirmed] = useState<boolean>(false);

  // Chosen base fixed expenses from Month 0 RPG character creation
  const [chosenBaseExpenses, setChosenBaseExpenses] = useState<ExpenseItem[]>([]);

  // Imprevisto random trigger time (between 120s and 180s remaining) & modal countdown (30s)
  const [unforeseenTriggerTime, setUnforeseenTriggerTime] = useState<number>(150);
  const [modalCountdown, setModalCountdown] = useState<number | null>(null);

  // Interactive Modals state (Deposit to Savings, Withdraw from Savings, Invest)
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [showInvestModal, setShowInvestModal] = useState<boolean>(false);

  const [depositAmountInput, setDepositAmountInput] = useState<string>("");
  const [withdrawAmountInput, setWithdrawAmountInput] = useState<string>("");
  const [investAmountInput, setInvestAmountInput] = useState<string>("");

  // RPG Month 0 character choices state
  const [rpgChoices, setRpgChoices] = useState<{
    housing?: { title: string; cost: number; points: number };
    food?: { title: string; cost: number; points: number };
    transport?: { title: string; cost: number; points: number };
    tech?: { title: string; cost: number; points: number };
  }>({});

  // Dynamic Catalog Options & Unforeseen Events loaded from API (/api/catalog)
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [catalogUnforeseens, setCatalogUnforeseens] = useState<any[]>([]);

  // Load Catalog Items & Unforeseen Events from /api/catalog
  useEffect(() => {
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (Array.isArray(data.expenses)) setCatalogItems(data.expenses);
          if (Array.isArray(data.unforeseen)) setCatalogUnforeseens(data.unforeseen);
        }
      })
      .catch(() => {});
  }, []);

  const [lastRemoteTriggerTime, setLastRemoteTriggerTime] = useState<string | null>(null);

  // Load group info & Poll remote actions (Month advance & Admin triggers)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncWithServer = () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token") || localStorage.getItem("finGame_groupToken");
      const savedName = localStorage.getItem("finGame_groupName");

      if (token) {
        localStorage.setItem("finGame_groupToken", token);

        fetch(`/api/groups`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.groups)) {
              const matched = data.groups.find((g: any) => g.qrCodeToken === token);
              if (matched) {
                if (!matched.isStarted) {
                  router.push(`/waiting-room?token=${token}`);
                  return;
                }
                setGroupName(matched.name);
                setBalance(matched.balance > 0 ? matched.balance : MONTHLY_ALLOWANCE);
                setSavings(matched.savings);
                if (matched.investments) setInvestedCapital(matched.investments);
                if (matched.happinessPoints) setHappinessPoints(matched.happinessPoints);
                if (matched.isRPGConfirmed !== undefined) setIsRPGConfirmed(matched.isRPGConfirmed);

                // Remote Month Advance by Admin or Timer Expiration
                if (matched.currentMonth !== undefined && matched.currentMonth !== currentMonth) {
                  if (matched.currentMonth > currentMonth && currentMonth > 0) {
                    handleMonthEnd();
                  } else {
                    setCurrentMonth(matched.currentMonth);
                  }
                }

                // Global Timer Sync using server timestamp
                if (matched.monthStartedAt) {
                  const elapsedSecs = Math.floor((Date.now() - new Date(matched.monthStartedAt).getTime()) / 1000);
                  const remaining = Math.max(0, MONTH_DURATION_SECONDS - elapsedSecs);
                  setTimeLeft(remaining);
                }

                // Remote Unforeseen Trigger by Admin
                if (matched.unforeseenTriggeredAt) {
                  const triggeredTimeStr = new Date(matched.unforeseenTriggeredAt).toISOString();
                  if (lastRemoteTriggerTime !== triggeredTimeStr) {
                    setLastRemoteTriggerTime(triggeredTimeStr);
                    triggerUnforeseenEvent();
                  }
                }

                // Recover local fixed expenses if saved
                const savedExpenses = localStorage.getItem(`finGame_fixedExpenses_${token}`);
                if (savedExpenses) {
                  try {
                    setFixedExpenses(JSON.parse(savedExpenses));
                  } catch (_) {}
                }

                // Recover chosen RPG base expenses if saved
                const savedChosen = localStorage.getItem(`finGame_chosenBase_${token}`);
                if (savedChosen) {
                  try {
                    setChosenBaseExpenses(JSON.parse(savedChosen));
                  } catch (_) {}
                }
              }
            }
          })
          .catch(() => {});
      } else if (savedName) {
        setGroupName(savedName);
      }
    };

    syncWithServer();
    const interval = setInterval(syncWithServer, 3000);
    return () => clearInterval(interval);
  }, [router, currentMonth, lastRemoteTriggerTime]);

  // Dynamic fixed expenses list
  const [fixedExpenses, setFixedExpenses] = useState<ExpenseItem[]>([
    {
      id: "f1",
      title: "Aluguel & Condomínio",
      cost: 750.0,
      happinessPoints: 10,
      type: "FIXED",
      category: "Moradia",
      isPaid: false,
      consecutiveMonths: 1,
      description: "Despesa fixa obrigatória de moradia para o mês.",
    },
    {
      id: "f2",
      title: "Supermercado & Alimentação",
      cost: 500.0,
      happinessPoints: 10,
      type: "FIXED",
      category: "Alimentação",
      isPaid: false,
      consecutiveMonths: 1,
      description: "Compras essenciais para refeições diárias.",
    },
    {
      id: "f3",
      title: "Transporte & Deslocamento",
      cost: 150.0,
      happinessPoints: 5,
      type: "FIXED",
      category: "Transporte",
      isPaid: false,
      consecutiveMonths: 1,
      description: "Gastos com transporte diário e passe.",
    },
    {
      id: "f4",
      title: "Internet & Celular",
      cost: 110.0,
      happinessPoints: 10,
      type: "FIXED",
      category: "Tecnologia",
      isPaid: false,
      consecutiveMonths: 1,
      description: "Plano de internet rápida para estudos e conexão.",
    },
  ]);

  // Persist fixedExpenses locally whenever changed
  useEffect(() => {
    if (typeof window !== "undefined" && fixedExpenses.length > 0) {
      const token = localStorage.getItem("finGame_groupToken");
      if (token) {
        localStorage.setItem(`finGame_fixedExpenses_${token}`, JSON.stringify(fixedExpenses));
      }
    }
  }, [fixedExpenses]);

  // Single-use temptations catalog
  const [temptations] = useState<ExpenseItem[]>([
    {
      id: "t1",
      title: "Ingresso de Show no Fim de Semana",
      cost: 180.0,
      happinessPoints: 45,
      type: "TEMPTATION",
      category: "Lazer",
      description: "Shows imperdíveis com a galera no sábado à noite! (Uso único)",
    },
    {
      id: "t2",
      title: "Jantar Especial em Restaurante Chique",
      cost: 140.0,
      happinessPoints: 35,
      type: "TEMPTATION",
      category: "Gastronomia",
      description: "Experiência culinária única para relaxar na sexta. (Uso único)",
    },
    {
      id: "t3",
      title: "Fone de Ouvido Noise Cancelling",
      cost: 320.0,
      happinessPoints: 70,
      type: "TEMPTATION",
      category: "Gadgets",
      description: "Foco total nos estudos e música sem ruídos. (Uso único)",
    },
    {
      id: "t4",
      title: "Passeio de Bate-Volta na Praia",
      cost: 120.0,
      happinessPoints: 30,
      type: "TEMPTATION",
      category: "Viagem",
      description: "Sol, mar e recarga de energias com os amigos. (Uso único)",
    },
    {
      id: "t5",
      title: "Assinatura VIP de Plataforma de Games",
      cost: 65.0,
      happinessPoints: 20,
      type: "TEMPTATION",
      category: "Entretenimento",
      description: "Acesso ilimitado aos jogos da temporada. (Uso único)",
    },
  ]);

  const [longTermGoals, setLongTermGoals] = useState<ExpenseItem[]>([
    {
      id: "g1",
      title: "Viagem dos Sonhos (Mochilão Europa)",
      cost: 3200.0,
      happinessPoints: 300,
      type: "LONG_TERM_GOAL",
      category: "Sonho de Vida",
      description: "A grande recompensa por economizar e manter foco total!",
    },
    {
      id: "g2",
      title: "Entrada do Carro Próprio",
      cost: 2800.0,
      happinessPoints: 250,
      type: "LONG_TERM_GOAL",
      category: "Patrimônio",
      description: "Conquista da independência de locomoção com seu veículo.",
    },
    {
      id: "g3",
      title: "Reserva de Investimentos & Fundo de Emergência",
      cost: 1800.0,
      happinessPoints: 180,
      type: "LONG_TERM_GOAL",
      category: "Segurança Financeira",
      description: "Tranquilidade absoluta para iniciar o próximo ciclo de vida.",
    },
  ]);

  // Unforeseen modal state
  const [activeUnforeseen, setActiveUnforeseen] = useState<UnforeseenEvent | null>(null);
  const [resolvedUnforeseens, setResolvedUnforeseens] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);

  // Dismiss notification banner automatically
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Randomize unforeseen trigger time whenever month changes
  useEffect(() => {
    if (currentMonth > 0) {
      const randomTime = Math.floor(Math.random() * (180 - 120 + 1)) + 120;
      setUnforeseenTriggerTime(randomTime);
    }
  }, [currentMonth]);

  // Real-time month timer tick
  useEffect(() => {
    if (currentMonth === 0) return; // Month 0 (RPG Setup) has no auto-advancing timer

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleMonthEnd();
          return MONTH_DURATION_SECONDS;
        }

        // Trigger Imprevisto at random time (between 120s and 180s remaining)
        if (prev === unforeseenTriggerTime && !activeUnforeseen) {
          triggerUnforeseenEvent();
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentMonth, fixedExpenses, balance, savings, unforeseenTriggerTime, activeUnforeseen]);

  // Active Unforeseen Modal Countdown Effect (30 seconds to answer)
  useEffect(() => {
    if (modalCountdown === null || !activeUnforeseen) return;

    if (modalCountdown <= 0) {
      // Auto-apply penalty immediately when decision timer expires
      handleResolveUnforeseen(false);
      setModalCountdown(null);
      setNotification({
        message: "⚡ Tempo esgotado para responder o imprevisto! Penalidade aplicada automaticamente.",
        type: "error",
      });
      return;
    }

    const timer = setTimeout(() => {
      setModalCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [modalCountdown, activeUnforeseen]);

  // Trigger Imprevisto at random time between 2 to 3 minutes (Shuffled per group)
  const triggerUnforeseenEvent = () => {
    const fallbackEvents: UnforeseenEvent[] = [
      {
        id: `u-1`,
        title: "📱 Tela do Celular Quebrou!",
        description: "Seu celular caiu no chão. O reparo imediato evita transtornos nos estudos e trabalho.",
        costToFix: 260.0,
        penaltyIfNotFixedPoints: 40,
        restoredPointsIfFixed: 10,
        triggeredMonth: currentMonth,
      },
      {
        id: `u-2`,
        title: "🦷 Emergência Odontológica",
        description: "Consulta de dor de dente urgente no meio do mês! Precisa de medicação imediata.",
        costToFix: 220.0,
        penaltyIfNotFixedPoints: 35,
        restoredPointsIfFixed: 5,
        triggeredMonth: currentMonth,
      },
      {
        id: `u-3`,
        title: "💻 Manutenção do Notebook da Faculdade",
        description: "Falha na memória RAM antes da entrega de um projeto importante.",
        costToFix: 310.0,
        penaltyIfNotFixedPoints: 50,
        restoredPointsIfFixed: 15,
        triggeredMonth: currentMonth,
      },
      {
        id: `u-4`,
        title: "🚗 Manutenção Urgente no Veículo",
        description: "Pneu furado e alinhamento necessário para continuar se deslocando com segurança.",
        costToFix: 280.0,
        penaltyIfNotFixedPoints: 45,
        restoredPointsIfFixed: 10,
        triggeredMonth: currentMonth,
      },
      {
        id: `u-5`,
        title: "⚡ Multa por Conta de Luz Atrasada",
        description: "Atraso no pagamento da energia gerou taxa de religação e juros de mora.",
        costToFix: 190.0,
        penaltyIfNotFixedPoints: 30,
        restoredPointsIfFixed: 5,
        triggeredMonth: currentMonth,
      },
      {
        id: `u-6`,
        title: "👟 Tênis do Dia a Dia Rasgou",
        description: "O calçado principal estragou na chuva. Necessário comprar um par substituto urgente.",
        costToFix: 170.0,
        penaltyIfNotFixedPoints: 25,
        restoredPointsIfFixed: 5,
        triggeredMonth: currentMonth,
      },
    ];

    const sourceEvents = catalogUnforeseens.length > 0
      ? catalogUnforeseens.map((u) => ({
          id: u.id,
          title: u.title,
          description: u.description,
          costToFix: u.costToFix,
          penaltyIfNotFixedPoints: u.penaltyIfNotFixedPoints,
          restoredPointsIfFixed: u.restoredPointsIfFixed,
          triggeredMonth: currentMonth,
        }))
      : fallbackEvents;

    // Deterministic shuffle based on group token so every group gets all events in different order
    const groupToken = (typeof window !== "undefined" && localStorage.getItem("finGame_groupToken")) || groupName;
    let hash = 0;
    for (let i = 0; i < groupToken.length; i++) {
      hash = (hash << 5) - hash + groupToken.charCodeAt(i);
      hash |= 0;
    }

    const shuffled = [...sourceEvents];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.abs((hash + i * 17) % (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedIndex = (currentMonth - 1) % shuffled.length;
    const selected = shuffled[selectedIndex];

    if (!resolvedUnforeseens.includes(selected.id)) {
      setActiveUnforeseen(selected);
      setModalCountdown(30); // 30s decision countdown
    }
  };

  // Sync group metrics with backend API
  const syncGroupMetrics = (newBalance: number, newSavings: number, newPoints: number, newMonth: number) => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token") || localStorage.getItem("finGame_groupToken");
      if (token) {
        fetch("/api/groups", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qrCodeToken: token,
            balance: newBalance,
            savings: newSavings,
            happinessPoints: newPoints,
            currentMonth: newMonth,
          }),
        }).catch(() => {});
      }
    }
  };

  // Helper to handle payment using Balance first, then Savings if needed
  const deductPayment = (cost: number) => {
    const totalFunds = balance + savings;
    if (totalFunds < cost) {
      return { success: false, usedSavings: 0, newBalance: balance, newSavings: savings };
    }

    let newBalance = balance;
    let newSavings = savings;
    let usedSavings = 0;

    if (balance >= cost) {
      newBalance = balance - cost;
    } else {
      usedSavings = cost - balance;
      newBalance = 0;
      newSavings = savings - usedSavings;
    }

    return { success: true, usedSavings, newBalance, newSavings };
  };

  // Confirm Month 0 RPG character creation
  const handleConfirmRPGCharacter = () => {
    if (!rpgChoices.housing || !rpgChoices.food || !rpgChoices.transport || !rpgChoices.tech) {
      setNotification({
        message: "Escolha uma opção para Moradia, Alimentação, Transporte e Conectividade para continuar!",
        type: "warning",
      });
      return;
    }

    const initialFixedExpenses: ExpenseItem[] = [
      {
        id: `f1-m1`,
        title: rpgChoices.housing.title,
        cost: rpgChoices.housing.cost,
        happinessPoints: rpgChoices.housing.points,
        type: "FIXED",
        category: "Moradia",
        isPaid: false,
        consecutiveMonths: 1,
        description: "Sua escolha de moradia definida no Mês 0 (RPG).",
      },
      {
        id: `f2-m1`,
        title: rpgChoices.food.title,
        cost: rpgChoices.food.cost,
        happinessPoints: rpgChoices.food.points,
        type: "FIXED",
        category: "Alimentação",
        isPaid: false,
        consecutiveMonths: 1,
        description: "Sua escolha de alimentação definida no Mês 0 (RPG).",
      },
      {
        id: `f3-m1`,
        title: rpgChoices.transport.title,
        cost: rpgChoices.transport.cost,
        happinessPoints: rpgChoices.transport.points,
        type: "FIXED",
        category: "Transporte",
        isPaid: false,
        consecutiveMonths: 1,
        description: "Sua escolha de transporte definida no Mês 0 (RPG).",
      },
      {
        id: `f4-m1`,
        title: rpgChoices.tech.title,
        cost: rpgChoices.tech.cost,
        happinessPoints: rpgChoices.tech.points,
        type: "FIXED",
        category: "Tecnologia",
        isPaid: false,
        consecutiveMonths: 1,
        description: "Sua escolha de conectividade definida no Mês 0 (RPG).",
      },
    ];

    const totalRPGPoints =
      100 +
      rpgChoices.housing.points +
      rpgChoices.food.points +
      rpgChoices.transport.points +
      rpgChoices.tech.points;

    setFixedExpenses(initialFixedExpenses);
    setChosenBaseExpenses(initialFixedExpenses);
    setHappinessPoints(totalRPGPoints);
    setIsRPGConfirmed(true);
    setBalance(MONTHLY_ALLOWANCE);

    const token = localStorage.getItem("finGame_groupToken");
    if (token) {
      localStorage.setItem(`finGame_chosenBase_${token}`, JSON.stringify(initialFixedExpenses));
      localStorage.setItem(`finGame_isRPGConfirmed_${token}`, "true");

      fetch("/api/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCodeToken: token,
          balance: MONTHLY_ALLOWANCE,
          savings,
          happinessPoints: totalRPGPoints,
          isRPGConfirmed: true,
        }),
      }).catch(() => {});
    }

    setNotification({
      message: "🎭 Personagem montado com sucesso! Aguarde os outros grupos confirmarem suas escolhas ou o término do tempo de 5 minutos do Mês 0...",
      type: "success",
    });
  };

  // Turn of month logic (with 8% interest & 1.5 power exponential penalty)
  const handleMonthEnd = () => {
    const unpaidFixed = fixedExpenses.filter((e) => !e.isPaid);
    let totalPenalty = 0;

    // Carried over unpaid expenses with +8% interest and incremented consecutive unpaid count
    const carriedOverExpenses: ExpenseItem[] = unpaidFixed.map((e, idx) => {
      const prevConsecutive = e.consecutiveMonths || 1;
      const nextConsecutive = prevConsecutive + 1;

      // Exponential penalty formula: 50 * (mesesAtrasados)^1.5
      const penaltyForThis = Math.round(50 * Math.pow(prevConsecutive, 1.5));
      totalPenalty += penaltyForThis;

      const newCost = Math.round(e.cost * 1.08 * 100) / 100;
      const titleClean = e.title.includes("⚠️ Atrasado")
        ? e.title.replace(/\(Atrasado \d+ mes\(es\).*\)/, `(Atrasado ${nextConsecutive} mes(es) | +8% Juros)`)
        : `${e.title} ⚠️ (Atrasado ${nextConsecutive} mes(es) | +8% Juros)`;

      return {
        ...e,
        id: `overdue-${currentMonth}-${idx}-${Date.now()}`,
        title: titleClean,
        cost: newCost,
        isPaid: false,
        consecutiveMonths: nextConsecutive,
        description: `Despesa não paga por ${prevConsecutive} mês(es). Inclui 8% de juros e penalidade exponencial ^1.5.`,
      };
    });

    if (unpaidFixed.length > 0) {
      setHappinessPoints((prev) => Math.max(0, prev - totalPenalty));
      setNotification({
        message: `Fim do Mês ${currentMonth}: Penalidade de -${totalPenalty} pts de Felicidade (Escalonada ^1.5)! ${unpaidFixed.length} despesa(s) não paga(s) acumularam +8% de juros!`,
        type: "error",
      });
    } else {
      setNotification({
        message: `Mês ${currentMonth} encerrado com sucesso! Sobra transferida para a Poupança. +Bolsa Auxílio recebida!`,
        type: "success",
      });
    }

    // Apply 2% monthly yield to Invested Capital (CDB Fictício)
    let updatedInvested = investedCapital;
    if (investedCapital > 0) {
      updatedInvested = Math.round(investedCapital * 1.02 * 100) / 100;
      setInvestedCapital(updatedInvested);
    }

    // Auto-transfer remaining balance to savings
    const remainingBalance = Math.max(0, balance);
    const newSavings = savings + remainingBalance;
    const newBalance = MONTHLY_ALLOWANCE;
    setSavings(newSavings);

    if (currentMonth < TOTAL_MONTHS) {
      const nextMonth = currentMonth + 1;
      setCurrentMonth(nextMonth);
      setBalance(newBalance);

      // Re-use the exact 4 expenses chosen by the player in Month 0 RPG character creation
      const sourceBase = chosenBaseExpenses.length > 0 
        ? chosenBaseExpenses 
        : fixedExpenses.filter((e) => !e.title.includes("⚠️ Atrasado"));

      const baseNewMonthExpenses: ExpenseItem[] = sourceBase.map((e, idx) => ({
        ...e,
        id: `f${idx + 1}-m${nextMonth}`,
        isPaid: false,
        consecutiveMonths: 1,
      }));

      setFixedExpenses([...carriedOverExpenses, ...baseNewMonthExpenses]);
      setActiveUnforeseen(null);
      setModalCountdown(null);

      syncGroupMetrics(newBalance, newSavings, Math.max(0, happinessPoints - totalPenalty), nextMonth);
    } else {
      // FINAL MONTH (Mês 6 Vencimento dos Investimentos!)
      let finalBonus = 0;
      if (updatedInvested > 0) {
        finalBonus = 150; // Massivo bônus de maturidade no Mês Final sem impostos!
        setBalance((prev) => prev + updatedInvested);
        setHappinessPoints((prev) => prev + finalBonus);
        setInvestedCapital(0);
      }

      setNotification({
        message: `🎉 PARABÉNS! Você chegou ao Mês Final! ${updatedInvested > 0 ? `Investimento resgatado SEM IMPOSTOS + Bônus de +${finalBonus} pts!` : "Use a sua Poupança para comprar Metas de Longo Prazo!"}`,
        type: "success",
      });
    }
  };

  // Action: Pay Fixed Expense
  const handlePayFixedExpense = (id: string) => {
    const expense = fixedExpenses.find((e) => e.id === id);
    if (!expense || expense.isPaid) return;

    const payment = deductPayment(expense.cost);
    if (!payment.success) {
      setNotification({
        message: "Saldo total (Mensal + Poupança) insuficiente para pagar esta despesa fixa!",
        type: "warning",
      });
      return;
    }

    const newPoints = happinessPoints + expense.happinessPoints;
    setBalance(payment.newBalance);
    setSavings(payment.newSavings);
    setHappinessPoints(newPoints);
    setFixedExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isPaid: true } : e))
    );

    syncGroupMetrics(payment.newBalance, payment.newSavings, newPoints, currentMonth);

    const savingsMsg = payment.usedSavings > 0
      ? ` (R$ ${payment.usedSavings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} retirados da Poupança)`
      : "";

    setNotification({
      message: `Despesa "${expense.title}" paga com sucesso (+${expense.happinessPoints} Felicidade)!${savingsMsg}`,
      type: "success",
    });
  };

  // Action: Buy Temptation (Single-use per item)
  const handleBuyTemptation = (item: ExpenseItem) => {
    if (boughtTemptationIds.includes(item.id)) {
      setNotification({
        message: "Esta tentação já foi adquirida! Permito comprar apenas 1 vez por item.",
        type: "warning",
      });
      return;
    }

    const payment = deductPayment(item.cost);
    if (!payment.success) {
      setNotification({
        message: "Saldo total (Mensal + Poupança) insuficiente para comprar esta tentação!",
        type: "warning",
      });
      return;
    }

    const newPoints = happinessPoints + item.happinessPoints;
    setBalance(payment.newBalance);
    setSavings(payment.newSavings);
    setHappinessPoints(newPoints);
    setBoughtTemptationIds((prev) => [...prev, item.id]);

    syncGroupMetrics(payment.newBalance, payment.newSavings, newPoints, currentMonth);

    const savingsMsg = payment.usedSavings > 0
      ? ` (R$ ${payment.usedSavings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} retirados da Poupança)`
      : "";

    setNotification({
      message: `Comprou "${item.title}"! +${item.happinessPoints} Pontos de Felicidade!${savingsMsg}`,
      type: "success",
    });
  };

  // Action: Buy Flash Promo inside Imprevisto modal
  const handleBuyFlashPromo = () => {
    const promoCost = 130.0;
    const promoPoints = 50;

    const payment = deductPayment(promoCost);
    if (!payment.success) {
      setNotification({
        message: "Saldo insuficiente para aproveitar a Promoção Flash!",
        type: "warning",
      });
      return;
    }

    const newPoints = happinessPoints + promoPoints;
    setBalance(payment.newBalance);
    setSavings(payment.newSavings);
    setHappinessPoints(newPoints);

    syncGroupMetrics(payment.newBalance, payment.newSavings, newPoints, currentMonth);

    setNotification({
      message: `⚡ Promoção Flash adquirida! +50 Pontos de Felicidade por apenas R$ 130,00!`,
      type: "success",
    });
  };

  // Action: Resolve Unforeseen
  const handleResolveUnforeseen = (pay: boolean) => {
    if (!activeUnforeseen) return;

    if (pay) {
      const payment = deductPayment(activeUnforeseen.costToFix);
      if (!payment.success) {
        setNotification({
          message: "Saldo total (Mensal + Poupança) insuficiente para resolver o imprevisto!",
          type: "warning",
        });
        return;
      }

      const newPoints = happinessPoints + activeUnforeseen.restoredPointsIfFixed;
      setBalance(payment.newBalance);
      setSavings(payment.newSavings);
      setHappinessPoints(newPoints);

      syncGroupMetrics(payment.newBalance, payment.newSavings, newPoints, currentMonth);

      const savingsMsg = payment.usedSavings > 0
        ? ` (R$ ${payment.usedSavings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} retirados da Poupança)`
        : "";

      setNotification({
        message: `Imprevisto resolvido! -$${activeUnforeseen.costToFix.toFixed(2)} | +${activeUnforeseen.restoredPointsIfFixed} Felicidade!${savingsMsg}`,
        type: "success",
      });
    } else {
      const newPoints = Math.max(0, happinessPoints - activeUnforeseen.penaltyIfNotFixedPoints);
      setHappinessPoints(newPoints);

      syncGroupMetrics(balance, savings, newPoints, currentMonth);

      setNotification({
        message: `Imprevisto ignorado! Penalidade de -${activeUnforeseen.penaltyIfNotFixedPoints} Pontos de Felicidade!`,
        type: "error",
      });
    }

    setResolvedUnforeseens((prev) => [...prev, activeUnforeseen.id]);
    setActiveUnforeseen(null);
    setModalCountdown(null);
  };

  // Action: Invest money into CDB Fictício (+2% yield/month)
  const handleInvestMoney = (amount: number) => {
    if (balance < amount) {
      setNotification({
        message: "Saldo mensal insuficiente para aplicar em investimentos!",
        type: "warning",
      });
      return;
    }
    const newBalance = balance - amount;
    const newInvested = investedCapital + amount;
    setBalance(newBalance);
    setInvestedCapital(newInvested);
    syncGroupMetrics(newBalance, savings, happinessPoints, currentMonth);
    setNotification({
      message: `R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} aplicados no CDB Fictício (+2% rendimento/mês)!`,
      type: "success",
    });
  };

  // Action: Early Withdraw from Investment (22.5% Tax Penalty before Month 6)
  const handleEarlyWithdrawInvestment = () => {
    if (investedCapital <= 0) return;

    // 22.5% Income Tax penalty for withdrawing before final maturity
    const taxAmount = Math.round(investedCapital * 0.225 * 100) / 100;
    const netAmount = Math.round((investedCapital - taxAmount) * 100) / 100;

    const newBalance = balance + netAmount;
    setBalance(newBalance);
    setInvestedCapital(0);
    syncGroupMetrics(newBalance, savings, happinessPoints, currentMonth);

    setNotification({
      message: `⚠️ Resgate Antecipado: R$ ${taxAmount.toFixed(2)} pagos em Imposto de Renda (22,5%). R$ ${netAmount.toFixed(2)} devolvidos ao saldo.`,
      type: "warning",
    });
  };

  // Action: Deposit to Savings manually
  const handleDepositToSavings = (amount: number) => {
    if (balance < amount) {
      setNotification({
        message: "Saldo mensal insuficiente para guardar esse valor!",
        type: "warning",
      });
      return;
    }
    const newBalance = balance - amount;
    const newSavings = savings + amount;
    setBalance(newBalance);
    setSavings(newSavings);
    syncGroupMetrics(newBalance, newSavings, happinessPoints, currentMonth);
    setNotification({
      message: `R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} guardados na Poupança com sucesso!`,
      type: "success",
    });
  };

  // Action: Withdraw from Savings manually
  const handleWithdrawFromSavings = (amount: number) => {
    if (savings < amount) {
      setNotification({
        message: "Poupança insuficiente para resgatar esse valor!",
        type: "warning",
      });
      return;
    }
    const newSavings = savings - amount;
    const newBalance = balance + amount;
    setSavings(newSavings);
    setBalance(newBalance);
    syncGroupMetrics(newBalance, newSavings, happinessPoints, currentMonth);
    setNotification({
      message: `R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} resgatados da Poupança para o Saldo Mensal!`,
      type: "success",
    });
  };

  // Action: Buy Long-Term Goal (only in final month using savings)
  const handleBuyGoal = (goal: ExpenseItem) => {
    if (savings < goal.cost) {
      setNotification({
        message: "Poupança insuficiente para adquirir esta Meta de Longo Prazo!",
        type: "warning",
      });
      return;
    }

    const newSavings = savings - goal.cost;
    const newPoints = happinessPoints + goal.happinessPoints;
    setSavings(newSavings);
    setHappinessPoints(newPoints);
    setLongTermGoals((prev) => prev.filter((g) => g.id !== goal.id));
    syncGroupMetrics(balance, newSavings, newPoints, currentMonth);

    setNotification({
      message: `🏆 META ALCANÇADA: ${goal.title}! Bônus MASSIVO de +${goal.happinessPoints} Pontos de Felicidade!`,
      type: "success",
    });
  };

  // Format countdown minutes & seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const timerPercentage = ((MONTH_DURATION_SECONDS - timeLeft) / MONTH_DURATION_SECONDS) * 100;
  
  const unpaidTotalCost = fixedExpenses
    .filter((e) => !e.isPaid)
    .reduce((sum, e) => sum + e.cost, 0);

  const getHappinessState = (pts: number) => {
    if (pts >= 180) return { label: "Radiante", icon: Smile, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    if (pts >= 100) return { label: "Equilibrado", icon: Meh, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    return { label: "Estressado", icon: Frown, color: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
  };

  const happyState = getHappinessState(happinessPoints);
  const MoodIcon = happyState.icon;

  // ==========================================
  // RENDER MONTH 0 (RPG CHARACTER SETUP SCREEN)
  // ==========================================
  if (currentMonth === 0) {
    if (isRPGConfirmed) {
      return (
        <div className="min-h-screen p-6 text-slate-100 flex flex-col items-center justify-center max-w-xl mx-auto space-y-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl glow-emerald animate-pulse">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <UserCheck className="w-4 h-4" />
              <span>Personagem Confirmado</span>
            </div>
            <h1 className="text-2xl font-black text-white">Personagem Criado com Sucesso!</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Suas 4 opções de estilo de vida foram salvas. Aguarde todos os outros grupos confirmarem suas escolhas ou o encerramento do cronômetro de 5 minutos para o jogo avançar para o Mês 1!
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-amber-500/30 text-amber-300 font-mono font-bold text-sm w-full flex items-center justify-between shadow-lg">
            <span className="text-xs text-slate-400 font-sans">Tempo Restante no Mês 0:</span>
            <span className="text-base font-extrabold text-amber-300 px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40">
              {formatTime(timeLeft)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 text-left space-y-1 w-full">
            <span className="font-bold text-purple-300 block">Sua Seleção de Estilo de Vida:</span>
            {rpgChoices.housing && <p>• Moradia: <strong>{rpgChoices.housing.title}</strong> (R$ {rpgChoices.housing.cost})</p>}
            {rpgChoices.food && <p>• Alimentação: <strong>{rpgChoices.food.title}</strong> (R$ {rpgChoices.food.cost})</p>}
            {rpgChoices.transport && <p>• Transporte: <strong>{rpgChoices.transport.title}</strong> (R$ {rpgChoices.transport.cost})</p>}
            {rpgChoices.tech && <p>• Conectividade: <strong>{rpgChoices.tech.title}</strong> (R$ {rpgChoices.tech.cost})</p>}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen p-4 sm:p-6 text-slate-100 flex flex-col items-center justify-center max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase tracking-wider">
            <UserCheck className="w-4 h-4 text-purple-400" />
            <span>Mês 0 • Criação do Personagem (RPG)</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Monte o Estilo de Vida da sua Equipe</h1>
          <p className="text-xs text-slate-300">
            Escolha como a sua equipe vai viver durante a dinâmica. Suas decisões definem suas <strong className="text-emerald-400">Despesas Fixas Mensais</strong> e seus <strong className="text-amber-300">Pontos iniciais de Felicidade</strong>!
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
          {/* Category 1: Moradia */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Home className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-white text-sm">1. Moradia & Habitação</h3>
            </div>
            <div className="space-y-2">
              {(
                catalogItems.filter((i) => i.isRPGChoice && i.category === "Moradia").length > 0
                  ? catalogItems
                      .filter((i) => i.isRPGChoice && i.category === "Moradia")
                      .map((i) => ({ title: i.title, cost: i.cost, points: i.happinessPoints, desc: i.description }))
                  : [
                      { title: "Quarto Compartilhado", cost: 500, points: 5, desc: "Custo baixo, pouca privacidade." },
                      { title: "Kitnet Própria", cost: 750, points: 10, desc: "Espaço independente e confortável." },
                      { title: "Apartamento Completo", cost: 1100, points: 20, desc: "Alto conforto, condomínio e infraestrutura." },
                    ]
              ).map((opt) => (
                <button
                  key={opt.title}
                  onClick={() => setRpgChoices((prev) => ({ ...prev, housing: opt }))}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    rpgChoices.housing?.title === opt.title
                      ? "bg-purple-600/30 border-purple-500 text-white shadow-lg glow-purple"
                      : "bg-slate-900/60 border-white/10 hover:border-white/20 text-slate-300"
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">{opt.title}</div>
                    <div className="text-[11px] text-slate-400">{opt.desc}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-emerald-400">R$ {opt.cost}</div>
                    <div className="text-[10px] text-amber-300 font-bold">+{opt.points} pts</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category 2: Alimentação */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-sm">2. Alimentação & Gastronomia</h3>
            </div>
            <div className="space-y-2">
              {(
                catalogItems.filter((i) => i.isRPGChoice && i.category === "Alimentação").length > 0
                  ? catalogItems
                      .filter((i) => i.isRPGChoice && i.category === "Alimentação")
                      .map((i) => ({ title: i.title, cost: i.cost, points: i.happinessPoints, desc: i.description }))
                  : [
                      { title: "Marmita & Básico", cost: 350, points: 5, desc: "Refeições essenciais preparadas em casa." },
                      { title: "Supermercado Completo", cost: 500, points: 10, desc: "Boa variedade de alimentos diários." },
                      { title: "Alimentação Gourmet", cost: 700, points: 20, desc: "Ingredientes nobres e delivery nos fins de semana." },
                    ]
              ).map((opt) => (
                <button
                  key={opt.title}
                  onClick={() => setRpgChoices((prev) => ({ ...prev, food: opt }))}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    rpgChoices.food?.title === opt.title
                      ? "bg-purple-600/30 border-purple-500 text-white shadow-lg glow-purple"
                      : "bg-slate-900/60 border-white/10 hover:border-white/20 text-slate-300"
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">{opt.title}</div>
                    <div className="text-[11px] text-slate-400">{opt.desc}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-emerald-400">R$ {opt.cost}</div>
                    <div className="text-[10px] text-amber-300 font-bold">+{opt.points} pts</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category 3: Transporte */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">3. Transporte & Mobilidade</h3>
            </div>
            <div className="space-y-2">
              {(
                catalogItems.filter((i) => i.isRPGChoice && i.category === "Transporte").length > 0
                  ? catalogItems
                      .filter((i) => i.isRPGChoice && i.category === "Transporte")
                      .map((i) => ({ title: i.title, cost: i.cost, points: i.happinessPoints, desc: i.description }))
                  : [
                      { title: "Transporte Público", cost: 120, points: 5, desc: "Ônibus e metrô no dia a dia." },
                      { title: "Passe Livre + Carona/App", cost: 200, points: 10, desc: "Agilidade extra para se locomover." },
                    ]
              ).map((opt) => (
                <button
                  key={opt.title}
                  onClick={() => setRpgChoices((prev) => ({ ...prev, transport: opt }))}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    rpgChoices.transport?.title === opt.title
                      ? "bg-purple-600/30 border-purple-500 text-white shadow-lg glow-purple"
                      : "bg-slate-900/60 border-white/10 hover:border-white/20 text-slate-300"
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">{opt.title}</div>
                    <div className="text-[11px] text-slate-400">{opt.desc}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-emerald-400">R$ {opt.cost}</div>
                    <div className="text-[10px] text-amber-300 font-bold">+{opt.points} pts</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category 4: Conectividade */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white text-sm">4. Conectividade & Tecnologia</h3>
            </div>
            <div className="space-y-2">
              {(
                catalogItems.filter((i) => i.isRPGChoice && i.category === "Tecnologia").length > 0
                  ? catalogItems
                      .filter((i) => i.isRPGChoice && i.category === "Tecnologia")
                      .map((i) => ({ title: i.title, cost: i.cost, points: i.happinessPoints, desc: i.description }))
                  : [
                      { title: "Internet Básica", cost: 90, points: 5, desc: "Navegação essencial para estudos." },
                      { title: "Fibra + Streamings VIP", cost: 150, points: 15, desc: "Conexão ultra-rápida e entretenimento." },
                    ]
              ).map((opt) => (
                <button
                  key={opt.title}
                  onClick={() => setRpgChoices((prev) => ({ ...prev, tech: opt }))}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    rpgChoices.tech?.title === opt.title
                      ? "bg-purple-600/30 border-purple-500 text-white shadow-lg glow-purple"
                      : "bg-slate-900/60 border-white/10 hover:border-white/20 text-slate-300"
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">{opt.title}</div>
                    <div className="text-[11px] text-slate-400">{opt.desc}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-emerald-400">R$ {opt.cost}</div>
                    <div className="text-[10px] text-amber-300 font-bold">+{opt.points} pts</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Card & Start Button */}
        <div className="w-full glass-panel p-6 rounded-3xl border border-purple-500/40 glow-purple flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-xs text-slate-300">
              Custo Fixo Mensal Definido:{" "}
              <strong className="text-emerald-400 text-sm font-extrabold">
                R${" "}
                {(
                  (rpgChoices.housing?.cost || 0) +
                  (rpgChoices.food?.cost || 0) +
                  (rpgChoices.transport?.cost || 0) +
                  (rpgChoices.tech?.cost || 0)
                ).toFixed(2)}
              </strong>{" "}
              / mês
            </div>
            <div className="text-xs text-slate-300">
              Bolsa Auxílio: <strong className="text-white">R$ 1.560,00</strong> | Pontos de Felicidade Iniciais:{" "}
              <strong className="text-amber-300 font-extrabold">
                {100 +
                  (rpgChoices.housing?.points || 0) +
                  (rpgChoices.food?.points || 0) +
                  (rpgChoices.transport?.points || 0) +
                  (rpgChoices.tech?.points || 0)}{" "}
                pts
              </strong>
            </div>
          </div>

          <button
            onClick={handleConfirmRPGCharacter}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-black text-sm shadow-xl glow-purple transition-all flex items-center gap-2"
          >
            <UserCheck className="w-5 h-5" />
            <span>Confirmar Personagem e Iniciar Mês 1</span>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER MAIN DASHBOARD (MONTHS 1 TO 6)
  // ==========================================
  return (
    <div className="min-h-screen pb-16 text-slate-100 selection:bg-emerald-500/20">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-md border animate-in fade-in slide-in-from-top-4 duration-300 ${
            notification.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : notification.type === "warning"
              ? "bg-amber-950/90 border-amber-500/50 text-amber-200"
              : "bg-rose-950/90 border-rose-500/50 text-rose-200"
          }`}
        >
          {notification.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {notification.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
          {notification.type === "error" && <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b glass-panel border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Group Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-bold text-white shadow-lg glow-emerald">
              {groupName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">{groupName}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>
                  Sala Conectada • {currentMonth === TOTAL_MONTHS ? "Mês Final!" : `Mês ${currentMonth} de ${TOTAL_MONTHS}`}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Live Month Timer Bar */}
          <div className="flex-1 max-w-md mx-auto">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
              <div className="flex items-center gap-1.5 text-amber-400">
                <Clock className="w-4 h-4 animate-spin-slow" />
                <span>Tempo Restante no Mês</span>
              </div>
              <span className="font-mono text-sm font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md">
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/5 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${100 - timerPercentage}%` }}
              />
            </div>
          </div>

          {/* Right: Quick Action & Allowance badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <TrendingUp className="w-4 h-4" />
              <span>Bolsa: R$ {MONTHLY_ALLOWANCE.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metric Cards Row (4 Columns: Balance, Savings, Investments, Happiness) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Monthly Balance */}
          <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Saldo Disponível (Mês)</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">
              R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
              <span>Capital Total:</span>
              <span className="font-bold text-emerald-300">
                R$ {(balance + savings).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card 2: Accumulated Savings */}
          <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Poupança Acumulada</span>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-purple-300 tracking-tight">
              R$ {savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-white/5 gap-1">
              <button
                onClick={() => {
                  setDepositAmountInput(balance > 0 ? balance.toString() : "");
                  setShowDepositModal(true);
                }}
                disabled={balance <= 0}
                className="px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 font-bold text-[11px] disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                + Guardar
              </button>
              <button
                onClick={() => {
                  setWithdrawAmountInput(savings > 0 ? savings.toString() : "");
                  setShowWithdrawModal(true);
                }}
                disabled={savings <= 0}
                className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 font-bold text-[11px] disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                - Resgatar
              </button>
            </div>
          </div>

          {/* Card 3: Investimentos Fictícios (CDB +2%/mês) */}
          <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group border border-indigo-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">Investimento (CDB)</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-indigo-200 tracking-tight">
              R$ {investedCapital.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-white/5 gap-1">
              <button
                onClick={() => {
                  setInvestAmountInput(balance > 0 ? balance.toString() : "");
                  setShowInvestModal(true);
                }}
                disabled={balance <= 0}
                className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 font-bold text-[11px] disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                + Aplicação (+2%)
              </button>
              {investedCapital > 0 && currentMonth < TOTAL_MONTHS && (
                <button
                  onClick={handleEarlyWithdrawInvestment}
                  className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-[10px]"
                  title="Resgate antecipado com 22,5% de Imposto de Renda"
                >
                  Saída (-22,5% IR)
                </button>
              )}
            </div>
          </div>

          {/* Card 4: Happiness Points Score */}
          <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pontos de Felicidade</span>
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Heart className="w-4 h-4 fill-amber-400/20" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-300 tracking-tight">{happinessPoints}</span>
              <span className="text-[10px] text-amber-400 font-semibold">pts</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
              <span className="text-slate-400">Estado:</span>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${happyState.color}`}>
                <MoodIcon className="w-3 h-3" />
                <span>{happyState.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Final Month Goals Section */}
        {currentMonth === TOTAL_MONTHS && (
          <section className="glass-panel p-6 rounded-2xl border-2 border-purple-500/40 glow-purple bg-gradient-to-b from-purple-950/20 to-slate-900/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-purple-500/20">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-bold text-white">Loja de Metas de Longo Prazo (Mês Final)</h2>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Use o saldo acumulado da sua <strong className="text-purple-300">Poupança</strong> e de <strong className="text-indigo-300">Investimentos resgatados sem impostos</strong> para comprar conquistas!
                </p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-sm">
                Poupança: R$ {savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {longTermGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="glass-panel p-5 rounded-xl border border-purple-500/20 flex flex-col justify-between hover:border-purple-500/50 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        {goal.category}
                      </span>
                      <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        +{goal.happinessPoints} pts
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base mb-1">{goal.title}</h3>
                    <p className="text-xs text-slate-400 mb-4">{goal.description}</p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-purple-300">
                      R$ {goal.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => handleBuyGoal(goal)}
                      disabled={savings < goal.cost}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                        savings >= goal.cost
                          ? "bg-purple-600 hover:bg-purple-500 text-white glow-purple"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                      }`}
                    >
                      <Award className="w-4 h-4" />
                      <span>Conquistar</span>
                    </button>
                  </div>
                </div>
              ))}

              {longTermGoals.length === 0 && (
                <div className="col-span-3 text-center py-8 text-emerald-400 font-semibold bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  🎉 Todas as grandes metas foram conquistadas com sucesso! Aguarde o ranking final!
                </div>
              )}
            </div>
          </section>
        )}

        {/* Main Section: 2 Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Fixed Mandatory Expenses (Despesas Fixas) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Despesas Fixas do Mês</h2>
                    <p className="text-xs text-slate-400">Despesas obrigatórias do período</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                  {fixedExpenses.filter((e) => e.isPaid).length}/{fixedExpenses.length} Pagas
                </span>
              </div>

              {/* List of Fixed Expenses */}
              <div className="space-y-3">
                {fixedExpenses.map((expense) => {
                  const totalFunds = balance + savings;
                  const canPay = totalFunds >= expense.cost;
                  const usesSavings = balance < expense.cost && canPay;

                  return (
                    <div
                      key={expense.id}
                      className={`p-4 rounded-xl border transition-all ${
                        expense.isPaid
                          ? "bg-slate-900/40 border-emerald-500/30 text-slate-400"
                          : expense.title.includes("⚠️ Atrasado")
                          ? "bg-rose-950/40 border-rose-500/40 text-white"
                          : "bg-slate-900/80 border-white/10 hover:border-white/20 text-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`text-sm font-bold ${expense.isPaid ? "line-through text-slate-400" : "text-white"}`}>
                              {expense.title}
                            </h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                              {expense.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{expense.description}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-extrabold text-emerald-400">
                            R$ {expense.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                          <span className="text-[11px] text-amber-400 font-semibold flex items-center justify-end gap-1 mt-0.5">
                            +{expense.happinessPoints} pts
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          Status: {expense.isPaid ? "✅ Pago" : expense.title.includes("⚠️ Atrasado") ? `⚠️ Atrasado (+8% Juros)` : "⏳ Pendente"}
                        </span>
                        {!expense.isPaid ? (
                          <button
                            onClick={() => handlePayFixedExpense(expense.id)}
                            disabled={!canPay}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              canPay
                                ? usesSavings
                                  ? "bg-purple-600 hover:bg-purple-500 text-white shadow-md glow-purple"
                                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md glow-emerald"
                                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                            }`}
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>{usesSavings ? "Pagar c/ Poupança" : "Pagar Despesa"}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Pago
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Temptation Feed (Single-Use Only) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Feed de Tentações de Gastos</h2>
                    <p className="text-xs text-slate-400">Gaste seu dinheiro para alavancar Felicidade! (Uso único por item)</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                  Compra Única
                </span>
              </div>

              {/* Grid of Temptation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {temptations.map((item) => {
                  const isBought = boughtTemptationIds.includes(item.id);
                  const totalFunds = balance + savings;
                  const canPay = totalFunds >= item.cost && !isBought;
                  const usesSavings = balance < item.cost && canPay;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        isBought
                          ? "bg-slate-950/40 border-white/5 opacity-60"
                          : "glass-panel-interactive border-white/10"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                            {item.category}
                          </span>
                          <div className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            <Heart className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>+{item.happinessPoints} pts</span>
                          </div>
                        </div>

                        <h3 className="font-bold text-white text-sm mb-1">{item.title}</h3>
                        <p className="text-xs text-slate-400 mb-3">{item.description}</p>
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between mt-2">
                        <span className="text-sm font-extrabold text-emerald-400">
                          R$ {item.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          onClick={() => handleBuyTemptation(item)}
                          disabled={!canPay}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isBought
                              ? "bg-slate-900 text-slate-500 border border-white/5 cursor-not-allowed"
                              : canPay
                              ? usesSavings
                                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-md glow-purple"
                                : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-md glow-amber"
                              : "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isBought ? "Já Adquirido" : usesSavings ? "Comprar c/ Poupança" : "Comprar"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Unforeseen Event Modal (With 30s Decision Timer & Flash Promo Option) */}
      {activeUnforeseen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass-panel max-w-lg w-full p-6 rounded-2xl border-2 border-rose-500/50 glow-rose bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-extrabold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>⚡ Alerta de Imprevisto no Mês {currentMonth}</span>
              </div>

              {/* Countdown Timer Display */}
              {modalCountdown !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-extrabold text-sm animate-pulse">
                  <Timer className="w-4 h-4" />
                  <span>{modalCountdown}s para decidir</span>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-black text-white mb-1">{activeUnforeseen.title}</h2>
              <p className="text-xs text-slate-300 leading-relaxed">{activeUnforeseen.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-slate-400 block mb-1">Custo para Resolver:</span>
                <strong className="text-emerald-400 text-base font-extrabold">
                  R$ {activeUnforeseen.costToFix.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </strong>
                <span className="text-[10px] text-emerald-300 block mt-1">
                  Recompensa: +{activeUnforeseen.restoredPointsIfFixed} Felicidade
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="text-slate-400 block mb-1">Se Recusar / Tempo Esgotar:</span>
                <strong className="text-rose-400 text-base font-extrabold">
                  -{activeUnforeseen.penaltyIfNotFixedPoints} Pontos
                </strong>
                <span className="text-[10px] text-rose-300 block mt-1">Penalidade imediata de Felicidade</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {(() => {
                const totalFunds = balance + savings;
                const canPay = totalFunds >= activeUnforeseen.costToFix;
                const usesSavings = balance < activeUnforeseen.costToFix && canPay;

                return (
                  <button
                    onClick={() => handleResolveUnforeseen(true)}
                    disabled={!canPay}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                      canPay
                        ? usesSavings
                          ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg glow-purple"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg glow-emerald"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {usesSavings
                        ? `Pagar c/ Poupança (R$ ${activeUnforeseen.costToFix.toFixed(0)})`
                        : `Pagar e Resolver (R$ ${activeUnforeseen.costToFix.toFixed(0)})`}
                    </span>
                  </button>
                );
              })()}

              <button
                onClick={() => handleResolveUnforeseen(false)}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-extrabold bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Ignorar (-{activeUnforeseen.penaltyIfNotFixedPoints} pts)</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Deposit Modal (+ Guardar na Poupança) */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-purple-500/40 space-y-4 shadow-2xl glow-purple">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Guardar na Poupança</h3>
              </div>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Digite o valor do seu <strong>Saldo Mensal</strong> (R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) que deseja guardar na Poupança:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const val = parseFloat(depositAmountInput);
                if (isNaN(val) || val <= 0) {
                  setNotification({ message: "Digite um valor válido!", type: "warning" });
                  return;
                }
                if (val > balance) {
                  setNotification({ message: "Saldo mensal insuficiente para esse valor!", type: "warning" });
                  return;
                }
                handleDepositToSavings(val);
                setShowDepositModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Valor a guardar (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balance}
                  value={depositAmountInput}
                  onChange={(e) => setDepositAmountInput(e.target.value)}
                  placeholder="0,00"
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm font-extrabold focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-semibold block">Valores Rápidos:</span>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {[50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmountInput(Math.min(amt, balance).toString())}
                      disabled={balance < amt}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-900/50 text-purple-200 border border-purple-500/20 text-xs font-bold disabled:opacity-30 transition-colors"
                    >
                      R$ {amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDepositAmountInput(balance.toString())}
                    disabled={balance <= 0}
                    className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold transition-colors"
                  >
                    Todo o Saldo
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-extrabold text-xs shadow-lg glow-purple flex items-center gap-1.5"
                >
                  <PiggyBank className="w-4 h-4" />
                  <span>Confirmar Depósito</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal (- Resgatar da Poupança) */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-emerald-500/40 space-y-4 shadow-2xl glow-emerald">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Resgatar da Poupança</h3>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Digite o valor da sua <strong>Poupança</strong> (R$ {savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) que deseja resgatar para o seu Saldo Mensal:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const val = parseFloat(withdrawAmountInput);
                if (isNaN(val) || val <= 0) {
                  setNotification({ message: "Digite um valor válido!", type: "warning" });
                  return;
                }
                if (val > savings) {
                  setNotification({ message: "Poupança insuficiente para esse valor!", type: "warning" });
                  return;
                }
                handleWithdrawFromSavings(val);
                setShowWithdrawModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Valor a resgatar (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={savings}
                  value={withdrawAmountInput}
                  onChange={(e) => setWithdrawAmountInput(e.target.value)}
                  placeholder="0,00"
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm font-extrabold focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-semibold block">Valores Rápidos:</span>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {[50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWithdrawAmountInput(Math.min(amt, savings).toString())}
                      disabled={savings < amt}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-900/50 text-emerald-200 border border-emerald-500/20 text-xs font-bold disabled:opacity-30 transition-colors"
                    >
                      R$ {amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWithdrawAmountInput(savings.toString())}
                    disabled={savings <= 0}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-xs font-bold transition-colors"
                  >
                    Toda a Poupança
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs shadow-lg glow-emerald flex items-center gap-1.5"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Confirmar Resgate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invest Modal (+ Aplicação em CDB Fictício +2%) */}
      {showInvestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-indigo-500/40 space-y-4 shadow-2xl glow-indigo">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Investimento CDB (+2%/mês)</h3>
              </div>
              <button
                onClick={() => setShowInvestModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Digite o valor do seu <strong>Saldo Mensal</strong> (R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) que deseja aplicar no CDB (+2% de rendimento mensal):
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const val = parseFloat(investAmountInput);
                if (isNaN(val) || val <= 0) {
                  setNotification({ message: "Digite um valor válido!", type: "warning" });
                  return;
                }
                if (val > balance) {
                  setNotification({ message: "Saldo mensal insuficiente para esse valor!", type: "warning" });
                  return;
                }
                handleInvestMoney(val);
                setShowInvestModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Valor a aplicar (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balance}
                  value={investAmountInput}
                  onChange={(e) => setInvestAmountInput(e.target.value)}
                  placeholder="0,00"
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm font-extrabold focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-semibold block">Valores Rápidos:</span>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {[100, 200, 300, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setInvestAmountInput(Math.min(amt, balance).toString())}
                      disabled={balance < amt}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-900/50 text-indigo-200 border border-indigo-500/20 text-xs font-bold disabled:opacity-30 transition-colors"
                    >
                      R$ {amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setInvestAmountInput(balance.toString())}
                    disabled={balance <= 0}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-bold transition-colors"
                  >
                    Todo o Saldo
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowInvestModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white font-extrabold text-xs shadow-lg glow-indigo flex items-center gap-1.5"
                >
                  <Percent className="w-4 h-4" />
                  <span>Confirmar Aplicação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
