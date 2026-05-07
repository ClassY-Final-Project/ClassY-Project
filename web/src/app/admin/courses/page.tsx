"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";

interface CourseItem {
  id: string;
  title: string;
  isPublished: boolean;
  price: string;
  createdAt: string;
  enrollmentCount: number;
  instructor: { id: string; fullName: string | null; email: string };
}

export default function AdminCoursesPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { if (token) loadCourses(); }, [token]);

  async function loadCourses() {
    setLoading(true);
    const res = await fetch("/api/admin/courses", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setCourses(data.courses ?? []);
    setLoading(false);
  }

  async function togglePublish(courseId: string, current: boolean) {
    setToggling(courseId);
    const res = await fetch(`/api/admin/courses/${courseId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !current }),
    });
    if (res.ok) {
      setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, isPublished: !current } : c));
      showToast(current ? "Kurs yayından kaldırıldı." : "Kurs yayına alındı.", "success");
    } else {
      showToast("Güncelleme başarısız.", "error");
    }
    setToggling(null);
  }

  async function deleteCourse(courseId: string, title: string) {
    const ok = await confirm({ title: "Kursu Sil", message: `"${title}" kursunu kalıcı olarak silmek istediğinize emin misiniz?`, confirmText: "Sil", danger: true });
    if (!ok) return;
    setDeleting(courseId);
    const res = await fetch(`/api/courses/${courseId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      showToast("Kurs silindi.", "success");
    } else {
      showToast("Silinemedi.", "error");
    }
    setDeleting(null);
  }

  const filtered = courses.filter((c) => {
    const matchFilter = filter === "ALL" || (filter === "PUBLISHED" ? c.isPublished : !c.isPublished);
    const matchSearch = !search.trim() ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.instructor.fullName || c.instructor.email).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Kurslar</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{courses.length} kurs · {courses.filter(c => c.isPublished).length} yayında</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input type="text" placeholder="Kurs adı veya eğitmen ara..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="ALL">Tüm Kurslar</option>
          <option value="PUBLISHED">Yayında</option>
          <option value="DRAFT">Taslak</option>
        </select>
      </div>

      <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[2fr_1.2fr_auto_auto_auto_auto] text-xs font-semibold text-zinc-400 uppercase tracking-wider px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 gap-4">
          <span>Kurs Adı</span><span>Eğitmen</span><span>Durum</span><span>Fiyat</span><span>Kayıt</span><span></span>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-12">Kurs bulunamadı.</p>
        ) : (
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {filtered.map((c) => (
              <div key={c.id} className="grid grid-cols-[2fr_1.2fr_auto_auto_auto_auto] items-center px-6 py-3 gap-4">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{c.title}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                  {c.instructor.fullName || c.instructor.email}
                </p>
                {/* Yayın durumu toggle */}
                <button
                  onClick={() => togglePublish(c.id, c.isPublished)}
                  disabled={toggling === c.id}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors disabled:opacity-50 ${
                    c.isPublished
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-200"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400 hover:bg-zinc-200"
                  }`}
                >
                  {toggling === c.id ? "..." : c.isPublished ? "Yayında" : "Taslak"}
                </button>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                  {parseFloat(c.price) === 0 ? "Ücretsiz" : `₺${parseFloat(c.price).toLocaleString("tr-TR")}`}
                </span>
                <span className="text-sm text-zinc-500 whitespace-nowrap">{c.enrollmentCount} kişi</span>
                <button onClick={() => deleteCourse(c.id, c.title)} disabled={deleting === c.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 font-medium transition-colors">
                  {deleting === c.id ? "..." : "Sil"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
