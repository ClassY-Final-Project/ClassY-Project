"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";

interface Question {
  question: string;
  options: string[];
  answer: string;
}

interface Subscriber {
  id: string;
  fullName: string | null;
  email: string;
}

interface WrongQuestion {
  questionText: string;
  correctAnswer: string;
  userAnswer: string | null;
}

interface SentStudent {
  quizId: string;
  student: { id: string; fullName: string | null; email: string };
  score: number | null;
  completed: boolean;
  wrongQuestions: WrongQuestion[];
}

interface SentQuizGroup {
  title: string;
  subject: string;
  createdAt: string;
  students: SentStudent[];
}

type Step = "build" | "assign";
type BuildMode = "manual" | "pdf";
type PageTab = "create" | "sent";

export default function InstructorQuizPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pageTab, setPageTab] = useState<PageTab>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "sent" ? "sent" : "create"
  );

  const [step, setStep] = useState<Step>("build");
  const [buildMode, setBuildMode] = useState<BuildMode>("manual");

  // Quiz meta
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { question: "", options: ["", "", "", ""], answer: "" },
  ]);

  // PDF üretimi
  const [file, setFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Atama
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [done, setDone] = useState(false);

  // Gönderilen quizler sekmesi
  const [sentQuizGroups, setSentQuizGroups] = useState<SentQuizGroup[]>([]);
  const [loadingSent, setLoadingSent] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role === "STUDENT") router.replace("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (searchParams.get("tab") === "sent") setPageTab("sent");
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/instructor/subscribers", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(j => {
        const subs: Subscriber[] = (j.students || []).map((s: any) => ({
          id: s.id,
          fullName: s.fullName,
          email: s.email,
        })).filter((s: Subscriber) => s.id);
        setSubscribers(subs);
      });
  }, [token]);

  useEffect(() => {
    if (pageTab === "sent" && token) loadSentQuizzes();
  }, [pageTab, token]); // eslint-disable-line

  async function loadSentQuizzes() {
    setLoadingSent(true);
    try {
      const res = await fetch("/api/instructor/quiz/sent", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      setSentQuizGroups(j.quizGroups || []);
    } catch {
      showToast("Gönderilen quizler yüklenemedi.", "error");
    } finally {
      setLoadingSent(false);
    }
  }

  // Manuel soru yönetimi
  function updateQuestion(qi: number, field: "question" | "answer", val: string) {
    setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, [field]: val } : q));
  }
  function updateOption(qi: number, oi: number, val: string) {
    setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, options: q.options.map((o, j) => j === oi ? val : o) } : q));
  }
  function addQuestion() {
    setQuestions(prev => [...prev, { question: "", options: ["", "", "", ""], answer: "" }]);
  }
  function removeQuestion(qi: number) {
    setQuestions(prev => prev.filter((_, i) => i !== qi));
  }

  // PDF'den üret
  async function handleGenerate() {
    if (!file) return;
    setGenerating(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("question_count", String(questionCount));
      const res = await fetch("http://localhost:8000/generate-quiz", { method: "POST", body: fd });
      const json = await res.json();
      if (json.quiz) {
        setQuestions(json.quiz.map((q: any) => ({
          question: q.question,
          options: q.options,
          answer: q.answer,
        })));
        setGenerated(true);
        showToast(`${json.quiz.length} soru oluşturuldu!`, "success");
      }
    } catch {
      showToast("AI servise bağlanılamadı.", "error");
    }
    setGenerating(false);
  }

  // Atama
  async function handleAssign() {
    if (!quizTitle.trim()) { showToast("Quiz başlığı girin.", "error"); return; }
    if (questions.some(q => !q.question.trim() || !q.answer.trim())) {
      showToast("Tüm sorular ve cevaplar dolu olmalı.", "error"); return;
    }
    if (selectedIds.size === 0) { showToast("En az bir öğrenci seçin.", "error"); return; }

    setAssigning(true);
    try {
      const res = await fetch("/api/instructor/quiz/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: quizTitle.trim(),
          questions,
          studentIds: Array.from(selectedIds),
        }),
      });
      if (res.ok) {
        setDone(true);
        showToast("Quiz başarıyla gönderildi!", "success");
      } else {
        const j = await res.json();
        showToast(j.detail || j.error || "Gönderilemedi.", "error");
      }
    } catch {
      showToast("Sunucuya bağlanılamadı.", "error");
    }
    setAssigning(false);
  }

  function toggleStudent(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(subscribers.map(s => s.id)));
  }

  if (loading) return null;

  if (done) return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Quiz gönderildi!</h2>
        <p className="text-sm text-zinc-400 mb-6">{selectedIds.size} öğrenciye başarıyla atandı.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setDone(false); setStep("build"); setQuizTitle(""); setQuestions([{ question: "", options: ["", "", "", ""], answer: "" }]); setSelectedIds(new Set()); setGenerated(false); setFile(null); }}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            Yeni Quiz Oluştur
          </button>
          <button onClick={() => { setDone(false); setPageTab("sent"); }}
            className="px-5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
            Gönderilenleri Gör
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Quiz Yönetimi</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Quiz oluştur, öğrencilere gönder ve sonuçları takip et</p>
        </div>

        {/* Sekme Seçici */}
        <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
          {([["create", "✏️ Oluştur & Ata"], ["sent", "📊 Gönderdiğim Quizler"]] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setPageTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${pageTab === tab ? "bg-white dark:bg-zinc-700 text-indigo-700 dark:text-indigo-300 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── GÖNDERILEN QUIZLER SEKMESİ ── */}
        {pageTab === "sent" && (
          <SentQuizzesView
            groups={sentQuizGroups}
            loading={loadingSent}
            onRefresh={loadSentQuizzes}
            expandedGroup={expandedGroup}
            setExpandedGroup={setExpandedGroup}
            expandedStudent={expandedStudent}
            setExpandedStudent={setExpandedStudent}
          />
        )}

        {pageTab === "create" && (
          <>

        {/* Adım indikatörü */}
        <div className="flex items-center gap-3">
          {[["build", "1. Quiz Hazırla"], ["assign", "2. Öğrenci Seç & Gönder"]].map(([s, label], i) => (
            <div key={s} className="flex items-center gap-3">
              {i > 0 && <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-700" />}
              <button onClick={() => { if (s === "assign" && questions.some(q => !q.question.trim())) return; setStep(s as Step); }}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === s ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}>
                <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${step === s ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"}`}>
                  {i + 1}
                </span>
                {label}
              </button>
            </div>
          ))}
        </div>

        {/* ── ADIM 1: Quiz Hazırla ── */}
        {step === "build" && (
          <div className="space-y-5">
            {/* Başlık */}
            <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Quiz Başlığı</label>
              <input type="text" value={quizTitle} onChange={e => setQuizTitle(e.target.value)}
                placeholder="ör. Dönem Sonu Değerlendirme Quizi"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            {/* Mod seçimi */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-1">
              {([["manual", "✏️ Manuel Oluştur"], ["pdf", "🤖 PDF'den AI ile Üret"]] as const).map(([m, label]) => (
                <button key={m} onClick={() => setBuildMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${buildMode === m ? "bg-white dark:bg-zinc-700 text-indigo-700 dark:text-indigo-400 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* PDF Modu */}
            {buildMode === "pdf" && (
              <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${file ? "border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-zinc-300 dark:border-zinc-700 hover:border-indigo-400"}`}>
                  <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setGenerated(false); } }} />
                  <div className="text-3xl mb-2">{file ? "📄" : "📤"}</div>
                  {file ? (
                    <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400">{file.name}</p>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">PDF dosyasını seçin</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Soru sayısı:</label>
                  <input type="range" min={10} max={20} value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} className="flex-1 accent-indigo-600" />
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 w-6 text-right">{questionCount}</span>
                </div>
                <button onClick={handleGenerate} disabled={!file || generating}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-sm">
                  {generating ? "Sorular üretiliyor..." : "AI ile Oluştur"}
                </button>
                {generated && (
                  <p className="text-xs text-green-600 dark:text-green-400 text-center">✓ {questions.length} soru oluşturuldu. Aşağıda düzenleyebilirsin.</p>
                )}
              </div>
            )}

            {/* Sorular */}
            {(buildMode === "manual" || generated) && (
              <div className="space-y-4">
                {questions.map((q, qi) => (
                  <div key={qi} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Soru {qi + 1}</span>
                      {questions.length > 1 && (
                        <button onClick={() => removeQuestion(qi)} className="text-xs text-zinc-400 hover:text-red-500 transition-colors">Sil</button>
                      )}
                    </div>
                    <textarea value={q.question} onChange={e => updateQuestion(qi, "question", e.target.value)}
                      placeholder="Soru metnini yazın..." rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none" />
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-400 w-5 shrink-0">{String.fromCharCode(65 + oi)})</span>
                          <input type="text" value={opt} onChange={e => updateOption(qi, oi, e.target.value)}
                            placeholder={`${String.fromCharCode(65 + oi)} şıkkı`}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Doğru Cevap</label>
                      <select value={q.answer} onChange={e => updateQuestion(qi, "answer", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                        <option value="">Seçin...</option>
                        {q.options.filter(o => o.trim()).map((opt, oi) => (
                          <option key={oi} value={opt}>{String.fromCharCode(65 + oi)}) {opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                <button onClick={addQuestion}
                  className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                  + Soru Ekle
                </button>

                {(() => {
                  const missingTitle = !quizTitle.trim();
                  const missingQuestion = questions.some(q => !q.question.trim());
                  const missingAnswer = questions.some(q => !q.answer.trim());
                  const missingOptions = questions.some(q => q.options.filter(o => o.trim()).length < 2);
                  if (missingTitle || missingQuestion || missingOptions || missingAnswer) {
                    return (
                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 space-y-1">
                        <p className="font-semibold">Devam etmek için eksikler var:</p>
                        {missingTitle && <p>• Quiz başlığı girilmedi</p>}
                        {missingQuestion && <p>• Soru metni boş olan soru var</p>}
                        {missingOptions && <p>• En az 2 şık doldurulmalı</p>}
                        {missingAnswer && <p>• Doğru cevap seçilmedi (şıkları doldurunca dropdown aktif olur)</p>}
                      </div>
                    );
                  }
                  return null;
                })()}
                <button onClick={() => setStep("assign")}
                  disabled={!quizTitle.trim() || questions.some(q => !q.question.trim() || q.options.filter(o => o.trim()).length < 2 || !q.answer.trim())}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
                  Devam Et — Öğrenci Seç →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ADIM 2: Öğrenci Seç & Gönder ── */}
        {step === "assign" && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Öğrenci Seç ({selectedIds.size}/{subscribers.length})
                </h2>
                {subscribers.length > 0 && (
                  <button onClick={selectAll} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Tümünü Seç</button>
                )}
              </div>

              {subscribers.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-3xl mb-2">👨‍🎓</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Henüz abone öğrenciniz yok.</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    Öğrencilerin quiz alabilmesi için önce sana abone olmaları gerekiyor.
                  </p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400">
                    Öğrenci hesabıyla <strong>/instructors</strong> sayfasına gidip seni bularak abone olabilirler.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {subscribers.map(s => {
                    const selected = selectedIds.has(s.id);
                    return (
                      <button key={s.id} onClick={() => toggleStudent(s.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selected ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-600" : "border-zinc-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-700"}`}>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selected ? "bg-indigo-600 border-indigo-600" : "border-zinc-300 dark:border-zinc-600"}`}>
                          {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                          {(s.fullName || s.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{s.fullName || s.email}</p>
                          <p className="text-xs text-zinc-400 truncate">{s.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Özet */}
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4">
              <p className="text-sm text-indigo-700 dark:text-indigo-400">
                <strong>"{quizTitle}"</strong> — {questions.length} soru — {selectedIds.size} öğrenciye gönderilecek
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("build")}
                className="px-5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                ← Geri
              </button>
              <button onClick={handleAssign} disabled={assigning || selectedIds.size === 0}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-sm">
                {assigning ? "Gönderiliyor..." : `Quizi Gönder (${selectedIds.size} öğrenci)`}
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}

// ── Gönderilen Quizler Bileşeni ──
function SentQuizzesView({
  groups,
  loading,
  onRefresh,
  expandedGroup,
  setExpandedGroup,
  expandedStudent,
  setExpandedStudent,
}: {
  groups: SentQuizGroup[];
  loading: boolean;
  onRefresh: () => void;
  expandedGroup: string | null;
  setExpandedGroup: (v: string | null) => void;
  expandedStudent: string | null;
  setExpandedStudent: (v: string | null) => void;
}) {
  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (groups.length === 0) return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">📭</p>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Henüz quiz göndermediniz.</p>
      <p className="text-zinc-400 text-xs mt-1">Quiz oluşturup öğrencilere gönderin.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{groups.length} farklı quiz gönderildi</p>
        <button onClick={onRefresh} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">↻ Yenile</button>
      </div>

      {groups.map((group, gi) => {
        const isGroupOpen = expandedGroup === group.title + gi;
        const completedCount = group.students.filter(s => s.completed).length;
        const avgScore = completedCount > 0
          ? Math.round(group.students.filter(s => s.score !== null).reduce((sum, s) => sum + (s.score ?? 0), 0) / completedCount)
          : null;

        return (
          <div key={gi} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Quiz başlık satırı */}
            <button
              onClick={() => setExpandedGroup(isGroupOpen ? null : group.title + gi)}
              className="w-full flex items-center gap-4 p-5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0">
                {group.title.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate">{group.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {new Date(group.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                  {" · "}
                  {completedCount}/{group.students.length} tamamlandı
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {avgScore !== null && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    avgScore >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : avgScore >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    Ort. %{avgScore}
                  </span>
                )}
                <svg className={`w-4 h-4 text-zinc-400 transition-transform ${isGroupOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Öğrenci listesi */}
            {isGroupOpen && (
              <div className="border-t border-zinc-100 dark:border-zinc-800">
                {group.students.map((s, si) => {
                  const studentKey = group.title + gi + s.student.id;
                  const isStudentOpen = expandedStudent === studentKey;
                  return (
                    <div key={si} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                      <button
                        onClick={() => setExpandedStudent(isStudentOpen ? null : studentKey)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold text-xs shrink-0">
                          {(s.student.fullName || s.student.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            {s.student.fullName || s.student.email}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">{s.student.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.completed ? (
                            <>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                (s.score ?? 0) >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : (s.score ?? 0) >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              }`}>
                                %{s.score}
                              </span>
                              {s.wrongQuestions.length > 0 && (
                                <span className="text-xs text-zinc-400">{s.wrongQuestions.length} yanlış</span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400">Bekleniyor</span>
                          )}
                          {s.completed && s.wrongQuestions.length > 0 && (
                            <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isStudentOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Yanlış sorular detayı */}
                      {isStudentOpen && s.wrongQuestions.length > 0 && (
                        <div className="px-5 pb-4 space-y-2">
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">Yanlış Cevaplanan Sorular</p>
                          {s.wrongQuestions.map((wq, wi) => (
                            <div key={wi} className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl p-3">
                              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 mb-2">{wi + 1}. {wq.questionText}</p>
                              <div className="flex gap-4 text-xs">
                                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                  <span className="font-semibold">Öğrenci:</span> {wq.userAnswer ?? "—"}
                                </span>
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                  <span className="font-semibold">Doğru:</span> {wq.correctAnswer}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {isStudentOpen && s.completed && s.wrongQuestions.length === 0 && (
                        <div className="px-5 pb-4">
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3 text-center">
                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">🎉 Tüm soruları doğru yanıtladı!</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
