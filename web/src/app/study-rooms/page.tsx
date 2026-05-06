"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import UpgradeModal from "@/components/UpgradeModal";
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
  roomAccess: "PUBLIC" | "GOLD_PLUS" | "PLATINUM_ONLY";
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
  const [userPlan, setUserPlan] = useState<string>("FREE");
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{ title: string; description: string; plan?: "GOLD" | "PLATINUM" } | null>(null);
  const [filterAccess, setFilterAccess] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "", topic: "", type: "SILENT", maxCapacity: 20,
    isPrivate: false, scheduledStart: "", scheduledEnd: "",
    roomAccess: "PUBLIC",
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
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
      if (json.userPlan) setUserPlan(json.userPlan);
    } catch {
      // sessizce
    } finally {
      setFetching(false);
    }
  }

  async function createRoom() {
    if (!form.name.trim()) { showToast("Oda adi bos olamaz.", "error"); return; }
    if (!form.isPrivate && (!form.scheduledStart || !form.scheduledEnd)) {
      showToast("Genel oda icin baslangic ve bitis saati girin.", "error"); return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/study-rooms", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === "ROOM_CREATION_NOT_ALLOWED" || json.code === "ROOM_LIMIT_EXCEEDED") {
          setShowCreate(false);
          setUpgradeModal({
            title: json.code === "ROOM_CREATION_NOT_ALLOWED" ? "Oda Olusturmak icin Plan Gerekli" : "Haftalik Limit Doldu",
            description: json.error,
            plan: "GOLD",
          });
          return;
        }
        if (json.code === "PLAN_REQUIRED") {
          setShowCreate(false);
          setUpgradeModal({ title: "Plan Yukseltmesi Gerekli", description: json.error, plan: form.roomAccess === "PLATINUM_ONLY" ? "PLATINUM" : "GOLD" });
          return;
        }
        throw new Error(json.error);
      }
      showToast("Oda olusturuldu!", "success");
      if (json.inviteCode) {
        setCreatedInviteCode(json.inviteCode);
      } else {
        setShowCreate(false);
        loadRooms();
      }
      setForm({ name: "", topic: "", type: "SILENT", maxCapacity: 20, isPrivate: false, scheduledStart: "", scheduledEnd: "", roomAccess: "PUBLIC" });
    } catch (e: any) {
      showToast(e.message || "Oda olusturulamadi.", "error");
    } finally {
      setCreating(false);
    }
  }

  function handleOpenCreate() {
    if (userPlan === "FREE") {
      setUpgradeModal({
        title: "Oda açmak için Plan yükselt",
        description: "Ücretsiz planda çalışma odası oluşturulamazsınız. Gold veya Platinum plana geçerek bu özelliği kullanabilirsiniz.",
        plan: "GOLD",
      });
      return;
    }
    setShowCreate(true);
  }

  function copyInviteLink(code: string) {
    const link = `${window.location.origin}/study-rooms/join/${code}`;
    navigator.clipboard.writeText(link);
    showToast("Davet linki kopyalandı!", "success");
  }

  if (loading || fetching) {
    return (
      <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const topRoom = rooms[0];

  // Filtre uygula
  const canAccess = (room: StudyRoom) => {
    if (room.roomAccess === "PLATINUM_ONLY") return userPlan === "PLATINUM";
    if (room.roomAccess === "GOLD_PLUS") return userPlan === "GOLD" || userPlan === "PLATINUM";
    return true;
  };
  const visibleRooms = filterAccess.length === 0
    ? rooms
    : rooms.filter(r => filterAccess.includes(r.roomAccess));

  function toggleFilter(val: string) {
    setFilterAccess(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  }

  return (
    <>
      {upgradeModal && (
        <UpgradeModal
          title={upgradeModal.title}
          description={upgradeModal.description}
          requiredPlan={upgradeModal.plan}
          onClose={() => setUpgradeModal(null)}
        />
      )}
      <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Çalisma Odaları</h1>
              <p className="text-zinc-500 dark:text-gray-400 mt-1">Birlikte calis, birlikte ogren.</p>
            </div>
            {user?.role !== "INSTRUCTOR" && (
              <button
                onClick={handleOpenCreate}
                className={`px-5 py-2.5 rounded-lg font-medium transition-colors text-white ${
                  userPlan === "FREE" ? "bg-amber-500 hover:bg-amber-600" : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {userPlan === "FREE" ? "+ Oda Ac (Plan Gerekli)" : "+ Oda Ac"}
              </button>
            )}
          </div>

          {userPlan !== "FREE" && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 ${
              userPlan === "PLATINUM" ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
            }`}>
              {userPlan === "PLATINUM" ? "💎 Platinum Plan" : "⭐ Gold Plan"} aktif
            </div>
          )}

          {/* Filtre sekmesi */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-1">Filtrele:</span>
            <button
              onClick={() => setFilterAccess([])}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filterAccess.length === 0
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => toggleFilter("PUBLIC")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filterAccess.includes("PUBLIC")
                  ? "bg-zinc-700 text-white border-zinc-700"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
              }`}
            >
              🌐 Ücretsiz
            </button>
            <button
              onClick={() => toggleFilter("GOLD_PLUS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filterAccess.includes("GOLD_PLUS")
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-amber-400"
              }`}
            >
              ⭐ Gold
            </button>
            <button
              onClick={() => toggleFilter("PLATINUM_ONLY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filterAccess.includes("PLATINUM_ONLY")
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-violet-400"
              }`}
            >
              💎 Platinum
            </button>
          </div>

          {topRoom && topRoom._count.participants > 0 && (
            <div className="mb-8 p-4 rounded-xl border border-purple-400/30 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-900/10 flex items-center gap-4">
              <div className="text-2xl">🔥</div>
              <div className="flex-1">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider mb-0.5">En Aktif Oda</p>
                <p className="text-zinc-900 dark:text-white font-semibold">{topRoom.name}</p>
                {topRoom.topic && <p className="text-zinc-500 dark:text-gray-400 text-sm">{topRoom.topic}</p>}
              </div>
              <div className="text-right">
                <p className="text-purple-600 dark:text-purple-300 font-bold text-xl">{topRoom._count.participants}</p>
                <p className="text-zinc-400 dark:text-gray-500 text-xs">kisi calisiyor</p>
              </div>
              <Link href={`/study-rooms/${topRoom.id}`} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Katil
              </Link>
            </div>
          )}

          {visibleRooms.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">📚</p>
              <p className="text-zinc-500 dark:text-gray-400 text-lg">Henuz acik genel oda yok.</p>
              <p className="text-zinc-400 dark:text-gray-600 text-sm mt-1">Ilk odayi sen ac!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {visibleRooms.map((room, i) => (
                <RoomCard key={room.id} room={room} rank={i} canAccess={canAccess(room)} />
              ))}
            </div>
          )}
        </div>

        {showCreate && !createdInviteCode && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-md my-4">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-5">Yeni Oda Ac</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setForm(f => ({ ...f, isPrivate: false }))} className={`p-3 rounded-lg border-2 text-left transition-colors ${!form.isPrivate ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border-zinc-200 dark:border-gray-700"}`}>
                    <p className="text-lg mb-0.5">🌐</p>
                    <p className="text-zinc-900 dark:text-white font-medium text-sm">Genel Oda</p>
                    <p className="text-zinc-500 dark:text-gray-500 text-xs">Herkese acik</p>
                  </button>
                  <button onClick={() => setForm(f => ({ ...f, isPrivate: true }))} className={`p-3 rounded-lg border-2 text-left transition-colors ${form.isPrivate ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border-zinc-200 dark:border-gray-700"}`}>
                    <p className="text-lg mb-0.5">🔒</p>
                    <p className="text-zinc-900 dark:text-white font-medium text-sm">Ozel Oda</p>
                    <p className="text-zinc-500 dark:text-gray-500 text-xs">Davet linkiyle</p>
                  </button>
                </div>
                <div>
                  <label className="text-sm text-zinc-500 dark:text-gray-400 mb-1.5 block">Oda Adi *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="orn. Matematik Calışma" className="w-full bg-zinc-100 dark:bg-gray-800 border border-zinc-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="text-sm text-zinc-500 dark:text-gray-400 mb-1.5 block">Konu (istege bagli)</label>
                  <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="orn. Turev ve Integral" className="w-full bg-zinc-100 dark:bg-gray-800 border border-zinc-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="text-sm text-zinc-500 dark:text-gray-400 mb-2 block">Kimler Katilabilir?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "PUBLIC", emoji: "🌐", short: "Herkes", desc: "Tum kullanicilar", disabled: false },
                      { value: "GOLD_PLUS", emoji: "⭐", short: "Gold+", desc: "Gold ve Platinum", disabled: userPlan === "FREE" },
                      { value: "PLATINUM_ONLY", emoji: "💎", short: "Platinum", desc: "Sadece Platinum", disabled: userPlan !== "PLATINUM" },
                    ].map(opt => (
                      <button key={opt.value} disabled={opt.disabled} onClick={() => !opt.disabled && setForm(f => ({ ...f, roomAccess: opt.value }))}
                        className={`p-2.5 rounded-lg border-2 text-left transition-colors ${form.roomAccess === opt.value ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : opt.disabled ? "border-zinc-100 dark:border-gray-800 opacity-40 cursor-not-allowed" : "border-zinc-200 dark:border-gray-700 hover:border-zinc-400"}`}>
                        <p className="text-zinc-900 dark:text-white font-medium text-xs">{opt.short}</p>
                        <p className="text-zinc-400 dark:text-gray-500 text-[10px]">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                {!form.isPrivate && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-zinc-500 dark:text-gray-400 mb-1.5 block">Baslangic *</label>
                      <input type="datetime-local" value={form.scheduledStart} onChange={e => setForm(f => ({ ...f, scheduledStart: e.target.value }))} className="w-full bg-zinc-100 dark:bg-gray-800 border border-zinc-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500 text-sm" />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-500 dark:text-gray-400 mb-1.5 block">Bitis *</label>
                      <input type="datetime-local" value={form.scheduledEnd} onChange={e => setForm(f => ({ ...f, scheduledEnd: e.target.value }))} className="w-full bg-zinc-100 dark:bg-gray-800 border border-zinc-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500 text-sm" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm text-zinc-500 dark:text-gray-400 mb-2 block">Oda Tipi</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setForm(f => ({ ...f, type: "SILENT" }))} className={`p-3 rounded-lg border-2 text-left transition-colors ${form.type === "SILENT" ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border-zinc-200 dark:border-gray-700"}`}>
                      <p className="text-zinc-900 dark:text-white font-medium text-sm">Sessiz</p>
                      <p className="text-zinc-500 dark:text-gray-500 text-xs">Kutuphane modunda</p>
                    </button>
                    <button onClick={() => setForm(f => ({ ...f, type: "VOICE" }))} className={`p-3 rounded-lg border-2 text-left transition-colors ${form.type === "VOICE" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-zinc-200 dark:border-gray-700"}`}>
                      <p className="text-zinc-900 dark:text-white font-medium text-sm">Sesli</p>
                      <p className="text-zinc-500 dark:text-gray-500 text-xs">Tartis, ders anlat</p>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-zinc-500 dark:text-gray-400 mb-1.5 block">Maksimum Kisi</label>
                  <input type="number" min={2} max={50} value={form.maxCapacity} onChange={e => setForm(f => ({ ...f, maxCapacity: parseInt(e.target.value) || 20 }))} className="w-full bg-zinc-100 dark:bg-gray-800 border border-zinc-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg border border-zinc-200 dark:border-gray-700 text-zinc-600 dark:text-gray-300 hover:bg-zinc-50 dark:hover:bg-gray-800 transition-colors">Iptal</button>
                <button onClick={createRoom} disabled={creating} className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors disabled:opacity-50">{creating ? "Olusturuluyor..." : "Olustur"}</button>
              </div>
            </div>
          </div>
        )}

        {createdInviteCode && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-md text-center">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Ozel Oda Hazir!</h2>
              <p className="text-zinc-500 dark:text-gray-400 text-sm mb-5">Bu linki arkadaslarinla paylas:</p>
              <div className="bg-zinc-100 dark:bg-gray-800 border border-zinc-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm text-purple-600 dark:text-purple-300 break-all mb-4 font-mono">
                {`${window.location.origin}/study-rooms/join/${createdInviteCode}`}
              </div>
              <button onClick={() => copyInviteLink(createdInviteCode)} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors mb-3">Linki Kopyala</button>
              <button onClick={() => { setCreatedInviteCode(null); setShowCreate(false); loadRooms(); router.push("/study-rooms"); }} className="w-full text-zinc-400 dark:text-gray-500 hover:text-zinc-700 dark:hover:text-gray-300 py-2 text-sm transition-colors">Kapat</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function RoomCard({ room, rank, canAccess }: { room: StudyRoom; rank: number; canAccess: boolean }) {
  const router = useRouter();
  const isFull = room._count.participants >= room.maxCapacity;
  const locked = !canAccess;
  const lockLabel = room.roomAccess === "PLATINUM_ONLY" ? "💎 Platinum gerekli" : "⭐ Gold gerekli";

  function formatTimeRange() {
    if (!room.scheduledStart || !room.scheduledEnd) return null;
    const start = new Date(room.scheduledStart).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const end = new Date(room.scheduledEnd).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    return `${start} - ${end}`;
  }

  const timeRange = formatTimeRange();
  const accessBadge = room.roomAccess === "PLATINUM_ONLY"
    ? { label: "Platinum", cls: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" }
    : room.roomAccess === "GOLD_PLUS"
    ? { label: "Gold+", cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" }
    : null;

  return (
    <div
      className={`block ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}
      onClick={() => { if (!locked) router.push(`/study-rooms/${room.id}`); }}
    >      
      <div className={`relative p-5 rounded-xl border transition-all ${
        locked
          ? "border-zinc-200 dark:border-gray-700 bg-zinc-50 dark:bg-gray-900/40 opacity-80"
          : isFull
          ? "border-zinc-200 dark:border-gray-700 bg-zinc-100 dark:bg-gray-900/40 opacity-70"
          : room.type === "VOICE"
          ? "border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/5 hover:border-blue-400 dark:hover:border-blue-500/60 hover:scale-[1.01] cursor-pointer"
          : "border-zinc-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 hover:border-purple-400/50 dark:hover:border-purple-500/40 hover:scale-[1.01] cursor-pointer"
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{room.type === "VOICE" ? "🎙️" : "🤫"}</span>
            <div>
              <h3 className="text-zinc-900 dark:text-white font-semibold leading-tight">{room.name}</h3>
              {room.topic && <p className="text-zinc-500 dark:text-gray-500 text-xs mt-0.5">{room.topic}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {accessBadge && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${accessBadge.cls}`}>{accessBadge.label}</span>
            )}
            {rank === 0 && room._count.participants > 0 && (
              <span className="text-xs bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-300/50 dark:border-orange-500/30 px-2 py-0.5 rounded-full">En aktif</span>
            )}
          </div>
        </div>
        {/* Kilitli overlay */}
        {locked && (
          <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/10 dark:bg-black/30 backdrop-blur-[1px]">
            <Link
              href="/pricing"
              onClick={e => e.stopPropagation()}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shadow transition-opacity hover:opacity-80 ${
                room.roomAccess === "PLATINUM_ONLY"
                  ? "bg-violet-600 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              🔒 {lockLabel} — Plan Yükselt
            </Link>
          </div>
        )}
        {timeRange && (
          <div className="flex items-center gap-1.5 mb-3 text-xs text-yellow-600 dark:text-yellow-400/80 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-300/50 dark:border-yellow-800/20 rounded-lg px-2.5 py-1.5 w-fit">
            {timeRange}
          </div>
        )}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex -space-x-2">
            {room.participants.slice(0, 5).map(p => (
              <div key={p.id} className="w-7 h-7 rounded-full bg-purple-600 border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs font-bold text-white" title={p.user.fullName || ""}>
                {(p.user.fullName || "?")[0].toUpperCase()}
              </div>
            ))}
          </div>
          {room._count.participants === 0
            ? <span className="text-zinc-400 dark:text-gray-600 text-sm">Henuz kimse yok</span>
            : <span className="text-zinc-500 dark:text-gray-400 text-sm">{room._count.participants} kisi calisiyor</span>
          }
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${room.type === "VOICE" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-zinc-100 dark:bg-gray-800 text-zinc-600 dark:text-gray-400"}`}>
              {room.type === "VOICE" ? "Sesli" : "Sessiz"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-gray-800 text-zinc-500 dark:text-gray-500">max {room.maxCapacity}</span>
          </div>
          {isFull ? <span className="text-xs text-red-500 dark:text-red-400">Dolu</span> : <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Katil</span>}
        </div>
      </div>
    </div>
  );
}
