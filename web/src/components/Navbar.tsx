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
          { href: "/courses", label: "Katalog" },
        ]
      : [
          { href: "/dashboard", label: "Çalışma Alanım" },
          { href: "/live", label: "🔴 Canlı Ders" },
          { href: "/instructors", label: "Eğitmenler" },
          { href: "/courses", label: "Kurslar" },
        ]
    : [];

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-6">
          {/* Logo */}
          <Link href={user?.role === "ADMIN" ? "/admin" : user ? "/dashboard" : "/"} className="flex items-center gap-2 mr-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base">C</div>
            <span className="font-bold text-zinc-900 dark:text-white text-lg">ClassY</span>
          </Link>

          {/* Desktop Nav */}
          {user && (
            <nav className="hidden md:flex items-center gap-5">
              {navLinks.map(l => (
                <Link key={l.href} href={l.href} className={linkClass(l.href)}>{l.label}</Link>
              ))}
            </nav>
          )}

          <div className="flex-1" />

          {/* Dark mode toggle */}
          <button onClick={toggleDark} title={dark ? "Açık mod" : "Gece modu"}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {dark ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          {/* Bildirim zili */}
          {user && (
            <div className="relative">
              <button onClick={() => { setNotifOpen((v) => !v); if (unread > 0) markAllRead(); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors relative">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-10 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Bildirimler</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-zinc-400 text-center py-6">Bildirim yok</p>
                    ) : notifications.map((n) => (
                      <div key={n.id} className={`px-4 py-3 text-xs ${n.isRead ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-300 bg-indigo-50/50 dark:bg-indigo-950/20"}`}>
                        <p>{n.message}</p>
                        <p className="text-zinc-400 mt-0.5">{new Date(n.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop Auth */}
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Profilim">
                <div className="w-7 h-7 rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {initials}
                </div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400 max-w-28 truncate">{user.fullName || user.email}</span>
              </Link>
              <button onClick={logout}
                className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                Çıkış
              </button>
            </div>
          ) : pathname !== "/" ? (
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Giriş Yap</Link>
              <Link href="/register" className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">Kayıt Ol</Link>
            </div>
          ) : null}

          {/* Hamburger (mobil) */}
          <button onClick={() => setMenuOpen(v => !v)}
            className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
            <span className={`block w-4 h-0.5 bg-current transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-4 h-0.5 bg-current transition-all ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-4 h-0.5 bg-current transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
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
