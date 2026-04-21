"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/Skeleton";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface NoteDetail {
  id: string;
  fileName: string;
  subject: string;
  summary: string | null;
  processedStatus: "PENDING" | "COMPLETED" | "FAILED";
  uploadedAt: string;
  flashcards: Flashcard[];
}

export default function NoteDetailPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const noteId = params.noteId as string;

  const [note, setNote] = useState<NoteDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"summary" | "flashcards">("summary");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!token || !noteId) return;
    fetch(`/api/notes/${noteId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(j => {
        if (j.note) setNote(j.note);
        else setError(j.error || "Not yüklenemedi.");
      })
      .catch(() => setError("Sunucuya bağlanılamadı."))
      .finally(() => setFetching(false));
  }, [token, noteId]);

  function toggleCard(id: string) {
    setFlippedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading || fetching) return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );

  if (error || !note) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-zinc-500 dark:text-zinc-400 mb-4">{error || "Not bulunamadı."}</p>
        <Link href="/dashboard" className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline">← Geri dön</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Geri */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Çalışma Alanına Dön
        </Link>

        {/* Başlık */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-2xl shrink-0">📄</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white truncate">{note.fileName}</h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-medium">
                  {note.subject}
                </span>
                <span className="text-xs text-zinc-400">
                  {new Date(note.uploadedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  note.processedStatus === "COMPLETED"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                }`}>
                  {note.processedStatus === "COMPLETED" ? "Tamamlandı" : "İşleniyor"}
                </span>
              </div>
            </div>
          </div>

          {/* İstatistikler */}
          <div className="flex gap-4 mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-center">
              <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{note.flashcards.length}</p>
              <p className="text-xs text-zinc-400">Flashcard</p>
            </div>
            <div className="w-px bg-zinc-100 dark:bg-zinc-800" />
            <div className="text-center">
              <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {note.summary ? Math.ceil(note.summary.split(" ").length / 200) : 0}
              </p>
              <p className="text-xs text-zinc-400">dk okuma</p>
            </div>
          </div>
        </div>

        {/* Sekmeler */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-1">
          {([["summary", "📝 Özet"], ["flashcards", `🃏 Flashcard (${note.flashcards.length})`]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? "bg-white dark:bg-zinc-700 text-indigo-700 dark:text-indigo-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Özet */}
        {activeTab === "summary" && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            {note.summary ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm">
                  {note.summary}
                </p>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">⏳</p>
                <p className="text-zinc-400 text-sm">Özet henüz hazır değil.</p>
              </div>
            )}
          </div>
        )}

        {/* Flashcard'lar */}
        {activeTab === "flashcards" && (
          <div>
            {note.flashcards.length === 0 ? (
              <div className="text-center py-16 text-zinc-400 text-sm">Henüz flashcard yok.</div>
            ) : (
              <>
                <p className="text-xs text-zinc-400 mb-4 text-center">Kartlara tıklayarak çevirin</p>
                <style>{`
                  .fc-scene { perspective: 1000px; }
                  .fc-inner {
                    position: relative; width: 100%; min-height: 140px;
                    transform-style: preserve-3d;
                    transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);
                  }
                  .fc-inner.flipped { transform: rotateY(180deg); }
                  .fc-face {
                    position: absolute; inset: 0;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                    border-radius: 1rem; padding: 1.25rem;
                    display: flex; flex-direction: column; justify-content: center;
                  }
                  .fc-back { transform: rotateY(180deg); }
                `}</style>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {note.flashcards.map((card, i) => {
                    const isFlipped = flippedCards.has(card.id);
                    return (
                      <div key={card.id} className="fc-scene cursor-pointer" style={{ minHeight: 140 }} onClick={() => toggleCard(card.id)}>
                        <div className={`fc-inner${isFlipped ? " flipped" : ""}`} style={{ minHeight: 140 }}>
                          <div className="fc-face bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-md">
                            <div className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wide">Kart {i + 1}</div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{card.front}</p>
                            <div className="mt-3 text-xs text-zinc-300 dark:text-zinc-600">Çevirmek için tıkla →</div>
                          </div>
                          <div className="fc-face fc-back bg-indigo-600 border border-indigo-500 shadow-md">
                            <div className="text-xs font-semibold text-indigo-200 mb-2 uppercase tracking-wide">Cevap</div>
                            <p className="text-sm text-white leading-relaxed">{card.back}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
