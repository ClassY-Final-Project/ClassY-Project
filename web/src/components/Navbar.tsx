"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; message: string; isRead: boolean; createdAt: string; link?: string | null }[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("classy_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  // Sayfa değişince menüyü kapat
  useEffect(() => { setMenuOpen(false); setNotifOpen(false); }, [pathname]);

  // Bildirimler
  useEffect(() => {
    if (!user) return;
    const load = () => {
      const token = localStorage.getItem("classy_token");
      fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) { setUnread(d.unreadCount); setNotifications(d.notifications); } });
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user]);

  async function markAllRead() {
    const token = localStorage.getItem("classy_token");
    await fetch("/api/notifications", { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    setUnread(0);
    setNotifications((n) => n.map((x) => ({ ...x, isRead: true })));
  }

  async function deleteNotification(id: string) {
    const token = localStorage.getItem("classy_token");
    const res = await fetch(`/api/notifications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("classy_theme", next ? "dark" : "light");
  }

  const initials = user
    ? (user.fullName || user.email || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "";

  if (loading) return null;
  if (pathname.startsWith("/admin")) return null;

  const isInstructor = user?.role === "INSTRUCTOR";

  // Aktif plan hesapla
  const activePlan = (user?.plan && user?.planExpiresAt && new Date(user.planExpiresAt) > new Date())
    ? user.plan
    : "FREE";

  const planBadge = activePlan === "PLATINUM"
    ? { label: "💎 Platinum", cls: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" }
    : activePlan === "GOLD"
    ? { label: "⭐ Gold", cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" }
    : { label: "Ücretsiz", cls: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400" };

  const navLinks = user
    ? isInstructor
      ? [
          { href: "/instructor/dashboard", label: "📊 Panelim" },
          { href: "/instructor/courses", label: "📝 Kurslarım" },
          { href: "/instructor/earnings", label: "💰 Kazançlarım" },
          { href: "/instructor/quiz", label: "📋 Quiz" },
          { href: "/live", label: "🔴 Canlı" },
          // { href: "/study-rooms", label: "📚 Odalar" },
          { href: "/courses", label: "📖 Katalog" },
        ]
      : [
          { href: "/dashboard", label: "💻 Çalışma Alanım" },
          { href: "/study-rooms", label: "📚 Odalar" },
          { href: "/live", label: "🔴 Canlı Ders" },
          { href: "/instructors", label: "👨‍🏫 Eğitmenler" },
          { href: "/courses", label: "📖 Kurslar" },
          ...(activePlan !== "PLATINUM" ? [{ href: "/pricing", label: "⭐ Planını Yükselt", highlight: true }] : []),
        ]
    : [];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-200/50 dark:border-white/5 bg-white/70 dark:bg-[#09090b]/70 backdrop-blur-xl">
        <div className="w-full px-6 py-4 flex items-center justify-between relative">
          {/* Logo (Left) */}
          <div className="flex-1 flex items-center justify-start">
            <Link href={user?.role === "ADMIN" ? "/admin" : user ? "/dashboard" : "/"} className="flex items-center gap-0 group w-fit">
              <Image src="/logo.png" alt="ClassY Logo" width={44} height={44} className="w-11 h-11 object-contain" priority />
              <span className="font-extrabold text-2xl tracking-tight transition-transform group-hover:scale-105" style={{ color: '#763fff' }}>classY</span>
            </Link>
          </div>

          {/* Desktop Nav (Center) */}
          {user ? (
            <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center justify-center gap-1">
              {navLinks.map(l => (
                <Link key={l.href} href={l.href} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                  (l as any).highlight && pathname !== l.href
                    ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                    : pathname === l.href || pathname.startsWith(l.href + "/")
                      ? "bg-zinc-100 dark:bg-white/10 text-indigo-700 dark:text-indigo-300"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5"
                }`}>
                  {l.label}
                </Link>
              ))}
            </nav>
          ) : null}

          {/* Actions (Right) */}
          <div className="flex-1 flex items-center justify-end gap-3">
            {/* Dark mode toggle */}
            <button onClick={toggleDark} title={dark ? "Açık mod" : "Gece modu"}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors">
              {dark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>

            {/* Bildirim zili */}
            {user && (
              <div className="relative">
                <button onClick={() => { setNotifOpen((v) => !v); if (unread > 0) markAllRead(); }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors relative">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unread > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-[#09090b]"></span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-14 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/5">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">Bildirimler</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center">
                          <p className="text-sm text-zinc-400 font-medium">Yeni bildiriminiz yok</p>
                        </div>
                      ) : notifications.map((n) => {
                        const inner = (
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">{n.message}</p>
                              <p className="text-xs text-zinc-400 mt-1 font-medium">{new Date(n.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNotification(n.id); }}
                              className="shrink-0 p-1 text-zinc-300 hover:text-red-500 transition-colors mt-0.5"
                              title="Bildirimi sil"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                        return (
                          <div key={n.id} className={`px-4 py-3.5 border-b border-zinc-50 dark:border-white/5 last:border-0 ${n.isRead ? "opacity-70" : "bg-indigo-50/50 dark:bg-indigo-500/10"}`}>
                            {n.link ? (
                              <Link href={n.link} onClick={() => setNotifOpen(false)} className="flex items-start gap-2 hover:opacity-80 transition-opacity">
                                {inner}
                              </Link>
                            ) : (
                              <div className="flex items-start gap-2">{inner}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Plan badge */}
            {user && !isInstructor && (
              <span className={`hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${planBadge.cls}`}>
                {planBadge.label}
              </span>
            )}

            {/* Desktop Auth */}
            {user ? (
              <div className="hidden md:flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-white/10">
                <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white leading-none">{user.fullName || "Kullanıcı"}</span>
                    <span className="text-xs text-zinc-500 font-medium mt-1">{isInstructor ? "Eğitmen" : "Öğrenci"}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white dark:ring-zinc-900">
                    {initials}
                  </div>
                </Link>
                <button onClick={logout} title="Çıkış"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors">
                  <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : pathname !== "/" ? (
              <div className="hidden md:flex items-center gap-3">
                <Link href="/login" className="px-5 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">Giriş Yap</Link>
                <Link href="/register" className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-md">Kayıt Ol</Link>
              </div>
            ) : null}

            {/* Hamburger (mobil) */}
            <button onClick={() => setMenuOpen(v => !v)}
              className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-indigo-600 transition-colors">
              <span className={`block w-5 h-0.5 bg-current transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block w-5 h-0.5 bg-current transition-all ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-5 h-0.5 bg-current transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobil Menü */}
      {menuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-white/5 shadow-2xl px-6 py-6 space-y-2">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} className={`block px-5 py-4 rounded-2xl text-base font-bold transition-colors ${
              pathname === l.href || pathname.startsWith(l.href + "/")
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5"
            }`}>
              {l.label}
            </Link>
          ))}
          <div className="border-t border-zinc-200/50 dark:border-white/5 pt-4 mt-4">
            {user ? (
              <div className="flex items-center justify-between">
                <Link href="/profile" className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {initials}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-40">{user.fullName || user.email}</span>
                    <span className="text-xs text-zinc-500">{isInstructor ? "Eğitmen" : "Öğrenci"}</span>
                  </div>
                </Link>
                <button onClick={logout} className="w-10 h-10 flex items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400">
                  <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link href="/login" className="w-full text-center py-3.5 bg-zinc-100 dark:bg-white/5 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white">Giriş Yap</Link>
                <Link href="/register" className="w-full text-center py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-sm font-bold">Kayıt Ol</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
