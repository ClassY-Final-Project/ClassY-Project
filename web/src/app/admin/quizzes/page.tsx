"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/Skeleton";

interface QuizItem {
  id: string;
  title: string;
  subject: string;
  score: number | null;
  createdAt: string;
  student: { id: string; fullName: string | null; email: string };
  questionCount: number;
}

export default function AdminQuizzesPage() {
  const { token } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => { if (token) loadQuizzes(); }, [token]);

  async function loadQuizzes() {
    setLoading(true);
    const res = await fetch("/api/admin/quizzes", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setQuizzes(data.quizzes ?? []);
    setLoading(false);
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function deleteQuiz(quizId: string, title: string) {
    if (!confirm(`"${title}" quizini silmek istediğinize emin misiniz?`)) return;
    setDeleting(quizId);
    const res = await fetch(`/api/admin/quizzes/${quizId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      showToast("Quiz silindi.", true);
    } else {
      showToast("Silinemedi.", false);
    }
    setDeleting(null);
  }

  const filtered = quizzes.filter((q) => {
    const matchFilter =
      filter === "ALL" ||
      (filter === "GRADED" && q.score !== null) ||
      (filter === "UNGRADED" && q.score === null);
    const matchSearch =
      !search.trim() ||
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.subject.toLowerCase().includes(search.toLowerCase()) ||
      (q.student.fullName || q.student.email).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const avgScore = (() => {
    const graded = quizzes.filter((q) => q.score !== null);
    if (graded.length === 0) return 0;
    return Math.round(graded.reduce((s, q) => s + (q.score ?? 0), 0) / graded.length);
  })();

  return (
    <div className="p-8 space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium text-white ${toast.ok ? "bg-emerald-500" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Quizler</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {quizzes.length} quiz · {quizzes.filter((q) => q.score !== null).length} değerlendirilmiş
          </p>
        </div>
        <div className="text-right bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 shadow-sm">
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">%{avgScore}</p>
          <p className="text-xs text-zinc-400 mt-1">Ortalama Puan</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Quiz adı, konu veya öğrenci ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">Tüm Quizler</option>
          <option value="GRADED">Değerlendirilmiş</option>
          <option value="UNGRADED">Değerlendirilmemiş</option>
        </select>
      </div>

      <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1.2fr_auto_auto_auto] text-xs font-semibold text-zinc-400 uppercase tracking-wider px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 gap-4">
          <span>Quiz Adı</span><span>Konu</span><span>Öğrenci</span><span>Puan</span><span>Soru</span><span></span>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-12">Quiz bulunamadı.</p>
        ) : (
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {filtered.map((q) => (
              <div key={q.id} className="grid grid-cols-[2fr_1fr_1.2fr_auto_auto_auto] items-center px-6 py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs shrink-0">
                    📝
                  </div>
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{q.title}</span>
                </div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{q.subject}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                  {q.student.fullName || q.student.email}
                </span>
                <span className={`text-sm font-semibold whitespace-nowrap ${
                  q.score === null
                    ? "text-zinc-400"
                    : q.score >= 70
                    ? "text-emerald-600 dark:text-emerald-400"
                    : q.score >= 50
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-500"
                }`}>
                  {q.score !== null ? `%${q.score}` : "—"}
                </span>
                <span className="text-sm text-zinc-500 whitespace-nowrap">{q.questionCount}</span>
                <button
                  onClick={() => deleteQuiz(q.id, q.title)}
                  disabled={deleting === q.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 font-medium transition-colors"
                >
                  {deleting === q.id ? "..." : "Sil"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
