"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";

export default function ProfilePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
    }
  }, [user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: fullName.trim(), bio: bio.trim() }),
      });
      if (res.ok) {
        showToast("Profil güncellendi.", "success");
      } else {
        const j = await res.json();
        showToast(j.error || "Güncelleme başarısız.", "error");
      }
    } catch {
      showToast("Sunucuya bağlanılamadı.", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("Şifreler eşleşmiyor.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Şifre en az 6 karakter olmalıdır.", "error");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        showToast("Şifre başarıyla değiştirildi.", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const j = await res.json();
        showToast(j.error || "Şifre değiştirilemedi.", "error");
      }
    } catch {
      showToast("Sunucuya bağlanılamadı.", "error");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return null;

  const initials = (user?.fullName || user?.email || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = user?.role === "INSTRUCTOR" ? "Eğitmen" : user?.role === "ADMIN" ? "Admin" : "Öğrenci";
  const roleBadge = user?.role === "INSTRUCTOR"
    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
    : user?.role === "ADMIN"
    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Profil Kartı */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 flex items-center gap-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-md">
            {initials}
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">{user?.fullName || "İsimsiz Kullanıcı"}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{user?.email}</p>
            <span className={`inline-block mt-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${roleBadge}`}>
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Sekmeler */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-1">
          {([["profile", "Profil Bilgileri"], ["password", "Şifre Değiştir"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? "bg-white dark:bg-zinc-700 text-indigo-700 dark:text-indigo-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Profil Bilgileri */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Profil Bilgileri</h2>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Ad Soyad</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Adınız Soyadınız"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">E-posta</label>
              <input type="email" value={user?.email || ""} disabled
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 text-sm cursor-not-allowed" />
              <p className="text-xs text-zinc-400 mt-1">E-posta adresi değiştirilemez.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Hakkımda</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                placeholder="Kendinizden kısaca bahsedin..."
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all resize-none" />
            </div>

            <button type="submit" disabled={savingProfile}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm">
              {savingProfile ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </form>
        )}

        {/* Şifre Değiştir */}
        {activeTab === "password" && (
          <form onSubmit={handleSavePassword} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Şifre Değiştir</h2>

            {[
              { label: "Mevcut Şifre", value: currentPassword, onChange: setCurrentPassword, placeholder: "••••••••" },
              { label: "Yeni Şifre", value: newPassword, onChange: setNewPassword, placeholder: "En az 6 karakter" },
              { label: "Yeni Şifre Tekrar", value: confirmPassword, onChange: setConfirmPassword, placeholder: "Şifreyi tekrar girin" },
            ].map(({ label, value, onChange, placeholder }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{label}</label>
                <input type="password" value={value} onChange={(e) => onChange(e.target.value)} required placeholder={placeholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all" />
              </div>
            ))}

            <button type="submit" disabled={savingPassword}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm">
              {savingPassword ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
