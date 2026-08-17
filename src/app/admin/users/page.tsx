"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  Plus,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Mail,
  User,
  Trash2,
  Edit,
  Key,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  LogOut,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserItem {
  id: string;
  username: string;
  email: string | null;
  name: string;
  role: "SUPER_ADMIN" | "FACILITATOR";
  isActive: boolean;
  createdAt: string;
  _count?: {
    sessions: number;
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"FACILITATOR" | "SUPER_ADMIN">("FACILITATOR");
  const [formIsActive, setFormIsActive] = useState(true);

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  // Verify super admin session
  useEffect(() => {
    fetch("/api/admin/check")
      .then((res) => res.json())
      .then((data) => {
        if (!data.isAuthenticated) {
          router.push("/admin/login");
        } else if (data.user?.role !== "SUPER_ADMIN") {
          alert("Acesso restrito ao Super Administrador.");
          router.push("/admin");
        } else {
          setCurrentUser(data.user);
          setAuthChecked(true);
          fetchUsers();
        }
      })
      .catch(() => router.push("/admin/login"));
  }, [router]);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  // Open create modal
  const handleOpenCreate = () => {
    setFormName("");
    setFormUsername("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("FACILITATOR");
    setFormIsActive(true);
    setShowCreateModal(true);
  };

  // Submit Create
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formUsername || !formPassword) {
      setNotification({ message: "Preencha todos os campos obrigatórios.", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          username: formUsername,
          email: formEmail || undefined,
          password: formPassword,
          role: formRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ message: `🎉 Facilitador "${data.user.name}" cadastrado com sucesso com catálogo próprio!`, type: "success" });
        setShowCreateModal(false);
        fetchUsers();
      } else {
        setNotification({ message: data.error || "Erro ao cadastrar facilitador.", type: "error" });
      }
    } catch (_) {
      setNotification({ message: "Erro de conexão.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (u: UserItem) => {
    setSelectedUser(u);
    setFormName(u.name);
    setFormEmail(u.email || "");
    setFormRole(u.role);
    setFormIsActive(u.isActive);
    setShowEditModal(true);
  };

  // Submit Edit
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          name: formName,
          email: formEmail || null,
          role: formRole,
          isActive: formIsActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ message: "Usuário atualizado com sucesso!", type: "success" });
        setShowEditModal(false);
        fetchUsers();
      } else {
        setNotification({ message: data.error || "Erro ao atualizar.", type: "error" });
      }
    } catch (_) {
      setNotification({ message: "Erro de conexão.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Password Modal
  const handleOpenPassword = (u: UserItem) => {
    setSelectedUser(u);
    setFormPassword("");
    setShowPasswordModal(true);
  };

  // Submit Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !formPassword.trim()) {
      setNotification({ message: "Digite a nova senha.", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          password: formPassword.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ message: `Senha de "${selectedUser.name}" redefinida com sucesso!`, type: "success" });
        setShowPasswordModal(false);
      } else {
        setNotification({ message: data.error || "Erro ao alterar senha.", type: "error" });
      }
    } catch (_) {
      setNotification({ message: "Erro de conexão.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (u: UserItem) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: u.id,
          isActive: !u.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, isActive: !u.isActive } : item)));
        setNotification({
          message: `Status de "${u.name}" alterado para ${!u.isActive ? "Ativo" : "Desativado"}.`,
          type: "success",
        });
      }
    } catch (_) {}
  };

  // Delete User
  const handleDeleteUser = async (u: UserItem) => {
    if (u.id === currentUser?.id) {
      alert("Você não pode excluir a sua própria conta.");
      return;
    }
    if (!confirm(`Tem certeza que deseja excluir o facilitador "${u.name}" (@${u.username}) e todas as suas partidas?`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.filter((item) => item.id !== u.id));
        setNotification({ message: `Facilitador "${u.name}" excluído com sucesso.`, type: "success" });
      } else {
        alert(`Erro ao excluir: ${data.error}`);
      }
    } catch (_) {
      alert("Erro de conexão ao excluir usuário.");
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const totalFacilitators = users.filter((u) => u.role === "FACILITATOR").length;
  const totalActive = users.filter((u) => u.isActive).length;
  const totalSessions = users.reduce((acc, u) => acc + (u._count?.sessions || 0), 0);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span>Verificando credenciais de Super Administrador...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 selection:bg-emerald-500/20">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-md border animate-in fade-in slide-in-from-top-4 duration-300 ${
            notification.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/60 text-emerald-200 shadow-emerald-900/40"
              : "bg-rose-950/95 border-rose-500/60 text-rose-200 shadow-rose-900/40"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2.5 rounded-xl glass-panel text-slate-400 hover:text-white border border-white/10 transition-colors"
              title="Voltar ao Painel de Jogos"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-black uppercase tracking-wider">
                  Super Admin
                </span>
                <span className="text-xs text-slate-400">Controle Central de Acesso</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
                <Users className="w-6 h-6 text-purple-400" />
                <span>Gestão de Usuários & Facilitadores</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg glow-purple transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Facilitador</span>
            </button>
          </div>
        </div>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Facilitadores Cadastrados</div>
              <div className="text-2xl font-black text-white">{totalFacilitators}</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Usuários Ativos</div>
              <div className="text-2xl font-black text-emerald-300">{totalActive}</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Total de Partidas Criadas</div>
              <div className="text-2xl font-black text-amber-300">{totalSessions}</div>
            </div>
          </div>
        </div>

        {/* Users Table & Filter Section */}
        <div className="glass-panel rounded-3xl border border-white/10 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, login ou e-mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div className="text-xs text-slate-400">
              Exibindo <strong>{filteredUsers.length}</strong> de <strong>{users.length}</strong> usuários
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
              <span className="text-xs">Carregando lista de facilitadores...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold">Nenhum facilitador encontrado.</p>
              <p className="text-xs text-slate-500">Clique no botão "Novo Facilitador" para liberar acesso para um professor ou instrutor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                    <th className="py-3.5 px-4">Usuário / Facilitador</th>
                    <th className="py-3.5 px-4">Login de Acesso</th>
                    <th className="py-3.5 px-4">Perfil</th>
                    <th className="py-3.5 px-4">Partidas</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-sm">{u.name}</div>
                        <div className="text-slate-400 text-[11px]">{u.email || "Sem e-mail cadastrado"}</div>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-purple-300">
                        @{u.username}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            u.role === "SUPER_ADMIN"
                              ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                              : "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                          }`}
                        >
                          {u.role === "SUPER_ADMIN" ? "Super Admin" : "Facilitador"}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-300">
                        {u._count?.sessions || 0} {u._count?.sessions === 1 ? "partida" : "partidas"}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="flex items-center gap-1.5 focus:outline-none"
                          title="Clique para alternar status"
                        >
                          {u.isActive ? (
                            <>
                              <ToggleRight className="w-5 h-5 text-emerald-400" />
                              <span className="text-emerald-400 font-bold">Ativo</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-5 h-5 text-slate-500" />
                              <span className="text-slate-500 font-bold">Desativado</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenPassword(u)}
                            className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors"
                            title="Redefinir Senha"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 transition-colors"
                            title="Editar Facilitador"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-colors"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Facilitator */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Shield className="w-5 h-5" />
                <span>Novo Facilitador</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/5"
              >
                ✕
              </button>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Criar Acesso de Facilitador</h2>
              <p className="text-xs text-slate-400 mt-1">
                O usuário terá acesso para criar partidas, despesas, recompensas e imprevistos com catálogo próprio independente.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nome Completo *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ex: Prof. Rodrigo Silveira"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Login de Acesso (Username) *</label>
                <div className="relative">
                  <span className="text-slate-500 text-xs font-bold absolute left-3 top-1/2 -translate-y-1/2">@</span>
                  <input
                    type="text"
                    placeholder="rodrigo"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    required
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">E-mail (Opcional)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="rodrigo@sebrae.com.br"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Senha Inicial *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Perfil de Acesso</label>
                <select
                  value={formRole}
                  onChange={(e: any) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-500 focus:outline-none font-medium"
                >
                  <option value="FACILITATOR">Facilitador (Cria e gerencia suas próprias partidas)</option>
                  <option value="SUPER_ADMIN">Super Administrador (Acesso total a todos os usuários e jogos)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200">
                ✨ Um catálogo completo com despesas fixas, RPG, tentações e alertas padrão será automaticamente clonado para este facilitador começar a jogar!
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg glow-purple transition-all flex items-center gap-2"
                >
                  {submitting ? "Cadastrando..." : "Cadastrar Facilitador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Facilitator */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/30 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Edit className="w-5 h-5" />
                <span>Editar Facilitador</span>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">E-mail</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Perfil</label>
                <select
                  value={formRole}
                  onChange={(e: any) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-indigo-500 focus:outline-none"
                >
                  <option value="FACILITATOR">Facilitador</option>
                  <option value="SUPER_ADMIN">Super Administrador</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-white/10">
                <span className="text-xs font-bold text-slate-300">Status da Conta</span>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className="flex items-center gap-1.5"
                >
                  {formIsActive ? (
                    <span className="text-emerald-400 text-xs font-bold">Ativo</span>
                  ) : (
                    <span className="text-rose-400 text-xs font-bold">Desativado</span>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg glow-purple"
                >
                  {submitting ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Key className="w-5 h-5" />
                <span>Redefinir Senha</span>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/5"
              >
                ✕
              </button>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Alterar Senha de {selectedUser.name}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Digite uma nova senha de acesso para o usuário <strong>@{selectedUser.username}</strong>.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nova Senha *</label>
                <input
                  type="password"
                  placeholder="Digite a nova senha"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs shadow-lg glow-amber"
                >
                  {submitting ? "Alterando..." : "Confirmar Nova Senha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
