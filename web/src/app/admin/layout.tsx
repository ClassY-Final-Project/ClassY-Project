"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { href: "/admin", label: "Genel Bakış", icon: "📊" },
  { href: "/admin/users", label: "Kullanıcılar", icon: "👥" },
  { href: "/admin/courses", label: "Kurslar", icon: "🎬" },
  { href: "/admin/reports", label: "Raporlar", icon: "📈" },
  { href: "/admin/announcements", label: "Duyurular", icon: "📢" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col py-6 px-3">
        <div className="px-3 mb-6 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center text-white text-xs font-bold">A</div>
          <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Admin Panel</span>
        </div>
        <nav className="space-y-1 flex-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          <p className="text-xs text-zinc-400 truncate">{user.email}</p>
          <Link href="/" className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            ← Platforma Dön
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
