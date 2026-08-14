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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface GroupItem {
  id: string;
  name: string;
  qrCodeToken: string;
  balance: number;
  savings: number;
  investments?: number;
  happinessPoints: number;
  currentMonth: number;
  isStarted: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Dynamic host URL
  const [baseUrl, setBaseUrl] = useState("https://fin-game-umber.vercel.app");
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Audit Logs State
  const [selectedGroupForLogs, setSelectedGroupForLogs] = useState<GroupItem | null>(null);
  const [groupLogs, setGroupLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [editingScoreGroupId, setEditingScoreGroupId] = useState<string | null>(null);
  const [newScoreInput, setNewScoreInput] = useState<string>("");

  // Check admin session authentication
  useEffect(() => {
    fetch("/api/admin/check")
      .then((res) => res.json())
      .then((data) => {
        if (!data.isAuthenticated) {
          router.push("/admin/login");
        } else {
          setAuthChecked(true);
        }
      })
      .catch(() => {
        router.push("/admin/login");
      });
  }, [router]);

  // Auto-detect browser domain on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  // Full registration URL encoded in QR Code
  const registerUrl = `${baseUrl}/register-group`;

  // Fetch groups from API
  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setGroups(data.groups);
        // Sync started state if any group is started
        const hasStarted = data.groups.some((g: any) => g.isStarted);
        if (hasStarted) {
          setGameStarted(true);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar grupos:", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Start game for all groups
  const handleStartGame = async () => {
    try {
      const res = await fetch("/api/groups/start", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setGameStarted(true);
        fetchGroups();
        setLastAction("🚀 Partida iniciada com sucesso! Todos os grupos na Sala de Espera foram liberados para o Mês 1.");
      } else {
        alert(`Erro ao iniciar partida: ${data.error}`);
      }
    } catch (err) {
      alert("Erro de conexão ao iniciar partida.");
    }
  };

  // Delete single group
  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o grupo "${name}"?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/groups?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setGroups((prev) => prev.filter((g) => g.id !== id));
        setLastAction(`🗑️ Grupo "${name}" excluído com sucesso.`);
      } else {
        alert(`Erro ao excluir: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Erro de conexão ao excluir grupo.`);
    } finally {
      setDeletingId(null);
    }
  };

  // Delete all groups (Reset Room)
  const handleClearAllGroups = async () => {
    if (!confirm("⚠️ ATENÇÃO: Deseja realmente excluir TODOS os grupos da sala? Esta ação é irreversível!")) {
      return;
    }

    try {
      const res = await fetch("/api/groups?all=true", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setGroups([]);
        setGameStarted(false);
        setCurrentMonth(1);
        setLastAction("🧹 Todos os grupos foram removidos e a sala foi resetada.");
      } else {
        alert(`Erro ao limpar sala: ${data.error}`);
      }
    } catch (err) {
      alert("Erro de conexão ao limpar sala.");
    }
  };

  // Admin Logout
  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    localStorage.removeItem("finGame_admin_logged");
    router.push("/admin/login");
  };

  // Poll groups & listen to Supabase Realtime changes
  useEffect(() => {
    if (!authChecked) return;
    fetchGroups();

    // Polling interval every 3 seconds for instant updates
    const interval = setInterval(fetchGroups, 3000);

    // Supabase Realtime channel subscription
    let channel: any = null;
    let supabase: any = null;
    try {
      supabase = createClient();
      if (supabase) {
        channel = supabase
          .channel("realtime-groups")
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
  }, [authChecked]);

  // Live timer tick for admin control panel based on server timestamp (4 minutes = 240s)
  const [timeLeft, setTimeLeft] = useState<number>(240);

  useEffect(() => {
    if (!gameStarted || groups.length === 0) return;
    const firstWithTime = groups.find((g: any) => (g as any).monthStartedAt);
    if (!firstWithTime || !(firstWithTime as any).monthStartedAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date((firstWithTime as any).monthStartedAt).getTime()) / 1000);
      setTimeLeft(Math.max(0, 240 - elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStarted, groups]);

  // Open audit logs modal for a group
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

  // Adjust group score manually (with audit log)
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
        // Record adjustment log
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qrCodeToken: group.qrCodeToken,
            groupName: group.name,
            action: "ADMIN_SCORE_ADJUSTMENT",
            details: `Facilitador ajustou pontuação manualmente de ${group.happinessPoints} para ${pts} pts.`,
            currentMonth: group.currentMonth || 1,
            balance: group.balance,
            savings: group.savings,
            investments: group.investments || 0,
            happinessPoints: pts,
          }),
        }).catch(() => {});

        setEditingScoreGroupId(null);
        setNewScoreInput("");
        fetchGroups();
        if (selectedGroupForLogs?.qrCodeToken === group.qrCodeToken) {
          handleOpenGroupLogs({ ...group, happinessPoints: pts });
        }
        setLastAction(`✏️ Pontuação do grupo "${group.name}" ajustada para ${pts} pts.`);
      } else {
        alert(`Erro ao ajustar pontuação: ${data.error}`);
      }
    } catch (_) {
      alert("Erro de conexão ao salvar ajuste.");
    }
  };

  // Advance month for all active groups in DB
  const handleNextMonth = async () => {
    try {
      const res = await fetch("/api/groups/advance", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCurrentMonth(data.currentMonth);
        fetchGroups();
        setLastAction(`⏩ Mês avançado no banco de dados para Mês ${data.currentMonth}! Todos os cronômetros e participantes foram atualizados.`);
      } else {
        alert(`Erro ao avançar mês: ${data.error}`);
      }
    } catch (err) {
      alert("Erro de conexão ao avançar mês.");
    }
  };

  // Remotely trigger imprevisto for all groups in DB
  const handleTriggerImprevisto = async () => {
    try {
      const res = await fetch("/api/groups/trigger-unforeseen", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLastAction(`⚡ Imprevisto disparado com sucesso no servidor para todos os ${groups.length} grupos!`);
      } else {
        alert(`Erro ao disparar imprevisto: ${data.error}`);
      }
    } catch (err) {
      alert("Erro de conexão ao disparar imprevisto.");
    }
  };

  // Finish game for all groups in DB and view final ranking
  const handleFinishGame = async () => {
    if (!confirm("🏁 Tem certeza que deseja finalizar a dinâmica e visualizar o Ranking Final com todos os participantes?")) return;
    try {
      const res = await fetch("/api/groups/finish", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        router.push("/final-ranking");
      } else {
        alert(`Erro ao finalizar jogo: ${data.error}`);
      }
    } catch (err) {
      alert("Erro de conexão ao finalizar jogo.");
    }
  };

  const copyRegistrationUrl = () => {
    navigator.clipboard.writeText(registerUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-slate-100">
        <div className="flex items-center gap-3 text-sm text-slate-400 font-semibold">
          <span className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></span>
          <span>Verificando autenticação do admin...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 text-slate-100 max-w-7xl mx-auto space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-panel text-xs font-semibold text-slate-300 hover:text-white border border-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Início</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <Trophy className="w-4 h-4 text-purple-400" />
            <span>Painel do Facilitador</span>
          </div>

          <Link
            href="/admin/catalog"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white font-bold text-xs shadow-lg glow-purple border border-purple-400/30 transition-all"
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span>Gestor de Catálogo / Mês 0</span>
          </Link>

          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg glow-emerald transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>Expandir QR Code de Cadastro</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors"
            title="Encerrar sessão de admin"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Main Grid: QR Code Display Card & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: QR Code Display for Participants */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between items-center text-center relative overflow-hidden">
          <div className="w-full space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <QrCode className="w-4 h-4" />
              <span>Escaneie com o Celular</span>
            </div>
            <h2 className="text-xl font-black text-white">Cadastrar Novo Grupo</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Aponta a câmera do celular para abrir a tela de cadastro do grupo.
            </p>
          </div>

          {/* QR Code Canvas Frame */}
          <div className="my-6 p-5 rounded-3xl bg-white shadow-2xl border-4 border-emerald-500/40 relative group">
            <QRCodeSVG
              value={registerUrl}
              size={220}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: "https://nextjs.org/favicon.ico",
                x: undefined,
                y: undefined,
                height: 24,
                width: 24,
                excavate: true,
              }}
            />
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 pointer-events-none group-hover:bg-transparent transition-all" />
          </div>

          {/* URL Configurator */}
          <div className="w-full space-y-3 pt-4 border-t border-white/10 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Wifi className="w-3.5 h-3.5" />
                <span>URL de Cadastro:</span>
              </span>
              <button
                onClick={copyRegistrationUrl}
                className="text-slate-300 hover:text-white flex items-center gap-1 font-bold"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Copiado!" : "Copiar Link"}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-white/10">
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://fin-game-umber.vercel.app"
                className="bg-transparent text-white font-mono text-xs flex-1 focus:outline-none px-2"
              />
              <a
                href={registerUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Abrir página de cadastro"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-[11px] text-slate-500">
              O QR Code se atualiza automaticamente com o domínio acima.
            </p>
          </div>
        </div>

        {/* Right Column: Controls & Realtime Registered Groups List */}
        <div className="lg:col-span-7 space-y-6">
          {/* Facilitator Control Buttons */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Controles da Dinâmica</h3>
                <p className="text-xs text-slate-400">Gerencie o início do jogo e os eventos</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                  gameStarted
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                }`}
              >
                {gameStarted ? `Em Andamento (Mês ${currentMonth})` : "Aguardando Cadastro na Sala de Espera"}
              </span>
            </div>

            {/* Live Month Countdown Bar for Facilitator */}
            {gameStarted && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Cronômetro Global do Mês {currentMonth} (Sincronizado):</span>
                </div>
                <div className="px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-500/50 font-mono font-extrabold text-sm text-amber-300">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleStartGame}
                disabled={gameStarted || groups.length === 0}
                className={`p-4 rounded-2xl border font-bold text-left transition-all flex flex-col justify-between h-28 ${
                  !gameStarted && groups.length > 0
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
                disabled={!gameStarted || currentMonth >= 7}
                className={`p-4 rounded-2xl border font-bold text-left transition-all flex flex-col justify-between h-28 ${
                  gameStarted && currentMonth < 7
                    ? "bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white border-purple-500/40 shadow-xl glow-purple"
                    : "bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between">
                  <FastForward className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-bold">Mês {currentMonth + 1}</span>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold">Avançar Mês</div>
                  <div className="text-[11px] opacity-80 font-normal">Transferência de saldo & bolsas</div>
                </div>
              </button>

              <button
                onClick={handleTriggerImprevisto}
                disabled={!gameStarted}
                className={`p-4 rounded-2xl border font-bold text-left transition-all flex flex-col justify-between h-28 ${
                  gameStarted
                    ? "bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white border-amber-500/40 shadow-xl glow-amber"
                    : "bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Zap className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-bold">Minuto 3</span>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold">Disparar Imprevisto</div>
                  <div className="text-[11px] opacity-80 font-normal">Alerta surpresa ao vivo</div>
                </div>
              </button>

              <button
                onClick={handleFinishGame}
                disabled={!gameStarted}
                className={`p-4 rounded-2xl border font-bold text-left transition-all flex flex-col justify-between h-28 col-span-1 sm:col-span-3 ${
                  gameStarted
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 hover:from-emerald-500 hover:to-indigo-600 text-white border-emerald-500/40 shadow-xl glow-emerald"
                    : "bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Trophy className="w-5 h-5 text-amber-300" />
                  <span className="text-[10px] uppercase font-bold text-amber-300">Encerramento Oficial</span>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold">🏁 Finalizar Dinâmica e Visualizar Ranking Final</div>
                  <div className="text-[11px] opacity-80 font-normal">Exibe o pódio e o ranking final para todos os participantes ao vivo</div>
                </div>
              </button>
            </div>
          </div>

          {/* Real-time Connected Groups Monitor */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Grupos Cadastrados em Tempo Real</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  {groups.length} {groups.length === 1 ? "Grupo Conectado" : "Grupos Conectados"}
                </span>

                {groups.length > 0 && (
                  <button
                    onClick={handleClearAllGroups}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs transition-colors flex items-center gap-1"
                    title="Excluir todos os grupos e resetar a sala"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Sala</span>
                  </button>
                )}

                <button
                  onClick={fetchGroups}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Atualizar lista de grupos"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List of Registered Teams */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {groups.map((group, idx) => (
                <div
                  key={group.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-wrap items-center justify-between gap-3 hover:border-emerald-500/40 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 font-extrabold text-white flex items-center justify-center text-sm shadow-md">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{group.name}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            !group.isStarted
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : (group as any).isRPGConfirmed
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse"
                          }`}
                        >
                          {!group.isStarted
                            ? "Na Espera"
                            : (group as any).isRPGConfirmed
                            ? "✅ Personagem Pronto"
                            : "⏳ Montando Personagem"}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Token: <strong className="text-emerald-300">{group.qrCodeToken}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Saldo Mensal:</span>
                      <strong className="text-emerald-400 font-extrabold">
                        R$ {group.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <div className="text-right border-l border-white/10 pl-3">
                      <span className="text-slate-400 block text-[10px]">Pontuação:</span>
                      <strong className="text-amber-300 font-extrabold">{group.happinessPoints} pts</strong>
                    </div>

                    <button
                      onClick={() => handleOpenGroupLogs(group)}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                      title="Ver histórico de ações e auditoria de pontuação"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Logs</span>
                    </button>

                    <a
                      href={`/dashboard?token=${group.qrCodeToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] flex items-center gap-1 border border-white/10"
                    >
                      <span>Tela</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      disabled={deletingId === group.id}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                      title="Excluir este grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {groups.length === 0 && !loadingGroups && (
                <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-dashed border-white/10 space-y-2">
                  <QrCode className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">Nenhum grupo cadastrado ainda.</p>
                  <p className="text-[11px] text-slate-500">
                    Peça para os participantes escanear o QR Code acima para cadastrar a equipe.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Group Audit Logs Modal */}
      {selectedGroupForLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass-panel max-w-4xl w-full p-6 rounded-3xl border border-indigo-500/40 shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => {
                setSelectedGroupForLogs(null);
                setEditingScoreGroupId(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white px-3 py-1 rounded-lg bg-slate-900 text-xs font-bold"
            >
              ✕ Fechar
            </button>

            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10 pr-16">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>Logs & Auditoria: {selectedGroupForLogs.name}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Token: <strong className="text-emerald-300 font-mono">{selectedGroupForLogs.qrCodeToken}</strong> • Mês Atual: <strong className="text-white">Mês {selectedGroupForLogs.currentMonth || 1}</strong>
                  </p>
                </div>
              </div>

              {/* Score Inspection & Manual Adjustment */}
              <div className="flex items-center gap-3 bg-slate-900/80 p-2.5 rounded-2xl border border-white/10">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Pontuação Atual</span>
                  <span className="text-lg font-extrabold text-amber-300">{selectedGroupForLogs.happinessPoints} pts</span>
                </div>

                {editingScoreGroupId === selectedGroupForLogs.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={newScoreInput}
                      onChange={(e) => setNewScoreInput(e.target.value)}
                      placeholder="Nova pontuação"
                      className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-amber-500/50 text-amber-300 text-xs font-bold"
                    />
                    <button
                      onClick={() => handleSaveScoreAdjustment(selectedGroupForLogs)}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      title="Salvar nova pontuação"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingScoreGroupId(null)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingScoreGroupId(selectedGroupForLogs.id);
                      setNewScoreInput(selectedGroupForLogs.happinessPoints.toString());
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition-colors"
                    title="Ajustar pontuação do grupo manualmente"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Ajustar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Metrics Snapshot Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Saldo Mensal</span>
                <strong className="text-xs font-extrabold text-emerald-400">R$ {selectedGroupForLogs.balance.toFixed(2)}</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Poupança Acumulada</span>
                <strong className="text-xs font-extrabold text-purple-300">R$ {selectedGroupForLogs.savings.toFixed(2)}</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Investimentos CDB</span>
                <strong className="text-xs font-extrabold text-teal-300">R$ {(selectedGroupForLogs.investments || 0).toFixed(2)}</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-[10px] text-slate-400 block">Pontos Felicidade</span>
                <strong className="text-xs font-extrabold text-amber-300">{selectedGroupForLogs.happinessPoints} pts</strong>
              </div>
            </div>

            {/* Logs Timeline List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[450px]">
              {loadingLogs && (
                <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></span>
                  <span>Carregando logs de auditoria...</span>
                </div>
              )}

              {!loadingLogs && groupLogs.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-dashed border-white/10">
                  Nenhum evento registrado ainda para este grupo.
                </div>
              )}

              {!loadingLogs &&
                groupLogs.map((log: any) => {
                  const dateStr = new Date(log.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-white/5 hover:border-indigo-500/30 transition-all text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[10px]">
                            {log.action}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            Mês {log.currentMonth}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{dateStr}</span>
                      </div>
                      <p className="text-slate-300 text-xs">{log.details}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1 border-t border-white/5">
                        <span>Saldo: <strong className="text-emerald-400">R$ {log.balance.toFixed(2)}</strong></span>
                        <span>Poupança: <strong className="text-purple-300">R$ {log.savings.toFixed(2)}</strong></span>
                        <span>Investimento: <strong className="text-teal-300">R$ {log.investments.toFixed(2)}</strong></span>
                        <span>Pontos: <strong className="text-amber-300">{log.happinessPoints} pts</strong></span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Projection Modal for QR Code */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass-panel max-w-xl w-full p-8 rounded-3xl border border-emerald-500/40 shadow-2xl text-center space-y-6 relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white px-3 py-1 rounded-lg bg-slate-900 text-xs font-bold"
            >
              ✕ Fechar
            </button>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                Projeção do QR Code de Cadastro
              </span>
              <h2 className="text-3xl font-black text-white pt-2">Escaneie para Cadastrar seu Grupo</h2>
              <p className="text-xs text-slate-300">
                URL: <strong className="text-emerald-400 font-mono">{registerUrl}</strong>
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white shadow-2xl inline-block border-4 border-emerald-500/40">
              <QRCodeSVG value={registerUrl} size={300} level="H" includeMargin={true} />
            </div>

            <div className="text-xs text-slate-400">
              Grupos atualmente cadastrados: <strong className="text-emerald-300 font-bold">{groups.length} equipes</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
