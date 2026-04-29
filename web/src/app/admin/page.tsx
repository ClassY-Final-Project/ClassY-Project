"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/Skeleton";

interface Stats {
  totalUsers: number;
  students: number;
  instructors: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  newUsersThisMonth: number;
  totalRevenue: number;
  activity: { type: "enrollment" | "published"; text: string; price: number | null; date: string }[];
}

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, [token]);

  const CARDS = [
    { label: "Toplam Kullanıcı", value: stats?.totalUsers, icon: "👥", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
    { label: "Bu Ay Yeni Kayıt", value: stats?.newUsersThisMonth, icon: "✨", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40" },
    { label: "Öğrenci", value: stats?.students, icon: "🎓", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
    { label: "Eğitmen", value: stats?.instructors, icon: "👨‍🏫", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/40" },
    { label: "Yayındaki Kurs", value: stats?.publishedCourses, icon: "🎬", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Toplam Kayıt", value: stats?.totalEnrollments, icon: "📋", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/40" },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Başlık + Gelir */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Genel Bakış</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Platform geneli istatistikler</p>
        </div>
        <div className="text-right bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 shadow-sm">
          {loading ? (
            <Skeleton className="h-8 w-28 mb-1" />
          ) : (
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              ₺{(stats?.totalRevenue ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-xs text-zinc-400 mt-1">Toplam Platform Geliri</p>
        </div>
      </div>

      {/* İstatistik kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {CARDS.map((c) => (
          <div key={c.label} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${c.bg}`}>{c.icon}</div>
            {loading ? <Skeleton className="h-8 w-14 mb-1" /> : (
              <p className={`text-3xl font-extrabold ${c.color}`}>{c.value ?? 0}</p>
            )}
            <p className="text-sm text-zinc-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Son aktivite */}
      <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-800 dark:text-zinc-200">Son Aktivite</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !stats?.activity.length ? (
          <p className="text-sm text-zinc-400 text-center py-10">Henüz aktivite yok.</p>
        ) : (
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {stats.activity.map((a, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                  a.type === "enrollment"
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-500"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500"
                }`}>
                  {a.type === "enrollment" ? "📋" : "✅"}
                </div>
                <p className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 truncate">{a.text}</p>
                {a.price != null && a.price > 0 && (
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    +₺{a.price.toLocaleString("tr-TR")}
                  </span>
                )}
                <span className="text-xs text-zinc-400 whitespace-nowrap shrink-0">
                  {new Date(a.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
