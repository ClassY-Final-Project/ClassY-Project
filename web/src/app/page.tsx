"use client";

import { useState, useRef } from "react";

const API_URL = "http://localhost:8000";

type QuizItem = {
  question: string;
  options: string[];
  answer: string;
};

type Flashcard = {
  front: string;
  back: string;
};

type StudyNotes = {
  summary: string;
  flashcards: Flashcard[];
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "quiz">("notes");
  const [questionCount, setQuestionCount] = useState(10);
  const [studyNotes, setStudyNotes] = useState<StudyNotes | null>(null);
  const [quiz, setQuiz] = useState<QuizItem[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
      setError(null);
    } else {
      setError("Lütfen bir PDF dosyası seçin.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") {
      setFile(dropped);
      setError(null);
    } else {
      setError("Lütfen bir PDF dosyası sürükleyin.");
    }
  };

  const generateStudyNotes = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setQuiz(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/generate-study-notes`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Bir hata oluştu");
      }
      const data = await res.json();
      setStudyNotes(data.data);
      setFlippedCards(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setStudyNotes(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("question_count", questionCount.toString());
      const res = await fetch(`${API_URL}/generate-quiz`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Bir hata oluştu");
      }
      const data = await res.json();
      setQuiz(data.quiz);
      setSelectedAnswers({});
      setShowResults(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (activeTab === "quiz") {
      generateQuiz();
    } else {
      generateStudyNotes();
    }
  };

  const toggleCard = (index: number) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const score = quiz
    ? Object.entries(selectedAnswers).filter(
        ([i, ans]) => quiz[Number(i)]?.answer === ans
      ).length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Header */}
      <header className="border-b border-indigo-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">C</div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">ClassY</h1>
          <span className="text-sm text-zinc-400 ml-1">AI Ders Asistanı</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Upload Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            file
              ? "border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-600"
              : "border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:border-indigo-600"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="text-4xl mb-3">{file ? "📄" : "📤"}</div>
          {file ? (
            <div>
              <p className="font-semibold text-indigo-700 dark:text-indigo-400">{file.name}</p>
              <p className="text-sm text-zinc-500 mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB — Değiştirmek için tıkla
              </p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                PDF dosyanızı sürükleyin veya tıklayın
              </p>
              <p className="text-sm text-zinc-400 mt-1">Ders notlarınızı yükleyin</p>
            </div>
          )}
        </div>

        {/* Tabs + Options */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-1">
            {(["notes", "quiz"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-white dark:bg-zinc-700 text-indigo-700 dark:text-indigo-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {tab === "notes" ? "📝 Özet & Flashcard" : "📋 Quiz"}
              </button>
            ))}
          </div>

          {activeTab === "quiz" && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Soru sayısı:</label>
              <input
                type="range"
                min={10}
                max={20}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-32 accent-indigo-600"
              />
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 min-w-[2ch]">
                {questionCount}
              </span>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!file || loading}
            className="ml-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            {loading ? "⏳ Üretiliyor..." : "Oluştur"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-12 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-zinc-500 text-sm">
              {activeTab === "quiz" ? "Quiz soruları hazırlanıyor..." : "Notlarınız analiz ediliyor..."}
            </p>
          </div>
        )}

        {/* Study Notes Result: Summary + Flashcards */}
        {!loading && activeTab === "notes" && studyNotes && (
          <div className="mt-8 space-y-10">
            {/* Özet */}
            <div>
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-4">📝 Özet</h2>
              <div className="bg-white dark:bg-zinc-800/50 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {studyNotes.summary}
              </div>
            </div>

            {/* Flashcardlar */}
            <div>
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-4">🃏 Flashcardlar</h2>
              <p className="text-sm text-zinc-400 mb-4">Kartlara tıklayarak çevirebilirsiniz</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {studyNotes.flashcards.map((card, i) => (
                  <div
                    key={i}
                    onClick={() => toggleCard(i)}
                    className="min-h-[140px] p-5 rounded-2xl cursor-pointer transition-all shadow-sm hover:shadow-md border flex flex-col justify-center"
                    style={{
                      background: flippedCards.has(i)
                        ? "linear-gradient(135deg, #eef2ff, #e0e7ff)"
                        : "white",
                      borderColor: flippedCards.has(i) ? "#a5b4fc" : "#e5e7eb",
                    }}
                  >
                    <div className="text-xs font-medium text-indigo-500 mb-2">
                      {flippedCards.has(i) ? "CEVAP" : `KART ${i + 1}`}
                    </div>
                    <p className={`text-sm leading-relaxed ${flippedCards.has(i) ? "text-indigo-800" : "text-zinc-700"}`}>
                      {flippedCards.has(i) ? card.back : card.front}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quiz Result */}
        {!loading && activeTab === "quiz" && quiz && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">📋 Quiz ({quiz.length} Soru)</h2>
              {showResults && (
                <div className="px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-full text-sm font-bold text-indigo-700 dark:text-indigo-400">
                  Skor: {score}/{quiz.length}
                </div>
              )}
            </div>
            <div className="space-y-4">
              {quiz.map((q, qi) => (
                <div
                  key={qi}
                  className={`bg-white dark:bg-zinc-800/50 rounded-2xl p-5 shadow-sm border transition-all ${
                    showResults
                      ? selectedAnswers[qi] === q.answer
                        ? "border-green-300 dark:border-green-700"
                        : selectedAnswers[qi]
                        ? "border-red-300 dark:border-red-700"
                        : "border-zinc-100 dark:border-zinc-800"
                      : "border-zinc-100 dark:border-zinc-800"
                  }`}
                >
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 mb-3">
                    <span className="text-indigo-600 dark:text-indigo-400 mr-2">{qi + 1}.</span>
                    {q.question}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => {
                      const isSelected = selectedAnswers[qi] === opt;
                      const isCorrect = showResults && opt === q.answer;
                      const isWrong = showResults && isSelected && opt !== q.answer;
                      return (
                        <button
                          key={oi}
                          onClick={() => {
                            if (showResults) return;
                            setSelectedAnswers((prev) => ({ ...prev, [qi]: opt }));
                          }}
                          className={`text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${
                            isCorrect
                              ? "bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-600 text-green-800 dark:text-green-300"
                              : isWrong
                              ? "bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-600 text-red-800 dark:text-red-300"
                              : isSelected
                              ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-600 text-indigo-800 dark:text-indigo-300"
                              : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50"
                          }`}
                        >
                          <span className="font-medium mr-2">{String.fromCharCode(65 + oi)})</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {!showResults && (
              <button
                onClick={() => setShowResults(true)}
                disabled={Object.keys(selectedAnswers).length < quiz.length}
                className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {Object.keys(selectedAnswers).length < quiz.length
                  ? `Tüm soruları cevaplayın (${Object.keys(selectedAnswers).length}/${quiz.length})`
                  : "Sonuçları Göster"}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
