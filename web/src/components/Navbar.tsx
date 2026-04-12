"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `text-sm font-medium transition-colors ${
      pathname === href
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
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Auth */}
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">
              {user.fullName || user.email}
            </span>
            <button
              onClick={logout}
              className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              Çıkış
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </header>
  );
}
