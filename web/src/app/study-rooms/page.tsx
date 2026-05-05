"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import Link from "next/link";

interface Participant {
  id: string;
  user: { id: string; fullName: string | null; avatarUrl: string | null };
  studying: string | null;
}

interface StudyRoom {
  id: string;
  name: string;
  topic: string | null;
  type: "VOICE" | "SILENT";
  maxCapacity: number;
  isPrivate: boolean;
  inviteCode: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  createdAt: string;
  createdBy: { id: string; fullName: string | null };
  participants: Participant[];
  _count: { participants: number };
}

export default function StudyRoomsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", topic: "", type: "SILENT", maxCapacity: 20,
    isPrivate: false, scheduledStart: "", scheduledEnd: "",
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    // Eğitmenler odaları görebilir, sadece admin paneline yönlendirilmez
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    loadRooms();
    const interval = setInterval(loadRooms, 15000);
    return () => clearInterval(interval);
  }, [token]);

  async function loadRooms() {
    try {
      const res = await fetch("/api/study-rooms", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setRooms(json.rooms || []);
    } catch {
      // sessizce
    } finally {
      setFetching(false);
    }
  }

  async function createRoom() {
    if (!form.name.trim()) { showToast("Oda adı boş olamaz.", "error"); return; }
    if (!form.isPrivate && (!form.scheduledStart || !form.scheduledEnd)) {
      showToast("Genel oda için başlangıç ve bitiş saati girin.", "error"); return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/study-rooms", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast("Oda oluşturuldu!", "success");
      if (json.inviteCode) {
        setCreatedInviteCode(json.inviteCode);
      } else {
        setShowCreate(false);
        loadRooms();
      }
      setForm({ name: "", topic: "", type: "SILENT", maxCapacity: 20, isPrivate: false, scheduledStart: "", scheduledEnd: "" });
    } catch (e: any) {
      showToast(e.message || "Oda oluşturulamadı.", "error");
    } finally {
      setCreating(false);
    }
  }

  function copyInviteLink(code: string) {
    const link = `${window.location.origin}/study-rooms/join/${code}`;
    navigator.clipboard.writeText(link);
    showToast("Davet linki kopyalandı!", "success");
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const topRoom = rooms[0];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Başlık */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Çalışma Odaları</h1>
            <p className="text-gray-400 mt-1">Birlikte çalış, birlikte öğren.</p>
          </div>
          {user?.role !== "INSTRUCTOR" && (
            <button
              onClick={() => setShowCreate(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
            >
              + Oda Aç
            </button>
          )}
        </div>

        {/* En aktif oda önerisi */}
        {topRoom && topRoom._count.participants > 0 && (
          <div className="mb-8 p-4 rounded-xl border border-purple-500/30 bg-purple-900/10 flex items-center gap-4">
            <div className="text-2xl">🔥</div>
            <div className="flex-1">
              <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-0.5">En Aktif Oda</p>
              <p className="text-white font-semibold">{topRoom.name}</p>
              {topRoom.topic && <p className="text-gray-400 text-sm">{topRoom.topic}</p>}
            </div>
            <div className="text-right">
              <p className="text-purple-300 font-bold text-xl">{topRoom._count.participants}</p>
              <p className="text-gray-500 text-xs">kişi çalışıyor</p>
            </div>
            <Link href={`/study-rooms/${topRoom.id}`} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Katıl
            </Link>
          </div>
        )}

        {rooms.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📚</p>
            <p className="text-gray-400 text-lg">Henüz açık genel oda yok.</p>
            <p className="text-gray-600 text-sm mt-1">İlk odayı sen aç!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rooms.map((room, i) => (
              <RoomCard key={room.id} room={room} rank={i} />
            ))}
          </div>
        )}
      </div>

      {/* Oda Oluştur Modal */}
      {showCreate && !createdInviteCode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md my-4">
            <h2 className="text-xl font-bold text-white mb-5">Yeni Oda Aç</h2>

            <div className="space-y-4">
              {/* Oda tipi: Genel / Özel */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setForm(f => ({ ...f, isPrivate: false }))}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${!form.isPrivate ? "border-purple-500 bg-purple-900/20" : "border-gray-700 hover:border-gray-500"}`}
                >
                  <p className="text-lg mb-0.5">🌐</p>
                  <p className="text-white font-medium text-sm">Genel Oda</p>
                  <p className="text-gray-500 text-xs">Saat aralığıyla, herkese açık</p>
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, isPrivate: true }))}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${form.isPrivate ? "border-purple-500 bg-purple-900/20" : "border-gray-700 hover:border-gray-500"}`}
                >
                  <p className="text-lg mb-0.5">🔐</p>
                  <p className="text-white font-medium text-sm">Özel Oda</p>
                  <p className="text-gray-500 text-xs">Sadece davet linkiyle</p>
                </button>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Oda Adı *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="örn. Matematik Çalışma"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Konu (isteğe bağlı)</label>
                <input
                  value={form.topic}
                  onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="örn. Türev ve İntegral"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Saat aralığı — sadece genel oda */}
              {!form.isPrivate && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-400 mb-1.5 block">Başlangıç *</label>
                    <input
                      type="datetime-local"
                      value={form.scheduledStart}
                      onChange={e => setForm(f => ({ ...f, scheduledStart: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1.5 block">Bitiş *</label>
                    <input
                      type="datetime-local"
                      value={form.scheduledEnd}
                      onChange={e => setForm(f => ({ ...f, scheduledEnd: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Sessiz / Sesli */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Oda Tipi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setForm(f => ({ ...f, type: "SILENT" }))}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${form.type === "SILENT" ? "border-purple-500 bg-purple-900/20" : "border-gray-700 hover:border-gray-500"}`}
                  >
                    <p className="text-lg mb-0.5">🤫</p>
                    <p className="text-white font-medium text-sm">Sessiz</p>
                    <p className="text-gray-500 text-xs">Kütüphane modunda</p>
                  </button>
                  <button
                    onClick={() => setForm(f => ({ ...f, type: "VOICE" }))}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${form.type === "VOICE" ? "border-blue-500 bg-blue-900/20" : "border-gray-700 hover:border-gray-500"}`}
                  >
                    <p className="text-lg mb-0.5">🎙️</p>
                    <p className="text-white font-medium text-sm">Sesli</p>
                    <p className="text-gray-500 text-xs">Tartış, ders anlat</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Maksimum Kişi</label>
                <input
                  type="number" min={2} max={50} value={form.maxCapacity}
                  onChange={e => setForm(f => ({ ...f, maxCapacity: parseInt(e.target.value) || 20 }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors">
                İptal
              </button>
              <button onClick={createRoom} disabled={creating} className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors disabled:opacity-50">
                {creating ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Davet linki göster */}
      {createdInviteCode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md text-center">
            <p className="text-4xl mb-3">🔐</p>
            <h2 className="text-xl font-bold text-white mb-2">Özel Oda Hazır!</h2>
            <p className="text-gray-400 text-sm mb-5">Bu linki arkadaşlarınla paylaş:</p>
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-purple-300 break-all mb-4 font-mono">
              {`${window.location.origin}/study-rooms/join/${createdInviteCode}`}
            </div>
            <button
              onClick={() => copyInviteLink(createdInviteCode)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors mb-3"
            >
              Linki Kopyala
            </button>
            <button
              onClick={() => { setCreatedInviteCode(null); setShowCreate(false); loadRooms(); router.push(`/study-rooms`); }}
              className="w-full text-gray-500 hover:text-gray-300 py-2 text-sm transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomCard({ room, rank }: { room: StudyRoom; rank: number }) {
  const isFull = room._count.participants >= room.maxCapacity;

  function formatTimeRange() {
    if (!room.scheduledStart || !room.scheduledEnd) return null;
    const start = new Date(room.scheduledStart).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const end = new Date(room.scheduledEnd).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    return `${start} – ${end}`;
  }

  const timeRange = formatTimeRange();

  return (
    <Link href={`/study-rooms/${room.id}`} className="block">
      <div className={`p-5 rounded-xl border transition-all hover:scale-[1.01] cursor-pointer ${
        isFull ? "border-gray-700 bg-gray-900/40 opacity-70"
          : room.type === "VOICE" ? "border-blue-500/30 bg-blue-900/5 hover:border-blue-500/60"
          : "border-gray-700 bg-gray-900/60 hover:border-purple-500/40"
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{room.type === "VOICE" ? "🎙️" : "🤫"}</span>
            <div>
              <h3 className="text-white font-semibold leading-tight">{room.name}</h3>
              {room.topic && <p className="text-gray-500 text-xs mt-0.5">{room.topic}</p>}
            </div>
          </div>
          {rank === 0 && room._count.participants > 0 && (
            <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full shrink-0">
              🔥 En aktif
            </span>
          )}
        </div>

        {timeRange && (
          <div className="flex items-center gap-1.5 mb-3 text-xs text-yellow-400/80 bg-yellow-900/10 border border-yellow-800/20 rounded-lg px-2.5 py-1.5 w-fit">
            <span>🕐</span>
            <span>{timeRange}</span>
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <div className="flex -space-x-2">
            {room.participants.slice(0, 5).map(p => (
              <div key={p.id} className="w-7 h-7 rounded-full bg-purple-600 border-2 border-gray-900 flex items-center justify-center text-xs font-bold text-white" title={p.user.fullName || ""}>
                {(p.user.fullName || "?")[0].toUpperCase()}
              </div>
            ))}
          </div>
          {room._count.participants === 0
            ? <span className="text-gray-600 text-sm">Henüz kimse yok</span>
            : <span className="text-gray-400 text-sm">{room._count.participants} kişi çalışıyor</span>
          }
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${room.type === "VOICE" ? "bg-blue-900/30 text-blue-400" : "bg-gray-800 text-gray-400"}`}>
              {room.type === "VOICE" ? "Sesli" : "Sessiz"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">max {room.maxCapacity}</span>
          </div>
          {isFull ? <span className="text-xs text-red-400">Dolu</span> : <span className="text-xs text-purple-400 font-medium">Katıl →</span>}
        </div>
      </div>
    </Link>
  );
}
