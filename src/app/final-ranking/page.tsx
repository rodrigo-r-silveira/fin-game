"use client";

import React from "react";
import { Trophy, Medal, Award, ArrowLeft, Heart, PiggyBank, Sparkles } from "lucide-react";
import Link from "next/link";

export default function FinalRankingPage() {
  const leaderboard = [
    { rank: 1, name: "Grupo Inovadores FinTech", savings: 3500.0, points: 580, goal: "Mochilão Europa ✈️" },
    { rank: 2, name: "Grupo Capital Estratégico", savings: 2400.0, points: 460, goal: "Entrada do Carro 🚗" },
    { rank: 3, name: "Grupo Visão do Futuro", savings: 1900.0, points: 375, goal: "Reserva de Investimentos 📈" },
  ];

  return (
    <div className="min-h-screen p-6 text-slate-100 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-panel text-xs font-semibold text-slate-300 hover:text-white border border-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Dashboard</span>
        </Link>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
          <Trophy className="w-4 h-4" />
          <span>Resultado Final da Dinâmica</span>
        </div>
      </div>

      {/* Podium Header */}
      <div className="glass-panel p-8 rounded-3xl border border-white/10 text-center space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center mx-auto shadow-xl glow-amber font-black text-2xl">
          🏆
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight">Pódio de Felicidade & Poupança</h1>
        <p className="text-xs text-slate-300 max-w-md mx-auto">
          Confira a pontuação final dos grupos após a conversão do saldo guardado em conquistas de vida!
        </p>

        {/* Podium Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-left">
          {leaderboard.map((item) => (
            <div
              key={item.rank}
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
                        ? "bg-amber-400 text-slate-950"
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
                <div className="text-xs text-purple-300 font-semibold mb-3 flex items-center gap-1">
                  <PiggyBank className="w-3.5 h-3.5" />
                  <span>Poupança: R$ {item.savings.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 text-xs">
                <span className="text-slate-400 block mb-0.5">Meta Conquistada:</span>
                <span className="font-bold text-white">{item.goal}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
