"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AccessibilityPanel from "./AccessibilityPanel";
import GlobalSearch from "./GlobalSearch";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("classy_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(saved ? saved === "dark" : prefersDark);
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<
    {
      id: string;
      message: string;
      isRead: boolean;
      createdAt: string;
      link?: string | null;
    }[]
  >([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }

    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!user) return;

    const load = () => {
      const token = localStorage.getItem("classy_token");
      fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data) {
            setUnread(data.unreadCount);
            setNotifications(data.notifications);
          }
        });
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user]);

  async function markAllRead() {
    const token = localStorage.getItem("classy_token");
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setUnread(0);
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true })),
    );
  }

  async function deleteNotification(id: string) {
    const token = localStorage.getItem("classy_token");
    const response = await fetch(`/api/notifications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      setNotifications((current) =>
        current.filter((notification) => notification.id !== id),
      );
    }
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("classy_theme", next ? "dark" : "light");
  }

  const initials = user
    ? (user.fullName || user.email || "?")
        .split(" ")
        .map((word: string) => word[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  if (loading) return null;
  if (pathname.startsWith("/admin")) return null;

  const isInstructor = user?.role === "INSTRUCTOR";
  const activePlan =
    user?.plan && user?.planExpiresAt && new Date(user.planExpiresAt) > new Date()
      ? user.plan
      : "FREE";

  const planBadge =
    activePlan === "PLATINUM"
      ? {
          label: "💎 Platinum",
          cls: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
        }
      : activePlan === "GOLD"
        ? {
            label: "⭐ Gold",
            cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
          }
        : {
            label: "Ücretsiz",
            cls: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
          };

  const navLinks = user
    ? isInstructor
      ? [
          { href: "/instructor/dashboard", label: "📊 Panelim" },
          { href: "/instructor/courses", label: "📝 Kurslarım" },
          { href: "/instructor/earnings", label: "💰 Kazançlarım" },
          { href: "/instructor/quiz", label: "📋 Quiz" },
          { href: "/live", label: "🔴 Canlı" },
          { href: "/courses", label: "📖 Katalog" },
        ]
      : [
          { href: "/dashboard", label: "💻 Çalışma Alanım" },
          { href: "/study-rooms", label: "📚 Odalar" },
          { href: "/live", label: "🔴 Canlı Ders" },
          { href: "/instructors", label: "👨‍🏫 Eğitmenler" },
          { href: "/courses", label: "📖 Kurslar" },
        ]
    : [];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-200/50 bg-white/70 backdrop-blur-xl dark:border-white/5 dark:bg-[#09090b]/70">
        <div className="flex min-h-[64px] w-full items-center gap-3 px-6 py-4">
          <div className="shrink-0">
            <Link
              href={user?.role === "ADMIN" ? "/admin" : user ? "/dashboard" : "/"}
              className="group flex w-fit items-center gap-0"
            >
              <Image
                src="/logo.png"
                alt="ClassY Logo"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
                priority
              />
              <span
                className="text-2xl font-extrabold tracking-tight transition-transform group-hover:scale-105"
                style={{ color: "#763fff" }}
                translate="no"
              >
                classY
              </span>
            </Link>
          </div>

          {user ? (
            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-hidden xl:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-all duration-300 ${
                    pathname === link.href || pathname.startsWith(link.href + "/")
                      ? "bg-zinc-100 text-indigo-700 dark:bg-white/10 dark:text-indigo-300"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : (
            <div className="flex-1" />
          )}

          <div className="ml-auto flex shrink-0 items-center justify-end gap-3">
            {user && <GlobalSearch />}

            <AccessibilityPanel />

            <button
              onClick={toggleDark}
              title={dark ? "Açık mod" : "Gece modu"}
              data-classy-control="icon-button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10"
            >
              {dark ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                  />
                </svg>
              )}
            </button>

            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    setNotifOpen((current) => !current);
                    if (unread > 0) {
                      void markAllRead();
                    }
                  }}
                  data-classy-control="icon-button"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {unread > 0 && (
                    <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-red-500 dark:border-[#09090b]" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
                    <div className="border-b border-zinc-100 px-5 py-4 dark:border-white/5">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        Bildirimler
                      </p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center">
                          <p className="text-sm font-medium text-zinc-400">
                            Yeni bildiriminiz yok
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => {
                          const inner = (
                            <div className="flex min-w-0 flex-1 items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium leading-relaxed text-zinc-800 dark:text-zinc-200">
                                  {notification.message}
                                </p>
                                <p className="mt-1 text-xs font-medium text-zinc-400">
                                  {new Date(notification.createdAt).toLocaleDateString(
                                    "tr-TR",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </p>
                              </div>
                              <button
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  void deleteNotification(notification.id);
                                }}
                                className="mt-0.5 shrink-0 p-1 text-zinc-300 transition-colors hover:text-red-500"
                                title="Bildirimi sil"
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          );

                          return (
                            <div
                              key={notification.id}
                              className={`border-b border-zinc-50 px-4 py-3.5 last:border-0 dark:border-white/5 ${
                                notification.isRead
                                  ? "opacity-70"
                                  : "bg-indigo-50/50 dark:bg-indigo-500/10"
                              }`}
                            >
                              {notification.link ? (
                                <Link
                                  href={notification.link}
                                  onClick={() => setNotifOpen(false)}
                                  className="flex items-start gap-2 transition-opacity hover:opacity-80"
                                >
                                  {inner}
                                </Link>
                              ) : (
                                <div className="flex items-start gap-2">{inner}</div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user && !isInstructor && (
              activePlan === "FREE" ? (
                <Link
                  href="/pricing"
                  data-classy-control="upgrade-button"
                  className="hidden whitespace-nowrap rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 lg:inline-flex"
                >
                  ⭐ Planını Yükselt
                </Link>
              ) : (
                <Link
                  href="/pricing"
                  className={`hidden items-center rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-75 lg:inline-flex ${planBadge.cls}`}
                >
                  {planBadge.label}
                </Link>
              )
            )}

            {user ? (
              <div className="hidden items-center gap-3 border-l border-zinc-200 pl-4 dark:border-white/10 lg:flex">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 transition-opacity hover:opacity-80"
                >
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold leading-none text-zinc-900 dark:text-white">
                      {user.fullName || "Kullanıcı"}
                    </span>
                    <span className="mt-1 text-xs font-medium text-zinc-500">
                      {isInstructor ? "Eğitmen" : "Öğrenci"}
                    </span>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-900">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName || ""}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                </Link>
                <button
                  onClick={logout}
                  title="Çıkış"
                  data-classy-control="icon-button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-500 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <svg
                    className="ml-1 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            ) : pathname !== "/" ? (
              <div className="hidden items-center gap-3 lg:flex">
                <Link
                  href="/login"
                  className="px-5 py-2.5 text-sm font-bold text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-105 dark:bg-white dark:text-zinc-900"
                >
                  Kayıt Ol
                </Link>
              </div>
            ) : null}

            <button
              onClick={() => setMenuOpen((current) => !current)}
              data-classy-control="icon-button"
              className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:text-indigo-600 dark:bg-white/5 xl:hidden"
            >
              <span
                className={`block h-0.5 w-5 bg-current transition-all ${
                  menuOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-5 bg-current transition-all ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-5 bg-current transition-all ${
                  menuOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-x-0 top-16 z-40 space-y-2 border-b border-zinc-200/50 bg-white/90 px-6 py-6 shadow-2xl backdrop-blur-2xl dark:border-white/5 dark:bg-zinc-950/90 xl:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-2xl px-5 py-4 text-base font-bold transition-colors ${
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-4 border-t border-zinc-200/50 pt-4 dark:border-white/5">
            <div className="mb-4">
              <AccessibilityPanel
                mobileLabel
                buttonClassName="flex w-full items-center justify-center rounded-2xl bg-zinc-100 px-4 py-3.5 text-sm font-bold text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              />
            </div>

            {user ? (
              <div className="flex items-center justify-between">
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName || ""}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="max-w-40 truncate text-sm font-bold text-zinc-900 dark:text-white">
                      {user.fullName || user.email}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {isInstructor ? "Eğitmen" : "Öğrenci"}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={logout}
                  data-classy-control="icon-button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"
                >
                  <svg
                    className="ml-1 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="w-full rounded-2xl bg-zinc-100 py-3.5 text-center text-sm font-bold text-zinc-900 dark:bg-white/5 dark:text-white"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="w-full rounded-2xl bg-zinc-900 py-3.5 text-center text-sm font-bold text-white dark:bg-white dark:text-zinc-900"
                >
                  Kayıt Ol
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
