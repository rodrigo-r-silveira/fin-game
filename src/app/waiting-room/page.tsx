"use client";

import React, { useState, useEffect } from "react";
import { Clock, Sparkles, CheckCircle2, Shield, Users, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function WaitingRoomPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState<string>("Sua Equipe");
  const [token, setToken] = useState<string>("");
  const [isStarted, setIsStarted] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryToken = params.get("token") || localStorage.getItem("finGame_groupToken") || "";
      const savedName = localStorage.getItem("finGame_groupName") || "Sua Equipe";

      setToken(queryToken);
      setGroupName(savedName);

      // Function to check if game has started
      const checkGameStatus = async () => {
        if (!queryToken) return;
        try {
          const res = await fetch("/api/groups");
          const data = await res.json();
          if (data.success && Array.isArray(data.groups)) {
            const matched = data.groups.find((g: any) => g.qrCodeToken === queryToken);
            if (matched) {
              setGroupName(matched.name);
              if (matched.isStarted) {
                setIsStarted(true);
                // Delayed redirect for celebratory feedback
                setTimeout(() => {
                  router.push(`/dashboard?token=${queryToken}`);
                }, 1200);
              }
            }
          }
        } catch (err) {
          console.error("Erro ao verificar status da sala:", err);
        }
      };

      checkGameStatus();
      const interval = setInterval(checkGameStatus, 2000);

      return () => clearInterval(interval);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-slate-100 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <main className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl text-center space-y-6 relative z-10">
        {!isStarted ? (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg glow-amber animate-pulse">
              <Clock className="w-10 h-10 animate-spin-slow" />
            </div>

            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                Sala de Espera
              </span>
              <h1 className="text-2xl font-black text-white pt-2">{groupName}</h1>
              <p className="text-xs text-slate-400">
                Código Token: <strong className="text-amber-300 font-mono">{token || "GRUPO-01"}</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 space-y-2">
              <div className="flex items-center justify-center gap-2 text-amber-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Aguardando o Facilitador</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Você já está registrado na tela do admin! A atividade iniciará em breve assim que todas as equipes entrarem.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>Sincronizando com o facilitador em tempo real...</span>
            </div>
          </>
        ) : (
          <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 flex items-center justify-center mx-auto glow-emerald">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Partida Iniciada!
              </span>
              <h2 className="text-2xl font-black text-white pt-1">Bolsa Auxílio Liberada 🚀</h2>
              <p className="text-xs text-slate-300">
                Redirecionando sua equipe para a Dashboard...
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 font-bold flex items-center justify-center gap-2">
              <span>Entrando no Mês 1</span>
              <ArrowRight className="w-4 h-4 animate-pulse" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
