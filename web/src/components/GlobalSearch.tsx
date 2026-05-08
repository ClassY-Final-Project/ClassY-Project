"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface SearchResponse {
  courses: { id: string; title: string; instructor: { fullName: string | null; email: string } }[];
  instructors: { id: string; fullName: string | null; email: string; bio: string | null }[];
  studyRooms: { id: string; name: string; topic: string | null; type: string }[];
  liveRooms: { id: string; name: string; dailyRoomName: string; instructor: { fullName: string | null } }[];
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(""); setResults(null); }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const token = localStorage.getItem("classy_token");
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  const totalResults = results
    ? (results.courses?.length ?? 0) + (results.instructors?.length ?? 0) +
      (results.studyRooms?.length ?? 0) + (results.liveRooms?.length ?? 0)
    : 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Ara (Ctrl+K)"
        className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Kurs, eğitmen, oda ara..."
                className="flex-1 bg-transparent text-zinc-900 dark:text-white text-sm placeholder-zinc-400 focus:outline-none"
              />
              {loading && (
                <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin shrink-0" />
              )}
              <kbd className="hidden sm:inline text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono">Esc</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {!query.trim() ? (
                <p className="text-sm text-zinc-400 text-center py-10">Aramak için yazmaya başlayın...</p>
              ) : !loading && totalResults === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-10">"{query}" için sonuç bulunamadı.</p>
              ) : (
                <div className="p-2 space-y-1">
                  {(results?.courses?.length ?? 0) > 0 && (
                    <>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-2">Kurslar</p>
                      {results!.courses.map((c) => (
                        <Link key={c.id} href={`/courses/${c.id}`} onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                          <span className="text-lg shrink-0">📖</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{c.title}</p>
                            <p className="text-xs text-zinc-400 truncate">{c.instructor.fullName || c.instructor.email}</p>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                  {(results?.instructors?.length ?? 0) > 0 && (
                    <>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-2">Eğitmenler</p>
                      {results!.instructors.map((i) => (
                        <Link key={i.id} href={`/instructors/${i.id}`} onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {(i.fullName || i.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{i.fullName || i.email}</p>
                            {i.bio && <p className="text-xs text-zinc-400 truncate">{i.bio}</p>}
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                  {(results?.studyRooms?.length ?? 0) > 0 && (
                    <>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-2">Çalışma Odaları</p>
                      {results!.studyRooms.map((r) => (
                        <Link key={r.id} href={`/study-rooms/${r.id}`} onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                          <span className="text-lg shrink-0">{r.type === "VOICE" ? "🎙️" : "🤫"}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{r.name}</p>
                            {r.topic && <p className="text-xs text-zinc-400 truncate">{r.topic}</p>}
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                  {(results?.liveRooms?.length ?? 0) > 0 && (
                    <>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-2">Canlı Dersler</p>
                      {results!.liveRooms.map((r) => (
                        <Link key={r.id} href={`/live/${r.dailyRoomName}`} onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                          <span className="text-lg shrink-0">🔴</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{r.name}</p>
                            <p className="text-xs text-zinc-400 truncate">{r.instructor.fullName}</p>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
