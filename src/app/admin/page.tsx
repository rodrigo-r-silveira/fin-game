"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Play,
  FastForward,
  Zap,
  Users,
  ArrowLeft,
  Trophy,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  LogOut,
  Sparkles,
  FileText,
  History,
  Edit3,
  Save,
  Plus,
  Settings,
  Shield,
  Layers,
  Clock,
  Wallet,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface GameSessionItem {
  id: string;
  code: string;
  title: string;
  facilitatorId?: string | null;
  status: "WAITING" | "RUNNING" | "FINISHED" | "ARCHIVED";
  currentMonth: number;
  monthDurationSeconds: number;
  totalMonths: number;
  monthlyAllowance: number;
  unforeseenMinPercent?: number;
  unforeseenMaxPercent?: number;
  monthStartedAt?: string | null;
  unforeseenTriggeredAt?: string | null;
  isStarted: boolean;
  isGameFinished: boolean;
  createdAt: string;
  _count?: {
    groups: number;
  };
  facilitator?: {
    name: string;
    username: string;
  };
}

interface GroupItem {
  id: string;
  sessionId?: string | null;
  name: string;
  qrCodeToken: string;
  balance: number;
  savings: number;
  investments?: number;
  happinessPoints: number;
  currentMonth: number;
  isStarted: boolean;
  isRPGConfirmed?: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Sessions state
  const [sessions, setSessions] = useState<GameSessionItem[]>([]);
  const [selectedSession, setSelectedSession] = useState<GameSessionItem | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Active Session Game State
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Host URL & Modals
  const [baseUrl, setBaseUrl] = useState("https://fin-game-umber.vercel.app");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New / Edit Session Form state
  const [formSessionTitle, setFormSessionTitle] = useState("");
  const [formSessionCode, setFormSessionCode] = useState("");
  const [formMonthDuration, setFormMonthDuration] = useState<number>(120); // 2 min
  const [formTotalMonths, setFormTotalMonths] = useState<number>(7);
  const [formAllowance, setFormAllowance] = useState<number>(1560.0);
  const [formUnforeseenMinPercent, setFormUnforeseenMinPercent] = useState<number>(35);
  const [formUnforeseenMaxPercent, setFormUnforeseenMaxPercent] = useState<number>(65);
  const [submittingSession, setSubmittingSession] = useState(false);

