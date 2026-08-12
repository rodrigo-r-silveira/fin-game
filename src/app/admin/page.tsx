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
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

interface GroupItem {
  id: string;
  name: string;
  qrCodeToken: string;
  balance: number;
  savings: number;
  happinessPoints: number;
  createdAt: string;
}

export default function AdminPage() {
  const [currentMonth, setCurrentMonth] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Default network IP for mobile testing
  const [hostIp, setHostIp] = useState("192.168.1.105:3000");
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Full registration URL encoded in QR Code
  const registerUrl = `http://${hostIp}/register-group`;

  // Fetch groups from API
  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setGroups(data.groups);
      }
    } catch (err) {
      console.error("Erro ao buscar grupos:", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Poll groups & listen to Supabase Realtime changes
  useEffect(() => {
    fetchGroups();

    // Polling interval every 3 seconds for instant updates
    const interval = setInterval(fetchGroups, 3000);

    // Supabase Realtime channel subscription
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-groups")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Group" },
        (payload) => {
          fetchGroups();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStartGame = () => {
    setGameStarted(true);
    setLastAction("🚀 Partida iniciada com sucesso! Todos os grupos sincronizados no Mês 1.");
  };

  const handleNextMonth = () => {
    if (currentMonth < 6) {
      setCurrentMonth((prev) => prev + 1);
      setLastAction(`⏩ Mês avançado para Mês ${currentMonth + 1}.`);
    }
  };

  const handleTriggerImprevisto = () => {
    setLastAction(`⚡ Imprevisto disparado para todos os ${groups.length} grupos cadastrados!`);
  };

  const copyRegistrationUrl = () => {
    navigator.clipboard.writeText(registerUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

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

          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg glow-emerald transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>Expandir QR Code de Cadastro</span>
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

          {/* IP Host Address Configurator */}
          <div className="w-full space-y-3 pt-4 border-t border-white/10 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Wifi className="w-3.5 h-3.5" />
                <span>URL de Cadastro (Wi-Fi Local):</span>
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
                value={hostIp}
                onChange={(e) => setHostIp(e.target.value)}
                placeholder="192.168.1.105:3000"
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
              Certifique-se de que o celular e o computador estão na mesma rede Wi-Fi.
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
                {gameStarted ? `Em Andamento (Mês ${currentMonth})` : "Aguardando Cadastro dos Grupos"}
              </span>
            </div>

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
                  <div className="text-[11px] opacity-80 font-normal">Sincroniza os grupos no Mês 1</div>
                </div>
              </button>

              <button
                onClick={handleNextMonth}
                disabled={!gameStarted || currentMonth >= 6}
                className={`p-4 rounded-2xl border font-bold text-left transition-all flex flex-col justify-between h-28 ${
                  gameStarted && currentMonth < 6
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
            </div>
          </div>

          {/* Real-time Connected Groups Monitor */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Grupos Cadastrados em Tempo Real</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  {groups.length} {groups.length === 1 ? "Grupo Conectado" : "Grupos Conectados"}
                </span>
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
                      <h4 className="font-bold text-white text-sm">{group.name}</h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Token: <strong className="text-emerald-300">{group.qrCodeToken}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Saldo Mensal:</span>
                      <strong className="text-emerald-400 font-extrabold">
                        R$ {group.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <div className="text-right border-l border-white/10 pl-4">
                      <span className="text-slate-400 block text-[10px]">Pontuação:</span>
                      <strong className="text-amber-300 font-extrabold">{group.happinessPoints} pts</strong>
                    </div>

                    <a
                      href={`/dashboard?token=${group.qrCodeToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] flex items-center gap-1 border border-white/10"
                    >
                      <span>Abrir Tela</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
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
