"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LiveRoomPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomName as string;

  const [token, setToken] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [fetchingToken, setFetchingToken] = useState(true);
  const [error, setError] = useState("");
  const [ending, setEnding] = useState(false);

  // Türkçe UI state
  const [joined, setJoined] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Daily.co iframe URL - lang=tr, leave button kaldırıldı (kendi butonumuz var)
  const dailyUrl = token && roomUrl
    ? `${roomUrl}?t=${token}&lang=tr&showLeaveButton=0`
    : null;

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !roomId) return;
    joinRoom();
  }, [user, roomId]);

  // Eğitmen sayfayı kapattığında/navigasyon yaptığında uyar
  useEffect(() => {
    if (!isOwner || !joined) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isOwner, joined]);

  // Sayaç
  useEffect(() => {
    if (!joined) return;
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [joined]);

  // Öğrenci: oda durumunu 10 saniyede bir kontrol et (eğitmen bitirince yönlendir)
  useEffect(() => {
    if (!joined || isOwner || !roomId) return;
    const poll = setInterval(async () => {
      const authToken = localStorage.getItem("classy_token");
      try {
        const res = await fetch(`/api/live-rooms/${roomId}/status`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.status === "ENDED") {
            clearInterval(poll);
            if (timerRef.current) clearInterval(timerRef.current);
            router.replace("/live?ended=1&tab=history");
          }
        }
      } catch { /* ignore network errors */ }
    }, 10000);
    return () => clearInterval(poll);
  }, [joined, isOwner, roomId, router]);

  async function joinRoom() {
    setFetchingToken(true);
    const authToken = localStorage.getItem("classy_token");
    const res = await fetch(`/api/live-rooms/${roomId}/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const json = await res.json();
    if (res.ok) {
      setToken(json.token);
      setRoomUrl(json.roomUrl);
      setIsOwner(json.isOwner);
      setRoomData(json.room);
    } else {
      if (json.requiresSubscription) {
        router.replace(`/instructors?subscribe=${json.instructorId}`);
      } else {
        setError(json.error || "Odaya bağlanılamadı.");
      }
    }
    setFetchingToken(false);
  }

  async function handleEnd() {
    if (!confirm("Canlı dersi bitirmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) return;
    setEnding(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const authToken = localStorage.getItem("classy_token");
    const res = await fetch(`/api/live-rooms/${roomId}/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      router.replace("/live?tab=history");
    } else {
      const j = await res.json();
      setError(j.error);
      setEnding(false);
    }
  }

  function handleLeaveAsStudent() {
    if (!confirm("Dersten ayrılmak istediğinizden emin misiniz?")) return;
    if (timerRef.current) clearInterval(timerRef.current);
    router.replace("/live");
  }

  function handlePopOut() {
    if (!dailyUrl) return;
    window.open(dailyUrl, "classy-live", "width=1280,height=720,toolbar=0,menubar=0,location=0");
  }

  function formatTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  if (loading || fetchingToken) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-950">
      <div className="w-10 h-10 border-4 border-indigo-800 border-t-indigo-400 rounded-full animate-spin" />
      <p className="text-sm text-zinc-400">Canlı derse bağlanılıyor...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-zinc-950">
      <div className="text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/live" className="text-sm text-indigo-400 hover:underline">← Ders odalarına dön</Link>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col bg-zinc-950" style={{ height: "calc(100vh - 57px)" }}>
      {/* ── Üst Bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        {/* Geri — eğitmen için uyarısız değil, sadece öğrenci için */}
        {!isOwner ? (
          <button onClick={handleLeaveAsStudent}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dersten Ayrıl
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-zinc-500 select-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dersi bitirmek için "Dersi Bitir" butonunu kullanın
          </div>
        )}

        <div className="h-4 w-px bg-zinc-700" />

        {/* Ders adı + canlı göstergesi */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold text-white truncate max-w-48">
            {roomData?.name || "Canlı Ders"}
          </span>
          {isOwner && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-400 font-medium">Eğitmen</span>
          )}
        </div>

        {/* Süre */}
        {joined && (
          <div className="flex items-center gap-1.5 text-sm text-zinc-400 font-mono">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime(elapsed)}
          </div>
        )}

        <div className="flex-1" />

        {/* Pop-out */}
        <button onClick={handlePopOut} title="Yeni pencerede aç"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 border border-zinc-700 rounded-lg hover:border-indigo-500 hover:text-indigo-400 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Pencerede Aç
        </button>

        {/* Dersi Bitir — sadece eğitmen */}
        {isOwner && (
          <button onClick={handleEnd} disabled={ending}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12H3M12 3l-9 9 9 9" />
            </svg>
            {ending ? "Bitiriliyor..." : "Dersi Bitir"}
          </button>
        )}
      </div>

      {/* ── Daily.co iframe ── */}
      <div className="relative flex-1">
        {!joined && dailyUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-zinc-950">
            <div className="w-10 h-10 border-4 border-indigo-800 border-t-indigo-400 rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">Video yükleniyor...</p>
          </div>
        )}
        {dailyUrl && (
          <iframe
            ref={iframeRef}
            src={dailyUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            allowFullScreen
            onLoad={() => setJoined(true)}
            className="w-full h-full border-0"
            style={{ opacity: joined ? 1 : 0, transition: "opacity 0.4s" }}
          />
        )}
      </div>

      {/* ── Eğitmene uyarı banner ── */}
      {isOwner && joined && (
        <div className="shrink-0 bg-amber-900/30 border-t border-amber-700/40 px-4 py-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="text-xs text-amber-300">
            Dersi bitirmek için yukarıdaki <strong>Dersi Bitir</strong> butonunu kullanın. Tarayıcıyı kapatmak dersi sonlandırmaz.
          </span>
        </div>
      )}
    </div>
  );
}
