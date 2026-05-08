"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { uploadFileToStorage } from "@/lib/upload";

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: string;
  thumbnailUrl: string | null;
  isPublished: boolean;
  createdAt: string;
}

export default function InstructorCoursesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "0", thumbnailUrl: "" });
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user?.role === "STUDENT") router.replace("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (token) loadCourses();
  }, [token]);

  async function loadCourses() {
    setFetching(true);
    const res = await fetch("/api/courses", { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (res.ok) setCourses(json.courses || []);
    setFetching(false);
  }

  async function deleteCourse(id: string, title: string) {
    if (!confirm(`"${title}" kursunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) return;
    const res = await fetch(`/api/courses/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setCourses((c) => c.filter((x) => x.id !== id));
    } else {
      const json = await res.json();
      alert(json.error || "Kurs silinemedi.");
    }
  }

  async function uploadThumbnail(file: File) {
    setThumbnailUploading(true);
    try {
      const url = await uploadFileToStorage(file, token!);
      setForm((f) => ({ ...f, thumbnailUrl: url }));
    } catch (e: unknown) {
      setError((e as Error).message || "Görsel yüklenemedi.");
    }
    setThumbnailUploading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || undefined,
        price: parseFloat(form.price) || 0,
        thumbnailUrl: form.thumbnailUrl || undefined,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setShowCreate(false);
      setForm({ title: "", description: "", price: "0", thumbnailUrl: "" });
      router.push(`/instructor/courses/${json.course.id}`);
    } else {
      setError(json.error || "Kurs oluşturulamadı.");
    }
    setCreating(false);
  }

  if (loading) return null;

  return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Kurslarım</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Video kurslarını yönet ve yayınla</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Kurs
          </button>
        </div>

        {fetching ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Henüz kurs oluşturmadın.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              İlk Kursunu Oluştur
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center gap-2">
              <Link
                href={`/instructor/courses/${course.id}`}
                className="flex-1 flex items-center gap-4 bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center shrink-0 overflow-hidden">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {course.title}
                  </p>
                  {course.description && (
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{course.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    ₺{parseFloat(course.price).toLocaleString("tr-TR")}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    course.isPublished
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                  }`}>
                    {course.isPublished ? "Yayında" : "Taslak"}
                  </span>
                  <svg className="w-4 h-4 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
              <button
                onClick={() => deleteCourse(course.id, course.title)}
                className="p-2 rounded-xl text-zinc-300 dark:text-zinc-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shrink-0"
                title="Kursu sil"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Yeni Kurs Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-zinc-100 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-5">Yeni Kurs Oluştur</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Kurs Başlığı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: React ile Modern Web Geliştirme"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Açıklama</label>
                <textarea
                  rows={3}
                  placeholder="Kurs hakkında kısa bir açıklama..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Fiyat (₺)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Kapak Görseli</label>
                {form.thumbnailUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.thumbnailUrl} alt="Kapak" className="w-full h-28 object-cover" />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, thumbnailUrl: "" }))}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center gap-1.5 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${thumbnailUploading ? "border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-zinc-200 dark:border-zinc-700 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10"}` }>
                    {thumbnailUploading ? (
                      <><div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /><span className="text-xs text-indigo-500">Yükleniyor...</span></>
                    ) : (
                      <><span className="text-xl">🖼️</span><span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Görsel seç veya sürükle</span><span className="text-xs text-zinc-400">İsteğe bağlı</span></>
                    )}
                    <input type="file" accept="image/*" className="hidden" disabled={thumbnailUploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadThumbnail(f); e.target.value = ""; }} />
                  </label>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setError(""); }}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:border-red-300 hover:text-red-500 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? "Oluşturuluyor..." : "Oluştur ve Düzenle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