  // Audit Logs State
  const [selectedGroupForLogs, setSelectedGroupForLogs] = useState<GroupItem | null>(null);
  const [groupLogs, setGroupLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [editingScoreGroupId, setEditingScoreGroupId] = useState<string | null>(null);
  const [newScoreInput, setNewScoreInput] = useState<string>("");

  // Live Timer Tick
  const [timeLeft, setTimeLeft] = useState<number>(120);

  // Auto-detect domain
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  // 1. Check session authentication
  useEffect(() => {
    fetch("/api/admin/check")
      .then((res) => res.json())
      .then((data) => {
        if (!data.isAuthenticated) {
          router.push("/admin/login");
        } else {
          setCurrentUser(data.user);
          setAuthChecked(true);
          fetchSessions();
        }
      })
      .catch(() => {
        router.push("/admin/login");
      });
  }, [router]);

  // 2. Fetch Sessions for current user
  const fetchSessions = async (autoSelectId?: string) => {
    try {
      setLoadingSessions(true);
      const res = await fetch("/api/sessions");
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        if (data.sessions.length > 0) {
          const toSelect = autoSelectId
            ? data.sessions.find((s: any) => s.id === autoSelectId)
            : selectedSession
            ? data.sessions.find((s: any) => s.id === selectedSession.id) || data.sessions[0]
            : data.sessions[0];
          setSelectedSession(toSelect || data.sessions[0]);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar partidas:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // 3. Fetch Groups of currently selected session
  const fetchGroups = async () => {
    if (!selectedSession) return;
    try {
      const res = await fetch(`/api/groups?sessionId=${selectedSession.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setGroups(data.groups);
        if (data.session) {
          setSelectedSession((prev) => (prev ? { ...prev, ...data.session } : data.session));
        }
      }
    } catch (err) {
      console.error("Erro ao buscar grupos da partida:", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Switch session effect
  useEffect(() => {
    if (selectedSession) {
      setLoadingGroups(true);
      fetchGroups();
      setTimeLeft(selectedSession.monthDurationSeconds || 120);
    }
  }, [selectedSession?.id]);

  // Real-time polling & channel listener
  useEffect(() => {
    if (!authChecked || !selectedSession) return;
    fetchGroups();
    const interval = setInterval(fetchGroups, 3000);

    let channel: any = null;
    let supabase: any = null;
    try {
      supabase = createClient();
      if (supabase) {
        channel = supabase
          .channel(`realtime-session-${selectedSession.id}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "Group" },
            () => {
              fetchGroups();
            }
          )
          .subscribe();
      }
    } catch (err) {
      console.warn("Supabase Realtime subscription error:", err);
    }

    return () => {
      clearInterval(interval);
      if (supabase && channel) {
        try {
          supabase.removeChannel(channel);
        } catch (_) {}
      }
    };
  }, [authChecked, selectedSession?.id]);

  // Live Timer Tick based on session's monthStartedAt and monthDurationSeconds
  useEffect(() => {
    if (!selectedSession || !selectedSession.isStarted || selectedSession.isGameFinished) return;

    const duration = selectedSession.monthDurationSeconds || 120;
    const startedAt = selectedSession.monthStartedAt;

    if (!startedAt) {
      setTimeLeft(duration);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      setTimeLeft(Math.max(0, duration - elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedSession?.isStarted, selectedSession?.monthStartedAt, selectedSession?.monthDurationSeconds, selectedSession?.isGameFinished]);

  // Full registration URL encoded in QR Code
  const registerUrl = selectedSession
    ? `${baseUrl}/register-group?session=${selectedSession.code}`
    : `${baseUrl}/register-group`;

  // Start game for selected session
  const handleStartGame = async () => {
    if (!selectedSession) return;
    try {
      const res = await fetch("/api/groups/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSession.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedSession((prev) => prev ? { ...prev, isStarted: true, status: "RUNNING", monthStartedAt: data.monthStartedAt } : null);
        fetchGroups();
        fetchSessions();
        setLastAction(`🚀 Partida "${selectedSession.title}" iniciada! Participantes liberados da Sala de Espera.`);
      } else {
        alert(`Erro ao iniciar partida: ${data.error}`);
      }
    } catch (err) {
      alert("Erro de conexão ao iniciar partida.");
    }
  };

  // Advance Month for selected session
  const handleNextMonth = async () => {
    if (!selectedSession) return;
    try {
      const res = await fetch("/api/groups/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSession.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedSession((prev) => prev ? { ...prev, currentMonth: data.currentMonth, monthStartedAt: data.monthStartedAt } : null);
        fetchGroups();
        fetchSessions();
        setLastAction(`⏩ Mês avançado para Mês ${data.currentMonth}!`);
      } else {
        alert(`Erro ao avançar mês: ${data.error}`);
      }
    } catch (err) {
      alert("Erro de conexão ao avançar mês.");
    }
  };

  // Trigger Imprevisto for selected session
  const handleTriggerImprevisto = async () => {
    if (!selectedSession) return;
    try {
      const res = await fetch("/api/groups/trigger-unforeseen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSession.id }),
      });
      const data = await res.json();
      if (data.success) {
        setLastAction(`⚡ Imprevisto disparado ao vivo para todos os ${groups.length} grupos da sala!`);
      } else {
        alert(`Erro ao disparar imprevisto: ${data.error}`);
      }
    } catch (err) {
      alert("Erro de conexão ao disparar imprevisto.");
    }
  };

  // Finish game for selected session
  const handleFinishGame = async () => {
    if (!selectedSession) return;
    if (!confirm(`🏁 Deseja realmente finalizar a partida "${selectedSession.title}" e consolidar o Ranking Final? Todos os dados históricos serão salvos permanentemente!`)) return;

    try {
      const res = await fetch("/api/groups/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSession.id }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/final-ranking?sessionId=${selectedSession.id}`);
      } else {
        alert(`Erro ao finalizar jogo: ${data.error}`);
      }
    } catch (err) {
      alert("Erro de conexão ao finalizar jogo.");
    }
  };

  // Open Create New Session Modal
  const handleOpenNewSessionModal = () => {
    const nextNum = sessions.length + 1;
    setFormSessionTitle(`Turma ${nextNum} - ${new Date().toLocaleDateString("pt-BR")}`);
    setFormSessionCode("");
    setFormMonthDuration(120);
    setFormTotalMonths(7);
    setFormAllowance(1560.0);
    setFormUnforeseenMinPercent(35);
    setFormUnforeseenMaxPercent(65);
    setShowNewSessionModal(true);
  };

  // Submit Create New Session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSessionTitle.trim()) {
      alert("Digite o nome da partida/turma.");
      return;
    }

    setSubmittingSession(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formSessionTitle,
          code: formSessionCode.trim() ? formSessionCode.trim().toUpperCase() : undefined,
          monthDurationSeconds: formMonthDuration,
          totalMonths: formTotalMonths,
          monthlyAllowance: formAllowance,
          unforeseenMinPercent: formUnforeseenMinPercent,
          unforeseenMaxPercent: formUnforeseenMaxPercent,
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        setShowNewSessionModal(false);
        setLastAction(`✨ Nova partida "${data.session.title}" (Código: ${data.session.code}) criada com sucesso!`);
        await fetchSessions(data.session.id);
      } else {
        alert(`Erro ao criar partida: ${data.error}`);
      }
    } catch (_) {
      alert("Erro de conexão ao criar partida.");
    } finally {
      setSubmittingSession(false);
    }
  };

