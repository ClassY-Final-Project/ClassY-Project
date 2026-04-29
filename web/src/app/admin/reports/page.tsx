"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/Skeleton";

interface MonthData { label: string; revenue: number; enrollmentCount: number }
interface CourseRevenue {
  id: string; title: string; price: string; revenue: number;
  enrollmentCount: number; reviewCount: number;
  instructor: { fullName: string | null; email: string };
}
interface InstructorRevenue { id: string; name: string; revenue: number; enrollments: number; courses: number }
interface AiStats {
  totalQuizzes: number; totalNotes: number; totalFlashcards: number;
  quizzesThisMonth: number; notesThisMonth: number;
}
interface ReportData {
  monthlyRevenue: MonthData[];
  courseRevenue: CourseRevenue[];
  instructorRevenue: InstructorRevenue[];
  aiStats: AiStats;
}

function fmt(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AdminReportsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"revenue" | "courses" | "instructors" | "ai">("revenue");

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/reports", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  const maxRevenue = Math.max(...(data?.monthlyRevenue.map((m) => m.revenue) ?? [1]), 1);

  const TABS = [
    { key: "revenue", label: "Gelir Raporu", icon: "💰" },
    { key: "courses", label: "En Popüler Kurslar", icon: "🎬" },
    { key: "instructors", label: "Eğitmen Performansı", icon: "👨‍🏫" },
    { key: "ai", label: "AI İstatistikleri", icon: "🤖" },
  ] as const;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Raporlar</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Platform geneli analitik veriler</p>
      </div>

      {/* Tab seçici */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300"
            }`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* GELİR RAPORU */}
      {tab === "revenue" && (
        <div className="space-y-6">
          {/* Aylık grafik */}
          <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-6">Son 6 Ay — Aylık Gelir</h2>
            {loading ? (
              <div className="flex items-end gap-3 h-40">{[...Array(6)].map((_, i) => <Skeleton key={i} className="flex-1 h-full" />)}</div>
            ) : (
              <div className="flex items-end gap-3 h-48">
                {data?.monthlyRevenue.map((m, i) => {
                  const heightPct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col justify-end" style={{ height: "160px" }}>
                        <div
                          className="w-full bg-indigo-500 dark:bg-indigo-600 rounded-t-lg transition-all duration-500 relative group cursor-default"
                          style={{ height: `${Math.max(heightPct, m.revenue > 0 ? 4 : 0)}%` }}
                        >
                          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            ₺{fmt(m.revenue)}<br/>{m.enrollmentCount} kayıt
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400 text-center">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Özet kartlar */}
          {loading ? (
            <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "Toplam Platform Geliri",
                  value: `₺${fmt(data?.monthlyRevenue.reduce((s, m) => s + m.revenue, 0) ?? 0)}`,
                  icon: "💰", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40",
                },
                {
                  label: "Bu Ay Gelir",
                  value: `₺${fmt(data?.monthlyRevenue[5]?.revenue ?? 0)}`,
                  icon: "📈", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40",
                },
                {
                  label: "Bu Ay Kayıt",
                  value: `${data?.monthlyRevenue[5]?.enrollmentCount ?? 0} kişi`,
                  icon: "📋", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40",
                },
              ].map((c) => (
                <div key={c.label} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${c.bg}`}>{c.icon}</div>
                  <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
                  <p className="text-sm text-zinc-400 mt-1">{c.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EN POPÜLER KURSLAR */}
      {tab === "courses" && (
        <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-[2fr_1.2fr_auto_auto_auto] text-xs font-semibold text-zinc-400 uppercase tracking-wider px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 gap-4">
            <span>Kurs</span><span>Eğitmen</span><span>Kayıt</span><span>Gelir</span><span>Yorum</span>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !data?.courseRevenue.length ? (
            <p className="text-sm text-zinc-400 text-center py-12">Henüz kurs verisi yok.</p>
          ) : (
            <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {data.courseRevenue.map((c, i) => (
                <div key={c.id} className="grid grid-cols-[2fr_1.2fr_auto_auto_auto] items-center px-6 py-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold text-zinc-400 w-5 shrink-0">#{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{c.title}</p>
                      <p className="text-xs text-zinc-400">
                        {parseFloat(c.price) === 0 ? "Ücretsiz" : `₺${parseFloat(c.price).toLocaleString("tr-TR")}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                    {c.instructor.fullName || c.instructor.email}
                  </p>
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    {c.enrollmentCount} kişi
                  </span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    ₺{fmt(c.revenue)}
                  </span>
                  <span className="text-sm text-zinc-500 whitespace-nowrap">
                    {c.reviewCount} ⭐
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EĞİTMEN PERFORMANSI */}
      {tab === "instructors" && (
        <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-[2fr_auto_auto_auto] text-xs font-semibold text-zinc-400 uppercase tracking-wider px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 gap-4">
            <span>Eğitmen</span><span>Toplam Kayıt</span><span>Kurs Sayısı</span><span>Toplam Gelir</span>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !data?.instructorRevenue.length ? (
            <p className="text-sm text-zinc-400 text-center py-12">Henüz veri yok.</p>
          ) : (
            <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {data.instructorRevenue.map((inst, i) => (
                <div key={inst.id} className="grid grid-cols-[2fr_auto_auto_auto] items-center px-6 py-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center font-bold text-violet-600 dark:text-violet-400 text-sm shrink-0">
                      {inst.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{inst.name}</p>
                      <p className="text-xs text-zinc-400">#{i + 1} sıra</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap text-center">
                    {inst.enrollments} öğrenci
                  </span>
                  <span className="text-sm text-zinc-500 whitespace-nowrap text-center">
                    {inst.courses} kurs
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-right">
                    ₺{fmt(inst.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI İSTATİSTİKLERİ */}
      {tab === "ai" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {loading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)
            ) : [
              { label: "Toplam Quiz", value: data?.aiStats.totalQuizzes ?? 0, sub: `Bu ay: ${data?.aiStats.quizzesThisMonth ?? 0}`, icon: "📝", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
              { label: "Toplam Çalışma Notu", value: data?.aiStats.totalNotes ?? 0, sub: `Bu ay: ${data?.aiStats.notesThisMonth ?? 0}`, icon: "📄", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40" },
              { label: "Toplam Flashcard", value: data?.aiStats.totalFlashcards ?? 0, sub: "Tüm zamanlar", icon: "🃏", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
              { label: "Ortalama Quiz/Not", value: data && data.aiStats.totalNotes > 0 ? (data.aiStats.totalQuizzes / data.aiStats.totalNotes).toFixed(1) : "0", sub: "Her not için quiz sayısı", icon: "📊", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/40" },
              { label: "Ortalama Flashcard/Not", value: data && data.aiStats.totalNotes > 0 ? (data.aiStats.totalFlashcards / data.aiStats.totalNotes).toFixed(1) : "0", sub: "Her not için kart sayısı", icon: "⚡", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
            ].map((c) => (
              <div key={c.label} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${c.bg}`}>{c.icon}</div>
                <p className={`text-3xl font-extrabold ${c.color}`}>{c.value}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 font-medium mt-1">{c.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-1">💡 Gemini API Kullanımı</p>
            <p className="text-sm text-amber-700 dark:text-amber-500">
              Her quiz üretimi ve çalışma notu işlemi Gemini API'ye bir istek atar.
              Tahmini toplam istek: <strong>{(data?.aiStats.totalQuizzes ?? 0) + (data?.aiStats.totalNotes ?? 0)}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
