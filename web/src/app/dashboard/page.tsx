"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getStudyArea, deleteNote, deleteQuiz, SubjectGroup } from "@/lib/apiClient";
import { DashboardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";

interface AssignedQuiz {
  id: string;
  title: string;
  subject: string;
  score: number | null;
  createdAt: string;
  instructor: { fullName: string | null; email: string };
}

export default function DashboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [dashboard, setDashboard] = useState<SubjectGroup[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [assignedQuizzes, setAssignedQuizzes] = useState<AssignedQuiz[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState<"dersler" | "gelen">("dersler");

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editNewSubject, setEditNewSubject] = useState("");
  const [editMode, setEditMode] = useState<"existing" | "new">("existing");
  const [savingSubject, setSavingSubject] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && (user.role === "INSTRUCTOR" || user.role === "ADMIN")) {
      router.replace("/instructor/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    loadDashboard();
    loadAssignedQuizzes();
  }, [token]);

  async function loadAssignedQuizzes() {
    try {
      const res = await fetch("/api/instructor/quiz/assigned", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setAssignedQuizzes(json.quizzes || []);
    } catch {
      // sessizce geç
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        setEditingNoteId(null);
      }
    }
    if (editingNoteId) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingNoteId]);

  async function loadDashboard() {
    setFetching(true);
    const result = await getStudyArea();
    if (result.ok) {
      const groups = result.dashboard || [];
      setDashboard(groups);
      if (groups.length > 0 && !selectedSubject) {
        setSelectedSubject(groups[0].subject);
      }
    } else {
      setError(result.error || "Veri yüklenemedi.");
    }
    setFetching(false);
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Bu notu silmek istediğinizden emin misiniz?")) return;
    const { ok } = await deleteNote(noteId);
    if (ok) {
      showToast("Not silindi.", "success");
      loadDashboard();
    } else {
      showToast("Not silinemedi.", "error");
    }
  }

  async function handleDeleteQuiz(quizId: string) {
    if (!confirm("Bu quizi silmek istediğinizden emin misiniz?")) return;
    const { ok } = await deleteQuiz(quizId);
    if (ok) {
      showToast("Quiz silindi.", "success");
      loadDashboard();
    } else {
      showToast("Quiz silinemedi.", "error");
    }
  }

  function openEditSubject(noteId: string, currentSubject: string) {
    setEditingNoteId(noteId);
    setEditSubject(currentSubject);
    setEditNewSubject("");
    setEditMode("existing");
  }

  async function handleSaveSubject(noteId: string) {
    const newSubject = editMode === "new" ? editNewSubject.trim() : editSubject;
    if (!newSubject) return;
    setSavingSubject(true);
    const res = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subject: newSubject }),
    });
    if (res.ok) {
      setEditingNoteId(null);
      if (newSubject !== selectedSubject) setSelectedSubject(newSubject);
      showToast("Ders güncellendi.", "success");
      await loadDashboard();
    } else {
      showToast("Güncellenemedi.", "error");
    }
    setSavingSubject(false);
  }

  const allSubjects = dashboard.map((g) => g.subject);

  // İstatistikler
  const totalNotes = dashboard.reduce((acc, g) => acc + g.items.notes.length, 0);
  const totalQuizzes = dashboard.reduce((acc, g) => acc + g.items.quizzes.length, 0);
  const completedQuizzes = dashboard.reduce((acc, g) => acc + g.items.quizzes.filter(q => q.score !== null).length, 0);

  if (loading || fetching) return <DashboardSkeleton />;

  const activeGroup = dashboard.find((g) => g.subject === selectedSubject) || null;

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {dashboard.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
          <div className="text-5xl mb-4">📚</div>
          <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Henüz hiç çalışmanız yok</h2>
          <p className="text-sm text-zinc-400 mb-6">AI asistanı kullanarak PDF&apos;inizden özet veya quiz oluşturun</p>
          <Link href="/study" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            AI Asistana Git
          </Link>
        </div>
      ) : (
        <>
          {/* ─── İstatistik Kartları ─── */}
          <div className="border-b border-zinc-100 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Ders", value: dashboard.length, icon: "📚", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
                { label: "Not", value: totalNotes, icon: "📝", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
                { label: "Quiz", value: totalQuizzes, icon: "📋", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40" },
                { label: "Tamamlanan", value: completedQuizzes, icon: "✅", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-3 bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${stat.bg}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className={`text-xl font-bold leading-none ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex h-[calc(100vh-57px-72px)]">
            {/* ─── Sol Panel ─── */}
            <aside className="w-60 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm overflow-y-auto">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Derslerim</span>
                <Link href="/study" title="Yeni çalışma"
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors text-sm font-bold">
                  +
                </Link>
              </div>
              {/* Sol panel sekmeleri */}
            <div className="flex p-2 gap-1">
              {([["dersler", "Derslerim"], ["gelen", "Gelen Quizler"]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setSideTab(id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${sideTab === id ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
                  {label}
                  {id === "gelen" && assignedQuizzes.filter(q => q.score === null).length > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{assignedQuizzes.filter(q => q.score === null).length}</span>
                  )}
                </button>
              ))}
            </div>

            <nav className="p-2">
                {error && <p className="text-xs text-red-500 px-2 py-1">{error}</p>}
                {sideTab === "dersler" && dashboard.map((group) => {
                  const isActive = group.subject === selectedSubject;
                  const total = group.items.notes.length + group.items.quizzes.length;
                  return (
                    <button key={group.subject} onClick={() => setSelectedSubject(group.subject)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 flex items-center gap-3 transition-all ${
                        isActive
                          ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white"
                      }`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                      }`}>
                        {group.subject.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{group.subject}</p>
                        <p className="text-xs opacity-60">{total} öğe</p>
                      </div>
                    </button>
                  );
                })}

                {sideTab === "gelen" && (
                  assignedQuizzes.length === 0 ? (
                    <p className="text-xs text-zinc-400 px-3 py-4 text-center">Gelen quiz yok.</p>
                  ) : (
                    assignedQuizzes.map((q) => (
                      <Link key={q.id} href={`/study/quiz/${q.id}`}
                        className="w-full text-left px-3 py-2.5 rounded-xl mb-1 flex items-center gap-3 transition-all text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                          📋
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{q.title}</p>
                          <p className="text-xs opacity-60 truncate">{q.instructor.fullName || q.instructor.email}</p>
                        </div>
                        {q.score !== null ? (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">%{q.score}</span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        )}
                      </Link>
                    ))
                  )
                )}
              </nav>
            </aside>

            {/* ─── İçerik Alanı ─── */}
            <main className="flex-1 overflow-y-auto">
              {activeGroup ? (
                <div className="max-w-3xl mx-auto px-6 py-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                        {activeGroup.subject.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{activeGroup.subject}</h1>
                        <p className="text-xs text-zinc-400">{activeGroup.items.notes.length} not · {activeGroup.items.quizzes.length} quiz</p>
                      </div>
                    </div>
                    <Link href="/study" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                      + Yeni Çalışma
                    </Link>
                  </div>

                  {/* Notlar */}
                  {activeGroup.items.notes.length > 0 && (
                    <section className="mb-8">
                      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">📝 Notlar & Özetler</h2>
                      <div className="space-y-3">
                        {activeGroup.items.notes.map((note) => (
                          <div key={note.id} className="relative">
                            <div className="bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 flex items-start gap-3">
                              <div className="text-2xl shrink-0">📄</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{note.fileName}</p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                  {new Date(note.uploadedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                                </p>
                                <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                                  note.processedStatus === "COMPLETED"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : note.processedStatus === "FAILED"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                }`}>
                                  {note.processedStatus === "COMPLETED" ? "Tamamlandı" : note.processedStatus === "FAILED" ? "Hata" : "İşleniyor"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => openEditSubject(note.id, activeGroup.subject)} title="Dersi değiştir"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button onClick={() => handleDeleteNote(note.id)} title="Sil"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-colors text-lg leading-none">
                                  ×
                                </button>
                              </div>
                            </div>

                            {editingNoteId === note.id && (
                              <div ref={editRef}
                                className="absolute right-0 top-full mt-1 z-20 w-72 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-lg p-4">
                                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Dersi Değiştir</p>
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {allSubjects.map((s) => (
                                    <button key={s}
                                      onClick={() => { setEditMode("existing"); setEditSubject(s); }}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                        editMode === "existing" && editSubject === s
                                          ? "bg-indigo-600 text-white border-indigo-600"
                                          : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300"
                                      }`}>
                                      {s}
                                    </button>
                                  ))}
                                  <button onClick={() => setEditMode("new")}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                      editMode === "new"
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-500 hover:border-indigo-400"
                                    }`}>
                                    + Yeni Ders
                                  </button>
                                </div>
                                {editMode === "new" && (
                                  <input type="text" value={editNewSubject} onChange={(e) => setEditNewSubject(e.target.value)}
                                    placeholder="Ders adı (ör. Fizik, Tarih...)" autoFocus
                                    className="w-full px-3 py-2 mb-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                                )}
                                <div className="flex gap-2">
                                  <button onClick={() => handleSaveSubject(note.id)}
                                    disabled={savingSubject || (editMode === "new" && !editNewSubject.trim())}
                                    className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                                    {savingSubject ? "Kaydediliyor..." : "Kaydet"}
                                  </button>
                                  <button onClick={() => setEditingNoteId(null)}
                                    className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-500 hover:border-red-300 hover:text-red-500 transition-colors">
                                    İptal
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Quizler */}
                  {activeGroup.items.quizzes.length > 0 && (
                    <section>
                      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">📋 Quizler</h2>
                      <div className="space-y-3">
                        {activeGroup.items.quizzes.map((quiz) => (
                          <Link key={quiz.id} href={`/study/quiz/${quiz.id}`}
                            className="bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 flex items-start gap-3 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-sm transition-all group">
                            <div className="text-2xl shrink-0">📋</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                                {quiz.title}
                              </p>
                              <p className="text-xs text-zinc-400 mt-0.5">
                                {new Date(quiz.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
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
                            <button onClick={(e) => { e.preventDefault(); handleDeleteQuiz(quiz.id); }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-colors text-lg leading-none shrink-0"
                              title="Sil">
                              ×
                            </button>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}

                  {activeGroup.items.notes.length === 0 && activeGroup.items.quizzes.length === 0 && (
                    <div className="text-center py-16">
                      <p className="text-zinc-400 text-sm">Bu derse ait henüz içerik yok.</p>
                      <Link href="/study" className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline mt-2 inline-block">
                        Yeni çalışma oluştur →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
                  Sol panelden bir ders seçin
                </div>
              )}
            </main>
          </div>
        </>
      )}
    </div>
  );
}
