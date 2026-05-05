"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";

export default function JoinByInvitePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const { showToast } = useToast();

  const [room, setRoom] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [studyingText, setStudyingText] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=/study-rooms/join/${code}`);
  }, [user, loading, router, code]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/study-rooms/invite/${code}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) showToast(d.error, "error");
        else setRoom(d.room);
      })
      .catch(() => showToast("Oda bulunamadı.", "error"))
      .finally(() => setFetching(false));
  }, [token, code, showToast]);

  async function joinRoom() {
    if (!room) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/study-rooms/${room.id}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ studying: studyingText || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(`/study-rooms/${room.id}`);
    } catch (e: any) {
      showToast(e.message || "Katılınamadı.", "error");
      setJoining(false);
    }
  }

  if (loading || fetching) {
    return (
      <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">🔒</p>
          <p className="text-zinc-900 dark:text-white text-xl font-bold mb-2">Geçersiz davet linki</p>
          <p className="text-zinc-500 dark:text-gray-400 text-sm mb-6">Bu link süresi dolmuş veya geçersiz.</p>
          <button onClick={() => router.push("/study-rooms")} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors">
            Odalara Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-700 rounded-2xl p-8 w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700/40 flex items-center justify-center text-2xl mx-auto mb-4">
          🔐
        </div>
        <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider mb-1">Özel Oda Daveti</p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">{room.name}</h1>
        {room.topic && <p className="text-zinc-500 dark:text-gray-400 text-sm mb-3">{room.topic}</p>}
        <p className="text-zinc-400 dark:text-gray-500 text-sm mb-6">
          {room.createdBy?.fullName || "Biri"} seni bu odaya davet etti · {room._count.participants} kişi içeride
        </p>

        <input
          value={studyingText}
          onChange={e => setStudyingText(e.target.value)}
          placeholder="Ne çalışıyorsunuz? (isteğe bağlı)"
          className="w-full bg-zinc-100 dark:bg-gray-800 border border-zinc-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-4"
        />

        <button
          onClick={joinRoom}
          disabled={joining || room._count.participants >= room.maxCapacity}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {joining ? "Katılınıyor..." : room._count.participants >= room.maxCapacity ? "Oda Dolu" : "Odaya Katıl"}
        </button>
      </div>
    </div>
  );
}
