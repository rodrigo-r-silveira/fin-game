"use client";

import React, { useState, useEffect } from "react";
import { Trophy, Medal, Award, ArrowLeft, Heart, PiggyBank, Sparkles, RefreshCw, Users, TrendingUp } from "lucide-react";
import Link from "next/link";

interface GroupData {
  id: string;
  name: string;
  savings: number;
  investments?: number;
  happinessPoints: number;
  achievedGoal?: string | null;
}

export default function FinalRankingPage() {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        // Sort groups by happinessPoints DESC, then total accumulated funds (savings + investments) DESC
        const sorted = [...data.groups].sort((a: any, b: any) => {
          if (b.happinessPoints !== a.happinessPoints) {
            return b.happinessPoints - a.happinessPoints;
          }
          const totalA = (a.savings || 0) + (a.investments || 0);
          const totalB = (b.savings || 0) + (b.investments || 0);
          return totalB - totalA;
        });
        setGroups(sorted);
      }
    } catch (err) {
      console.error("Erro ao buscar ranking dos grupos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    const interval = setInterval(fetchGroups, 3000);
    return () => clearInterval(interval);
  }, []);

  const leaderboard = groups.map((g, idx) => ({
    rank: idx + 1,
    id: g.id,
    name: g.name,
    savings: g.savings || 0,
    investments: g.investments || 0,
    points: g.happinessPoints || 0,
    goal: g.achievedGoal || (g.savings > 0 || (g.investments || 0) > 0 ? "Reserva Financeira Acumulada 💰" : "Planejamento Concluído 🎯"),
  }));

  const top3 = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  return (
    <div className="min-h-screen p-6 text-slate-100 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-panel text-xs font-semibold text-slate-300 hover:text-white border border-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Início</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Trophy className="w-4 h-4" />
            <span>Resultado Final da Dinâmica</span>
          </div>
          <button
            onClick={fetchGroups}
            className="p-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 border border-white/10 transition-colors"
            title="Atualizar Ranking"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Podium Header */}
      <div className="glass-panel p-8 rounded-3xl border border-white/10 text-center space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center mx-auto shadow-xl glow-amber font-black text-2xl">
          🏆
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight">Pódio de Felicidade & Investimento</h1>
        <p className="text-xs text-slate-300 max-w-md mx-auto">
          Confira a pontuação final dos grupos após a conversão dos investimentos acumulados em conquistas de vida!
        </p>

        {loading && (
          <div className="py-8 text-xs text-slate-400 font-semibold flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></span>
            <span>Carregando pontuações das equipes...</span>
          </div>
        )}

        {!loading && leaderboard.length === 0 && (
          <div className="py-8 text-xs text-slate-400 font-semibold space-y-2">
            <Users className="w-8 h-8 text-slate-500 mx-auto" />
            <p>Nenhum grupo participante registrado na dinâmica.</p>
          </div>
        )}

        {/* Podium Display (Top 3) */}
        {!loading && top3.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-left">
            {top3.map((item) => (
              <div
                key={item.id}
                className={`glass-panel p-5 rounded-2xl border relative flex flex-col justify-between transition-all ${
                  item.rank === 1
                    ? "border-amber-500/50 bg-gradient-to-b from-amber-950/30 to-slate-900 glow-amber md:-translate-y-2"
                    : item.rank === 2
                    ? "border-slate-400/40 bg-slate-900/60"
                    : "border-amber-700/30 bg-slate-900/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                        item.rank === 1
                          ? "bg-amber-400 text-slate-950 shadow-md"
                          : item.rank === 2
                          ? "bg-slate-300 text-slate-950"
                          : "bg-amber-700 text-white"
                      }`}
                    >
                      #{item.rank}
                    </span>
                    <div className="flex items-center gap-1 text-amber-300 font-extrabold text-sm">
                      <Heart className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>{item.points} pts</span>
                    </div>
                  </div>

                  <h2 className="font-bold text-white text-base mb-1">{item.name}</h2>
                  
                  <div className="text-xs text-emerald-300 font-bold mb-3 space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-1 text-emerald-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Investimento (até Mês 6): R$ {item.investments.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-1 text-purple-300 font-medium">
                      <PiggyBank className="w-3.5 h-3.5" />
                      <span>Poupança: R$ {item.savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 text-xs">
                  <span className="text-slate-400 block mb-0.5">Meta Conquistada:</span>
                  <span className="font-bold text-white">{item.goal}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remaining Groups List (#4 onwards) */}
      {!loading && remaining.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Demais Colocações do Ranking
          </h3>
          <div className="space-y-3">
            {remaining.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center border border-white/10">
                    #{item.rank}
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-sm">{item.name}</h4>
                    <span className="text-xs text-purple-300 font-medium">
                      Meta: {item.goal}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <div className="text-amber-300 font-extrabold text-sm flex items-center justify-end gap-1">
                    <Heart className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{item.points} pts</span>
                  </div>
                  <span className="text-xs text-emerald-400 block font-semibold">
                    Investimento (até Mês 6): R$ {item.investments.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Poupança: R$ {item.savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
