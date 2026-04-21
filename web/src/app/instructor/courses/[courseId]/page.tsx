"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface LessonContent {
  id: string;
  contentType: string;
  title: string | null;
  assetUrl: string | null;
  duration: number | null;
  orderIndex: number;
}

interface Lesson {
  id: string;
  title: string;
  duration: number | null;
  orderIndex: number;
  contents: LessonContent[];
}

interface Section {
  id: string;
  title: string;
  orderIndex: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: string;
  thumbnailUrl: string | null;
  isPublished: boolean;
}

export default function CourseEditorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { token, loading, user } = useAuth();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Edit states
  const [editingCourse, setEditingCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: "", description: "", price: "0", thumbnailUrl: "" });
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [newLessonTitles, setNewLessonTitles] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user?.role === "STUDENT") router.replace("/dashboard");
  }, [user, loading, router]);

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadCourse = useCallback(async () => {
    if (!token) return;
    setFetching(true);
    const [cRes, sRes] = await Promise.all([
      fetch(`/api/courses/${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/courses/${courseId}/sections`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (cRes.status === 404) { router.replace("/instructor/courses"); return; }
    const cJson = await cRes.json();
    const sJson = sRes.ok ? await sRes.json() : { sections: [] };

    const c = cJson.course;
    setCourse(c);
    setCourseForm({ title: c.title, description: c.description || "", price: c.price, thumbnailUrl: c.thumbnailUrl || "" });

    // Fetch lessons per section
    const sectionsWithLessons: Section[] = await Promise.all(
      (sJson.sections || []).map(async (sec: Section) => {
        const lRes = await fetch(`/api/courses/${courseId}/sections/${sec.id}/lessons`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const lJson = lRes.ok ? await lRes.json() : { lessons: [] };
        return { ...sec, lessons: lJson.lessons || [] };
      })
    );
    setSections(sectionsWithLessons);
    if (sectionsWithLessons.length > 0) {
      setOpenSections(new Set([sectionsWithLessons[0].id]));
    }
    setFetching(false);
  }, [token, courseId, router]);

  useEffect(() => { if (token) loadCourse(); }, [token, loadCourse]);

  async function saveCourse(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/courses/${courseId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: courseForm.title,
        description: courseForm.description || undefined,
        price: parseFloat(courseForm.price) || 0,
        thumbnailUrl: courseForm.thumbnailUrl || undefined,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setCourse(json.course);
      setEditingCourse(false);
      showToast("Kurs güncellendi.");
    } else {
      showToast(json.error || "Güncellenemedi.", "err");
    }
    setSaving(false);
  }

  async function togglePublish() {
    if (!course) return;
    setPublishing(true);
    const endpoint = course.isPublished
      ? `/api/courses/${courseId}/unpublish`
      : `/api/courses/${courseId}/publish`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (res.ok) {
      setCourse((c) => c ? { ...c, isPublished: !c.isPublished } : c);
      showToast(course.isPublished ? "Yayından kaldırıldı." : "Kurs yayınlandı!");
    } else {
      showToast(json.error || "İşlem başarısız.", "err");
    }
    setPublishing(false);
  }

  async function addSection() {
    if (!newSectionTitle.trim()) return;
    setAddingSection(true);
    const res = await fetch(`/api/courses/${courseId}/sections`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title: newSectionTitle.trim(), orderIndex: sections.length }),
    });
    const json = await res.json();
    if (res.ok) {
      const newSec = { ...json.section, lessons: [] };
      setSections((s) => [...s, newSec]);
      setOpenSections((s) => new Set([...s, newSec.id]));
      setNewSectionTitle("");
      showToast("Bölüm eklendi.");
    } else {
      showToast(json.error || "Bölüm eklenemedi.", "err");
    }
    setAddingSection(false);
  }

  async function deleteSection(sectionId: string) {
    if (!confirm("Bu bölümü ve içindeki tüm dersleri silmek istediğinizden emin misiniz?")) return;
    const res = await fetch(`/api/courses/${courseId}/sections/${sectionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSections((s) => s.filter((sec) => sec.id !== sectionId));
      showToast("Bölüm silindi.");
    } else {
      showToast("Bölüm silinemedi.", "err");
    }
  }

  async function addLesson(sectionId: string) {
    const title = (newLessonTitles[sectionId] || "").trim();
    if (!title) return;
    const section = sections.find((s) => s.id === sectionId);
    const res = await fetch(`/api/courses/${courseId}/sections/${sectionId}/lessons`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title, orderIndex: section?.lessons.length ?? 0 }),
    });
    const json = await res.json();
    if (res.ok) {
      setSections((s) =>
        s.map((sec) =>
          sec.id === sectionId
            ? { ...sec, lessons: [...sec.lessons, { ...json.lesson, contents: [] }] }
            : sec
        )
      );
      setNewLessonTitles((t) => ({ ...t, [sectionId]: "" }));
      showToast("Ders eklendi.");
    } else {
      showToast(json.error || "Ders eklenemedi.", "err");
    }
  }

  async function deleteLesson(sectionId: string, lessonId: string) {
    if (!confirm("Bu dersi silmek istediğinizden emin misiniz?")) return;
    const res = await fetch(`/api/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSections((s) =>
        s.map((sec) =>
          sec.id === sectionId
            ? { ...sec, lessons: sec.lessons.filter((l) => l.id !== lessonId) }
            : sec
        )
      );
      showToast("Ders silindi.");
    } else {
      showToast("Ders silinemedi.", "err");
    }
  }

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!course) return null;

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === "ok"
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        {/* Üst bar */}
        <div className="flex items-center gap-3">
          <Link href="/instructor/courses" className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-indigo-300 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white truncate">{course.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              course.isPublished
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
            }`}>
              {course.isPublished ? "Yayında" : "Taslak"}
            </span>
            <button
              onClick={togglePublish}
              disabled={publishing}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                course.isPublished
                  ? "border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-red-300 hover:text-red-600"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {publishing ? "..." : course.isPublished ? "Yayından Kaldır" : "Yayınla"}
            </button>
          </div>
        </div>

        {/* Kurs Bilgileri */}
        <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Kurs Bilgileri</h2>
            <button
              onClick={() => setEditingCourse(!editingCourse)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {editingCourse ? "İptal" : "Düzenle"}
            </button>
          </div>

          {editingCourse ? (
            <form onSubmit={saveCourse} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Başlık</label>
                <input
                  type="text"
                  required
                  value={courseForm.title}
                  onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Açıklama</label>
                <textarea
                  rows={2}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Fiyat (₺)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Kapak URL</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={courseForm.thumbnailUrl}
                    onChange={(e) => setCourseForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditingCourse(false)}
                  className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-500 hover:text-red-500 hover:border-red-300 transition-colors">
                  İptal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-zinc-400">Fiyat</p>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {parseFloat(course.price) === 0 ? "Ücretsiz" : `₺${parseFloat(course.price).toLocaleString("tr-TR")}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Bölüm</p>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">{sections.length}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Ders</p>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {sections.reduce((a, s) => a + s.lessons.length, 0)}
                  </p>
                </div>
              </div>
              {course.description && (
                <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-2">{course.description}</p>
              )}
            </div>
          )}
        </div>

        {/* Müfredat */}
        <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Müfredat</h2>

          {/* Bölümler */}
          <div className="space-y-3 mb-4">
            {sections.length === 0 && (
              <p className="text-sm text-zinc-400 text-center py-6">Henüz bölüm eklenmemiş.</p>
            )}

            {sections.map((section) => (
              <div key={section.id} className="border border-zinc-100 dark:border-zinc-700 rounded-xl overflow-hidden">
                {/* Bölüm başlığı */}
                <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-800">
                  <button
                    onClick={() => setOpenSections((s) => {
                      const n = new Set(s);
                      n.has(section.id) ? n.delete(section.id) : n.add(section.id);
                      return n;
                    })}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-zinc-400 transition-transform shrink-0 ${openSections.has(section.id) ? "rotate-90" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{section.title}</span>
                    <span className="text-xs text-zinc-400">{section.lessons.length} ders</span>
                  </button>
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Dersler */}
                {openSections.has(section.id) && (
                  <div className="px-4 py-2 space-y-1">
                    {section.lessons.map((lesson) => (
                      <div key={lesson.id} className="flex items-center gap-2 py-2 border-b border-zinc-50 dark:border-zinc-800 last:border-0">
                        <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                        </div>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{lesson.title}</span>
                        <button
                          onClick={() => deleteLesson(section.id, lesson.id)}
                          className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {/* Ders ekle */}
                    <div className="flex gap-2 pt-2 pb-1">
                      <input
                        type="text"
                        placeholder="Yeni ders başlığı..."
                        value={newLessonTitles[section.id] || ""}
                        onChange={(e) => setNewLessonTitles((t) => ({ ...t, [section.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addLesson(section.id)}
                        className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => addLesson(section.id)}
                        disabled={!newLessonTitles[section.id]?.trim()}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                      >
                        + Ders
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bölüm ekle */}
          <div className="flex gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <input
              type="text"
              placeholder="Yeni bölüm başlığı..."
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSection()}
              className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addSection}
              disabled={!newSectionTitle.trim() || addingSection}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {addingSection ? "..." : "+ Bölüm"}
            </button>
          </div>
        </div>

        {/* Public görünüm linki */}
        {course.isPublished && (
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-2xl px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">Kurs yayında</p>
              <p className="text-xs text-green-600 dark:text-green-500">Öğrenciler bu kursu katalogda görebilir</p>
            </div>
            <Link
              href={`/courses/${courseId}`}
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 hover:underline font-medium"
            >
              Görünümü Aç
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
