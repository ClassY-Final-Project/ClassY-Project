"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { uploadFileToStorage } from "@/lib/upload";

export default function ProfilePage() {
  const { user, token, loading, refreshUser, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [cancelModal, setCancelModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const PLAN_LOSSES: Record<string, string[]> = {
    GOLD: [
      "Her hafta 5 yerine 1 PDF yükleyebileceksiniz",
      "Haftada 1 çalışma odası oluşturma hakkı kaybolacak",
      "Gold çalışma odalarına giremeyeceksiniz",
    ],
    PLATINUM: [
      "Her hafta 10 yerine 1 PDF yükleyebileceksiniz",
      "Haftada 5 çalışma odası oluşturma hakkı kaybolacak",
      "Platinum ve Gold odalara giremeyeceksiniz",
      "Öncelikli destekten yararlanamayacaksınız",
    ],
  };

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setBio(user.bio || "");
      setAvatarUrl(user.avatarUrl ?? null);
    }
  }, [user]);

  async function handleUploadAvatar(file: File) {
    setUploadingAvatar(true);
    try {
      const url = await uploadFileToStorage(file, token!);
      const patchRes = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatarUrl: url }),
      });
      if (patchRes.ok) {
        setAvatarUrl(url);
        await refreshUser();
        showToast("Profil fotoğrafı güncellendi.", "success");
      } else {
        const j = await patchRes.json();
        showToast(j.error || "Güncelleme başarısız.", "error");
      }
    } catch (e: unknown) {
      showToast((e as Error).message || "Sunucuya bağlanılamadı.", "error");
    } finally {
      setUploadingAvatar(false);
    }
  }

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
        await refreshUser();
        showToast("Profil güncellendi.", "success");
      } else {
        const j = await res.json();
        showToast(j.error || "Güncelleme başarısız.", "error");
      }
    } catch {
      showToast("Sunucuya baglanılamadı.", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { showToast("Şifreler eşleşmiyor.", "error"); return; }
    if (newPassword.length < 6) { showToast("Şifre en az 6 karakter olmalıdır.", "error"); return; }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        showToast("Şifre başarıyla değiştirildi.", "success");
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      } else {
        const j = await res.json();
        showToast(j.error || "Şifre değiştirilemedi.", "error");
      }
    } catch {
      showToast("Sunucuya baglanılamadı.", "error");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleCancelPlan() {
    try {
      const res = await fetch("/api/plans/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast("Plan iptal edildi.", "success");
        setCancelModal(false);
        await refreshUser();
      } else {
        const j = await res.json();
        showToast(j.error || "İptal başarısız.", "error");
      }
    } catch {
      showToast("Sunucuya baglanılamadı.", "error");
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast("Hesabınız silindi.", "success");
        logout();
        router.push("/");
      } else {
        const j = await res.json();
        showToast(j.error || "Hesap silinemedi.", "error");
      }
    } catch {
      showToast("Sunucuya baglanılamadı.", "error");
    } finally {
      setDeletingAccount(false);
    }
  }

  if (loading) return null;

  const initials = (user?.fullName || user?.email || "?")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const roleLabel = user?.role === "INSTRUCTOR" ? "Eğitmen" : user?.role === "ADMIN" ? "Admin" : "Öğrenci";
  const roleBadge = user?.role === "INSTRUCTOR"
    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
    : user?.role === "ADMIN"
    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";

  const activePlan = (user?.plan && user?.planExpiresAt && new Date(user.planExpiresAt) > new Date())
    ? user.plan : "FREE";
  const planBadge = activePlan === "PLATINUM"
    ? { label: "💎 Platinum", cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" }
    : activePlan === "GOLD"
    ? { label: "⭐ Gold", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" }
    : { label: "Ücretsiz Plan", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" };

  const planLosses = PLAN_LOSSES[activePlan] || [];

  return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Profil Karti */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0 group">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-2xl">
                    {initials}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
              >
                {uploadingAvatar ? (
                  <div className="w-5 h-5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadAvatar(f); e.target.value = ""; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-zinc-900 dark:text-white">{user?.fullName || "Isimsiz Kullanici"}</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{user?.email}</p>
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${roleBadge}`}>{roleLabel}</span>
              </div>
            </div>
            {user?.role !== "INSTRUCTOR" && user?.role !== "ADMIN" && (
              <div className="shrink-0 text-right">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold mb-2 ${planBadge.cls}`}>
                  {planBadge.label}
                </div>
                {activePlan !== "FREE" && user?.planExpiresAt && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2">
                    {new Date(user.planExpiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })} tarihine kadar
                  </p>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => router.push("/pricing")}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    {activePlan === "FREE" ? "Plan Yükselt" : "Planı Değiştir"}
                  </button>
                  {activePlan !== "FREE" && (
                    <button
                      onClick={() => setCancelModal(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      İptal Et
                    </button>
                  )}
                </div>
              </div>
            )}
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
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Adınız Soyadınız"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">E-posta</label>
              <input type="email" value={user?.email || ""} disabled
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 text-sm cursor-not-allowed" />
              <p className="text-xs text-zinc-400 mt-1">E-posta adresi değiştirilemez.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Hakkimda</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Kendinizden kısaca bahsedin..."
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

        {/* Hesabı Sil */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-red-200 dark:border-red-900/40 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Tehlikeli Bölge</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak silinir ve bu işlem geri alınamaz.
          </p>
          <button onClick={() => setDeleteModal(true)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
            🗑️ Hesabımı Sil
          </button>
        </div>

      </div>

      {/* Plan Iptal Modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Planı İptal Et</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Planınızı iptal ederseniz şu avantajlardan yararlanamazsınız:
            </p>
            <ul className="space-y-2 mb-6">
              {planLosses.map((loss, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="text-red-500 mt-0.5 shrink-0">x</span>
                  {loss}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button onClick={() => setCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors">
                Vazgeç
              </button>
              <button onClick={handleCancelPlan}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
                Planı İptal Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hesap Silme Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 w-full max-w-md shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4 text-2xl">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white text-center mb-2">Hesabı Sil</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">
              Bu işlem geri alınamaz. Tüm verileriniz, kurslarınız ve çalışma geçmişiniz kalıcı olarak silinecektir.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors">
                İptal
              </button>
              <button onClick={handleDeleteAccount} disabled={deletingAccount}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {deletingAccount ? "Siliniyor..." : "Evet, Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
