"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type RoomStatus = "SCHEDULED" | "LIVE" | "ENDED";

interface LiveRoom {
  id: string;
  name: string;
  dailyRoomName: string;
  status: RoomStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  joinedAt?: string;
  instructor: { id: string; fullName: string | null; email: string };
  _count?: { participants: number };
}

type Tab = "live" | "scheduled" | "history";

export default function LiveRoomsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("live");
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  // Oda oluşturma formu
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScheduled, setNewScheduled] = useState("");
  const [creating, setCreating] = useState(false);

  const isInstructor = user?.role === "INSTRUCTOR" || user?.role === "ADMIN";

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    loadRooms();
  }, [user, tab]);

  async function loadRooms() {
    setFetching(true);
    setError("");
    const token = localStorage.getItem("classy_token");
    const filter = tab === "history" ? "history" : tab;
    const res = await fetch(`/api/live-rooms?filter=${filter}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (res.ok) setRooms(json.rooms || []);
    else setError(json.error || "Yüklenemedi.");
    setFetching(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const token = localStorage.getItem("classy_token");
    const res = await fetch("/api/live-rooms", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, scheduledAt: newScheduled || undefined }),
    });
    const json = await res.json();
    if (res.ok) {
      setShowForm(false);
      setNewName("");
      setNewScheduled("");
      setTab("scheduled");
      await loadRooms();
    } else {
      setError(json.error || "Oda oluşturulamadı.");
    }
    setCreating(false);
  }

  async function handleStart(roomId: string) {
    const token = localStorage.getItem("classy_token");
    const res = await fetch(`/api/live-rooms/${roomId}/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) router.push(`/live/${roomId}`);
    else { const j = await res.json(); setError(j.error); }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "live", label: "🔴 Canlı" },
    { id: "scheduled", label: "📅 Gelecek" },
    { id: "history", label: "📂 Geçmiş" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Başlık */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Canlı Dersler</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {isInstructor ? "Ders oluştur veya mevcut dersleri yönet" : "Canlı derslere katıl"}
            </p>
          </div>
          {isInstructor && (
            <button onClick={() => setShowForm(v => !v)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
              + Oda Oluştur
            </button>
          )}
        </div>

        {/* Oda oluşturma formu */}
        {showForm && isInstructor && (
          <form onSubmit={handleCreate} className="mb-6 p-5 bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700 rounded-2xl shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Yeni Canlı Ders</h2>
            <div className="flex gap-3 flex-wrap">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required
                placeholder="Ders adı (ör. Matematik 101)" minLength={2}
                className="flex-1 min-w-48 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
              <input type="datetime-local" value={newScheduled} onChange={e => setNewScheduled(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creating}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {creating ? "Oluşturuluyor..." : "Oluştur"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:border-red-300 hover:text-red-500 transition-colors">
                İptal
              </button>
            </div>
          </form>
        )}

        {/* Sekmeler */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-1 mb-6 w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white dark:bg-zinc-700 text-indigo-700 dark:text-indigo-400 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">{error}</div>
        )}

        {fetching ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">{tab === "live" ? "🎥" : tab === "scheduled" ? "📅" : "📂"}</div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {tab === "live" ? "Şu an canlı ders yok." : tab === "scheduled" ? "Planlanmış ders yok." : "Henüz katıldığın ders yok."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rooms.map(room => (
              <div key={room.id} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{room.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {room.instructor.fullName || room.instructor.email}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                    room.status === "LIVE" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                    room.status === "SCHEDULED" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
                    "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                  }`}>
                    {room.status === "LIVE" ? "🔴 Canlı" : room.status === "SCHEDULED" ? "📅 Planlandı" : "✓ Sona Erdi"}
                  </span>
                </div>

                {room.scheduledAt && room.status === "SCHEDULED" && (
                  <p className="text-xs text-zinc-400 mb-3">
                    {new Date(room.scheduledAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {room.joinedAt && (
                  <p className="text-xs text-zinc-400 mb-3">
                    Katıldın: {new Date(room.joinedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                  </p>
                )}

                <div className="flex gap-2 mt-3">
                  {room.status === "LIVE" && (
                    <Link href={`/live/${room.id}`}
                      className="flex-1 text-center py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors">
                      Katıl
                    </Link>
                  )}
                  {room.status === "SCHEDULED" && isInstructor && room.instructor.id === user?.id && (
                    <button onClick={() => handleStart(room.id)}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                      Başlat
                    </button>
                  )}
                  {room.status === "ENDED" && (
                    <span className="text-xs text-zinc-400 py-2">Ders tamamlandı</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
