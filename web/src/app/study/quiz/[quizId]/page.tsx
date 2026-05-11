"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { getQuiz, submitQuiz, Quiz } from "@/lib/apiClient";

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80
      ? "var(--classy-color-success)"
      : score >= 50
        ? "var(--classy-color-warning)"
        : "var(--classy-color-danger)";

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-zinc-100 dark:text-zinc-800"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-zinc-900 dark:text-white">
          {score}%
        </span>
        <span className="mt-0.5 text-xs text-zinc-400">skor</span>
      </div>
    </div>
  );
}

function ResultBadge({
  correct,
  className = "",
}: {
  correct: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
        correct
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300"
      } ${className}`}
    >
      <span aria-hidden="true">{correct ? "✓" : "✕"}</span>
      <span>{correct ? "Doğru" : "Yanlış"}</span>
    </span>
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
  const [result, setResult] = useState<{
    score: number;
    correctCount: number;
    totalQuestions: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState(false);
  const [history, setHistory] = useState<
    { id: string; score: number; createdAt: string }[]
  >([]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  async function loadQuiz() {
    setFetching(true);
    const res = await getQuiz(quizId);

    if (res.ok && res.quiz) {
      setQuiz(res.quiz);
      const alreadyAnswered = res.quiz.questions.every((question) => question.userAnswer !== null);

      if (alreadyAnswered) {
        const prefilledAnswers: Record<string, string> = {};
        res.quiz.questions.forEach((question) => {
          if (question.userAnswer) {
            prefilledAnswers[question.id] = question.userAnswer;
          }
        });

        setAnswers(prefilledAnswers);
        setSubmitted(true);
        setShowResultScreen(true);

        if (res.quiz.score !== null) {
          setResult({
            score: res.quiz.score,
            correctCount: 0,
            totalQuestions: res.quiz.questions.length,
          });
        }
      }

      if (res.quiz.subject) {
        const token = localStorage.getItem("classy_token");
        fetch(`/api/quizzes?subject=${encodeURIComponent(res.quiz.subject)}&limit=8`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((response) => (response.ok ? response.json() : null))
          .then((data) => {
            if (data?.quizzes) {
              setHistory(data.quizzes);
            }
          });
      }
    } else {
      setError(res.error || "Quiz yüklenemedi.");
    }

    setFetching(false);
  }

  useEffect(() => {
    if (!quizId) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadQuiz();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [quizId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    if (!quiz) {
      return;
    }

    setSubmitting(true);
    const res = await submitQuiz(quizId, answers);

    if (res.ok) {
      setResult({
        score: res.score!,
        correctCount: res.correctCount!,
        totalQuestions: res.totalQuestions!,
      });
      showToast(`Quiz tamamlandı. Skorunuz: %${res.score}`, res.score! >= 50 ? "success" : "info");
      await loadQuiz();
    } else {
      showToast(res.error || "Quiz gönderilemedi.", "error");
      setError(res.error || "Quiz gönderilemedi.");
    }

    setSubmitting(false);
  }

  const answeredCount = Object.keys(answers).length;
  const totalCount = quiz?.questions.length ?? 0;

  if (loading || fetching) {
    return (
      <div className="flex w-full flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex w-full flex-1 items-center justify-center px-6">
        <div className="text-center">
          <p className="mb-4 text-red-600 dark:text-red-400">{error}</p>
          <Link
            href="/dashboard"
            className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            ← Çalışma alanına dön
          </Link>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  if (showResultScreen && result) {
    const correctCount =
      result.correctCount || Math.round((result.score / 100) * result.totalQuestions);
    const wrongCount = result.totalQuestions - correctCount;
    const icon = result.score >= 80 ? "🎉" : result.score >= 50 ? "👍" : "📘";
    const message =
      result.score >= 80
        ? "Harika iş."
        : result.score >= 50
          ? "İyi gidiyor."
          : "Biraz daha çalışalım.";

    return (
      <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <main
          className="mx-auto max-w-xl space-y-6 px-6 py-14"
          data-focus-main
          data-focus-reading-width
          data-focus-card-stack
        >
          <div className="rounded-3xl border border-zinc-100 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 text-4xl" aria-hidden="true">
              {icon}
            </div>
            <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">
              {message}
            </h1>
            <p className="mb-8 text-sm text-zinc-400">{quiz.title}</p>

            <ScoreRing score={result.score} />

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                {
                  label: "Toplam",
                  value: result.totalQuestions,
                  color: "text-zinc-700 dark:text-zinc-300",
                  bg: "bg-zinc-50 dark:bg-zinc-800",
                },
                {
                  label: "Doğru",
                  value: correctCount,
                  color: "text-emerald-700 dark:text-emerald-400",
                  bg: "bg-emerald-50 dark:bg-emerald-950/40",
                },
                {
                  label: "Yanlış",
                  value: wrongCount,
                  color: "text-red-700 dark:text-red-400",
                  bg: "bg-red-50 dark:bg-red-950/40",
                },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-2xl py-4 ${stat.bg}`}>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-sm font-bold text-zinc-700 dark:text-zinc-300">
              Soru analizi
            </h2>
            <div className="space-y-3">
              {quiz.questions.map((question, index) => {
                const isCorrect = question.userAnswer === question.correctAnswer;

                return (
                  <div
                    key={question.id}
                    className={`rounded-xl border p-3.5 ${
                      isCorrect
                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20"
                        : "border-red-200 bg-red-50/50 dark:border-red-800/40 dark:bg-red-950/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <ResultBadge correct={isCorrect} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="mb-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          {index + 1}. {question.questionText}
                        </p>
                        {!isCorrect ? (
                          <div className="space-y-1">
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Senin cevabın:{" "}
                              <span className="font-semibold">{question.userAnswer || "—"}</span>
                            </p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              Doğru cevap:{" "}
                              <span className="font-semibold">{question.correctAnswer}</span>
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            Doğru cevap:{" "}
                            <span className="font-semibold">{question.correctAnswer}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {history.length > 1 && (
            <div
              className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              data-focus-hidden
            >
              <h2 className="mb-4 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                {quiz.subject} skor geçmişi
              </h2>
              <div className="flex h-20 items-end gap-1.5">
                {[...history].reverse().map((entry) => {
                  const percent = entry.score ?? 0;
                  const color =
                    percent >= 80
                      ? "bg-emerald-500"
                      : percent >= 50
                        ? "bg-amber-400"
                        : "bg-red-400";
                  const isCurrent = entry.id === quizId;

                  return (
                    <div
                      key={entry.id}
                      className="group relative flex flex-1 flex-col items-center gap-1"
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
                        %{percent}
                      </div>
                      <div
                        className={`w-full rounded-t-sm transition-all ${color} ${isCurrent ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
                        style={{ height: `${Math.max(4, percent * 0.75)}px` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-xs text-zinc-400">
                <span>En eski</span>
                <span>En yeni</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowResultScreen(false)}
              className="flex-1 rounded-xl border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-700 transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              Soruları gözden geçir
            </button>
            <Link
              href="/dashboard"
              className="flex-1 rounded-xl bg-indigo-600 py-3 text-center text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700"
            >
              Çalışma alanı
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main
        className="mx-auto max-w-3xl px-6 py-10"
        data-focus-main
        data-focus-reading-width
      >
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="mb-2 inline-block text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              ← Geri dön
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {quiz.title}
            </h1>
            {quiz.subject && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{quiz.subject}</p>
            )}
          </div>

          {!submitted && (
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {answeredCount}/{totalCount}
              </p>
              <p className="text-xs text-zinc-400">cevaplandı</p>
              <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${(answeredCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          )}

          {submitted && result && (
            <button
              onClick={() => setShowResultScreen(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Sonucu gör
            </button>
          )}
        </div>

        <div className="space-y-5">
          {quiz.questions.map((question, questionIndex) => {
            const selected = answers[question.id];

            return (
              <div
                key={question.id}
                className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-800/50"
              >
                <p className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  <span className="mr-2 text-indigo-600 dark:text-indigo-400">
                    {questionIndex + 1}.
                  </span>
                  {question.questionText}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(question.options as string[]).map((option, optionIndex) => {
                    const isSelected = selected === option;
                    const isCorrect = submitted && question.correctAnswer === option;
                    const isWrongSelection =
                      submitted && isSelected && question.correctAnswer !== option;

                    let buttonClass = "";

                    if (!submitted) {
                      buttonClass = isSelected
                        ? "border-indigo-400 bg-indigo-50 text-indigo-800 dark:border-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
                        : "border-zinc-200 text-zinc-600 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-indigo-600";
                    } else if (isCorrect) {
                      buttonClass =
                        "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
                    } else if (isWrongSelection) {
                      buttonClass =
                        "border-red-400 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300";
                    } else {
                      buttonClass =
                        "border-zinc-200 text-zinc-400 opacity-60 dark:border-zinc-800 dark:text-zinc-600";
                    }

                    return (
                      <button
                        key={option}
                        onClick={() => {
                          if (submitted) {
                            return;
                          }
                          setAnswers((prev) => ({ ...prev, [question.id]: option }));
                        }}
                        className={`rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${buttonClass} ${submitted ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <span className="mr-1.5 font-medium">
                          {String.fromCharCode(65 + optionIndex)})
                        </span>
                        {option}
                        {isCorrect && (
                          <ResultBadge correct className="float-right ml-3" />
                        )}
                        {isWrongSelection && (
                          <ResultBadge correct={false} className="float-right ml-3" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={answeredCount < totalCount || submitting}
            className="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? "Gönderiliyor..."
              : answeredCount < totalCount
                ? `Tüm soruları cevaplayın (${answeredCount}/${totalCount})`
                : "Quizi tamamla"}
          </button>
        ) : (
          <button
            onClick={() => setShowResultScreen(true)}
            className="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700"
          >
            Sonucu gör
          </button>
        )}
      </main>
    </div>
  );
}
