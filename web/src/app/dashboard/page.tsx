"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getStudyArea, deleteNote, deleteQuiz, SubjectGroup } from "@/lib/apiClient";

export default function DashboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [dashboard, setDashboard] = useState<SubjectGroup[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    loadDashboard();
  }, [token]);

  async function loadDashboard() {
    setFetching(true);
    const result = await getStudyArea();
    if (result.ok) {
      setDashboard(result.dashboard || []);
    } else {
      setError(result.error || "Veri yüklenemedi.");
    }
    setFetching(false);
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Bu notu silmek istediğinizden emin misiniz?")) return;
    const { ok } = await deleteNote(noteId);
    if (ok) loadDashboard();
  }

  async function handleDeleteQuiz(quizId: string) {
    if (!confirm("Bu quizi silmek istediğinizden emin misiniz?")) return;
    const { ok } = await deleteQuiz(quizId);
    if (ok) loadDashboard();
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Başlık */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Çalışma Alanım
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Tüm notlarınız ve quizleriniz ders bazında listeleniyor
            </p>
          </div>
          <Link
            href="/study"
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + Yeni Çalışma
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Boş durum */}
        {dashboard.length === 0 && !error && (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Henüz hiç çalışmanız yok
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              AI asistanı kullanarak PDF&apos;inizden özet veya quiz oluşturun
            </p>
            <Link
              href="/study"
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              AI Asistana Git
            </Link>
          </div>
        )}

        {/* Ders Grupları */}
        <div className="space-y-8">
          {dashboard.map((group) => (
            <div key={group.subject}>
              {/* Ders Başlığı */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  {group.subject.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                  {group.subject}
                </h2>
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                <span className="text-xs text-zinc-400">
                  {group.items.notes.length} not · {group.items.quizzes.length} quiz
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Notlar */}
                {group.items.notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 flex items-start gap-3"
                  >
                    <div className="text-2xl">📄</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {note.fileName}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {new Date(note.uploadedAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <span
                        className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                          note.processedStatus === "COMPLETED"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : note.processedStatus === "FAILED"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {note.processedStatus === "COMPLETED"
                          ? "Tamamlandı"
                          : note.processedStatus === "FAILED"
                          ? "Hata"
                          : "İşleniyor"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-colors text-lg leading-none"
                      title="Sil"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Quizler */}
                {group.items.quizzes.map((quiz) => (
                  <Link
                    key={quiz.id}
                    href={`/study/quiz/${quiz.id}`}
                    className="bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 flex items-start gap-3 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-sm transition-all group"
                  >
                    <div className="text-2xl">📋</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                        {quiz.title}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {new Date(quiz.createdAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      {quiz.score !== null ? (
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                          Skor: {quiz.score}%
                        </span>
                      ) : (
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                          Çözülmedi
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteQuiz(quiz.id);
                      }}
                      className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-colors text-lg leading-none"
                      title="Sil"
                    >
                      ×
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
