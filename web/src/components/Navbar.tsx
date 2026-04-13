"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("classy_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

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

  if (loading) return null;

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-6">
        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base">
            C
          </div>
          <span className="font-bold text-zinc-900 dark:text-white text-lg">ClassY</span>
        </Link>

        {/* Nav Links */}
        {user && (
          <>
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              Çalışma Alanım
            </Link>
            <Link href="/study" className={linkClass("/study")}>
              AI Asistan
            </Link>
            <Link href="/live" className={linkClass("/live")}>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Canlı Ders
              </span>
            </Link>
            <Link href="/instructors" className={linkClass("/instructors")}>
              Eğitmenler
            </Link>
            <Link href="/courses" className={linkClass("/courses")}>
              Kurslar
            </Link>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          title={dark ? "Açık mod" : "Gece modu"}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          {dark ? (
            /* Sun icon */
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            /* Moon icon */
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>

        {/* Auth */}
        {user ? (
          <div className="flex items-center gap-3">
            <Link href="/profile"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title="Profilim">
              <div className="w-7 h-7 rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {(user.fullName || user.email || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <span className="text-sm text-zinc-600 dark:text-zinc-400 hidden sm:block max-w-28 truncate">
                {user.fullName || user.email}
              </span>
            </Link>
            <button
              onClick={logout}
              className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              Çıkış
            </button>
          </div>
        ) : pathname !== "/" ? (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Kayıt Ol
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