  // Open Edit Session Modal
  const handleOpenEditSessionModal = () => {
    if (!selectedSession) return;
    setFormSessionTitle(selectedSession.title);
    setFormMonthDuration(selectedSession.monthDurationSeconds || 120);
    setFormTotalMonths(selectedSession.totalMonths || 7);
    setFormAllowance(selectedSession.monthlyAllowance || 1560.0);
    setFormUnforeseenMinPercent(selectedSession.unforeseenMinPercent || 35);
    setFormUnforeseenMaxPercent(selectedSession.unforeseenMaxPercent || 65);
    setShowEditSessionModal(true);
  };

  // Submit Edit Session
  const handleEditSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;

    setSubmittingSession(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedSession.id,
          title: formSessionTitle,
          monthDurationSeconds: formMonthDuration,
          totalMonths: formTotalMonths,
          monthlyAllowance: formAllowance,
          unforeseenMinPercent: formUnforeseenMinPercent,
          unforeseenMaxPercent: formUnforeseenMaxPercent,
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        setSelectedSession(data.session);
        setShowEditSessionModal(false);
        setLastAction(`⚙️ Configurações da partida "${data.session.title}" atualizadas com sucesso!`);
        fetchSessions();
      } else {
        alert(`Erro ao atualizar partida: ${data.error}`);
      }
    } catch (_) {
      alert("Erro de conexão ao atualizar partida.");
    } finally {
      setSubmittingSession(false);
    }
  };

  // Delete Group
  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover o grupo "${name}" desta partida?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/groups?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setGroups((prev) => prev.filter((g) => g.id !== id));
        setLastAction(`🗑️ Grupo "${name}" removido.`);
      } else {
        alert(`Erro ao excluir: ${data.error}`);
      }
    } catch (_) {
      alert("Erro de conexão.");
    } finally {
      setDeletingId(null);
    }
  };

  // Open Audit Logs Modal
  const handleOpenGroupLogs = async (group: GroupItem) => {
    setSelectedGroupForLogs(group);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/logs?token=${group.qrCodeToken}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setGroupLogs(data.logs);
      } else {
        setGroupLogs([]);
      }
    } catch (_) {
      setGroupLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Score Adjustment
  const handleSaveScoreAdjustment = async (group: GroupItem) => {
    const pts = parseInt(newScoreInput, 10);
    if (isNaN(pts)) {
      alert("Informe um número válido para a nova pontuação.");
      return;
    }

    try {
      const res = await fetch("/api/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCodeToken: group.qrCodeToken,
          happinessPoints: pts,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingScoreGroupId(null);
        setNewScoreInput("");
        fetchGroups();
        setLastAction(`✏️ Pontuação de "${group.name}" ajustada para ${pts} pts.`);
      }
    } catch (_) {}
  };

  // Admin Logout
  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  };

  const copyRegistrationUrl = () => {
    navigator.clipboard.writeText(registerUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-slate-100 bg-slate-950">
        <div className="flex items-center gap-3 text-sm text-slate-400 font-semibold">
          <span className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></span>
          <span>Carregando painel administrativo...</span>
        </div>
      </div>
    );
  }

  const isGameStarted = selectedSession?.isStarted || false;
  const isGameFinished = selectedSession?.isGameFinished || false;
  const currentMonthNum = selectedSession?.currentMonth || 0;
  const totalMonthsNum = selectedSession?.totalMonths || 7;

  return (
    <div className="min-h-screen p-4 sm:p-6 text-slate-100 max-w-7xl mx-auto space-y-6 selection:bg-emerald-500/20">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel text-xs font-semibold text-slate-300 hover:text-white border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Página Inicial</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-black uppercase tracking-wider">
              {currentUser?.role === "SUPER_ADMIN" ? "Super Administrador" : "Facilitador"}
            </span>
            <span className="text-xs text-white font-bold">Olá, {currentUser?.name}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentUser?.role === "SUPER_ADMIN" && (
            <Link
              href="/admin/users"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-bold text-xs shadow-lg transition-all"
            >
              <Users className="w-4 h-4 text-purple-300" />
              <span>Gestão de Usuários</span>
            </Link>
          )}

          <Link
            href="/admin/catalog"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 font-bold text-xs shadow-lg transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-300" />
            <span>Meu Catálogo & Imprevistos</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs transition-colors"
            title="Sair da Conta"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* MATCH / SESSION SELECTOR & MANAGEMENT BAR */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-purple-500/30 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>Seletor de Partida / Sala Ativa</span>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedSession?.id || ""}
                onChange={(e) => {
                  const target = sessions.find((s) => s.id === e.target.value);
                  if (target) setSelectedSession(target);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-purple-500/40 text-white font-extrabold text-sm focus:outline-none focus:border-purple-400"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.code}) - {s.isGameFinished ? "🏁 Finalizada" : s.isStarted ? "▶️ Em Andamento" : "⏳ Sala de Espera"}
                  </option>
                ))}
              </select>

              <button
                onClick={handleOpenNewSessionModal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg glow-purple transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Partida</span>
              </button>
            </div>
          </div>

          {selectedSession && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">Tempo/Mês:</span>
                <strong className="text-white">{Math.round((selectedSession.monthDurationSeconds || 120) / 60)} min ({selectedSession.monthDurationSeconds}s)</strong>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400">Meses:</span>
                <strong className="text-white">{selectedSession.totalMonths || 7} Meses</strong>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Bolsa:</span>
                <strong className="text-emerald-300">R$ {(selectedSession.monthlyAllowance || 1560).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
              </div>

              <button
                onClick={handleOpenEditSessionModal}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
                title="Editar Parâmetros da Partida"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedSession && (
        <>
          {/* ROOM CODE & PARTICIPANT INVITE CARD */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <Wifi className="w-3.5 h-3.5 animate-pulse" />
                  <span>Código de Entrada da Turma</span>
                </div>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-wider font-mono px-4 py-1.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 shadow-inner">
                    {selectedSession.code}
                  </div>
                  <span className="text-xs text-slate-400 max-w-xs">
                    Compartilhe este código ou projete o QR Code para os participantes cadastrarem seus personagens!
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
                  <button
                    onClick={copyRegistrationUrl}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-200 hover:text-white font-medium text-xs transition-colors"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    <span>{copiedLink ? "Link Copiado!" : "Copiar Link Direto"}</span>
                  </button>

                  <button
                    onClick={() => setShowQrModal(true)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg glow-emerald transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Abrir QR Code em Tela Cheia</span>
                  </button>

                  <a
                    href={registerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Testar Cadastro</span>
                  </a>
                </div>
              </div>

              {/* QR Code Preview */}
              <div
                onClick={() => setShowQrModal(true)}
                className="cursor-pointer bg-white p-3.5 rounded-2xl shadow-xl hover:scale-105 transition-transform shrink-0"
                title="Clique para expandir o QR Code"
              >
                <QRCodeSVG value={registerUrl} size={110} level="M" />
              </div>
            </div>
          </div>

          {/* FACILITATOR GAME CONTROL PANEL */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-black text-white">Painel de Controle da Partida</h2>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isGameFinished
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : isGameStarted
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                }`}
              >
                {isGameFinished
                  ? "🏁 Partida Finalizada (Histórico Preservado)"
                  : isGameStarted
                  ? `▶️ Em Andamento (Mês ${currentMonthNum} de ${totalMonthsNum})`
                  : "⏳ Aguardando Cadastro na Sala de Espera"}
              </span>
            </div>

            {/* Live Countdown Bar */}
            {isGameStarted && !isGameFinished && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Cronômetro Global do Mês {currentMonthNum} (Sincronizado):</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-lg bg-amber-950/90 border border-amber-500/50 font-mono font-extrabold text-sm text-amber-300 shadow-lg">
                  {`${Math.floor(timeLeft / 60).toString().padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`}
                </div>
              </div>
            )}

            {lastAction && (
              <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lastAction}</span>
              </div>
            )}

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleStartGame}
                disabled={isGameStarted || groups.length === 0}
                className={`p-4 rounded-2xl border font-bold text-left transition-all flex flex-col justify-between h-28 ${
                  !isGameStarted && groups.length > 0
                    ? "bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white border-emerald-500/40 shadow-xl glow-emerald"
                    : "bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Play className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-bold">Passo 1</span>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold">Dar Início à Atividade</div>
                  <div className="text-[11px] opacity-80 font-normal">Libera participantes da Sala de Espera</div>
                </div>
              </button>

              <button
                onClick={handleNextMonth}
                disabled={!isGameStarted || isGameFinished || currentMonthNum >= totalMonthsNum}
                className={`p-4 rounded-2xl border font-bold text-left transition-all flex flex-col justify-between h-28 ${
                  isGameStarted && !isGameFinished && currentMonthNum < totalMonthsNum
                    ? "bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white border-purple-500/40 shadow-xl glow-purple"
                    : "bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between">
                  <FastForward className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-bold">Mês {currentMonthNum + 1} de {totalMonthsNum}</span>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold">Avançar Mês</div>
                  <div className="text-[11px] opacity-80 font-normal">Transição de saldo & rendimento CDB</div>
                </div>
              </button>

              <button
                onClick={handleTriggerImprevisto}
                disabled={!isGameStarted || isGameFinished}
                className={`p-4 rounded-2xl border font-bold text-left transition-all flex flex-col justify-between h-28 ${
                  isGameStarted && !isGameFinished
                    ? "bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white border-amber-500/40 shadow-xl glow-amber"
                    : "bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Zap className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-bold">Alerta Surpresa</span>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold">Disparar Imprevisto</div>
                  <div className="text-[11px] opacity-80 font-normal">Alerta surpresa ao vivo na tela</div>
                </div>
              </button>

              <button
                onClick={handleFinishGame}
                disabled={!isGameStarted}
                className={`p-4 rounded-2xl border font-bold text-left transition-all flex flex-col justify-between h-28 col-span-1 sm:col-span-3 ${
                  isGameStarted
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 hover:from-emerald-500 hover:to-indigo-600 text-white border-emerald-500/40 shadow-xl glow-emerald"
                    : "bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Trophy className="w-5 h-5 text-amber-300" />
                  <span className="text-[10px] uppercase font-bold text-amber-300">
                    {isGameFinished ? "Ver Ranking Final" : "Encerramento Oficial"}
                  </span>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold">
                    {isGameFinished ? "🏆 Visualizar Pódio & Ranking Final desta Partida" : "🏁 Finalizar Partida e Exibir Ranking Final"}
                  </div>
                  <div className="text-[11px] opacity-80 font-normal">
                    {isGameFinished ? "Acesse o ranking consolidado a qualquer momento." : "Consolida os bônus finais de CDB e exibe o pódio oficial aos participantes."}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* REAL-TIME CONNECTED GROUPS MONITOR */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Grupos Cadastrados nesta Partida</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  {groups.length} {groups.length === 1 ? "Grupo Conectado" : "Grupos Conectados"}
                </span>

                <button
                  onClick={fetchGroups}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Atualizar Lista"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {loadingGroups ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                <span className="text-xs">Carregando grupos conectados...</span>
              </div>
            ) : groups.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold">Nenhum grupo cadastrado nesta partida ainda.</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Compartilhe o código <strong>{selectedSession.code}</strong> ou projete o QR Code para que os participantes entrem na sala de espera.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-wrap items-center justify-between gap-3 hover:border-purple-500/40 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-white text-sm">{g.name}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-purple-300 border border-purple-500/20">
                          {g.qrCodeToken}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span>Saldo: <strong className="text-emerald-300">R$ {g.balance.toFixed(2)}</strong></span>
                        <span>Poupança: <strong className="text-purple-300">R$ {g.savings.toFixed(2)}</strong></span>
                        {g.investments !== undefined && (
                          <span>CDB: <strong className="text-indigo-300">R$ {g.investments.toFixed(2)}</strong></span>
                        )}
                        <span>Felicidade: <strong className="text-amber-300">{g.happinessPoints} pts</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenGroupLogs(g)}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold transition-colors flex items-center gap-1.5"
                        title="Ver Histórico de Auditoria"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Logs</span>
                      </button>

                      <button
                        onClick={() => handleDeleteGroup(g.id, g.name)}
                        disabled={deletingId === g.id}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-colors"
                        title="Remover Grupo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL: CREATE NEW GAME SESSION */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Plus className="w-5 h-5" />
                <span>Nova Partida</span>
              </div>
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/5"
              >
                ✕
              </button>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Criar Nova Turma / Partida</h2>
              <p className="text-xs text-slate-400 mt-1">
                Uma nova sala independente será criada sem alterar nem apagar os grupos e históricos de partidas anteriores.
              </p>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nome da Partida / Turma *</label>
                <input
                  type="text"
                  placeholder="ex: Turma A - Estagiários 2026"
                  value={formSessionTitle}
                  onChange={(e) => setFormSessionTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Código da Sala (Opcional)</label>
                <input
                  type="text"
                  placeholder="Deixe em branco para gerar automático (ex: FIN-ABCD)"
                  value={formSessionCode}
                  onChange={(e) => setFormSessionCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Duração do Mês</label>
                  <select
                    value={formMonthDuration}
                    onChange={(e) => setFormMonthDuration(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-500 focus:outline-none font-medium"
                  >
                    <option value={60}>1 Minuto (60s)</option>
                    <option value={120}>2 Minutos (120s)</option>
                    <option value={180}>3 Minutos (180s)</option>
                    <option value={240}>4 Minutos (240s)</option>
                    <option value={300}>5 Minutos (300s)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Quantidade de Meses</label>
                  <select
                    value={formTotalMonths}
                    onChange={(e) => setFormTotalMonths(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-500 focus:outline-none font-medium"
                  >
                    <option value={6}>6 Meses</option>
                    <option value={7}>7 Meses (Padrão)</option>
                    <option value={8}>8 Meses</option>
                    <option value={10}>10 Meses</option>
                    <option value={12}>12 Meses</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Valor da Bolsa Auxílio Inicial (R$)</label>
                <input
                  type="number"
                  step="10"
                  value={formAllowance}
                  onChange={(e) => setFormAllowance(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-emerald-300 font-extrabold text-xs focus:border-purple-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  ⚡ Intervalo da Mensagem Relâmpago (Imprevisto)
                </label>
                <select
                  value={`${formUnforeseenMinPercent}-${formUnforeseenMaxPercent}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "custom") {
                      const [minStr, maxStr] = val.split("-");
                      setFormUnforeseenMinPercent(Number(minStr));
                      setFormUnforeseenMaxPercent(Number(maxStr));
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-amber-300 font-semibold text-xs focus:border-purple-500 focus:outline-none"
                >
                  <option value="35-65">Meio do Mês (35% a 65% do tempo - Padrão)</option>
                  <option value="15-40">Início do Mês (15% a 40% do tempo)</option>
                  <option value="60-85">Final do Mês (60% a 85% do tempo)</option>
                  <option value="10-90">Qualquer Momento (10% a 90% do tempo)</option>
                  <option value="custom">Personalizado (Escolher Min e Max em %)</option>
                </select>

                {(!["35-65", "15-40", "60-85", "10-90"].includes(`${formUnforeseenMinPercent}-${formUnforeseenMaxPercent}`)) && (
                  <div className="grid grid-cols-2 gap-3 mt-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Mínimo do Mês (%)</label>
                      <input
                        type="number"
                        min={5}
                        max={formUnforeseenMaxPercent - 5}
                        value={formUnforeseenMinPercent}
                        onChange={(e) => setFormUnforeseenMinPercent(Math.max(5, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-amber-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Máximo do Mês (%)</label>
                      <input
                        type="number"
                        min={formUnforeseenMinPercent + 5}
                        max={95}
                        value={formUnforeseenMaxPercent}
                        onChange={(e) => setFormUnforeseenMaxPercent(Math.min(95, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-amber-300 font-mono"
                      />
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  💡 A mensagem surgirá aleatoriamente entre{" "}
                  <strong className="text-amber-300">
                    {Math.floor(formMonthDuration * (formUnforeseenMinPercent / 100))}s
                  </strong>{" "}
                  e{" "}
                  <strong className="text-amber-300">
                    {Math.floor(formMonthDuration * (formUnforeseenMaxPercent / 100))}s
                  </strong>{" "}
                  decorridos de cada mês.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingSession}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg glow-purple transition-all"
                >
                  {submittingSession ? "Criando..." : "Criar e Ativar Partida"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ACTIVE SESSION PARAMS */}
      {showEditSessionModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Settings className="w-5 h-5" />
                <span>Configurar Parâmetros da Partida</span>
              </div>
              <button
                onClick={() => setShowEditSessionModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSession} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Título da Partida</label>
                <input
                  type="text"
                  value={formSessionTitle}
                  onChange={(e) => setFormSessionTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-500 focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Duração do Mês</label>
                  <select
                    value={formMonthDuration}
                    onChange={(e) => setFormMonthDuration(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-500 focus:outline-none"
                  >
                    <option value={60}>1 Minuto (60s)</option>
                    <option value={120}>2 Minutos (120s)</option>
                    <option value={180}>3 Minutos (180s)</option>
                    <option value={240}>4 Minutos (240s)</option>
                    <option value={300}>5 Minutos (300s)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Qtd de Meses</label>
                  <select
                    value={formTotalMonths}
                    onChange={(e) => setFormTotalMonths(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-500 focus:outline-none"
                  >
                    <option value={6}>6 Meses</option>
                    <option value={7}>7 Meses (Padrão)</option>
                    <option value={8}>8 Meses</option>
                    <option value={10}>10 Meses</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Valor da Bolsa Auxílio (R$)</label>
                <input
                  type="number"
                  step="10"
                  value={formAllowance}
                  onChange={(e) => setFormAllowance(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-emerald-300 font-extrabold text-xs focus:border-purple-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  ⚡ Intervalo da Mensagem Relâmpago (Imprevisto)
                </label>
                <select
                  value={`${formUnforeseenMinPercent}-${formUnforeseenMaxPercent}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "custom") {
                      const [minStr, maxStr] = val.split("-");
                      setFormUnforeseenMinPercent(Number(minStr));
                      setFormUnforeseenMaxPercent(Number(maxStr));
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-amber-300 font-semibold text-xs focus:border-purple-500 focus:outline-none"
                >
                  <option value="35-65">Meio do Mês (35% a 65% do tempo - Padrão)</option>
                  <option value="15-40">Início do Mês (15% a 40% do tempo)</option>
                  <option value="60-85">Final do Mês (60% a 85% do tempo)</option>
                  <option value="10-90">Qualquer Momento (10% a 90% do tempo)</option>
                  <option value="custom">Personalizado (Escolher Min e Max em %)</option>
                </select>

                {(!["35-65", "15-40", "60-85", "10-90"].includes(`${formUnforeseenMinPercent}-${formUnforeseenMaxPercent}`)) && (
                  <div className="grid grid-cols-2 gap-3 mt-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Mínimo do Mês (%)</label>
                      <input
                        type="number"
                        min={5}
                        max={formUnforeseenMaxPercent - 5}
                        value={formUnforeseenMinPercent}
                        onChange={(e) => setFormUnforeseenMinPercent(Math.max(5, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-amber-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Máximo do Mês (%)</label>
                      <input
                        type="number"
                        min={formUnforeseenMinPercent + 5}
                        max={95}
                        value={formUnforeseenMaxPercent}
                        onChange={(e) => setFormUnforeseenMaxPercent(Math.min(95, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-amber-300 font-mono"
                      />
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  💡 A mensagem surgirá aleatoriamente entre{" "}
                  <strong className="text-amber-300">
                    {Math.floor(formMonthDuration * (formUnforeseenMinPercent / 100))}s
                  </strong>{" "}
                  e{" "}
                  <strong className="text-amber-300">
                    {Math.floor(formMonthDuration * (formUnforeseenMaxPercent / 100))}s
                  </strong>{" "}
                  decorridos de cada mês.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditSessionModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingSession}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg glow-purple"
                >
                  {submittingSession ? "Salvando..." : "Salvar Parâmetros"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN QR CODE MODAL */}
      {showQrModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-emerald-500/40 shadow-2xl text-center space-y-6 relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                {selectedSession.title}
              </span>
              <h2 className="text-xl font-black text-white pt-1">Código de Sala: {selectedSession.code}</h2>
              <p className="text-xs text-slate-400">Escaneie com a câmera do celular para entrar</p>
            </div>

            <div className="bg-white p-6 rounded-3xl inline-block shadow-2xl glow-emerald mx-auto">
              <QRCodeSVG value={registerUrl} size={240} level="H" />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs font-mono text-emerald-300 break-all select-all">
              {registerUrl}
            </div>

            <button
              onClick={copyRegistrationUrl}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg glow-emerald transition-all flex items-center justify-center gap-2"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? "Link Copiado!" : "Copiar Link de Acesso"}</span>
            </button>
          </div>
        </div>
      )}

      {/* AUDIT LOGS MODAL */}
      {selectedGroupForLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="max-w-2xl w-full glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/40 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                  <History className="w-4 h-4" />
                  <span>Histórico de Auditoria & Ajuste de Pontos</span>
                </div>
                <h2 className="text-xl font-black text-white">{selectedGroupForLogs.name}</h2>
              </div>
              <button
                onClick={() => setSelectedGroupForLogs(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-purple-300 font-bold">Pontuação Atual de Felicidade:</div>
                <div className="text-2xl font-black text-amber-300">{selectedGroupForLogs.happinessPoints} pts</div>
              </div>

              {editingScoreGroupId === selectedGroupForLogs.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newScoreInput}
                    onChange={(e) => setNewScoreInput(e.target.value)}
                    className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-purple-500/50 text-white font-bold text-sm focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveScoreAdjustment(selectedGroupForLogs)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                  <button
                    onClick={() => setEditingScoreGroupId(null)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingScoreGroupId(selectedGroupForLogs.id);
                    setNewScoreInput(String(selectedGroupForLogs.happinessPoints));
                  }}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Ajustar Pontuação</span>
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1 divide-y divide-white/5">
              {loadingLogs ? (
                <div className="py-8 text-center text-slate-400">Carregando logs de auditoria...</div>
              ) : groupLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400">Nenhum evento registrado ainda para este grupo.</div>
              ) : (
                groupLogs.map((log) => (
                  <div key={log.id} className="pt-2.5 pb-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-bold text-purple-300 uppercase">{log.action}</span>
                      <span>{new Date(log.createdAt).toLocaleTimeString("pt-BR")} (Mês {log.currentMonth})</span>
                    </div>
                    <p className="text-slate-200">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
