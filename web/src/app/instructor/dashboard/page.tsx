"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/Skeleton";

interface InstructorStats {
  subscriberCount: number;
  liveRoomCount: number;
  quizSentCount: number;
  recentSubscribers: { id: string; fullName: string | null; email: string; subscribedAt: string }[];
  recentRooms: { id: string; name: string; status: string; startedAt: string | null; endedAt: string | null }[];
}

export default function InstructorDashboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<InstructorStats | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role === "STUDENT") router.replace("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    loadStats();
  }, [token]);

  async function loadStats() {
    setFetching(true);
    try {
      const [subRes, roomRes, quizRes] = await Promise.all([
        fetch("/api/instructor/subscribers", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/live-rooms?filter=history", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/instructor/quiz/sent-count", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const subJson = await subRes.json();
      const roomJson = await roomRes.json();
      const quizJson = quizRes.ok ? await quizRes.json() : { count: 0 };

      setStats({
        subscriberCount: subJson.students?.length ?? 0,
        liveRoomCount: roomJson.rooms?.length ?? 0,
        quizSentCount: quizJson.count ?? 0,
        recentSubscribers: (subJson.students || []).slice(0, 5).map((s: any) => ({
          id: s.id,
          fullName: s.fullName,
          email: s.email,
          subscribedAt: s.subscribedAt,
        })),
        recentRooms: (roomJson.rooms || []).slice(0, 4),
      });
    } catch {
      setStats({ subscriberCount: 0, liveRoomCount: 0, quizSentCount: 0, recentSubscribers: [], recentRooms: [] });
    }
    setFetching(false);
  }

  if (loading) return null;

  const initials = (user?.fullName || user?.email || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Hoşgeldin */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-2xl shadow-md shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Hoş geldin, {user?.fullName?.split(" ")[0] || "Eğitmen"} 👋
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Eğitmen Paneli</p>
          </div>
        </div>

        {/* İstatistik Kartları */}
        {fetching ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
                <Skeleton className="h-8 w-8 mb-3" />
                <Skeleton className="h-7 w-12 mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Abone Öğrenci", value: stats?.subscriberCount ?? 0, icon: "👨‍🎓", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
              { label: "Geçmiş Ders", value: stats?.liveRoomCount ?? 0, icon: "🎥", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40" },
              { label: "Gönderilen Quiz", value: stats?.quizSentCount ?? 0, icon: "📋", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${s.bg}`}>{s.icon}</div>
                <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-zinc-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Hızlı Aksiyonlar */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Hızlı İşlemler</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: "/instructor/courses", label: "Kurslarım", desc: "Kurs oluştur ve yönet", icon: "🎬", color: "border-indigo-200 dark:border-indigo-800 hover:border-indigo-400" },
              { href: "/live", label: "Canlı Ders Başlat", desc: "Yeni oda oluştur veya planla", icon: "🔴", color: "border-red-200 dark:border-red-800 hover:border-red-400" },
              { href: "/instructor/quiz", label: "Quiz Oluştur & Ata", desc: "Öğrencilerine quiz gönder", icon: "📋", color: "border-violet-200 dark:border-violet-800 hover:border-violet-400" },
            ].map((a) => (
              <Link key={a.href} href={a.href}
                className={`bg-white dark:bg-zinc-800/60 border ${a.color} rounded-2xl p-5 flex items-start gap-4 transition-all hover:shadow-md group`}>
                <div className="text-3xl shrink-0">{a.icon}</div>
                <div>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{a.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Son Abone Öğrenciler */}
          <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">👨‍🎓 Son Abone Öğrenciler</h2>
            {fetching ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : stats?.recentSubscribers.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">Henüz abone yok.</p>
            ) : (
              <div className="space-y-2">
                {stats?.recentSubscribers.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2 border-b border-zinc-50 dark:border-zinc-800 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0">
                      {(s.fullName || s.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">{s.fullName || s.email}</p>
                      <p className="text-xs text-zinc-400">{new Date(s.subscribedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Son Canlı Dersler */}
          <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">🎥 Son Canlı Dersler</h2>
            {fetching ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : stats?.recentRooms.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">Henüz canlı ders yok.</p>
            ) : (
              <div className="space-y-2">
                {stats?.recentRooms.map((r) => {
                  const duration = r.startedAt && r.endedAt
                    ? Math.floor((new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()) / 60000)
                    : null;
                  return (
                    <div key={r.id} className="flex items-center gap-3 py-2 border-b border-zinc-50 dark:border-zinc-800 last:border-0">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400 text-sm shrink-0">🎥</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">{r.name}</p>
                        <p className="text-xs text-zinc-400">
                          {r.startedAt ? new Date(r.startedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "—"}
                          {duration !== null && ` · ${duration} dk`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
