"use client";

import React, { useState, useEffect } from "react";
import { Users, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Wallet, Hash, Layers } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RegisterGroupPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [createdGroup, setCreatedGroup] = useState<{ id: string; name: string; qrCodeToken: string } | null>(null);

  // Read session code from URL query param if present (?session=CODE)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sCode = params.get("session") || "";
      if (sCode) {
        setSessionCode(sCode.toUpperCase());
        fetchSessionDetails(sCode.toUpperCase());
      }
    }
  }, []);

  const fetchSessionDetails = async (code: string) => {
    try {
      const res = await fetch(`/api/sessions?code=${code}`);
      const data = await res.json();
      if (data.success && data.session) {
        setSessionData(data.session);
      }
    } catch (_) {}
  };

  const handleSessionCodeBlur = () => {
    if (sessionCode.trim()) {
      fetchSessionDetails(sessionCode.trim().toUpperCase());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setErrorMsg("Por favor, digite o nome do seu personagem / grupo.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          sessionCode: sessionCode.trim() ? sessionCode.trim().toUpperCase() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao cadastrar o personagem.");
      }

      // Save token in localStorage
      localStorage.setItem("finGame_groupId", data.group.id);
      localStorage.setItem("finGame_groupToken", data.group.qrCodeToken);
      localStorage.setItem("finGame_groupName", data.group.name);
      if (data.session) {
        localStorage.setItem("finGame_sessionCode", data.session.code);
      }

      // Redirect to Waiting Room
      router.push(`/waiting-room?token=${data.group.qrCodeToken}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de conexão ao cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    if (createdGroup) {
      router.push(`/dashboard?token=${createdGroup.qrCodeToken}`);
    }
  };

  const allowanceDisplay = sessionData?.monthlyAllowance
    ? `R$ ${Number(sessionData.monthlyAllowance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : "R$ 1.560,00";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-slate-100 relative">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <main className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6 relative z-10">
        {!createdGroup ? (
          <>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center mx-auto shadow-lg glow-emerald mb-4">
                <Users className="w-8 h-8" />
              </div>

              {sessionData ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Sala: {sessionData.title} ({sessionData.code})</span>
                </div>
              ) : (
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  Dinâmica de Educação Financeira
                </span>
              )}

              <h1 className="text-2xl font-black text-white tracking-tight">Cadastro de Personagem</h1>
              <p className="text-xs text-slate-400">
                Parabéns pela aprovação! Digite o nome do seu personagem para começar a jornada.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Código da Sala:
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ex: FIN-2026"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    onBlur={handleSessionCodeBlur}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-purple-500 transition-colors uppercase placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Nome do Personagem:
                </label>
                <input
                  type="text"
                  placeholder="Digite o nome do seu personagem"
                  value={groupName}
                  onChange={(e) => {
                    setGroupName(e.target.value);
                    setErrorMsg("");
                  }}
                  disabled={loading}
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600 font-medium"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-semibold">{errorMsg}</p>
              )}

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Wallet className="w-4 h-4" />
                  <span>Benefício de Início:</span>
                </div>
                <p>• Bolsa Auxílio Mensal: <strong>{allowanceDisplay}</strong></p>
                <p>• Pontos de Felicidade Iniciais: <strong>100 pts</strong></p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl glow-emerald transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                    <span>Cadastrando...</span>
                  </span>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Confirmar Cadastro do Personagem</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 flex items-center justify-center mx-auto glow-emerald">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                Personagem Cadastrado com Sucesso!
              </span>
              <h2 className="text-2xl font-black text-white mt-1">{createdGroup.name}</h2>
              <p className="text-xs text-slate-400 mt-2">
                Código de Acesso: <strong className="text-emerald-300 font-mono">{createdGroup.qrCodeToken}</strong>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200">
              Seu personagem já apareceu na tela do facilitador! Aguarde o início da rodada ou acesse sua Dashboard.
            </div>

            <button
              onClick={handleGoToDashboard}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl glow-emerald transition-all flex items-center justify-center gap-2"
            >
              <span>Ir para a Dashboard do Personagem</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
