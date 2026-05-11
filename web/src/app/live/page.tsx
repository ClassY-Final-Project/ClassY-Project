"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  joinedAt?: string | null;
  isSubscribed: boolean;
  instructor: { id: string; fullName: string | null; email: string; avatarUrl: string | null };
  _count?: { participants: number };
}

type Tab = "live" | "scheduled" | "history";
type SubFilter = "all" | "subscribed" | "unsubscribed";

export default function LiveRoomsPageWrapper() {
  return (
    <Suspense>
      <LiveRoomsPage />
    </Suspense>
  );
}

function LiveRoomsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "live");
  const [subFilter, setSubFilter] = useState<SubFilter>("all");
  const [endedNotice, setEndedNotice] = useState(searchParams.get("ended") === "1");
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [subscribeAlert, setSubscribeAlert] = useState<{ instructorId: string; instructorName: string } | null>(null);

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
    setSubFilter("all");
    loadRooms();
  }, [user, tab]);

  // Canlı sekmesinde otomatik yenileme
  useEffect(() => {
    if (tab !== "live") return;
    const interval = setInterval(loadRooms, 15000);
    return () => clearInterval(interval);
  }, [tab]);

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
    <div className="w-full flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "live", label: "🔴 Canlı" },
    { id: "scheduled", label: "📅 Gelecek" },
    { id: "history", label: "📂 Geçmiş" },
  ];

  return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
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
        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-1 mb-4 w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white dark:bg-zinc-700 text-indigo-700 dark:text-indigo-400 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Abonelik filtresi */}
        {!isInstructor && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-1">Filtrele:</span>
            {(["all", "subscribed", "unsubscribed"] as SubFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setSubFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  subFilter === f
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                }`}
              >
                {f === "all" ? "Tümü" : f === "subscribed" ? "✓ Abone Olduklarım" : "🔒 Abone Olmadıklarım"}
              </button>
            ))}
          </div>
        )}

        {endedNotice && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-sm flex items-center justify-between">
            <span>Katıldığın canlı ders eğitmen tarafından sona erdirildi.</span>
            <button onClick={() => setEndedNotice(false)} className="ml-3 text-amber-400 hover:text-amber-600">✕</button>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">{error}</div>
        )}

        {fetching ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (() => {
          const visibleRooms = rooms.filter(room => {
            if (isInstructor) return true;
            if (subFilter === "subscribed") return room.isSubscribed;
            if (subFilter === "unsubscribed") return !room.isSubscribed;
            return true;
          });
          return visibleRooms.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">{tab === "live" ? "🎥" : tab === "scheduled" ? "📅" : "📂"}</div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                {subFilter !== "all"
                  ? "Bu filtreye uyan ders yok."
                  : tab === "live" ? "Şu an canlı ders yok." : tab === "scheduled" ? "Planlanmış ders yok." : "Henüz katıldığın ders yok."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibleRooms.map(room => (
                <div key={room.id} className={`bg-white dark:bg-zinc-800/60 border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${
                  !isInstructor && !room.isSubscribed
                    ? "border-zinc-200 dark:border-zinc-700 opacity-80"
                    : "border-zinc-100 dark:border-zinc-800"
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {room.instructor.avatarUrl ? (
                        <img src={room.instructor.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(room.instructor.fullName || room.instructor.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{room.name}</p>
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">
                          {room.instructor.fullName || room.instructor.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isInstructor && !room.isSubscribed && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                          🔒 Abone Değil
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        room.status === "LIVE" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        room.status === "SCHEDULED" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
                        "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                      }`}>
                        {room.status === "LIVE" ? "🔴 Canlı" : room.status === "SCHEDULED" ? "📅 Planlandı" : "✓ Sona Erdi"}
                      </span>
                    </div>
                  </div>

                  {/* Zamanlama bilgileri */}
                  {room.scheduledAt && room.status === "SCHEDULED" && (
                    <p className="text-xs text-zinc-400 mb-3">
                      📅 {new Date(room.scheduledAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {room.status === "ENDED" && (
                    <div className="mb-3 space-y-1">
                      {room.startedAt && (
                        <p className="text-xs text-zinc-400">
                          📅 {new Date(room.startedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                      {room.startedAt && room.endedAt && (
                        <p className="text-xs text-zinc-400">
                          ⏱ Süre: {(() => {
                            const diffMs = new Date(room.endedAt).getTime() - new Date(room.startedAt).getTime();
                            const totalMin = Math.floor(diffMs / 60000);
                            const h = Math.floor(totalMin / 60);
                            const m = totalMin % 60;
                            return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
                          })()}
                        </p>
                      )}
                      {room.joinedAt && (
                        <p className="text-xs text-indigo-400/70">✓ Katıldın</p>
                      )}
                    </div>
                  )}
                  {room.status === "LIVE" && room.joinedAt && (
                    <p className="text-xs text-zinc-400 mb-3">Daha önce katıldın</p>
                  )}

                  <div className="flex gap-2 mt-3">
                    {room.status === "LIVE" && (
                      !isInstructor && !room.isSubscribed ? (
                        <button
                          onClick={() => setSubscribeAlert({ instructorId: room.instructor.id, instructorName: room.instructor.fullName || room.instructor.email })}
                          className="flex-1 text-center py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                        >
                          🔒 Katıl
                        </button>
                      ) : (
                        <Link href={`/live/${room.id}`}
                          className="flex-1 text-center py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors">
                          Katıl
                        </Link>
                      )
                    )}
                    {room.status === "SCHEDULED" && !isInstructor && !room.isSubscribed && (
                      <button
                        onClick={() => setSubscribeAlert({ instructorId: room.instructor.id, instructorName: room.instructor.fullName || room.instructor.email })}
                        className="flex-1 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                      >
                        🔒 Abone Ol
                      </button>
                    )}
                    {room.status === "SCHEDULED" && isInstructor && room.instructor.id === user?.id && (
                      <button onClick={() => handleStart(room.id)}
                        className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                        Başlat
                      </button>
                    )}
                    {room.status === "ENDED" && (
                      <span className="text-xs text-zinc-500 py-2 italic">Ders sona erdi</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Abonelik uyarı modali */}
        {subscribeAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-7 shadow-xl max-w-sm w-full mx-4 text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Abonelik Gerekli</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Bu canlı derse katılmak için <span className="font-semibold text-zinc-700 dark:text-zinc-200">{subscribeAlert.instructorName}</span> eğitmenine abone olman gerekiyor.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSubscribeAlert(null)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 transition-colors"
                >
                  Şimdi Değil
                </button>
                <button
                  onClick={() => { setSubscribeAlert(null); router.push(`/instructors/${subscribeAlert.instructorId}`); }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Eğitmeni Görüntüle
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
