"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { generateNotes, generateQuiz, getStudyArea, GeneratedNote, GeneratedQuizItem } from "@/lib/apiClient";

type Tab = "notes" | "quiz";
type SubjectMode = "auto" | "existing" | "new";

export default function StudyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [tab, setTab] = useState<Tab>("notes");
  const [questionCount, setQuestionCount] = useState(10);

  // Ders seçimi
  const [existingSubjects, setExistingSubjects] = useState<string[]>([]);
  const [subjectMode, setSubjectMode] = useState<SubjectMode>("auto");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [newSubjectName, setNewSubjectName] = useState<string>("");

  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sonuçlar
  const [noteResult, setNoteResult] = useState<GeneratedNote | null>(null);
  const [quizResult, setQuizResult] = useState<{ quizId: string; items: GeneratedQuizItem[]; subject?: string } | null>(null);

  // Quiz etkileşimi
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && (user.role === "INSTRUCTOR" || user.role === "ADMIN")) {
      router.replace("/instructor/dashboard");
    }
  }, [user, loading, router]);

  // Mevcut dersleri yükle
  useEffect(() => {
    if (!user) return;
    getStudyArea().then((res) => {
      if (res.ok && res.dashboard) {
        const subjects = res.dashboard.map((g) => g.subject).filter(Boolean);
        setExistingSubjects(subjects);
        if (subjects.length > 0) setSelectedSubject(subjects[0]);
      }
    });
  }, [user]);

  function handleFileSelect(selected: File | null) {
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setError("Lütfen bir PDF dosyası seçin.");
      return;
    }
    setFile(selected);
    setError(null);
    setNoteResult(null);
    setQuizResult(null);
    setSelectedAnswers({});
    setShowResults(false);
    setFlippedCards(new Set());
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files[0] ?? null);
  }

  // Kullanıcının seçtiği konuyu API'ye gönder (veya auto için boş — AI tespit edecek)
  function getSubjectForAPI(): string | undefined {
    if (subjectMode === "auto") return undefined;
    if (subjectMode === "existing") return selectedSubject || undefined;
    if (subjectMode === "new") return newSubjectName.trim() || undefined;
  }

  async function handleGenerate() {
    if (!file) return;
    if (subjectMode === "new" && !newSubjectName.trim()) {
      setError("Lütfen yeni ders adını girin.");
      return;
    }
    setWorking(true);
    setError(null);
    setNoteResult(null);
    setQuizResult(null);
    setSelectedAnswers({});
    setShowResults(false);
    setFlippedCards(new Set());

    const subjectOverride = getSubjectForAPI();

    if (tab === "notes") {
      const result = await generateNotes(file, subjectOverride);
      if (result.ok && result.data) {
        setNoteResult(result.data);
        // Yeni ders oluşturulduysa listeyi güncelle
        refreshSubjects();
      } else {
        setError(result.error || "Özet oluşturulamadı.");
      }
    } else {
      const result = await generateQuiz(file, questionCount, subjectOverride);
      if (result.ok && result.data) {
        setQuizResult({ quizId: result.data.quizId, items: result.data.quiz });
        refreshSubjects();
      } else {
        setError(result.error || "Quiz oluşturulamadı.");
      }
    }

    setWorking(false);
  }

  async function refreshSubjects() {
    const res = await getStudyArea();
    if (res.ok && res.dashboard) {
      setExistingSubjects(res.dashboard.map((g) => g.subject).filter(Boolean));
    }
  }

  function toggleCard(index: number) {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  const correctCount = quizResult
    ? quizResult.items.filter((q, i) => selectedAnswers[i] === q.answer).length
    : 0;

  if (loading) return null;

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">AI Asistan</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            PDF&apos;inizden özet, flashcard veya quiz oluşturun
          </p>
        </div>

        {/* Dosya Yükleme */}
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
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          />
          <div className="text-4xl mb-3">{file ? "📄" : "📤"}</div>
          {file ? (
            <div>
              <p className="font-semibold text-indigo-700 dark:text-indigo-400">{file.name}</p>
              <p className="text-sm text-zinc-400 mt-1">
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

        {/* Ders Seçimi */}
        <div className="mt-5 p-4 bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
            Hangi derse eklensin?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSubjectMode("auto")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                subjectMode === "auto"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300"
              }`}
            >
              ✨ AI Otomatik Tespit
            </button>

            {existingSubjects.map((s) => (
              <button
                key={s}
                onClick={() => { setSubjectMode("existing"); setSelectedSubject(s); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  subjectMode === "existing" && selectedSubject === s
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300"
                }`}
              >
                {s}
              </button>
            ))}

            <button
              onClick={() => setSubjectMode("new")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                subjectMode === "new"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-indigo-400"
              }`}
            >
              + Yeni Ders
            </button>
          </div>

          {subjectMode === "new" && (
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Ders adı girin (ör. Fizik, Kimya...)"
              autoFocus
              className="mt-3 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          )}

          {subjectMode === "auto" && (
            <p className="mt-2 text-xs text-zinc-400">
              Yapay zeka PDF içeriğini okuyarak dersin konusunu otomatik belirleyecek
            </p>
          )}
        </div>

        {/* Kontroller */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          {/* Sekmeler */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-1">
            {(["notes", "quiz"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-white dark:bg-zinc-700 text-indigo-700 dark:text-indigo-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {t === "notes" ? "📝 Özet & Flashcard" : "📋 Quiz"}
              </button>
            ))}
          </div>

          {/* Soru sayısı */}
          {tab === "quiz" && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Soru:</label>
              <input
                type="range"
                min={10}
                max={20}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-28 accent-indigo-600"
              />
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 w-5">
                {questionCount}
              </span>
            </div>
          )}

          {/* Oluştur butonu */}
          <button
            onClick={handleGenerate}
            disabled={!file || working}
            className="ml-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {working ? "Oluşturuluyor..." : "Oluştur"}
          </button>
        </div>

        {/* Hata */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Yükleniyor */}
        {working && (
          <div className="mt-12 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-zinc-500 text-sm">
              {tab === "quiz" ? "Quiz soruları hazırlanıyor..." : "Notlarınız analiz ediliyor..."}
            </p>
          </div>
        )}

        {/* ─── Özet & Flashcard Sonucu ─── */}
        {!working && noteResult && (
          <div className="mt-10 space-y-10">
            <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
              <span>✓</span>
              <span>
                {noteResult.subject && noteResult.subject !== "Genel"
                  ? <><strong>{noteResult.subject}</strong> dersine kaydedildi.{" "}</>
                  : "Notlar çalışma alanınıza kaydedildi. "}
                <button onClick={() => router.push("/dashboard")} className="underline font-medium">
                  Çalışma alanına git →
                </button>
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-4">📝 Özet</h2>
              <div className="bg-white dark:bg-zinc-800/50 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap text-sm">
                {noteResult.summary}
              </div>
            </div>

            {noteResult.flashcards.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">🃏 Flashcardlar</h2>
                <p className="text-sm text-zinc-400 mb-4">Kartlara tıklayarak çevirin</p>
                <style>{`
                  .flashcard-scene { perspective: 1000px; }
                  .flashcard-inner {
                    position: relative; width: 100%; min-height: 140px;
                    transform-style: preserve-3d;
                    transition: transform 0.55s cubic-bezier(0.4,0,0.2,1);
                  }
                  .flashcard-inner.flipped { transform: rotateY(180deg); }
                  .flashcard-face {
                    position: absolute; inset: 0;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                    border-radius: 1rem;
                    padding: 1.25rem;
                    display: flex; flex-direction: column; justify-content: center;
                  }
                  .flashcard-back { transform: rotateY(180deg); }
                `}</style>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {noteResult.flashcards.map((card, i) => (
                    <div key={i} className="flashcard-scene cursor-pointer" style={{ minHeight: 140 }}
                      onClick={() => toggleCard(i)}>
                      <div className={`flashcard-inner${flippedCards.has(i) ? " flipped" : ""}`}
                        style={{ minHeight: 140 }}>
                        {/* Ön yüz */}
                        <div className="flashcard-face bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-md">
                          <div className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wide">Kart {i + 1}</div>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{card.front}</p>
                          <div className="mt-3 text-xs text-zinc-300 dark:text-zinc-600">Çevirmek için tıkla →</div>
                        </div>
                        {/* Arka yüz */}
                        <div className="flashcard-face flashcard-back bg-indigo-600 border border-indigo-500 shadow-md">
                          <div className="text-xs font-semibold text-indigo-200 mb-2 uppercase tracking-wide">Cevap</div>
                          <p className="text-sm text-white leading-relaxed">{card.back}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Quiz Sonucu ─── */}
        {!working && quizResult && (
          <div className="mt-10">
            <div className="p-3 mb-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
              <span>✓</span>
              <span>
                Quiz çalışma alanınıza kaydedildi.{" "}
                <button onClick={() => router.push(`/study/quiz/${quizResult.quizId}`)} className="underline font-medium">
                  Detaylı görüntüle →
                </button>
              </span>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                📋 Quiz ({quizResult.items.length} Soru)
              </h2>
              {showResults && (
                <div className="px-4 py-1 bg-indigo-100 dark:bg-indigo-900/40 rounded-full text-sm font-bold text-indigo-700 dark:text-indigo-400">
                  {correctCount}/{quizResult.items.length} doğru
                </div>
              )}
            </div>

            <div className="space-y-4">
              {quizResult.items.map((q, qi) => (
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
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 mb-3 text-sm">
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
                              : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:border-indigo-600"
                          }`}
                        >
                          <span className="font-medium mr-1.5">{String.fromCharCode(65 + oi)})</span>
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
                disabled={Object.keys(selectedAnswers).length < quizResult.items.length}
                className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
              >
                {Object.keys(selectedAnswers).length < quizResult.items.length
                  ? `Tüm soruları cevaplayın (${Object.keys(selectedAnswers).length}/${quizResult.items.length})`
                  : "Sonuçları Göster"}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
