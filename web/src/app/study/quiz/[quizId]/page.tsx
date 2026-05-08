"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getQuiz, submitQuiz, Quiz } from "@/lib/apiClient";
import { useToast } from "@/components/Toast";

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-100 dark:text-zinc-800" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-zinc-900 dark:text-white">{score}%</span>
        <span className="text-xs text-zinc-400 mt-0.5">skor</span>
      </div>
    </div>
  );
}

export default function QuizPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;
  const { showToast } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; correctCount: number; totalQuestions: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState(false);
  const [history, setHistory] = useState<{ id: string; score: number; createdAt: string }[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!quizId) return;
    loadQuiz();
  }, [quizId]);

  async function loadQuiz() {
    setFetching(true);
    const res = await getQuiz(quizId);
    if (res.ok && res.quiz) {
      setQuiz(res.quiz);
      const alreadyAnswered = res.quiz.questions.every((q) => q.userAnswer !== null);
      if (alreadyAnswered) {
        const preAnswers: Record<string, string> = {};
        res.quiz.questions.forEach((q) => { if (q.userAnswer) preAnswers[q.id] = q.userAnswer; });
        setAnswers(preAnswers);
        setSubmitted(true);
        setShowResultScreen(true);
        if (res.quiz.score !== null) {
          setResult({ score: res.quiz.score, correctCount: 0, totalQuestions: res.quiz.questions.length });
        }
      }
      // Konu geçmişini yükle
      if (res.quiz.subject) {
        const token = localStorage.getItem("classy_token");
        fetch(`/api/quizzes?subject=${encodeURIComponent(res.quiz.subject)}&limit=8`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d?.quizzes) setHistory(d.quizzes); });
      }
    } else {
      setError(res.error || "Quiz yüklenemedi.");
    }
    setFetching(false);
  }

  async function handleSubmit() {
    if (!quiz) return;
    setSubmitting(true);
    const res = await submitQuiz(quizId, answers);
    if (res.ok) {
      setResult({ score: res.score!, correctCount: res.correctCount!, totalQuestions: res.totalQuestions! });
      showToast(`Quiz tamamlandı! Skorunuz: %${res.score}`, res.score! >= 50 ? "success" : "info");
      await loadQuiz(); // Fetch again to get the correct answers
    } else {
      showToast(res.error || "Quiz gönderilemedi.", "error");
      setError(res.error || "Quiz gönderilemedi.");
    }
    setSubmitting(false);
  }

  const answeredCount = Object.keys(answers).length;
  const totalCount = quiz?.questions.length ?? 0;

  if (loading || fetching) return (
    <div className="w-full flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="w-full flex-1 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Link href="/dashboard" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">← Çalışma alanına dön</Link>
      </div>
    </div>
  );

  if (!quiz) return null;

  // ─── Sonuç Ekranı ───
  if (showResultScreen && result) {
    const correctCount = result.correctCount || Math.round((result.score / 100) * result.totalQuestions);
    const wrongCount = result.totalQuestions - correctCount;
    const emoji = result.score >= 80 ? "🎉" : result.score >= 50 ? "👍" : "📖";
    const message = result.score >= 80 ? "Harika iş!" : result.score >= 50 ? "İyi gidiyor!" : "Biraz daha çalışalım!";

    return (
      <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <main className="max-w-xl mx-auto px-6 py-14 space-y-6">
          {/* Ana sonuç kartı */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">{emoji}</div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">{message}</h1>
            <p className="text-sm text-zinc-400 mb-8">{quiz.title}</p>

            <ScoreRing score={result.score} />

            {/* İstatistikler */}
            <div className="grid grid-cols-3 gap-3 mt-8">
              {[
                { label: "Toplam", value: result.totalQuestions, color: "text-zinc-700 dark:text-zinc-300", bg: "bg-zinc-50 dark:bg-zinc-800" },
                { label: "Doğru", value: correctCount, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
                { label: "Yanlış", value: wrongCount, color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40" },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl py-4 ${s.bg}`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Soru bazlı analiz */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4">📋 Soru Analizi</h2>
            <div className="space-y-3">
              {quiz.questions.map((q, i) => {
                const isCorrect = q.userAnswer === q.correctAnswer;
                return (
                  <div key={q.id} className={`rounded-xl p-3.5 border ${isCorrect ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20" : "border-red-200 bg-red-50/50 dark:border-red-800/40 dark:bg-red-950/20"}`}>
                    <div className="flex items-start gap-2">
                      <span className={`shrink-0 text-base ${isCorrect ? "text-emerald-500" : "text-red-500"}`}>{isCorrect ? "✓" : "✗"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{i + 1}. {q.questionText}</p>
                        {!isCorrect && (
                          <div className="space-y-1">
                            <p className="text-[11px] text-red-600 dark:text-red-400">Senin cevabın: <span className="font-semibold">{q.userAnswer || "—"}</span></p>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Doğru cevap: <span className="font-semibold">{q.correctAnswer}</span></p>
                          </div>
                        )}
                        {isCorrect && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Doğru: <span className="font-semibold">{q.correctAnswer}</span></p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Konu skor geçmişi */}
          {history.length > 1 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4">📈 {quiz.subject} — Skor Geçmişi</h2>
              <div className="flex items-end gap-1.5 h-20">
                {[...history].reverse().map((h, i) => {
                  const pct = h.score ?? 0;
                  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
                  const isThis = h.id === quizId;
                  return (
                    <div key={h.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">{pct}%</div>
                      <div
                        className={`w-full rounded-t-sm transition-all ${color} ${isThis ? "ring-2 ring-offset-1 ring-indigo-400" : ""}`}
                        style={{ height: `${Math.max(4, pct * 0.75)}px` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                <span>En eski</span><span>En yeni</span>
              </div>
            </div>
          )}

          {/* Aksiyon butonları */}
          <div className="flex gap-3">
            <button onClick={() => setShowResultScreen(false)}
              className="flex-1 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 transition-all">
              Soruları Gözden Geçir
            </button>
            <Link href="/dashboard"
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all text-center shadow-sm">
              Çalışma Alanı
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ─── Quiz Ekranı ───
  return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 mb-2 inline-block">
              ← Geri Dön
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{quiz.title}</h1>
            {quiz.subject && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{quiz.subject}</p>}
          </div>
          {/* İlerleme */}
          {!submitted && (
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{answeredCount}/{totalCount}</p>
              <p className="text-xs text-zinc-400">cevaplandı</p>
              <div className="w-24 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(answeredCount / totalCount) * 100}%` }} />
              </div>
            </div>
          )}
          {submitted && result && (
            <button onClick={() => setShowResultScreen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
              Sonucu Gör
            </button>
          )}
        </div>

        <div className="space-y-5">
          {quiz.questions.map((q, qi) => {
            const selected = answers[q.id];
            return (
              <div key={q.id} className="bg-white dark:bg-zinc-800/50 rounded-2xl p-5 shadow-sm border border-zinc-100 dark:border-zinc-800">
                <p className="font-medium text-zinc-800 dark:text-zinc-200 mb-3 text-sm">
                  <span className="text-indigo-600 dark:text-indigo-400 mr-2">{qi + 1}.</span>
                  {q.questionText}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(q.options as string[]).map((opt, oi) => {
                    const isSelected = selected === opt;
                    const isCorrect = submitted && q.correctAnswer === opt;
                    const isWrongSelection = submitted && isSelected && q.correctAnswer !== opt;
                    
                    let btnClass = "";
                    if (!submitted) {
                      btnClass = isSelected
                        ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-600 text-indigo-800 dark:text-indigo-300"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:border-indigo-600";
                    } else {
                      if (isCorrect) {
                        btnClass = "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-800 dark:text-emerald-300";
                      } else if (isWrongSelection) {
                        btnClass = "bg-red-50 dark:bg-red-900/30 border-red-400 text-red-800 dark:text-red-300";
                      } else {
                        btnClass = "border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 opacity-60";
                      }
                    }

                    return (
                      <button key={oi} onClick={() => { if (submitted) return; setAnswers((prev) => ({ ...prev, [q.id]: opt })); }}
                        className={`text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${btnClass} ${submitted ? "cursor-default" : "cursor-pointer"}`}>
                        <span className="font-medium mr-1.5">{String.fromCharCode(65 + oi)})</span>{opt}
                        {isCorrect && <span className="float-right text-emerald-600 dark:text-emerald-400">✓</span>}
                        {isWrongSelection && <span className="float-right text-red-500">✗</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!submitted ? (
          <button onClick={handleSubmit} disabled={answeredCount < totalCount || submitting}
            className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm shadow-sm">
            {submitting ? "Gönderiliyor..." : answeredCount < totalCount ? `Tüm soruları cevaplayın (${answeredCount}/${totalCount})` : "Quizi Tamamla"}
          </button>
        ) : (
          <button onClick={() => setShowResultScreen(true)}
            className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all text-sm shadow-sm">
            Sonucu Gör
          </button>
        )}
      </main>
    </div>
  );
}
