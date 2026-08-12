import Link from "next/link";
import { ArrowRight, QrCode, LayoutDashboard, Sparkles, Shield, HeartHandshake } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-slate-100 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <main className="max-w-3xl w-full text-center space-y-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span>Dinâmica Gamificada de Educação Financeira</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
          Fin<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Game</span> Interns
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
          Gerencie a Bolsa Auxílio mensal do seu grupo, equilibre contas fixas, fuja das tentações e conquiste os maiores bônus de felicidade ao acumular sua poupança!
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-base shadow-xl glow-emerald transition-all flex items-center justify-center gap-3"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Acessar Dashboard do Grupo</span>
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            href="/login-qrcode"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl glass-panel hover:bg-slate-800/80 text-slate-200 font-bold text-base border border-white/10 transition-all flex items-center justify-center gap-3"
          >
            <QrCode className="w-5 h-5 text-amber-400" />
            <span>Escanear QR Code</span>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 text-left">
          <div className="glass-panel p-4 rounded-xl border border-white/10">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Rodada de 5 min</h3>
            <p className="text-xs text-slate-400 mt-1">Cada 5 minutos representam 1 Mês inteiro de escolhas financeiras.</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-white/10">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Imprevistos no Mês</h3>
            <p className="text-xs text-slate-400 mt-1">No minuto 3 surgem surpresas de vida real para decisão ágil do grupo.</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-white/10">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-2">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Metas de Longo Prazo</h3>
            <p className="text-xs text-slate-400 mt-1">Sua poupança desbloqueia sonhos como viagens e conquistas de alto valor.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
