"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";

interface NoteItem {
  id: string;
  fileName: string;
  subject: string;
  processedStatus: "PENDING" | "COMPLETED" | "FAILED";
  uploadedAt: string;
  summary: string | null;
  student: { id: string; fullName: string | null; email: string };
  quizCount: number;
  flashcardCount: number;
}

const STATUS_LABEL: Record<string, string> = { PENDING: "Bekliyor", COMPLETED: "Tamamlandı", FAILED: "Başarısız" };
const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

export default function AdminNotesPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { if (token) loadNotes(); }, [token]);

  async function loadNotes() {
    setLoading(true);
    const res = await fetch("/api/admin/notes", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setNotes(data.notes ?? []);
    setLoading(false);
  }

  async function deleteNote(noteId: string, fileName: string) {
    const ok = await confirm({ title: "Notu Sil", message: `"${fileName}" ders notunu kalıcı olarak silmek istediğinize emin misiniz?`, confirmText: "Sil", danger: true });
    if (!ok) return;
    setDeleting(noteId);
    const res = await fetch(`/api/admin/notes/${noteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      showToast("Ders notu silindi.", "success");
    } else {
      showToast("Silinemedi.", "error");
    }
    setDeleting(null);
  }

  const filtered = notes.filter((n) => {
    const matchFilter = filter === "ALL" || n.processedStatus === filter;
    const matchSearch =
      !search.trim() ||
      n.fileName.toLowerCase().includes(search.toLowerCase()) ||
      n.subject.toLowerCase().includes(search.toLowerCase()) ||
      (n.student.fullName || n.student.email).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Ders Notları</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {notes.length} not · {notes.filter((n) => n.processedStatus === "COMPLETED").length} tamamlandı
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Dosya adı, konu veya öğrenci ara..."
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
          <option value="COMPLETED">Tamamlandı</option>
          <option value="PENDING">Bekliyor</option>
          <option value="FAILED">Başarısız</option>
        </select>
      </div>

      <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1.2fr_auto_auto_auto_auto] text-xs font-semibold text-zinc-400 uppercase tracking-wider px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 gap-4">
          <span>Dosya Adı</span><span>Konu</span><span>Öğrenci</span><span>Durum</span><span>Quiz</span><span>Kart</span><span></span>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-12">Ders notu bulunamadı.</p>
        ) : (
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {filtered.map((n) => (
              <div key={n.id} className="grid grid-cols-[2fr_1fr_1.2fr_auto_auto_auto_auto] items-center px-6 py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-xs shrink-0">
                    📄
                  </div>
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{n.fileName}</span>
                </div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{n.subject}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                  {n.student.fullName || n.student.email}
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded-lg whitespace-nowrap ${STATUS_COLOR[n.processedStatus] ?? ""}`}>
                  {STATUS_LABEL[n.processedStatus] ?? n.processedStatus}
                </span>
                <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium whitespace-nowrap">{n.quizCount}</span>
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">{n.flashcardCount}</span>
                <button
                  onClick={() => deleteNote(n.id, n.fileName)}
                  disabled={deleting === n.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 font-medium transition-colors"
                >
                  {deleting === n.id ? "..." : "Sil"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
