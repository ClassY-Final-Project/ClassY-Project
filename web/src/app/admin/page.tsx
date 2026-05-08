"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/Skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

interface Stats {
  totalUsers: number;
  students: number;
  instructors: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  newUsersThisMonth: number;
  totalRevenue: number;
  liveRooms: number;
  studyRooms: number;
  activity: { type: "enrollment" | "published"; text: string; price: number | null; date: string }[];
  monthlyStats: { month: string; users: number; enrollments: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
}

const ROLE_COLORS = ["#6366f1", "#10b981", "#f59e0b"];

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
    { label: "Toplam Kurs Kaydı", value: stats?.totalEnrollments, icon: "📋", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/40" },
    { label: "Canlı Ders Odası", value: stats?.liveRooms, icon: "🔴", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40" },
    { label: "Çalışma Odası", value: stats?.studyRooms, icon: "📚", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
  ];

  const roleData = stats ? [
    { name: "Öğrenci", value: stats.students },
    { name: "Eğitmen", value: stats.instructors },
    { name: "Admin", value: Math.max(0, stats.totalUsers - stats.students - stats.instructors) },
  ].filter((d) => d.value > 0) : [];

  return (
    <div className="p-8 space-y-8 min-h-full">
      {/* Başlık + Gelir */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Genel Bakış</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Platform geneli istatistikler</p>
        </div>
        <div className="text-right bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 shadow-sm">
          {loading ? (
            <Skeleton className="h-8 w-28 mb-1" />
          ) : (
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              ₺{(stats?.totalRevenue ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-xs text-zinc-400 mt-1">Toplam Platform Geliri</p>
        </div>
      </div>

      {/* İstatistik kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

      {/* Grafikler — aylık büyüme + kullanıcı dağılımı */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-5">Aylık Büyüme</h2>
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.monthlyStats ?? []} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "none", borderRadius: 12, color: "#fafafa", fontSize: 13 }}
                    cursor={{ fill: "rgba(99,102,241,0.07)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
                  <Bar dataKey="users" name="Yeni Kullanıcı" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="enrollments" name="Kurs Kaydı" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-5">Kullanıcı Dağılımı</h2>
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : roleData.length > 0 ? (
            <div className="flex flex-col items-center">
              <div style={{ width: "100%", height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                      {roleData.map((_, i) => (
                        <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "none", borderRadius: 12, color: "#fafafa", fontSize: 13 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 w-full mt-3">
                {roleData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: ROLE_COLORS[i] }} />
                      <span className="text-zinc-600 dark:text-zinc-400">{d.name}</span>
                    </div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-10">Veri yok.</p>
          )}
        </div>
      </div>

      {/* Aylık gelir grafiği */}
      <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-5">Aylık Gelir (₺)</h2>
        {loading ? (
          <Skeleton className="h-44 w-full" />
        ) : (
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.monthlyRevenue ?? []}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "none", borderRadius: 12, color: "#fafafa", fontSize: 13 }}
                  formatter={(v: unknown) => [`₺${Number(v).toLocaleString("tr-TR")}`, "Gelir"]}
                />
                <Area type="monotone" dataKey="revenue" name="Gelir" stroke="#6366f1" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ fill: "#6366f1", r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Son platform hareketleri */}
      <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-800 dark:text-zinc-200">Son Platform Hareketleri</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !stats?.activity.length ? (
          <p className="text-sm text-zinc-400 text-center py-10">Henüz hareket yok.</p>
        ) : (
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {stats.activity.map((a, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                  a.type === "enrollment" ? "bg-blue-50 dark:bg-blue-950/40 text-blue-500" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500"
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
