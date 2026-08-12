"use client";

import React, { useState } from "react";
import { Lock, ShieldCheck, User, ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Preencha usuário e senha.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Acesso negado.");
      }

      // Store local flag for instant client UI check
      localStorage.setItem("finGame_admin_logged", "true");
      router.push("/admin");
    } catch (err: any) {
      setErrorMsg(err.message || "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
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

      <main className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center mx-auto shadow-lg glow-purple mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
            Área Restrita
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Painel do Admin</h1>
          <p className="text-xs text-slate-400">
            Informe suas credenciais de facilitador para acessar os controles da dinâmica.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>Usuário:</span>
            </label>
            <input
              type="text"
              placeholder="Ex: admin"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrorMsg("");
              }}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder:text-slate-600 font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-purple-400" />
              <span>Senha:</span>
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMsg("");
              }}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder:text-slate-600 font-medium"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 font-semibold">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-extrabold text-sm shadow-xl glow-purple transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                <span>Verificando...</span>
              </span>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Autenticar Facilitador</span>
              </>
            )}
          </button>
        </form>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-500 text-center">
          Credencial Padrão: Usuário <strong className="text-slate-300">admin</strong> • Senha <strong className="text-slate-300">fingame2026</strong>
        </div>
      </main>
    </div>
  );
}
