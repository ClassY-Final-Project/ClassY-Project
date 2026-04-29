"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/Skeleton";

interface UserItem {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  createdAt: string;
}

const ROLES = ["STUDENT", "INSTRUCTOR", "ADMIN"] as const;
type Role = typeof ROLES[number];

const ROLE_LABEL: Record<Role, string> = { STUDENT: "Öğrenci", INSTRUCTOR: "Eğitmen", ADMIN: "Admin" };
const ROLE_COLOR: Record<Role, string> = {
  STUDENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  INSTRUCTOR: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: "", fullName: "", password: "", role: "STUDENT" });
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => { if (token) loadUsers(); }, [token]);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function changeRole(userId: string, newRole: string) {
    setChangingRole(userId);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      showToast("Rol güncellendi.", true);
    } else {
      showToast("Rol güncellenemedi.", false);
    }
    setChangingRole(null);
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`"${name}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
    setDeleting(userId);
    const res = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast("Kullanıcı silindi.", true);
    } else {
      showToast("Silinemedi.", false);
    }
    setDeleting(null);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Kullanıcı oluşturuldu.", true);
      setShowCreate(false);
      setForm({ email: "", fullName: "", password: "", role: "STUDENT" });
      loadUsers();
    } else {
      showToast(data.error || "Hata oluştu.", false);
    }
    setCreating(false);
  }

  const filtered = users.filter((u) => {
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchSearch = !search.trim() ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.fullName || "").toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="p-8 space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium text-white transition-all ${toast.ok ? "bg-emerald-500" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Kullanıcılar</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{users.length} kullanıcı</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          + Yeni Kullanıcı
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input type="text" placeholder="Ad veya e-posta ara..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="ALL">Tüm Roller</option>
          <option value="STUDENT">Öğrenci</option>
          <option value="INSTRUCTOR">Eğitmen</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_1.4fr_140px_auto_auto] text-xs font-semibold text-zinc-400 uppercase tracking-wider px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 gap-4">
          <span>Ad Soyad</span><span>E-posta</span><span>Rol</span><span>Kayıt Tarihi</span><span></span>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-12">Kullanıcı bulunamadı.</p>
        ) : (
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {filtered.map((u) => (
              <div key={u.id} className="grid grid-cols-[1fr_1.4fr_140px_auto_auto] items-center px-6 py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0">
                    {(u.fullName || u.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{u.fullName || "—"}</span>
                </div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{u.email}</span>
                {/* Rol değiştirme dropdown */}
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  disabled={changingRole === u.id}
                  className={`text-xs font-medium px-2 py-1.5 rounded-lg border-0 cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 ${(ROLE_COLOR as any)[u.role] ?? ""}`}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
                <span className="text-xs text-zinc-400 whitespace-nowrap">
                  {new Date(u.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <button onClick={() => deleteUser(u.id, u.fullName || u.email)}
                  disabled={deleting === u.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 font-medium transition-colors">
                  {deleting === u.id ? "..." : "Sil"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-zinc-800 dark:text-white mb-4">Yeni Kullanıcı Oluştur</h2>
            <form onSubmit={createUser} className="space-y-4">
              {[
                { label: "Ad Soyad", key: "fullName", type: "text", placeholder: "Ahmet Yılmaz" },
                { label: "E-posta", key: "email", type: "email", placeholder: "ahmet@ornek.com" },
                { label: "Şifre", key: "password", type: "password", placeholder: "••••••••" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">{f.label}</label>
                  <input type={f.type} required={f.key !== "fullName"}
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Rol</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="STUDENT">Öğrenci</option>
                  <option value="INSTRUCTOR">Eğitmen</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  İptal
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-60 transition-colors">
                  {creating ? "Oluşturuluyor..." : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
