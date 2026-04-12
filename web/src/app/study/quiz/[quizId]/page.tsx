"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getQuiz, submitQuiz, Quiz } from "@/lib/apiClient";

export default function QuizPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    correctCount: number;
    totalQuestions: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      // Eğer daha önce çözülmüşse (userAnswer dolu) otomatik olarak sonuç göster
      const alreadyAnswered = res.quiz.questions.every((q) => q.userAnswer !== null);
      if (alreadyAnswered) {
        const preAnswers: Record<string, string> = {};
        res.quiz.questions.forEach((q) => {
          if (q.userAnswer) preAnswers[q.id] = q.userAnswer;
        });
        setAnswers(preAnswers);
        setSubmitted(true);
        if (res.quiz.score !== null) {
          setResult({
            score: res.quiz.score,
            correctCount: 0,
            totalQuestions: res.quiz.questions.length,
          });
        }
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
      setResult({
        score: res.score!,
        correctCount: res.correctCount!,
        totalQuestions: res.totalQuestions!,
      });
      setSubmitted(true);
      // Soruları yeniden çek — correctAnswer göstermek için (backend döndürmüyor ama state'te tutabiliriz)
    } else {
      setError(res.error || "Quiz gönderilemedi.");
    }
    setSubmitting(false);
  }

  const answeredCount = Object.keys(answers).length;
  const totalCount = quiz?.questions.length ?? 0;

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Link href="/dashboard" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            ← Çalışma alanına dön
          </Link>
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Başlık */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 mb-2 inline-block"
            >
              ← Geri Dön
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{quiz.title}</h1>
            {quiz.subject && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{quiz.subject}</p>
            )}
          </div>

          {/* Skor rozeti */}
          {result && (
            <div className="text-center bg-white dark:bg-zinc-800/50 border border-indigo-100 dark:border-indigo-800 rounded-2xl px-6 py-4">
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {result.score}%
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {result.correctCount ?? "—"}/{result.totalQuestions} doğru
              </div>
            </div>
          )}
        </div>

        {/* Sorular */}
        <div className="space-y-5">
          {quiz.questions.map((q, qi) => {
            const selected = answers[q.id];
            const isAnswered = !!selected;

            return (
              <div
                key={q.id}
                className={`bg-white dark:bg-zinc-800/50 rounded-2xl p-5 shadow-sm border transition-all ${
                  submitted && isAnswered
                    ? "border-zinc-200 dark:border-zinc-700"
                    : "border-zinc-100 dark:border-zinc-800"
                }`}
              >
                <p className="font-medium text-zinc-800 dark:text-zinc-200 mb-3 text-sm">
                  <span className="text-indigo-600 dark:text-indigo-400 mr-2">{qi + 1}.</span>
                  {q.questionText}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(q.options as string[]).map((opt, oi) => {
                    const isSelected = selected === opt;
                    return (
                      <button
                        key={oi}
                        onClick={() => {
                          if (submitted) return;
                          setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                        }}
                        className={`text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-600 text-indigo-800 dark:text-indigo-300"
                            : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:border-indigo-600"
                        } ${submitted ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <span className="font-medium mr-1.5">{String.fromCharCode(65 + oi)})</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Gönder / Sonuç */}
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={answeredCount < totalCount || submitting}
            className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
          >
            {submitting
              ? "Gönderiliyor..."
              : answeredCount < totalCount
              ? `Tüm soruları cevaplayın (${answeredCount}/${totalCount})`
              : "Quizi Tamamla"}
          </button>
        ) : (
          <div className="mt-6 p-5 bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-center">
            <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              Quiz tamamlandı!
            </div>
            {result && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Skorunuz: <span className="font-bold text-indigo-600 dark:text-indigo-400">{result.score}%</span>
              </p>
            )}
            <Link
              href="/dashboard"
              className="inline-block mt-4 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Çalışma Alanına Dön
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
