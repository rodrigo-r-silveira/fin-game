"use client";

import React, { useState, useEffect, useRef } from "react";
import { QrCode, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginQrCodePage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMsg("Por favor, informe a chave de acesso do grupo.");
      return;
    }
    // Simulate token verification and redirect to dashboard
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-slate-100 relative">
      <div className="absolute top-10 left-10">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-panel text-xs font-semibold text-slate-300 hover:text-white border border-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </Link>
      </div>

      <main className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg glow-emerald">
          <QrCode className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Acesso do Grupo</h1>
          <p className="text-xs text-slate-400 mt-1">
            Escaneie o QR Code fornecido pelo facilitador ou digite o Token da Sala.
          </p>
        </div>

        {/* QR Code Scanner Placeholder Area */}
        <div className="p-6 rounded-2xl bg-slate-950/80 border-2 border-dashed border-emerald-500/30 relative flex flex-col items-center justify-center min-h-[200px]">
          <div ref={scannerRef} id="reader" className="w-full"></div>

          {!isScanning && (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mx-auto animate-pulse">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400">Clique para ativar a câmera e ler o QR Code</p>
              <button
                onClick={() => setIsScanning(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md glow-emerald"
              >
                Ativar Câmera
              </button>
            </div>
          )}
        </div>

        {/* Manual Token Form */}
        <form onSubmit={handleManualLogin} className="space-y-4 pt-2 border-t border-white/10">
          <div className="text-left">
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Ou digite a Chave de Acesso (Token):
            </label>
            <input
              type="text"
              placeholder="Ex: GRUPO-FIN-102"
              value={tokenInput}
              onChange={(e) => {
                setTokenInput(e.target.value);
                setErrorMsg("");
              }}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 font-medium text-left">{errorMsg}</p>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg glow-emerald transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Entrar na Sala de Jogo</span>
          </button>
        </form>
      </main>
    </div>
  );
}
