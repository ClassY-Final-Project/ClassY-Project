"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface StudentRow {
  id: string;
  fullName: string | null;
  email: string;
  enrolledAt: string;
  completedLessons: number;
  totalLessons: number;
  progressPct: number;
  lastActivity: string | null;
}

interface StatsData {
  courseTitle: string;
  totalLessons: number;
  avgProgress: number;
  students: StudentRow[];
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

export default function CourseStudentsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { token, loading, user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<StatsData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user?.role === "STUDENT") router.replace("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    setFetching(true);
    fetch(`/api/courses/${courseId}/students`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => { setData(json); setFetching(false); })
      .catch(() => setFetching(false));
  }, [token, courseId]);

  const filtered = (data?.students ?? []).filter(
    (s) =>
      (s.fullName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || fetching) {
    return (
      <div className="w-full flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href={`/instructor/courses/${courseId}`}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-indigo-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">{data.courseTitle}</p>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Öğrenci Takibi</h1>
          </div>
        </div>

        {/* Özet kartlar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{data.students.length}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Toplam Öğrenci</p>
          </div>
          <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{data.totalLessons}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Toplam Ders</p>
          </div>
          <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">%{data.avgProgress}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Ortalama İlerleme</p>
          </div>
        </div>

        {/* Arama + Tablo */}
        <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-700 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
              </svg>
              <input
                type="text"
                placeholder="İsim veya e-posta ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{filtered.length} öğrenci</p>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 dark:text-zinc-500 text-sm">
              {data.students.length === 0 ? "Henüz kayıtlı öğrenci yok." : "Aramanızla eşleşen öğrenci bulunamadı."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Öğrenci</th>
                    <th className="text-left px-5 py-3">İlerleme</th>
                    <th className="text-left px-5 py-3 whitespace-nowrap">Son Aktivite</th>
                    <th className="text-left px-5 py-3 whitespace-nowrap">Kayıt Tarihi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-zinc-900 dark:text-white">{s.fullName ?? "—"}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{s.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                s.progressPct >= 80
                                  ? "bg-green-500"
                                  : s.progressPct >= 40
                                  ? "bg-indigo-500"
                                  : "bg-amber-400"
                              }`}
                              style={{ width: `${s.progressPct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 w-10 text-right">
                            %{s.progressPct}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                          {s.completedLessons}/{s.totalLessons} ders
                        </p>
                      </td>
                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap">
                        {formatDate(s.lastActivity)}
                      </td>
                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap">
                        {formatDate(s.enrolledAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
