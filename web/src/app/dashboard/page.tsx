"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  getSubjects,
  createSubject,
  deleteSubject,
  getWeek,
  generateForWeek,
  getNote,
  getMyCourses,
  SubjectFull,
  WeekDetail,
  NoteDetail,
  MyCourse,
  GeneratedQuizItem,
} from "@/lib/apiClient";
import { DashboardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import UpgradeModal from "@/components/UpgradeModal";

interface SelectedView {
  weekId: string;
  noteId?: string;
}

interface SubjectStat {
  subject: string;
  studySeconds: number;
  noteCount: number;
  quizCount: number;
  avgScore: number | null;
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}

export default function DashboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [openDersler, setOpenDersler] = useState(true);
  const [openKurslar, setOpenKurslar] = useState(false);
  const [openOdevler, setOpenOdevler] = useState(true);

  const [subjects, setSubjects] = useState<SubjectFull[]>([]);
  const [myCourses, setMyCourses] = useState<MyCourse[]>([]);

  interface AssignedQuiz {
    id: string;
    title: string;
    subject: string;
    score: number | null;
    createdAt: string;
    instructor: { fullName: string | null; email: string };
  }
  const [assignedQuizzes, setAssignedQuizzes] = useState<AssignedQuiz[]>([]);
  const [fetching, setFetching] = useState(true);

  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
  const [openWeekId, setOpenWeekId] = useState<string | null>(null);
  const [weekDetail, setWeekDetail] = useState<WeekDetail | null>(null);
  const [view, setView] = useState<SelectedView | null>(null);
  const [noteDetail, setNoteDetail] = useState<NoteDetail | null>(null);
  const [weekQuizzes, setWeekQuizzes] = useState<{ id: string; title: string; score: number | null; createdAt: string; noteId: string | null }[]>([]);

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWeeks, setNewWeeks] = useState(8);
  const [creating, setCreating] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  const [generated, setGenerated] = useState<{ noteId: string; quizId: string; summary: string; flashcards: { front: string; back: string }[]; quiz: GeneratedQuizItem[] } | null>(null);

  const [activeView, setActiveView] = useState<"dashboard" | "karne">("dashboard");
  const [studyStats, setStudyStats] = useState<SubjectStat[]>([]);
  const [totalStudySeconds, setTotalStudySeconds] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role === "ADMIN") router.replace("/admin");
    if (!loading && user && user.role === "INSTRUCTOR") router.replace("/instructor/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !token) return;
    loadAll();
  }, [user, token]); // eslint-disable-line

  useEffect(() => {
    if (activeView === "karne") loadStudyStats();
  }, [activeView]); // eslint-disable-line

  async function loadAll() {
    setFetching(true);
    const [s, c] = await Promise.all([getSubjects(), getMyCourses()]);
    if (s.ok) setSubjects(s.subjects || []);
    if (c.ok) setMyCourses(c.courses || []);
    if (token) {
      try {
        const r = await fetch("/api/instructor/quiz/assigned", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await r.json();
        setAssignedQuizzes(j.quizzes || []);
      } catch { /* sessizce geç */ }
    }
    setFetching(false);
  }

  async function loadStudyStats() {
    if (!token) return;
    setLoadingStats(true);
    try {
      const res = await fetch("/api/study-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setStudyStats(json.stats || []);
      setTotalStudySeconds(json.totalStudySeconds || 0);
    } catch {
      // sessizce geç
    } finally {
      setLoadingStats(false);
    }
  }

  async function selectWeek(weekId: string) {
    setOpenWeekId(weekId);
    setView(null);
    setNoteDetail(null);
    setGenerated(null);
    const res = await getWeek(weekId);
    if (res.ok && res.data) {
      setWeekDetail(res.data);
      setWeekQuizzes(res.data.quizzes);
    }
  }

  async function selectNote(weekId: string, noteId: string) {
    setView({ weekId, noteId });
    setGenerated(null);
    setFile(null);
    setFlipped(new Set());
    const res = await getNote(noteId);
    if (res.ok && res.note) setNoteDetail(res.note);
  }

  function startNewUpload(weekId: string) {
    setView({ weekId });
    setNoteDetail(null);
    setGenerated(null);
    setFile(null);
    setError(null);
    setFlipped(new Set());
  }

  function handleFileSelect(f: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Lütfen PDF seçin.");
      return;
    }
    setError(null);
    setFile(f);
  }

  async function handleGenerate() {
    if (!file || !view?.weekId) return;
    setWorking(true);
    setError(null);
    const res = await generateForWeek(view.weekId, file, 10);
    if (res.ok && res.data) {
      setGenerated(res.data);
      const wk = await getWeek(view.weekId);
      if (wk.ok && wk.data) {
        setWeekDetail(wk.data);
        setWeekQuizzes(wk.data.quizzes);
      }
      const s = await getSubjects();
      if (s.ok) setSubjects(s.subjects || []);
    } else if (res.code === "PDF_LIMIT_EXCEEDED") {
      setUpgradeModal({
        title: "PDF Yükleme Limitine Ulaştın",
        description: res.error || "Bu hafta için PDF yükleme limitini doldurdun. Daha fazla PDF yüklemek için planını yükselt.",
      });
    } else {
      setError(res.error || "Üretim başarısız.");
    }
    setWorking(false);
  }

  async function handleAddSubject() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await createSubject(newName.trim(), newWeeks);
    if (res.ok && res.subject) {
      setSubjects((prev) => [...prev, res.subject!]);
      setOpenSubjectId(res.subject.id);
      setShowAddSubject(false);
      setNewName("");
      setNewWeeks(8);
      showToast("Ders eklendi.", "success");
    } else {
      showToast(res.error || "Eklenemedi.", "error");
    }
    setCreating(false);
  }

  async function handleDeleteSubject(id: string) {
    if (!confirm("Bu dersi ve tüm haftalarını silmek istediğinize emin misiniz?")) return;
    const res = await deleteSubject(id);
    if (res.ok) {
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      if (openSubjectId === id) {
        setOpenSubjectId(null);
        setOpenWeekId(null);
        setView(null);
      }
      showToast("Ders silindi.", "success");
    }
  }

  function toggleFlip(i: number) {
    setFlipped((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  }

  if (loading || fetching) return <DashboardSkeleton />;

  const activeSubject = subjects.find((s) => s.id === openSubjectId) || null;

  return (
    <>
    {upgradeModal && (
      <UpgradeModal
        title={upgradeModal.title}
        description={upgradeModal.description}
        onClose={() => setUpgradeModal(null)}
      />
    )}
    <div className="flex flex-1 w-full overflow-hidden bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="flex flex-1 w-full">
        {/* 1. KOLON */}
        <aside className="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="p-4">
            {/* Görünüm Seçici */}
            <div className="flex gap-1 mb-4 p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
              {([["dashboard", "📂 Dersler"], ["karne", "📊 Karne"]] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setActiveView(v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeView === v
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeView === "dashboard" && (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between px-2 py-2">
                    <button
                      onClick={() => setOpenDersler((v) => !v)}
                      className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <ChevronIcon open={openDersler} />
                      Derslerim
                      <span className="text-xs text-zinc-400 font-normal">({subjects.length})</span>
                    </button>
                    {openDersler && (
                      <button
                        onClick={() => setShowAddSubject(true)}
                        className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-800/50 font-medium"
                        title="Ders ekle"
                      >
                        + Ders
                      </button>
                    )}
                  </div>
                  {openDersler && (
                    <div className="mt-1 space-y-0.5">
                      {subjects.length === 0 && (
                        <p className="text-xs text-zinc-400 px-3 py-2">Henüz ders eklemediniz.</p>
                      )}
                      {subjects.map((s) => {
                        const isActive = openSubjectId === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              setOpenSubjectId(isActive ? null : s.id);
                              setOpenWeekId(null);
                              setView(null);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                              isActive
                                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                            }`}
                          >
                            <span className="text-base">📚</span>
                            <span className="flex-1 truncate font-medium">{s.name}</span>
                            <span className="text-xs opacity-60">{s.weekCount}h</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <button
                    onClick={() => setOpenKurslar((v) => !v)}
                    className="w-full flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-2"
                  >
                    <ChevronIcon open={openKurslar} />
                    Kurslarım
                    <span className="text-xs text-zinc-400 font-normal">({myCourses.length})</span>
                  </button>
                  {openKurslar && (
                    <div className="mt-1 space-y-0.5">
                      {myCourses.length === 0 && (
                        <p className="text-xs text-zinc-400 px-3 py-2">
                          Aldığınız kurs yok.{" "}
                          <Link href="/courses" className="text-indigo-500 hover:underline">
                            Kataloğa git
                          </Link>
                        </p>
                      )}
                      {myCourses.map((c) => (
                        <Link
                          key={c.id}
                          href={`/courses/${c.id}`}
                          className="w-full block px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 truncate"
                        >
                          🎓 {c.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ödevler */}
                <div className="mb-4">
                  <button
                    onClick={() => setOpenOdevler((v) => !v)}
                    className="w-full flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-2"
                  >
                    <ChevronIcon open={openOdevler} />
                    Ödevlerim
                    <span className="text-xs text-zinc-400 font-normal">({assignedQuizzes.length})</span>
                    {(() => { const unsolved = assignedQuizzes.filter(q => q.score === null).length; return unsolved > 0 ? (
                      <span className="ml-auto text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-semibold px-1.5 py-0.5 rounded-full">
                        {unsolved}
                      </span>
                    ) : null; })()}
                  </button>
                  {openOdevler && (
                    <div className="mt-1 space-y-0.5">
                      {assignedQuizzes.length === 0 && (
                        <p className="text-xs text-zinc-400 px-3 py-2">Henüz atanmış ödev yok.</p>
                      )}
                      {assignedQuizzes.map((q) => (
                        <div key={q.id} className="group flex items-center gap-1 px-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors">
                          <Link
                            href={`/study/quiz/${q.id}`}
                            className="flex items-start gap-2 py-2 pl-2 flex-1 min-w-0 text-sm text-zinc-600 dark:text-zinc-400"
                          >
                            <span className="text-base shrink-0">📋</span>
                            <span className="flex-1 min-w-0">
                              <span className="block truncate text-xs font-medium">{q.title}</span>
                              {q.score !== null ? (
                                <span className={`text-[10px] font-semibold ${
                                  q.score >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                                  q.score >= 50 ? "text-amber-500" : "text-red-500"
                                }`}>%{q.score}</span>
                              ) : (
                                <span className="text-[10px] text-violet-500 font-medium">Çözülmedi</span>
                              )}
                            </span>
                          </Link>
                          {q.score !== null && (
                            <button
                              onClick={async (e) => {
                                e.preventDefault();
                                if (!token) return;
                                const res = await fetch(`/api/quizzes/${q.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                                if (res.ok) setAssignedQuizzes(prev => prev.filter(x => x.id !== q.id));
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-300 hover:text-red-500 transition-all shrink-0"
                              title="Ödevi sil"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeView === "karne" && (
              <div className="mt-1">
                <p className="text-xs text-zinc-400 px-2 mb-3">
                  Toplam:{" "}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatDuration(totalStudySeconds)}
                  </span>
                </p>
                {studyStats.map((s) => (
                  <div key={s.subject} className="px-2 py-1.5 mb-1">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{s.subject}</p>
                    <p className="text-[10px] text-zinc-400">{formatDuration(s.studySeconds)} · {s.noteCount} not</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Karne Ana İçeriği */}
        {activeView === "karne" && (
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Çalışma Karnem</h2>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    Toplam çalışma:{" "}
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {formatDuration(totalStudySeconds)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={loadStudyStats}
                  className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  ↻ Yenile
                </button>
              </div>

              {loadingStats ? (
                <div className="text-center py-16 text-zinc-400 text-sm">Yükleniyor...</div>
              ) : studyStats.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">📊</p>
                  <p className="text-zinc-500 text-sm">Henüz çalışma istatistiği yok.</p>
                  <p className="text-zinc-400 text-xs mt-1">
                    Çalışma odalarına katılın, not ve quiz oluşturun.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {studyStats.map((stat) => {
                    const pct =
                      totalStudySeconds > 0
                        ? Math.round((stat.studySeconds / totalStudySeconds) * 100)
                        : 0;
                    return (
                      <div
                        key={stat.subject}
                        className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0">
                              {stat.subject.charAt(0).toUpperCase()}
                            </div>
                            <p className="font-semibold text-zinc-900 dark:text-white text-sm">
                              {stat.subject}
                            </p>
                          </div>
                          {stat.avgScore !== null && (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                stat.avgScore >= 70
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : stat.avgScore >= 50
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              }`}
                            >
                              %{stat.avgScore}
                            </span>
                          )}
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-zinc-400 mb-1">
                            <span>⏱ {formatDuration(stat.studySeconds)}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex gap-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <span className="text-blue-500">📝</span>
                            {stat.noteCount} not
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-violet-500">📋</span>
                            {stat.quizCount} quiz
                          </span>
                          {stat.avgScore !== null && (
                            <span className="flex items-center gap-1">
                              <span className="text-emerald-500">🎯</span>
                              Ort. %{stat.avgScore}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        )}

        {/* Dashboard Ana İçeriği */}
        {activeView === "dashboard" && (
          <>
            {/* 2. KOLON: Haftalar */}
            {activeSubject && (
              <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-sm overflow-y-auto">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ders</p>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{activeSubject.name}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteSubject(activeSubject.id)}
                    title="Dersi sil"
                    className="text-zinc-300 hover:text-red-500 text-xl leading-none px-1"
                  >
                    ×
                  </button>
                </div>
                <nav className="p-2">
                  {activeSubject.weeks.map((w) => {
                    const isActive = openWeekId === w.id;
                    const hasContent = w._count.notes > 0 || w._count.quizzes > 0;
                    return (
                      <button
                        key={w.id}
                        onClick={() => selectWeek(w.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm mb-0.5 transition-colors ${
                          isActive
                            ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        <span className="flex-1">{w.weekNumber}. Hafta</span>
                        {hasContent && (
                          <span className="text-xs bg-indigo-200 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full px-1.5">
                            {w._count.notes}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </aside>
            )}

            {/* 3. KOLON: PDF listesi */}
            {activeSubject && openWeekId && weekDetail && (
              <aside className="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-sm overflow-y-auto">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {weekDetail.week.weekNumber}. Hafta
                  </p>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">PDF&apos;ler</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => startNewUpload(openWeekId)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm mb-2 transition-colors ${
                      view && !view.noteId
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                    }`}
                  >
                    <span>＋</span>
                    <span className="font-medium">Yeni PDF Yükle</span>
                  </button>
                  {weekDetail.notes.length === 0 && (
                    <p className="text-xs text-zinc-400 px-3 py-3">Bu haftada henüz PDF yok.</p>
                  )}
                  {weekDetail.notes.map((n) => {
                    const isActive = view?.noteId === n.id;
                    return (
                      <button
                        key={n.id}
                        onClick={() => selectNote(openWeekId, n.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-start gap-2 text-sm mb-0.5 transition-colors ${
                          isActive
                            ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        <span className="text-base shrink-0">📄</span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-xs font-medium">{n.fileName}</span>
                          <span className="block text-[10px] opacity-60">
                            {new Date(n.uploadedAt).toLocaleDateString("tr-TR")}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>
            )}

            {/* İçerik */}
            <main className="flex-1 overflow-y-auto">
              {!activeSubject ? (
                <EmptyState
                  icon="📚"
                  title="Çalışma alanına hoş geldiniz"
                  text="Sol menüden bir ders seçin veya '+ Ders' ile yeni ders oluşturun."
                />
              ) : !openWeekId ? (
                <EmptyState
                  icon="📅"
                  title={activeSubject.name}
                  text="Bir hafta seçerek o haftaya ait PDF, özet, flashcard ve quizleri görüntüleyebilirsiniz."
                />
              ) : !view ? (
                <EmptyState
                  icon="📄"
                  title={`${weekDetail?.week.weekNumber}. Hafta`}
                  text="Sol listeden bir PDF seçin veya yeni PDF yükleyin."
                />
              ) : !view.noteId ? (
                <UploadView
                  subjectName={activeSubject.name}
                  weekNumber={weekDetail?.week.weekNumber || 0}
                  file={file}
                  fileInputRef={fileInputRef}
                  onFile={handleFileSelect}
                  onGenerate={handleGenerate}
                  working={working}
                  error={error}
                  generated={generated}
                  flipped={flipped}
                  toggleFlip={toggleFlip}
                />
              ) : (
                <div className="max-w-3xl mx-auto px-6 py-10">
                  <div className="mb-8">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {activeSubject.name} · {weekDetail?.week.weekNumber}. Hafta
                    </p>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1 truncate">
                      {noteDetail?.fileName || "Yükleniyor..."}
                    </h1>
                  </div>

                  {noteDetail ? (
                    <SavedView
                      note={noteDetail}
                      weekQuizzes={weekQuizzes.filter((q) => q.noteId === noteDetail.id)}
                      flipped={flipped}
                      toggleFlip={toggleFlip}
                    />
                  ) : (
                    <div className="flex justify-center py-12">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </main>
          </>
        )}
      </div>

      {/* Yeni Ders Modal */}
      {showAddSubject && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAddSubject(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Yeni Ders Ekle</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Ders adı ve hafta sayısını belirleyin.</p>

            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Ders Adı</label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Örn. Matematik 101"
              className="w-full px-4 py-2.5 mb-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Hafta Sayısı: <span className="text-indigo-600">{newWeeks}</span>
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={newWeeks}
              onChange={(e) => setNewWeeks(Number(e.target.value))}
              className="w-full accent-indigo-600 mb-5"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddSubject(false)}
                className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                İptal
              </button>
              <button
                onClick={handleAddSubject}
                disabled={!newName.trim() || creating}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
              >
                {creating ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-24 h-24 rounded-3xl bg-linear-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center text-5xl mb-6 shadow-[0_0_40px_-10px_rgba(99,102,241,0.2)]">
        {icon}
      </div>
      <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{title}</h2>
      <p className="text-base text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm font-medium">{text}</p>
    </div>
  );
}

function UploadView(props: {
  subjectName: string;
  weekNumber: number;
  file: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File | null) => void;
  onGenerate: () => void;
  working: boolean;
  error: string | null;
  generated: { noteId: string; quizId: string; summary: string; flashcards: { front: string; back: string }[]; quiz: GeneratedQuizItem[] } | null;
  flipped: Set<number>;
  toggleFlip: (i: number) => void;
}) {
  const { subjectName, weekNumber, file, fileInputRef, onFile, onGenerate, working, error, generated } = props;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          {subjectName} · {weekNumber}. Hafta
        </div>
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Ders Notu Yükle</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
          PDF&apos;inizi bırakın, yapay zeka sizin için sihrini yapsın.
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files[0] ?? null);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative overflow-hidden border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 group ${
          file
            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-[0_0_40px_-10px_rgba(99,102,241,0.2)]"
            : "border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <div className="text-5xl mb-3">{file ? "📄" : "📤"}</div>
        {file ? (
          <>
            <p className="font-semibold text-indigo-700 dark:text-indigo-400">{file.name}</p>
            <p className="text-sm text-zinc-400 mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB · değiştirmek için tıklayın
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              PDF dosyanızı sürükleyin veya tıklayın
            </p>
            <p className="text-sm text-zinc-400 mt-1">Bu hafta için ders notu</p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={onGenerate}
          disabled={!file || working}
          className="px-8 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-sm hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-xl shadow-zinc-900/20 dark:shadow-white/10 ring-1 ring-black/5 dark:ring-white/5"
        >
          {working ? "Yapay Zeka Çalışıyor..." : "Oluştur"}
        </button>
      </div>

      {working && (
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Özet, flashcard ve quiz birlikte hazırlanıyor...</p>
        </div>
      )}

      {generated && <ResultView {...props} generated={generated} />}
    </div>
  );
}

function SavedView({
  note,
  weekQuizzes,
  flipped,
  toggleFlip,
}: {
  note: NoteDetail;
  weekQuizzes: { id: string; title: string; score: number | null; createdAt: string; noteId: string | null }[];
  flipped: Set<number>;
  toggleFlip: (i: number) => void;
}) {
  return (
    <div className="space-y-10">
      {note.summary && (
        <section>
          <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-3">📝 Özet</h2>
          <div className="bg-white dark:bg-zinc-800/50 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap text-sm">
            {note.summary}
          </div>
        </section>
      )}

      {note.flashcards.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">🃏 Flashcardlar</h2>
          <p className="text-sm text-zinc-400 mb-4">Kartlara tıklayarak çevirin</p>
          <FlashcardGrid cards={note.flashcards} flipped={flipped} toggleFlip={toggleFlip} />
        </section>
      )}

      {weekQuizzes.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-3">📋 Quizler</h2>
          <div className="space-y-2">
            {weekQuizzes.map((q) => (
              <Link
                key={q.id}
                href={`/study/quiz/${q.id}`}
                className="block bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-sm transition-all"
              >
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{q.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-zinc-400">
                    {new Date(q.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  {q.score !== null ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium">
                      Skor: %{q.score}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400 font-medium">
                      Çözülmedi
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FlashcardGrid({
  cards,
  flipped,
  toggleFlip,
}: {
  cards: { front: string; back: string }[];
  flipped: Set<number>;
  toggleFlip: (i: number) => void;
}) {
  return (
    <>
      <style>{`
        .flashcard-scene { perspective: 1200px; }
        .flashcard-inner { position: relative; width: 100%; min-height: 160px; transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .flashcard-inner.flipped { transform: rotateY(180deg); }
        .flashcard-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 1.5rem; padding: 1.5rem; display: flex; flex-direction: column; justify-content: center; }
        .flashcard-back { transform: rotateY(180deg); }
      `}</style>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {cards.map((card, i) => (
          <div key={i} className="flashcard-scene cursor-pointer group" style={{ minHeight: 160 }} onClick={() => toggleFlip(i)}>
            <div className={`flashcard-inner${flipped.has(i) ? " flipped" : ""}`} style={{ minHeight: 160 }}>
              <div className="flashcard-face bg-white dark:bg-[#09090b] border border-zinc-200/60 dark:border-zinc-800 shadow-sm group-hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] font-bold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-md uppercase tracking-widest">Kart {i + 1}</div>
                </div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">{card.front}</p>
                <div className="mt-auto pt-4 text-xs text-zinc-400 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Çevir</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </div>
              </div>
              <div className="flashcard-face flashcard-back bg-linear-to-br from-indigo-500 to-violet-600 border border-indigo-400/50 shadow-xl shadow-indigo-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] font-bold px-2 py-1 bg-white/20 text-white rounded-md uppercase tracking-widest">Cevap</div>
                </div>
                <p className="text-sm font-medium text-white leading-relaxed">{card.back}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ResultView({
  generated,
  flipped,
  toggleFlip,
}: {
  generated: { noteId: string; quizId: string; summary: string; flashcards: { front: string; back: string }[]; quiz: GeneratedQuizItem[] };
  flipped: Set<number>;
  toggleFlip: (i: number) => void;
}) {
  return (
    <div className="mt-10 space-y-10">
      <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm">
        ✓ Özet, flashcard ve quiz oluşturuldu ve bu haftaya kaydedildi.
      </div>

      <section>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-4 tracking-tight">📝 Özet</h2>
        <div className="bg-white dark:bg-[#09090b] rounded-3xl p-8 shadow-sm border border-zinc-200/60 dark:border-zinc-800 leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap text-[15px] font-medium selection:bg-indigo-500/30">
          {generated.summary}
        </div>
      </section>

      {generated.flashcards.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">🃏 Flashcardlar</h2>
              <p className="text-xs text-zinc-400 font-medium mt-1">Kartlara tıklayarak cevabı gör</p>
            </div>
          </div>
          <FlashcardGrid cards={generated.flashcards} flipped={flipped} toggleFlip={toggleFlip} />
        </section>
      )}

      {generated.quiz.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">📋 Quiz ({generated.quiz.length} Soru)</h2>
          <p className="text-sm text-zinc-400 mb-4">Bu konuyu pekiştirmek için oluşturulan quiz hazır.</p>
          <Link
            href={`/study/quiz/${generated.quizId}`}
            className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Quize Git
          </Link>
        </section>
      )}
      
      <div className="flex justify-end pt-4">
        <button 
          onClick={() => window.location.href = "/dashboard"}
          className="px-8 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-md"
        >
          Tamam
        </button>
      </div>
    </div>
  );
}
