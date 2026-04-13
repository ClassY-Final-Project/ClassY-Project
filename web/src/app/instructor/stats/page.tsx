"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/Skeleton";

interface AssignedQuiz {
  id: string;
  title: string;
  subject: string;
  createdAt: string;
  questions: { id: string }[];
  results: {
    studentId: string;
    studentName: string | null;
    studentEmail: string;
    score: number | null;
    completedAt: string | null;
  }[];
}

export default function InstructorStatsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<AssignedQuiz[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selected, setSelected] = useState<AssignedQuiz | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role === "STUDENT") router.replace("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    loadQuizzes();
  }, [token]);

  async function loadQuizzes() {
    setFetching(true);
    try {
      const res = await fetch("/api/instructor/quiz/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setQuizzes(json.quizzes || []);
    } catch {
      setQuizzes([]);
    }
    setFetching(false);
  }

  if (loading) return null;

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Quiz İstatistikleri</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Gönderdiğin quizlerin sonuçlarını incele</p>
        </div>

        {fetching ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Henüz gönderilmiş quiz yok.</p>
            <button onClick={() => router.push("/instructor/quiz")}
              className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
              Quiz Oluştur
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol: Quiz listesi */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Quizler</h2>
              {quizzes.map(q => {
                const completed = q.results.filter(r => r.score !== null).length;
                const avg = completed > 0
                  ? Math.round(q.results.filter(r => r.score !== null).reduce((a, r) => a + r.score!, 0) / completed)
                  : null;
                const isSelected = selected?.id === q.id;
                return (
                  <button key={q.id} onClick={() => setSelected(isSelected ? null : q)}
                    className={`w-full text-left bg-white dark:bg-zinc-800/60 border rounded-2xl p-4 transition-all hover:shadow-md ${isSelected ? "border-indigo-400 dark:border-indigo-600 shadow-md" : "border-zinc-100 dark:border-zinc-800"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{q.title}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {new Date(q.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                          {" · "}{q.questions.length} soru
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {avg !== null ? (
                          <p className={`text-lg font-bold ${avg >= 70 ? "text-green-600 dark:text-green-400" : avg >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                            %{avg}
                          </p>
                        ) : (
                          <p className="text-sm text-zinc-400">—</p>
                        )}
                        <p className="text-xs text-zinc-400">{completed}/{q.results.length} tamamladı</p>
                      </div>
                    </div>

                    {/* Tamamlanma progress bar */}
                    {q.results.length > 0 && (
                      <div className="mt-3 h-1.5 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${(completed / q.results.length) * 100}%` }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sağ: Seçili quiz detayı */}
            <div>
              {selected ? (
                <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm sticky top-24">
                  <h2 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1 truncate">{selected.title}</h2>
                  <p className="text-xs text-zinc-400 mb-4">{selected.results.length} öğrenciye gönderildi</p>

                  {/* Özet istatistikler */}
                  {selected.results.filter(r => r.score !== null).length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {(() => {
                        const scores = selected.results.filter(r => r.score !== null).map(r => r.score!);
                        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                        const max = Math.max(...scores);
                        const min = Math.min(...scores);
                        return [
                          { label: "Ortalama", value: `%${avg}`, color: "text-indigo-600 dark:text-indigo-400" },
                          { label: "En Yüksek", value: `%${max}`, color: "text-green-600 dark:text-green-400" },
                          { label: "En Düşük", value: `%${min}`, color: "text-red-600 dark:text-red-400" },
                        ].map(s => (
                          <div key={s.label} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl py-3 text-center">
                            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
                          </div>
                        ));
                      })()}
                    </div>
                  )}

                  {/* Öğrenci listesi */}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {selected.results.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-zinc-50 dark:border-zinc-800 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 font-bold text-xs shrink-0">
                          {(r.studentName || r.studentEmail).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                            {r.studentName || r.studentEmail}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {r.completedAt
                              ? new Date(r.completedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                              : "Henüz çözmedi"}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {r.score !== null ? (
                            <span className={`text-sm font-bold ${r.score >= 70 ? "text-green-600 dark:text-green-400" : r.score >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                              %{r.score}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded-full">Bekliyor</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-zinc-400 text-sm border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl">
                  Detayları görmek için bir quiz seçin
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
