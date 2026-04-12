"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LiveRoomPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomName as string; // route param adı roomName ama artık ID

  const [token, setToken] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [fetchingToken, setFetchingToken] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [error, setError] = useState("");
  const [ending, setEnding] = useState(false);

  const dailyUrl = token && roomUrl ? `${roomUrl}?t=${token}` : null;

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !roomId) return;
    joinRoom();
  }, [user, roomId]);

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
    if (!confirm("Canlı dersi bitirmek istediğinizden emin misiniz?")) return;
    setEnding(true);
    const authToken = localStorage.getItem("classy_token");
    const res = await fetch(`/api/live-rooms/${roomId}/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) router.replace("/live");
    else { const j = await res.json(); setError(j.error); setEnding(false); }
  }

  function handlePopOut() {
    if (!dailyUrl) return;
    window.open(dailyUrl, "classy-live", "width=1280,height=720,toolbar=0,menubar=0,location=0");
  }

  if (loading || fetchingToken) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Canlı derse bağlanılıyor...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Link href="/live" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">← Ders odalarına dön</Link>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 57px)" }}>
      {/* Üst Bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <Link href="/live" className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Odalar
        </Link>
        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {roomData?.name || "Canlı Ders"}
          </span>
          {isOwner && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-medium">Eğitmen</span>
          )}
        </div>

        <div className="flex-1" />

        <button onClick={handlePopOut} title="Yeni pencerede aç"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Pencerede Aç
        </button>

        {isOwner && (
          <button onClick={handleEnd} disabled={ending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50">
            {ending ? "Bitiriliyor..." : "Dersi Bitir"}
          </button>
        )}
      </div>

      {/* iframe */}
      <div className="relative flex-1 bg-zinc-950">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-10 h-10 border-4 border-indigo-800 border-t-indigo-400 rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">Video yükleniyor...</p>
          </div>
        )}
        {dailyUrl && (
          <iframe src={dailyUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            allowFullScreen
            onLoad={() => setIframeLoaded(true)}
            className="w-full h-full border-0"
            style={{ opacity: iframeLoaded ? 1 : 0, transition: "opacity 0.3s" }}
          />
        )}
      </div>
    </div>
  );
}
