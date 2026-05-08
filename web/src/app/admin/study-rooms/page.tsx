"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/components/ConfirmModal";

interface RoomItem {
  id: string;
  name: string;
  topic: string | null;
  type: "VOICE" | "SILENT";
  isActive: boolean;
  isPrivate: boolean;
  maxCapacity: number;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  expiresAt: string | null;
  createdAt: string;
  roomAccess: "PUBLIC" | "GOLD_PLUS" | "PLATINUM_ONLY";
  createdBy: { id: string; fullName: string | null; email: string };
  _count: { participants: number };
}

export default function AdminStudyRoomsPage() {
  const { token } = useAuth();
  const { confirm } = useConfirm();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [closing, setClosing] = useState<string | null>(null);

  useEffect(() => {
    loadRooms();
  }, [token, filter]); // eslint-disable-line

  async function loadRooms() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/study-rooms?filter=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setRooms(json.rooms || []);
    } finally {
      setLoading(false);
    }
  }

  async function closeRoom(id: string) {
    const ok = await confirm({ title: "Odayı Kapat", message: "Bu çalışma odasını kapatmak istediğinize emin misiniz?", confirmText: "Kapat", danger: true });
    if (!ok) return;
    setClosing(id);
    try {
      await fetch(`/api/admin/study-rooms/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadRooms();
    } finally {
      setClosing(null);
    }
  }

  const active = rooms.filter(r => r.isActive).length;
  const total = rooms.length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Çalışma Odaları</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Tüm odaları görüntüle ve yönet.</p>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{active}</p>
          <p className="text-zinc-500 text-sm">Aktif Oda</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{total}</p>
          <p className="text-zinc-500 text-sm">Toplam Oda</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {rooms.filter(r => r.isActive).reduce((sum, r) => sum + r._count.participants, 0)}
          </p>
          <p className="text-zinc-500 text-sm">Aktif Katılımcı</p>
        </div>
      </div>

      {/* Filtre */}
      <div className="flex gap-2 mb-4">
        {(["active", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}>
            {f === "active" ? "Aktif Odalar" : "Tümü"}
          </button>
        ))}
        <button onClick={loadRooms} className="ml-auto px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
          ↻ Yenile
        </button>
      </div>

      {/* Tablo */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-400">Yükleniyor...</div>
        ) : rooms.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">Oda bulunamadı.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Oda</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Açan</th>
                <th className="text-center px-4 py-3 text-zinc-500 font-medium">Tip</th>
                <th className="text-center px-4 py-3 text-zinc-500 font-medium">Erişim</th>
                <th className="text-center px-4 py-3 text-zinc-500 font-medium">Katılımcı</th>
                <th className="text-center px-4 py-3 text-zinc-500 font-medium">Durum</th>
                <th className="text-center px-4 py-3 text-zinc-500 font-medium">Bitiş</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {rooms.map(room => (
                <tr key={room.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900 dark:text-white">{room.name}</p>
                    {room.topic && <p className="text-zinc-400 text-xs">{room.topic}</p>}
                    {room.isPrivate && <span className="text-xs text-purple-400">🔐 Özel</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    <p>{room.createdBy.fullName || "-"}</p>
                    <p className="text-xs text-zinc-400">{room.createdBy.email}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${room.type === "VOICE" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                      {room.type === "VOICE" ? "🎙️ Sesli" : "🤫 Sessiz"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {room.roomAccess === "PLATINUM_ONLY" ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 font-medium">💎 Platinum</span>
                    ) : room.roomAccess === "GOLD_PLUS" ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">⭐ Gold+</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">Herkese Açık</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">
                    {room._count.participants} / {room.maxCapacity}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${room.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                      {room.isActive ? "Aktif" : "Kapalı"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-400 text-xs">
                    {room.expiresAt ? new Date(room.expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {room.isActive && (
                      <button
                        onClick={() => closeRoom(room.id)}
                        disabled={closing === room.id}
                        className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40 transition-colors"
                      >
                        {closing === room.id ? "..." : "Kapat"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
