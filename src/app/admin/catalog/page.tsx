"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Home,
  ShieldCheck,
  Zap,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface CatalogItem {
  id: string;
  title: string;
  cost: number;
  happinessPoints: number;
  type: "FIXED" | "TEMPTATION" | "UNFORESEEN" | "LONG_TERM_GOAL";
  category: string;
  description: string;
  isRPGChoice: boolean;
}

interface UnforeseenItem {
  id: string;
  title: string;
  description: string;
  costToFix: number;
  penaltyIfNotFixedPoints: number;
  restoredPointsIfFixed: number;
}

export default function AdminCatalogPage() {
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [unforeseenItems, setUnforeseenItems] = useState<UnforeseenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"RPG" | "FIXED" | "TEMPTATION" | "UNFORESEEN">("RPG");

  // Form state for creating/editing ExpenseOption
  const [formTitle, setFormTitle] = useState("");
  const [formCost, setFormCost] = useState<number>(0);
  const [formPoints, setFormPoints] = useState<number>(10);
  const [formType, setFormType] = useState<"FIXED" | "TEMPTATION">("FIXED");
  const [formCategory, setFormCategory] = useState("Moradia");
  const [formDescription, setFormDescription] = useState("");
  const [formIsRPG, setFormIsRPG] = useState(true);

  // Form state for creating/editing UnforeseenEvent (Mensagem Relâmpago)
  const [formCostToFix, setFormCostToFix] = useState<number>(200);
  const [formPenalty, setFormPenalty] = useState<number>(35);
  const [formRestoredPoints, setFormRestoredPoints] = useState<number>(5);

  const [notification, setNotification] = useState<string | null>(null);

  // Auto-dismiss banner
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  // Check admin session
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
      .catch(() => router.push("/admin/login"));
  }, [router]);

  // Load catalog items & unforeseen events
  const fetchCatalog = async () => {
    try {
      const res = await fetch("/api/catalog");
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.expenses)) setItems(data.expenses);
        if (Array.isArray(data.unforeseen)) setUnforeseenItems(data.unforeseen);
      }
    } catch (err) {
      console.error("Erro ao buscar catálogo:", err);
    } finally {
      setLoading(false);
    }
  };

  // Reset catalog to initial code defaults
  const handleResetCatalog = async () => {
    if (!confirm("Tem certeza que deseja restaurar todas as despesas e mensagens relâmpago para os valores padrão do código?")) return;
    try {
      setLoading(true);
      const res = await fetch("/api/catalog?reset=true");
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.expenses)) setItems(data.expenses);
        if (Array.isArray(data.unforeseen)) setUnforeseenItems(data.unforeseen);
        setNotification("Catálogo e Mensagens Relâmpago restaurados para o padrão com sucesso!");
      }
    } catch (err) {
      alert("Erro ao restaurar catálogo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authChecked) {
      fetchCatalog();
    }
  }, [authChecked]);

  // Save new or updated item (Supports both ExpenseOption and UnforeseenEvent)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    try {
      if (activeTab === "UNFORESEEN") {
        // Saving UnforeseenEvent
        const payload = {
          id: editingId,
          targetTable: "UNFORESEEN",
          title: formTitle,
          description: formDescription,
          costToFix: formCostToFix,
          penaltyIfNotFixedPoints: formPenalty,
          restoredPointsIfFixed: formRestoredPoints,
        };

        const method = editingId ? "PUT" : "POST";
        const res = await fetch("/api/catalog", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setNotification(editingId ? "Mensagem Relâmpago atualizada!" : "Nova Mensagem Relâmpago cadastrada!");
          resetForm();
          fetchCatalog();
        }
      } else {
        // Saving ExpenseOption
        const payload = {
          id: editingId,
          title: formTitle,
          cost: formCost,
          happinessPoints: formPoints,
          type: formType,
          category: formCategory,
          description: formDescription,
          isRPGChoice: formIsRPG,
        };

        const method = editingId ? "PUT" : "POST";
        const res = await fetch("/api/catalog", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setNotification(editingId ? "Item atualizado com sucesso!" : "Novo item cadastrado com sucesso!");
          resetForm();
          fetchCatalog();
        }
      }
    } catch (err) {
      alert("Erro ao salvar item no catálogo.");
    }
  };

  const handleEditExpense = (item: CatalogItem) => {
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormCost(item.cost);
    setFormPoints(item.happinessPoints);
    setFormType(item.type === "TEMPTATION" ? "TEMPTATION" : "FIXED");
    setFormCategory(item.category || "Moradia");
    setFormDescription(item.description || "");
    setFormIsRPG(item.isRPGChoice);
  };

  const handleEditUnforeseen = (item: UnforeseenItem) => {
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormDescription(item.description || "");
    setFormCostToFix(item.costToFix);
    setFormPenalty(item.penaltyIfNotFixedPoints);
    setFormRestoredPoints(item.restoredPointsIfFixed);
  };

  const handleDelete = async (id: string, title: string, isUnforeseen: boolean = false) => {
    if (!confirm(`Deseja excluir "${title}"?`)) return;
    try {
      const url = isUnforeseen ? `/api/catalog?id=${id}&targetTable=UNFORESEEN` : `/api/catalog?id=${id}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setNotification(`"${title}" excluído do catálogo.`);
        fetchCatalog();
      }
    } catch (err) {
      alert("Erro ao excluir item.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormTitle("");
    setFormCost(0);
    setFormPoints(10);
    setFormType("FIXED");
    setFormCategory("Moradia");
    setFormDescription("");
    setFormIsRPG(true);
    setFormCostToFix(200);
    setFormPenalty(35);
    setFormRestoredPoints(5);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-slate-100">
        <div className="flex items-center gap-3 text-sm text-slate-400 font-semibold">
          <span className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></span>
          <span>Carregando catálogo administrativo...</span>
        </div>
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    if (activeTab === "RPG") return item.isRPGChoice;
    if (activeTab === "FIXED") return item.type === "FIXED" && !item.isRPGChoice;
    return item.type === "TEMPTATION";
  });

  return (
    <div className="min-h-screen p-4 sm:p-6 text-slate-100 max-w-7xl mx-auto space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin"
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-panel text-xs font-semibold text-slate-300 hover:text-white border border-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Painel</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetCatalog}
            className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 font-bold text-xs transition-all flex items-center gap-1.5"
            title="Restaurar todas as despesas e mensagens relâmpago para os valores padrão do código"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>Restaurar Padrões do Código</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Gestor de Catálogo & Mensagens Relâmpago</span>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Grid: Add/Edit Form & Catalog List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {editingId ? <Edit className="w-4 h-4 text-amber-400" /> : <Plus className="w-4 h-4 text-emerald-400" />}
              <span>
                {editingId
                  ? activeTab === "UNFORESEEN"
                    ? "Editar Mensagem Relâmpago"
                    : "Editar Item do Catálogo"
                  : activeTab === "UNFORESEEN"
                  ? "Cadastrar Mensagem Relâmpago (Imprevisto)"
                  : "Cadastrar Nova Opção / Despesa"}
              </span>
            </h2>
            {editingId && (
              <button onClick={resetForm} className="text-xs text-rose-400 hover:underline">
                Cancelar Edição
              </button>
            )}
          </div>

          <form onSubmit={handleSaveItem} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                {activeTab === "UNFORESEEN" ? "Título do Imprevisto / Alerta:" : "Título da Despesa / Escolha:"}
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={
                  activeTab === "UNFORESEEN"
                    ? "Ex: 📱 Tela do Celular Quebrou!"
                    : "Ex: Apê Próprio, Supermercado, Fone Noise Cancelling"
                }
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            {activeTab === "UNFORESEEN" ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-emerald-400 block mb-1">Custo Resolver (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formCostToFix}
                      onChange={(e) => setFormCostToFix(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-emerald-300 text-xs focus:outline-none focus:border-emerald-500 font-extrabold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-rose-400 block mb-1">Penalidade (pts):</label>
                    <input
                      type="number"
                      min="0"
                      value={formPenalty}
                      onChange={(e) => setFormPenalty(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-rose-300 text-xs focus:outline-none focus:border-rose-500 font-extrabold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-amber-300 block mb-1">Recompensa (pts):</label>
                    <input
                      type="number"
                      min="0"
                      value={formRestoredPoints}
                      onChange={(e) => setFormRestoredPoints(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-amber-300 text-xs focus:outline-none focus:border-amber-500 font-extrabold"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Custo (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formCost}
                      onChange={(e) => setFormCost(Number(e.target.value))}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500 font-extrabold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-amber-300 block mb-1">Pontos de Felicidade:</label>
                    <input
                      type="number"
                      value={formPoints}
                      onChange={(e) => setFormPoints(Number(e.target.value))}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-amber-300 text-xs focus:outline-none focus:border-amber-500 font-extrabold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Tipo de Item:</label>
                    <select
                      value={formType}
                      onChange={(e) => {
                        const val = e.target.value as "FIXED" | "TEMPTATION";
                        setFormType(val);
                        if (val === "TEMPTATION") setFormIsRPG(false);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500 font-medium"
                    >
                      <option value="FIXED">Despesa Fixa (Mandatória)</option>
                      <option value="TEMPTATION">Tentação (Opcional)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Categoria:</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500 font-medium"
                    >
                      <option value="Moradia">Moradia</option>
                      <option value="Alimentação">Alimentação</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Tecnologia">Tecnologia & Conectividade</option>
                      <option value="Lazer">Lazer & Gastronomia</option>
                      <option value="Gadgets">Gadgets</option>
                      <option value="Viagem">Viagem</option>
                    </select>
                  </div>
                </div>

                {formType === "FIXED" && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30">
                    <input
                      type="checkbox"
                      id="isRPG"
                      checked={formIsRPG}
                      onChange={(e) => setFormIsRPG(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="isRPG" className="text-xs text-purple-200 font-semibold cursor-pointer">
                      Disponível para escolha no Mês 0 (RPG Personagem)
                    </label>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Descrição Explicativa:</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Detalhes sobre o impacto desta escolha no orçamento e estilo de vida..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-extrabold text-xs shadow-xl glow-purple transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{editingId ? "Salvar Alterações" : "Cadastrar no Catálogo"}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Filter Tabs & Catalog Items List */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tabs Bar */}
          <div className="glass-panel p-2 rounded-2xl border border-white/10 flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => {
                setActiveTab("RPG");
                setFormType("FIXED");
                setFormIsRPG(true);
                resetForm();
              }}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "RPG"
                  ? "bg-purple-600 text-white shadow-md glow-purple"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Opções Mês 0 (RPG)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("FIXED");
                setFormType("FIXED");
                setFormIsRPG(false);
                resetForm();
              }}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "FIXED"
                  ? "bg-purple-600 text-white shadow-md glow-purple"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Despesas Fixas</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("TEMPTATION");
                setFormType("TEMPTATION");
                setFormIsRPG(false);
                resetForm();
              }}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "TEMPTATION"
                  ? "bg-purple-600 text-white shadow-md glow-purple"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Tentações</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("UNFORESEEN");
                resetForm();
              }}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "UNFORESEEN"
                  ? "bg-amber-600 text-white shadow-md glow-amber"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Mensagens Relâmpago</span>
            </button>
          </div>

          {/* Items List View */}
          <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {activeTab === "UNFORESEEN" ? (
              /* Render Unforeseen Items List */
              unforeseenItems.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-dashed border-white/10 space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto animate-bounce" />
                  <p className="text-xs text-slate-400 font-medium">Nenhuma Mensagem Relâmpago cadastrada ainda.</p>
                  <p className="text-[11px] text-slate-500">
                    Use o formulário para criar imprevistos que serão sorteados entre os grupos a cada mês!
                  </p>
                </div>
              ) : (
                unforeseenItems.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-500/60 transition-all flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ⚡ Imprevisto
                        </span>
                        <h3 className="text-sm font-bold text-white">{u.title}</h3>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{u.description}</p>
                      <div className="flex items-center gap-4 text-xs font-semibold pt-1">
                        <span className="text-emerald-400">Custo: R$ {u.costToFix.toFixed(2)}</span>
                        <span className="text-rose-400">Penalidade: -{u.penaltyIfNotFixedPoints} pts</span>
                        <span className="text-amber-300">Bônus: +{u.restoredPointsIfFixed} pts</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleEditUnforeseen(u)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
                        title="Editar Imprevisto"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.title, true)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-400 transition-colors"
                        title="Excluir Imprevisto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : /* Render ExpenseOption Items List */
            filteredItems.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-dashed border-white/10 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">Nenhum item nesta categoria ainda.</p>
                <p className="text-[11px] text-slate-500">
                  Use o formulário ao lado ou o botão &quot;Restaurar Padrões&quot; no topo.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {item.category}
                      </span>
                      {item.isRPGChoice && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Mês 0 (RPG)
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    </div>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-emerald-400">
                        R$ {item.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-amber-300 font-bold">+{item.happinessPoints} pts</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditExpense(item)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 transition-colors"
                        title="Editar Despesa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title, false)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-400 transition-colors"
                        title="Excluir Despesa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
