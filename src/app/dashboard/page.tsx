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
  Zap,
  TrendingUp,
  Award,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  Plane,
  Car,
  Laptop,
  Smile,
  Frown,
  Meh,
  DollarSign,
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
  iconName?: string;
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
const MONTHLY_ALLOWANCE = 2500.0; // Bolsa Auxílio inicial e a cada mês

export default function DashboardPage() {
  const router = useRouter();
  // Game state
  const [currentMonth, setCurrentMonth] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(MONTH_DURATION_SECONDS);
  const [balance, setBalance] = useState<number>(MONTHLY_ALLOWANCE);
  const [savings, setSavings] = useState<number>(0.0);
  const [happinessPoints, setHappinessPoints] = useState<number>(100);
  const [groupName, setGroupName] = useState<string>("Grupo Inovadores FinTech");

  // Load group name from URL query parameter or localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const savedName = localStorage.getItem("finGame_groupName");

      if (token) {
        // Fetch group info from API if token present
        fetch(`/api/groups`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.groups)) {
              const matched = data.groups.find((g: any) => g.qrCodeToken === token);
              if (matched) {
                if (!matched.isStarted) {
                  // Redirect to waiting room if game hasn't started yet
                  router.push(`/waiting-room?token=${token}`);
                  return;
                }
                setGroupName(matched.name);
                setBalance(matched.balance);
                setSavings(matched.savings);
                setHappinessPoints(matched.happinessPoints);
              }
            }
          })
          .catch(() => {});
      } else if (savedName) {
        setGroupName(savedName);
      }
    }
  }, [router]);
  
  // Expenses state
  const [fixedExpenses, setFixedExpenses] = useState<ExpenseItem[]>([
    {
      id: "f1",
      title: "Aluguel & Condomínio",
      cost: 1100.0,
      happinessPoints: 10,
      type: "FIXED",
      category: "Moradia",
      isPaid: false,
      description: "Despesa fixa obrigatória de moradia para o mês.",
    },
    {
      id: "f2",
      title: "Supermercado & Alimentação",
      cost: 650.0,
      happinessPoints: 15,
      type: "FIXED",
      category: "Alimentação",
      isPaid: false,
      description: "Compras essenciais para refeições diárias.",
    },
    {
      id: "f3",
      title: "Contas de Luz, Água & Gás",
      cost: 250.0,
      happinessPoints: 5,
      type: "FIXED",
      category: "Utilidades",
      isPaid: false,
      description: "Serviços essenciais de utilidade pública.",
    },
    {
      id: "f4",
      title: "Internet Fibra + Celular",
      cost: 150.0,
      happinessPoints: 10,
      type: "FIXED",
      category: "Tecnologia",
      isPaid: false,
      description: "Plano de internet rápida para estudos e lazer.",
    },
  ]);

  const [temptations, setTemptations] = useState<ExpenseItem[]>([
    {
      id: "t1",
      title: "Ingresso de Show no Fim de Semana",
      cost: 220.0,
      happinessPoints: 45,
      type: "TEMPTATION",
      category: "Lazer",
      description: "Shows imperdíveis com a galera no sábado à noite!",
    },
    {
      id: "t2",
      title: "Jantar Especial em Restaurante Chique",
      cost: 180.0,
      happinessPoints: 35,
      type: "TEMPTATION",
      category: "Gastronomia",
      description: "Experiência culinária única para relaxar na sexta.",
    },
    {
      id: "t3",
      title: "Fone de Ouvido Noise Cancelling Premium",
      cost: 450.0,
      happinessPoints: 70,
      type: "TEMPTATION",
      category: "Gadgets",
      description: "Foco total nos estudos e música sem ruídos.",
    },
    {
      id: "t4",
      title: "Passeio de Bate-Volta na Praia",
      cost: 150.0,
      happinessPoints: 30,
      type: "TEMPTATION",
      category: "Viagem",
      description: "Sol, mar e recarga de energias com os amigos.",
    },
    {
      id: "t5",
      title: "Assinatura VIP de Plataforma de Games",
      cost: 80.0,
      happinessPoints: 20,
      type: "TEMPTATION",
      category: "Entretenimento",
      description: "Acesso ilimitado aos jogos mais recentes da temporada.",
    },
  ]);

  const [longTermGoals, setLongTermGoals] = useState<ExpenseItem[]>([
    {
      id: "g1",
      title: "Viagem dos Sonhos (Mochilão Europa)",
      cost: 4000.0,
      happinessPoints: 300,
      type: "LONG_TERM_GOAL",
      category: "Sonho de Vida",
      description: "A grande recompensa por economizar e manter foco total!",
    },
    {
      id: "g2",
      title: "Entrada do Carro Próprio",
      cost: 3500.0,
      happinessPoints: 250,
      type: "LONG_TERM_GOAL",
      category: "Patrimônio",
      description: "Conquista da independência de locomoção com seu veículo.",
    },
    {
      id: "g3",
      title: "Fundo de Emergência & Reserva de Investimentos",
      cost: 2000.0,
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

  // Auto notification dismissal
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Real-time 5-minute timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleMonthEnd();
          return MONTH_DURATION_SECONDS;
        }

        // Trigger Unforeseen event at minute 3 (120s remaining = 2 minutes elapsed)
        if (prev === 120 && !activeUnforeseen) {
          triggerUnforeseenEvent();
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentMonth, fixedExpenses, balance, savings]);

  // Trigger Imprevisto at minute 3
  const triggerUnforeseenEvent = () => {
    const events: UnforeseenEvent[] = [
      {
        id: `u-${currentMonth}-1`,
        title: "📱 Tela do Celular Quebrou!",
        description: "Você deixou seu celular cair no chão. Para consertar o display custará dinheiro, ou você terá que ficar incomunicável.",
        costToFix: 350.0,
        penaltyIfNotFixedPoints: 40,
        restoredPointsIfFixed: 10,
        triggeredMonth: currentMonth,
      },
      {
        id: `u-${currentMonth}-2`,
        title: "🦷 Emergência Odontológica",
        description: "Dor de dente súbita no meio da semana! Precisa de consulta de urgência e medicação.",
        costToFix: 280.0,
        penaltyIfNotFixedPoints: 35,
        restoredPointsIfFixed: 5,
        triggeredMonth: currentMonth,
      },
      {
        id: `u-${currentMonth}-3`,
        title: "💻 Notebook da Faculdade Travou",
        description: "Falha na memória RAM antes de entregar um trabalho vital. Reparo urgente necessário.",
        costToFix: 400.0,
        penaltyIfNotFixedPoints: 50,
        restoredPointsIfFixed: 15,
        triggeredMonth: currentMonth,
      },
    ];

    const selected = events[(currentMonth - 1) % events.length];
    if (!resolvedUnforeseens.includes(selected.id)) {
      setActiveUnforeseen(selected);
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

  // Turn of month logic
  const handleMonthEnd = () => {
    // Check unpaid fixed expenses
    const unpaidFixed = fixedExpenses.filter((e) => !e.isPaid);
    let penalty = 0;

    // Carried over unpaid expenses with 8% interest added
    const carriedOverExpenses: ExpenseItem[] = unpaidFixed.map((e, idx) => {
      const alreadyOverdue = e.title.includes("⚠️ Atrasado");
      const titleClean = alreadyOverdue ? e.title : `${e.title} ⚠️ (Atrasado +8% Juros)`;
      const newCost = Math.round(e.cost * 1.08 * 100) / 100;
      return {
        ...e,
        id: `overdue-${currentMonth}-${idx}-${Date.now()}`,
        title: titleClean,
        cost: newCost,
        isPaid: false,
        description: `Despesa acumulada não paga no mês anterior com 8% de juros inclusos.`,
      };
    });

    if (unpaidFixed.length > 0) {
      penalty = 50;
      setHappinessPoints((prev) => Math.max(0, prev - penalty));
      setNotification({
        message: `Fim do Mês ${currentMonth}: Penalidade -50 pts! ${unpaidFixed.length} despesa(s) não paga(s) acumularam +8% de juros e foram transferidas para o Mês ${currentMonth + 1}.`,
        type: "error",
      });
    } else {
      setNotification({
        message: `Mês ${currentMonth} encerrado com sucesso! Sobra transferida para a Poupança. +Bolsa Auxílio recebida!`,
        type: "success",
      });
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

      // Default base fixed expenses for the new month
      const baseNewMonthExpenses: ExpenseItem[] = [
        {
          id: `f1-m${nextMonth}`,
          title: "Aluguel & Condomínio",
          cost: 1100.0,
          happinessPoints: 10,
          type: "FIXED",
          category: "Moradia",
          isPaid: false,
          description: "Despesa fixa obrigatória de moradia para o mês.",
        },
        {
          id: `f2-m${nextMonth}`,
          title: "Supermercado & Alimentação",
          cost: 650.0,
          happinessPoints: 15,
          type: "FIXED",
          category: "Alimentação",
          isPaid: false,
          description: "Compras essenciais para refeições diárias.",
        },
        {
          id: `f3-m${nextMonth}`,
          title: "Contas de Luz, Água & Gás",
          cost: 250.0,
          happinessPoints: 5,
          type: "FIXED",
          category: "Utilidades",
          isPaid: false,
          description: "Serviços essenciais de utilidade pública.",
        },
        {
          id: `f4-m${nextMonth}`,
          title: "Internet Fibra + Celular",
          cost: 150.0,
          happinessPoints: 10,
          type: "FIXED",
          category: "Tecnologia",
          isPaid: false,
          description: "Plano de internet rápida para estudos e lazer.",
        },
      ];

      // Combine: carried over unpaid items (with 8% juros) + new month base expenses
      setFixedExpenses([...carriedOverExpenses, ...baseNewMonthExpenses]);
      setActiveUnforeseen(null);

      syncGroupMetrics(newBalance, newSavings, Math.max(0, happinessPoints - penalty), nextMonth);
    } else {
      setNotification({
        message: "🎉 PARABÉNS! Você chegou ao Mês Final! Use a sua Poupança para comprar as Metas de Longo Prazo!",
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

  // Action: Buy Temptation
  const handleBuyTemptation = (item: ExpenseItem) => {
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

    syncGroupMetrics(payment.newBalance, payment.newSavings, newPoints, currentMonth);

    const savingsMsg = payment.usedSavings > 0
      ? ` (R$ ${payment.usedSavings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} retirados da Poupança)`
      : "";

    setNotification({
      message: `Comprou "${item.title}"! +${item.happinessPoints} Pontos de Felicidade!${savingsMsg}`,
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

  // Calculate percentage of timer
  const timerPercentage = ((MONTH_DURATION_SECONDS - timeLeft) / MONTH_DURATION_SECONDS) * 100;
  
  // Calculate total unpaid fixed cost
  const unpaidTotalCost = fixedExpenses
    .filter((e) => !e.isPaid)
    .reduce((sum, e) => sum + e.cost, 0);

  // Helper for Happiness mood icon & status
  const getHappinessState = (pts: number) => {
    if (pts >= 180) return { label: "Radiante", icon: Smile, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    if (pts >= 100) return { label: "Equilibrado", icon: Meh, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    return { label: "Estressado", icon: Frown, color: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
  };

  const happyState = getHappinessState(happinessPoints);
  const MoodIcon = happyState.icon;

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
                <span>Sala Conectada • {currentMonth === TOTAL_MONTHS ? "Mês Final!" : `Mês ${currentMonth} de ${TOTAL_MONTHS}`}</span>
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
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Monthly Balance */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saldo Disponível (Mês)</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
              <span>Capital Total Disponível:</span>
              <span className="font-bold text-emerald-300">
                R$ {(balance + savings).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card 2: Accumulated Savings */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Poupança Acumulada</span>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <PiggyBank className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-purple-300 tracking-tight">
              R$ {savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5 gap-2">
              <button
                onClick={() => handleDepositToSavings(Math.min(balance, 500))}
                disabled={balance <= 0}
                className="px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 font-semibold text-[11px] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Transferir até R$500 do saldo para a poupança"
              >
                + Guardar Saldo
              </button>
              <button
                onClick={() => handleWithdrawFromSavings(Math.min(savings, 500))}
                disabled={savings <= 0}
                className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-200 font-semibold text-[11px] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Resgatar até R$500 da poupança para o saldo"
              >
                - Resgatar R$500
              </button>
            </div>
          </div>

          {/* Card 3: Happiness Points Score */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pontos de Felicidade</span>
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Heart className="w-5 h-5 fill-amber-400/20" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-300 tracking-tight">{happinessPoints}</span>
              <span className="text-xs text-amber-400 font-semibold">pts acumulados</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-white/5">
              <span className="text-slate-400">Estado Emocional:</span>
              <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold ${happyState.color}`}>
                <MoodIcon className="w-3.5 h-3.5" />
                <span>{happyState.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Final Month Goals Section (Visible when in final month or when savings > 0) */}
        {currentMonth === TOTAL_MONTHS && (
          <section className="glass-panel p-6 rounded-2xl border-2 border-purple-500/40 glow-purple bg-gradient-to-b from-purple-950/20 to-slate-900/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-purple-500/20">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-bold text-white">Loja de Metas de Longo Prazo (Mês Final)</h2>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Use o saldo acumulado da sua <strong className="text-purple-300">Poupança</strong> para comprar conquistas e alavancar seus Pontos de Felicidade no ranking final!
                </p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-sm">
                Saldo Poupança: R$ {savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
                    <p className="text-xs text-slate-400">Obrigatórias para evitar penalidade (-50 pts e +8% juros)</p>
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
                          Status: {expense.isPaid ? "✅ Pago" : expense.title.includes("⚠️ Atrasado") ? "⚠️ Atrasado (+8% Juros)" : "⏳ Pendente"}
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

          {/* Right Column: Temptation Feed (Feed de Tentações) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Feed de Tentações de Gastos</h2>
                    <p className="text-xs text-slate-400">Gaste seu dinheiro para alavancar Pontos de Felicidade!</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                  Opcional
                </span>
              </div>

              {/* Grid of Temptation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {temptations.map((item) => {
                  const totalFunds = balance + savings;
                  const canPay = totalFunds >= item.cost;
                  const usesSavings = balance < item.cost && canPay;

                  return (
                    <div
                      key={item.id}
                      className="glass-panel-interactive p-4 rounded-xl border border-white/10 flex flex-col justify-between"
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
                            canPay
                              ? usesSavings
                                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-md glow-purple"
                                : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-md glow-amber"
                              : "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{usesSavings ? "Comprar c/ Poupança" : "Comprar"}</span>
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

      {/* Unforeseen Event Modal (Modal de Imprevisto - Appears automatically at Minute 3) */}
      {activeUnforeseen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass-panel max-w-lg w-full p-6 rounded-2xl border-2 border-rose-500/50 glow-rose bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl relative">
            <div className="absolute top-4 right-4 p-2 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-extrabold uppercase tracking-wider mb-3">
              ⚡ Alerta de Imprevisto no Mês {currentMonth}
            </div>

            <h2 className="text-xl font-black text-white mb-2">{activeUnforeseen.title}</h2>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              {activeUnforeseen.description}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6 p-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs">
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
                <span className="text-slate-400 block mb-1">Se Recusar/Ignorar:</span>
                <strong className="text-rose-400 text-base font-extrabold">
                  -{activeUnforeseen.penaltyIfNotFixedPoints} Pontos
                </strong>
                <span className="text-[10px] text-rose-300 block mt-1">Penalidade imediata de Felicidade</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
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
    </div>
  );
}
