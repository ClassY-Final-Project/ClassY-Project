"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const TARGETS = [
  { value: "ALL", label: "Tüm Kullanıcılar", icon: "👥", desc: "Herkese gönderilir" },
  { value: "STUDENT", label: "Sadece Öğrenciler", icon: "🎓", desc: "Öğrenci rolündeki kullanıcılar" },
  { value: "INSTRUCTOR", label: "Sadece Eğitmenler", icon: "👨‍🏫", desc: "Eğitmen rolündeki kullanıcılar" },
];

interface SentItem {
  message: string;
  target: string;
  count: number;
  sentAt: string;
}

export default function AdminAnnouncementsPage() {
  const { token } = useAuth();
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("ALL");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<SentItem[]>([]);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (token) loadHistory();
  }, [token]);

  async function loadHistory() {
    try {
      const res = await fetch("/api/admin/announcements", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.announcements) {
        setHistory(data.announcements.map((a: any) => ({
          message: a.message,
          target: "Bilinmiyor",
          count: a.count,
          sentAt: a.createdAt
        })));
      }
    } catch (e) {
      console.error(e);
    }
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function deleteAnnouncement(msg: string) {
    if (!confirm("Bu duyuruyu tüm kullanıcılardan silmek istediğinize emin misiniz?")) return;
    
    const res = await fetch(`/api/admin/announcements?message=${encodeURIComponent(msg)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.ok) {
      showToast("Duyuru silindi.", true);
      loadHistory();
    } else {
      showToast("Duyuru silinemedi.", false);
    }
  }

  async function sendAnnouncement() {
    if (!message.trim()) return;
    if (!confirm(`"${TARGETS.find(t => t.value === targetRole)?.label}" grubuna duyuru gönderilecek. Emin misiniz?`)) return;

    setSending(true);
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim(), targetRole }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`Duyuru ${data.count} kullanıcıya gönderildi.`, true);
      loadHistory();
      setMessage("");
    } else {
      showToast(data.error || "Gönderilemedi.", false);
    }
    setSending(false);
  }

  const selectedTarget = TARGETS.find((t) => t.value === targetRole)!;

  return (
    <div className="p-8 space-y-8 max-w-2xl">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium text-white ${toast.ok ? "bg-emerald-500" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Duyurular</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Kullanıcılara platform bildirimi gönder</p>
      </div>

      {/* Duyuru formu */}
      <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Hedef Kitle</label>
          <div className="grid grid-cols-3 gap-3">
            {TARGETS.map((t) => (
              <button key={t.value} onClick={() => setTargetRole(t.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                  targetRole === t.value
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                }`}>
                <span className="text-2xl">{t.icon}</span>
                <span className={`text-xs font-medium ${targetRole === t.value ? "text-indigo-700 dark:text-indigo-400" : "text-zinc-600 dark:text-zinc-400"}`}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-400 mt-2">{selectedTarget.desc}</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Duyuru Mesajı</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Platformdaki önemli bir güncelleme veya duyuruyu buraya yazın..."
            rows={4}
            className="w-full border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <p className="text-xs text-zinc-400 mt-1 text-right">{message.length} karakter</p>
        </div>

        <button
          onClick={sendAnnouncement}
          disabled={!message.trim() || sending}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
        >
          {sending ? "Gönderiliyor..." : `📢 ${selectedTarget.label}'a Duyuru Gönder`}
        </button>
      </div>

      {/* Gönderilen duyurular */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Geçmiş Duyurular</h2>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-xl px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{h.message}</p>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-zinc-400 whitespace-nowrap">
                      {new Date(h.sentAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button onClick={() => deleteAnnouncement(h.message)} className="text-xs text-red-500 hover:text-red-700 transition-colors">
                      Sil
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-zinc-400">· {h.count} kişiye ulaştı</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
