"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  HelpCircle,
  Home,
  ShoppingBag,
  Sparkles,
  Zap,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export default function AdminCatalogPage() {
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"RPG" | "FIXED" | "TEMPTATION">("RPG");

  // Form state for creating/editing
  const [formTitle, setFormTitle] = useState("");
  const [formCost, setFormCost] = useState<number>(0);
  const [formPoints, setFormPoints] = useState<number>(10);
  const [formType, setFormType] = useState<"FIXED" | "TEMPTATION">("FIXED");
  const [formCategory, setFormCategory] = useState("Moradia");
  const [formDescription, setFormDescription] = useState("");
  const [formIsRPG, setFormIsRPG] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

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

  // Load catalog items
  const fetchCatalog = async () => {
    try {
      const res = await fetch("/api/catalog");
      const data = await res.json();
      if (data.success && Array.isArray(data.expenses)) {
        setItems(data.expenses);
      }
    } catch (err) {
      console.error("Erro ao buscar catálogo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authChecked) {
      fetchCatalog();
    }
  }, [authChecked]);

  // Save new or updated item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    try {
      if (editingId) {
        // PUT update
        const res = await fetch("/api/catalog", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            title: formTitle,
            cost: formCost,
            happinessPoints: formPoints,
            type: formType,
            category: formCategory,
            description: formDescription,
            isRPGChoice: formIsRPG,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setNotification("Item atualizado com sucesso!");
          resetForm();
          fetchCatalog();
        }
      } else {
        // POST create
        const res = await fetch("/api/catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle,
            cost: formCost,
            happinessPoints: formPoints,
            type: formType,
            category: formCategory,
            description: formDescription,
            isRPGChoice: formIsRPG,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setNotification("Novo item cadastrado com sucesso!");
          resetForm();
          fetchCatalog();
        }
      }
    } catch (err) {
      alert("Erro ao salvar item no catálogo.");
    }
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormCost(item.cost);
    setFormPoints(item.happinessPoints);
    setFormType(item.type === "TEMPTATION" ? "TEMPTATION" : "FIXED");
    setFormCategory(item.category || "Moradia");
    setFormDescription(item.description || "");
    setFormIsRPG(item.isRPGChoice);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Deseja excluir "${title}" do catálogo?`)) return;
    try {
      const res = await fetch(`/api/catalog?id=${id}`, { method: "DELETE" });
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

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Gestor de Catálogo & Mês 0 (RPG)</span>
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
              {editingId ? <Edit2 className="w-4 h-4 text-purple-400" /> : <Plus className="w-4 h-4 text-emerald-400" />}
              <span>{editingId ? "Editar Item do Catálogo" : "Cadastrar Nova Opção / Despesa"}</span>
            </h2>
            {editingId && (
              <button
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-white underline font-semibold"
              >
                Cancelar Edição
              </button>
            )}
          </div>

          <form onSubmit={handleSaveItem} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Título da Despesa / Escolha:</label>
              <input
                type="text"
                placeholder="Ex: Apê Próprio, Supermercado, Fone Noise Cancelling"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Custo (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formCost}
                  onChange={(e) => setFormCost(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500 font-extrabold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-amber-300 block mb-1">Pontos de Felicidade:</label>
                <input
                  type="number"
                  value={formPoints}
                  onChange={(e) => setFormPoints(parseInt(e.target.value) || 0)}
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
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500 font-medium"
                >
                  <option value="FIXED">Despesa Fixa (Mandarória)</option>
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
                </select>
              </div>
            </div>

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

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Descrição Explicativa:</label>
              <textarea
                rows={3}
                placeholder="Detalhes sobre o impacto desta escolha no orçamento e estilo de vida..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
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

        {/* Right Column: Catalog Listing */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tabs */}
          <div className="glass-panel p-2 rounded-2xl border border-white/10 flex items-center gap-2">
            <button
              onClick={() => setActiveTab("RPG")}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "RPG"
                  ? "bg-purple-600 text-white shadow-md glow-purple"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Opções Mês 0 (RPG)</span>
            </button>

            <button
              onClick={() => setActiveTab("FIXED")}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "FIXED"
                  ? "bg-purple-600 text-white shadow-md glow-purple"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Despesas Fixas Base</span>
            </button>

            <button
              onClick={() => setActiveTab("TEMPTATION")}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "TEMPTATION"
                  ? "bg-amber-600 text-white shadow-md glow-amber"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Tentações (Uso Único)</span>
            </button>
          </div>

          {/* List */}
          <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-wrap items-center justify-between gap-3 hover:border-purple-500/40 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">{item.title}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {item.category}
                    </span>
                    {item.isRPGChoice && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        RPG Mês 0
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">{item.description}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-emerald-400 block">
                      R$ {item.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-amber-300 font-bold">
                      +{item.happinessPoints} pts
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Editar item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                      title="Excluir item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-dashed border-white/10 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">Nenhum item nesta categoria ainda.</p>
                <p className="text-[11px] text-slate-500">
                  Use o formulário ao lado para cadastrar opções personalizadas de despesas e pontos.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
