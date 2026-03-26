"use client";

import { useState } from "react";
import { Loader, AlertCircle, CheckCircle, FileText, Brain } from "lucide-react";

type ProcessingMode = "summary" | "quiz" | null;

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

interface ProcessResult {
  success?: boolean;
  error?: string;
  summary?: string;
  questions?: QuizQuestion[];
  count?: number;
}

interface PDFProcessorProps {
  courseId: string;
}

const normalizeGeneratedText = (value: string): string => {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/([.,;:!?])([A-Za-zÇĞİÖŞÜçğıöşü])/g, "$1 $2")
    .replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, "$1 $2")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const toQuizQuestion = (raw: unknown): QuizQuestion | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as {
    question?: unknown;
    options?: unknown;
    correct?: unknown;
  };

  if (!Array.isArray(candidate.options)) {
    return null;
  }

  const options = candidate.options
    .map((option) => normalizeGeneratedText(String(option || "")))
    .filter((option) => option.length > 0)
    .slice(0, 4);

  if (options.length < 4) {
    return null;
  }

  const correct =
    typeof candidate.correct === "number" && candidate.correct >= 0 && candidate.correct <= 3
      ? candidate.correct
      : 0;

  return {
    question: normalizeGeneratedText(String(candidate.question || "")),
    options,
    correct,
  };
};

const normalizeResult = (mode: ProcessingMode, data: ProcessResult): ProcessResult => {
  if (mode === "summary" && data.summary) {
    return {
      ...data,
      summary: normalizeGeneratedText(data.summary),
    };
  }

  if (mode === "quiz" && Array.isArray(data.questions)) {
    const normalizedQuestions = data.questions
      .map((question) => toQuizQuestion(question))
      .filter((question): question is QuizQuestion => question !== null);

    return {
      ...data,
      questions: normalizedQuestions,
      count: normalizedQuestions.length,
    };
  }

  return data;
};

export function PDFProcessor({ courseId }: PDFProcessorProps) {
  const [mode, setMode] = useState<ProcessingMode>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleProcessing = async () => {
    if (!mode || !courseId) {
      setResult({ error: "Lütfen bir ders seçin ve modu belirleyin" });
      return;
    }

    setLoading(true);
    setResult(null);
    setQuizSubmitted(false);

    try {
      let endpoint = "";
      let payload: Record<string, unknown> = {};

      if (mode === "summary") {
        endpoint = "/api/ai/summary";
        payload = { courseId, maxLength: 500 };
      } else if (mode === "quiz") {
        endpoint = "/api/ai/quiz";
        payload = { courseId, count: 10 };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as ProcessResult;

      if (!response.ok) {
        setResult({ error: data.error || "İşlem başarısız" });
      } else {
        setResult(normalizeResult(mode, data));
        if (mode === "quiz") {
          setSelectedAnswers({});
        }
      }
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : "Bir hata oluştu",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuiz = () => {
    if (!result?.questions) return;

    // Calculate score
    let correctCount = 0;
    result.questions.forEach((q: QuizQuestion, idx: number) => {
      if (selectedAnswers[idx] === q.correct) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / result.questions.length) * 100);
    setScore(finalScore);
    setQuizSubmitted(true);
  };

  const handleAnswer = (questionIndex: number, optionIndex: number) => {
    if (!quizSubmitted) {
      setSelectedAnswers({
        ...selectedAnswers,
        [questionIndex]: optionIndex,
      });
    }
  };

  const resetForm = () => {
    setMode(null);
    setResult(null);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setScore(null);
  };

  const summaryParagraphs = (result?.summary || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">İçerik İşle</h2>

      {/* Mode Selection */}
      {!result && !loading && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setMode("summary")}
            className={`p-4 rounded-lg border-2 transition-all ${
              mode === "summary"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-300"
            }`}
          >
            <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="font-semibold text-gray-800">Özet Oluştur</p>
            <p className="text-sm text-gray-600">Ders özetini al</p>
          </button>

          <button
            onClick={() => setMode("quiz")}
            className={`p-4 rounded-lg border-2 transition-all ${
              mode === "quiz"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-300"
            }`}
          >
            <Brain className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="font-semibold text-gray-800">Quiz Oluştur</p>
            <p className="text-sm text-gray-600">10 soruluk bir test yap</p>
          </button>
        </div>
      )}

      {/* Process Button */}
      {!result && !loading && mode && (
        <button
          onClick={handleProcessing}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors mb-6"
        >
          {mode === "summary" ? "Özet Oluştur" : "Quiz Başla"}
        </button>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <Loader className="animate-spin h-8 w-8 mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">
            {mode === "summary" ? "Özet oluşturuluyor..." : "Quiz hazırlanıyor..."}
          </p>
        </div>
      )}

      {/* Error State */}
      {result?.error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded-md flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">Hata</p>
            <p className="text-sm text-red-700">{result.error}</p>
          </div>
        </div>
      )}

      {/* Summary Result */}
      {result?.summary && mode === "summary" && !loading && (
        <div className="space-y-4">
          <div className="p-4 bg-green-100 border border-green-400 rounded-md flex gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">Özet başarıyla oluşturuldu</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">Ders Özeti</h3>
            <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
              {summaryParagraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          <button
            onClick={resetForm}
            className="w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Yeni İşlem
          </button>
        </div>
      )}

      {/* Quiz Result */}
      {result?.questions && mode === "quiz" && !loading && (
        <div className="space-y-6">
          <h3 className="font-semibold text-gray-800">
            Quiz: {result.count} Soru
          </h3>

          {result.questions.map((question: QuizQuestion, idx: number) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-800 mb-3">
                {idx + 1}. {question.question}
              </p>
              <div className="space-y-2">
                {question.options.map((option: string, optIdx: number) => (
                  <button
                    type="button"
                    key={optIdx}
                    onClick={() => handleAnswer(idx, optIdx)}
                    disabled={quizSubmitted}
                    className={`w-full text-left p-3 rounded-md border shadow-sm transition-colors text-sm sm:text-base ${
                      selectedAnswers[idx] === optIdx
                        ? "border-blue-500 bg-blue-50 text-gray-900"
                        : "border-gray-300 bg-white hover:border-blue-300 text-gray-800"
                    } ${
                      quizSubmitted && question.correct === optIdx
                        ? "border-green-500 bg-green-50 text-gray-900"
                        : ""
                    } ${
                      quizSubmitted &&
                      selectedAnswers[idx] === optIdx &&
                      question.correct !== optIdx
                        ? "border-red-500 bg-red-50 text-gray-900"
                        : ""
                    } disabled:cursor-not-allowed`}
                  >
                    <span className="font-semibold mr-2">
                      {String.fromCharCode(65 + optIdx)}.
                    </span>
                    <span className="align-middle">{option}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {!quizSubmitted && (
            <button
              onClick={handleSubmitQuiz}
              className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 transition-colors font-semibold"
            >
              Quiz&apos;i Gönder
            </button>
          )}

          {quizSubmitted && score !== null && (
            <div className="p-6 bg-blue-50 border border-blue-300 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600 mb-2">{score}%</p>
              <p className="text-gray-700">
                {score >= 80
                  ? "Harika! 🎉"
                  : score >= 60
                  ? "İyi iş! 👍"
                  : "Daha fazla çalış 💪"}
              </p>
            </div>
          )}

          {quizSubmitted && (
            <button
              onClick={resetForm}
              className="w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Yeni Quiz
            </button>
          )}
        </div>
      )}
    </div>
  );
}
