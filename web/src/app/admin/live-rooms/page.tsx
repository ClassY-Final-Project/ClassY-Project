"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";

interface RoomItem {
  id: string;
  name: string;
  dailyRoomName: string;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  instructor: { id: string; fullName: string | null; email: string };
  participantCount: number;
}

const STATUS_LABEL: Record<string, string> = { SCHEDULED: "Planlandı", LIVE: "Yayında", ENDED: "Sona Erdi" };
const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  LIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  ENDED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400",
};

export default function AdminLiveRoomsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { if (token) loadRooms(); }, [token]);

  async function loadRooms() {
    setLoading(true);
    const res = await fetch("/api/admin/live-rooms", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setRooms(data.rooms ?? []);
    setLoading(false);
  }

  async function deleteRoom(roomId: string, name: string) {
    const ok = await confirm({ title: "Canlı Dersi Sil", message: `"${name}" canlı dersini kalıcı olarak silmek istediğinize emin misiniz?`, confirmText: "Sil", danger: true });
    if (!ok) return;
    setDeleting(roomId);
    const res = await fetch(`/api/admin/live-rooms/${roomId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      showToast("Canlı ders silindi.", "success");
    } else {
      showToast("Silinemedi.", "error");
    }
    setDeleting(null);
  }

  async function changeStatus(roomId: string, newStatus: string) {
    const res = await fetch(`/api/admin/live-rooms/${roomId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, status: newStatus as RoomItem["status"] } : r))
      );
      showToast("Durum güncellendi.", "success");
    } else {
      showToast("Güncelleme başarısız.", "error");
    }
  }

  const filtered = rooms.filter((r) => {
    const matchFilter = filter === "ALL" || r.status === filter;
    const matchSearch =
      !search.trim() ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.instructor.fullName || r.instructor.email).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Canlı Dersler</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {rooms.length} ders · {rooms.filter((r) => r.status === "LIVE").length} yayında
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Ders adı veya eğitmen ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">Tüm Durumlar</option>
          <option value="LIVE">Yayında</option>
          <option value="SCHEDULED">Planlandı</option>
          <option value="ENDED">Sona Erdi</option>
        </select>
      </div>

      <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[2fr_1.2fr_auto_auto_auto_auto] text-xs font-semibold text-zinc-400 uppercase tracking-wider px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 gap-4">
          <span>Ders Adı</span><span>Eğitmen</span><span>Durum</span><span>Katılımcı</span><span>Tarih</span><span></span>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-12">Canlı ders bulunamadı.</p>
        ) : (
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {filtered.map((r) => (
              <div key={r.id} className="grid grid-cols-[2fr_1.2fr_auto_auto_auto_auto] items-center px-6 py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-xs shrink-0">
                    🔴
                  </div>
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{r.name}</span>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                  {r.instructor.fullName || r.instructor.email}
                </p>
                {/* Durum değiştirme dropdown */}
                <select
                  value={r.status}
                  onChange={(e) => changeStatus(r.id, e.target.value)}
                  className={`text-xs font-medium px-2 py-1.5 rounded-lg border-0 cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:outline-none ${STATUS_COLOR[r.status] ?? ""}`}
                >
                  <option value="SCHEDULED">Planlandı</option>
                  <option value="LIVE">Yayında</option>
                  <option value="ENDED">Sona Erdi</option>
                </select>
                <span className="text-sm text-zinc-500 whitespace-nowrap">{r.participantCount} kişi</span>
                <span className="text-xs text-zinc-400 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <button
                  onClick={() => deleteRoom(r.id, r.name)}
                  disabled={deleting === r.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 font-medium transition-colors"
                >
                  {deleting === r.id ? "..." : "Sil"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
