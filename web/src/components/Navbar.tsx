"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; message: string; isRead: boolean; createdAt: string }[]>([]);
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

  const linkClass = (href: string) =>
    `text-sm font-medium transition-colors ${
      pathname === href || pathname.startsWith(href + "/")
        ? "text-indigo-600 dark:text-indigo-400"
        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
    }`;

  const mobileLinkClass = (href: string) =>
    `block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
      pathname === href || pathname.startsWith(href + "/")
        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
    }`;

  const initials = user
    ? (user.fullName || user.email || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "";

  if (loading) return null;
  if (pathname.startsWith("/admin")) return null;

  const isInstructor = user?.role === "INSTRUCTOR";

  const navLinks = user
    ? isInstructor
      ? [
          { href: "/instructor/dashboard", label: "Panelim" },
          { href: "/instructor/courses", label: "Kurslarım" },
          { href: "/instructor/earnings", label: "Kazançlarım" },
          { href: "/instructor/quiz", label: "Quiz" },
          { href: "/live", label: "🔴 Canlı" },
          { href: "/study-rooms", label: "📚 Odalar" },
          { href: "/courses", label: "Katalog" },
        ]
      : [
          { href: "/dashboard", label: "Çalışma Alanım" },
          { href: "/study-rooms", label: "📚 Odalar" },
          { href: "/live", label: "🔴 Canlı Ders" },
          { href: "/instructors", label: "Eğitmenler" },
          { href: "/courses", label: "Kurslar" },
        ]
    : [];

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* SOL: Logo */}
          <div className="flex items-center">
            <Link href={user?.role === "ADMIN" ? "/admin" : user ? "/dashboard" : "/"} className="flex items-center">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg mr-2.5 shadow-sm shadow-indigo-200 dark:shadow-none">
                C
              </div>
              <span className="font-bold text-zinc-900 dark:text-white text-xl tracking-tight hidden sm:block">ClassY</span>
            </Link>
          </div>

          {/* ORTA: Desktop Nav Links (Centered) */}
          <div className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2">
            {user && (
              <nav className="flex items-center gap-6 lg:gap-8">
                {navLinks.map(l => (
                  <Link key={l.href} href={l.href} className={linkClass(l.href)}>{l.label}</Link>
                ))}
              </nav>
            )}
          </div>

          {/* SAĞ: Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Dark mode toggle */}
            <button onClick={toggleDark} title={dark ? "Açık mod" : "Gece modu"}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
              {dark ? (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>

            {/* Bildirim zili */}
            {user && (
              <div className="relative">
                <button onClick={() => { setNotifOpen((v) => !v); if (unread > 0) markAllRead(); }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all relative">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900" />
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5">
                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
                      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Bildirimler</p>
                      {unread > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-md">YENİ</span>}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center">
                          <p className="text-2xl mb-1 opacity-20">🔔</p>
                          <p className="text-sm text-zinc-400">Henüz bildirim yok</p>
                        </div>
                      ) : notifications.map((n) => (
                        <div key={n.id} className={`group relative px-4 py-3.5 text-xs transition-colors ${n.isRead ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-800 dark:text-zinc-200 bg-indigo-50/30 dark:bg-indigo-900/10 font-medium"}`}>
                          <p className="leading-relaxed pr-6">{n.message}</p>
                          <p className="text-[10px] text-zinc-400 mt-1.5">{new Date(n.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                          <button onClick={() => deleteNotification(n.id)} className="absolute right-2 top-3 w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Sil">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profil ve Çıkış */}
            {user ? (
              <div className="hidden md:flex items-center gap-3 ml-2 pl-4 border-l border-zinc-200 dark:border-zinc-800">
                <Link href="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" title="Profilim">
                  <div className="w-8 h-8 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm shadow-indigo-200 dark:shadow-none">
                    {initials}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 max-w-24 truncate leading-none mb-0.5">{user.fullName || "Kullanıcı"}</p>
                    <p className="text-[10px] text-zinc-400 truncate max-w-24 leading-none">Profilim</p>
                  </div>
                </Link>
                <button onClick={logout}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  title="Güvenli Çıkış">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : pathname !== "/" ? (
              <div className="hidden md:flex items-center gap-3">
                <Link href="/login" className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Giriş Yap</Link>
                <Link href="/register" className="text-sm px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-sm shadow-indigo-200 dark:shadow-none">Kayıt Ol</Link>
              </div>
            ) : null}

            {/* Hamburger (mobil) */}
            <button onClick={() => setMenuOpen(v => !v)}
              className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
              <span className={`block w-4.5 h-0.5 bg-current transition-all ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
              <span className={`block w-4.5 h-0.5 bg-current transition-all ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-4.5 h-0.5 bg-current transition-all ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobil Menü */}
      {menuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14.25 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-lg px-4 py-3 space-y-1">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} className={mobileLinkClass(l.href)}>{l.label}</Link>
          ))}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-2">
            {user ? (
              <div className="flex items-center justify-between px-4 py-2">
                <Link href="/profile" className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs">{initials}</div>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-40">{user.fullName || user.email}</span>
                </Link>
                <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium">Çıkış</button>
              </div>
            ) : (
              <div className="flex gap-2 px-4 py-2">
                <Link href="/login" className="flex-1 text-center py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-600">Giriş Yap</Link>
                <Link href="/register" className="flex-1 text-center py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Kayıt Ol</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
