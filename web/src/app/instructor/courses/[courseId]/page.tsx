"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/components/ConfirmModal";

interface LessonContent {
  id: string;
  contentType: string;
  title: string | null;
  assetUrl: string | null;
  textContent: string | null;
  duration: number | null;
  orderIndex: number;
}

interface Lesson {
  id: string;
  sectionId: string;
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

const CONTENT_TYPE_LABELS: Record<string, string> = {
  VIDEO_URL: "Video",
  UPLOADED_VIDEO: "Video",
  PDF: "PDF",
  TEXT: "Yazılı İçerik",
  ASSIGNMENT_TEXT: "Ödev",
};

const CONTENT_TYPE_ICONS: Record<string, string> = {
  VIDEO_URL: "🎬",
  UPLOADED_VIDEO: "🎬",
  PDF: "📄",
  TEXT: "📝",
  ASSIGNMENT_TEXT: "📋",
};

const FORM_TYPES = ["VIDEO_URL", "PDF", "TEXT", "ASSIGNMENT_TEXT"];

export default function CourseEditorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { token, loading, user } = useAuth();
  const { confirm } = useConfirm();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const [editingCourse, setEditingCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: "", description: "", price: "0", thumbnailUrl: "" });
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [newLessonTitles, setNewLessonTitles] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // İçerik paneli için state'ler
  const [selectedLesson, setSelectedLesson] = useState<{ sectionId: string; lesson: Lesson } | null>(null);
  const [loadingContents, setLoadingContents] = useState(false);
  const [contentForm, setContentForm] = useState({
    contentType: "VIDEO_URL",
    title: "",
    assetUrl: "",
    textContent: "",
    duration: "",
  });
  const [addingContent, setAddingContent] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [uploading, setUploading] = useState(false);

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

    const sectionsWithLessons: Section[] = await Promise.all(
      (sJson.sections || []).map(async (sec: Section) => {
        const lRes = await fetch(`/api/courses/${courseId}/sections/${sec.id}/lessons`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const lJson = lRes.ok ? await lRes.json() : { lessons: [] };
        return { ...sec, lessons: (lJson.lessons || []).map((l: Lesson) => ({ ...l, contents: l.contents || [] })) };
      })
    );
    setSections(sectionsWithLessons);
    if (sectionsWithLessons.length > 0) setOpenSections(new Set([sectionsWithLessons[0].id]));
    setFetching(false);
  }, [token, courseId, router]);

  useEffect(() => { if (token) loadCourse(); }, [token, loadCourse]);

  async function uploadFile(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
    const json = await res.json();
    if (res.ok) {
      const isVideo = file.type.startsWith("video/");
      setContentForm((f) => ({
        ...f,
        assetUrl: json.url,
        contentType: isVideo ? "UPLOADED_VIDEO" : f.contentType,
      }));
      showToast("Dosya yüklendi.");
    } else {
      showToast(json.error || "Yükleme başarısız.", "err");
    }
    setUploading(false);
  }

  async function openLessonPanel(sectionId: string, lesson: Lesson) {
    setSelectedLesson({ sectionId, lesson });
    setUploadMode("file");
    setContentForm({ contentType: "VIDEO_URL", title: "", assetUrl: "", textContent: "", duration: "" });

    if (lesson.contents.length === 0) {
      setLoadingContents(true);
      const res = await fetch(
        `/api/courses/${courseId}/sections/${sectionId}/lessons/${lesson.id}/contents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = res.ok ? await res.json() : { contents: [] };
      setSections((s) =>
        s.map((sec) =>
          sec.id === sectionId
            ? { ...sec, lessons: sec.lessons.map((l) => l.id === lesson.id ? { ...l, contents: json.contents || [] } : l) }
            : sec
        )
      );
      setSelectedLesson((prev) => prev ? { ...prev, lesson: { ...prev.lesson, contents: json.contents || [] } } : null);
      setLoadingContents(false);
    }
  }

  async function addContent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLesson) return;
    setAddingContent(true);

    const { sectionId, lesson } = selectedLesson;
    const body: Record<string, unknown> = {
      contentType: contentForm.contentType,
      orderIndex: lesson.contents.length,
    };
    if (contentForm.title.trim()) body.title = contentForm.title.trim();
    if (["VIDEO_URL", "UPLOADED_VIDEO", "PDF"].includes(contentForm.contentType) && contentForm.assetUrl.trim()) {
      body.assetUrl = contentForm.assetUrl.trim();
    }
    if (["TEXT", "ASSIGNMENT_TEXT"].includes(contentForm.contentType) && contentForm.textContent.trim()) {
      body.textContent = contentForm.textContent.trim();
    }
    if (["VIDEO_URL", "UPLOADED_VIDEO"].includes(contentForm.contentType) && contentForm.duration) {
      body.duration = parseInt(contentForm.duration) * 60;
    }

    const res = await fetch(
      `/api/courses/${courseId}/sections/${sectionId}/lessons/${lesson.id}/contents`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const json = await res.json();
    if (res.ok) {
      const newContent = json.content;
      setSections((s) =>
        s.map((sec) =>
          sec.id === sectionId
            ? { ...sec, lessons: sec.lessons.map((l) => l.id === lesson.id ? { ...l, contents: [...l.contents, newContent] } : l) }
            : sec
        )
      );
      setSelectedLesson((prev) =>
        prev ? { ...prev, lesson: { ...prev.lesson, contents: [...prev.lesson.contents, newContent] } } : null
      );
      setContentForm({ contentType: "VIDEO_URL", title: "", assetUrl: "", textContent: "", duration: "" });
      showToast("İçerik eklendi.");
    } else {
      showToast(json.error || "İçerik eklenemedi.", "err");
    }
    setAddingContent(false);
  }

  async function deleteContent(sectionId: string, lessonId: string, contentId: string) {
    const res = await fetch(
      `/api/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/contents/${contentId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      setSections((s) =>
        s.map((sec) =>
          sec.id === sectionId
            ? { ...sec, lessons: sec.lessons.map((l) => l.id === lessonId ? { ...l, contents: l.contents.filter((c) => c.id !== contentId) } : l) }
            : sec
        )
      );
      setSelectedLesson((prev) =>
        prev && prev.lesson.id === lessonId
          ? { ...prev, lesson: { ...prev.lesson, contents: prev.lesson.contents.filter((c) => c.id !== contentId) } }
          : prev
      );
      showToast("İçerik silindi.");
    } else {
      showToast("Silinemedi.", "err");
    }
  }

  async function saveCourse(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/courses/${courseId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: courseForm.title,
        description: courseForm.description || undefined,
        price: parseFloat(courseForm.price) || 0,
        thumbnailUrl: courseForm.thumbnailUrl || undefined,
      }),
    });
    const json = await res.json();
    if (res.ok) { setCourse(json.course); setEditingCourse(false); showToast("Kurs güncellendi."); }
    else showToast(json.error || "Güncellenemedi.", "err");
    setSaving(false);
  }

  async function togglePublish() {
    if (!course) return;
    setPublishing(true);
    const res = await fetch(`/api/courses/${courseId}/publish`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ publish: !course.isPublished }),
    });
    const json = await res.json();
    if (res.ok) {
      setCourse((c) => c ? { ...c, isPublished: !c.isPublished } : c);
      showToast(course.isPublished ? "Yayından kaldırıldı." : "Kurs yayınlandı!");
    } else {
      const msg = json.issues?.length
        ? `Eksikler: ${json.issues.join(", ")}`
        : json.error || "İşlem başarısız.";
      showToast(msg, "err");
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
    } else showToast(json.error || "Bölüm eklenemedi.", "err");
    setAddingSection(false);
  }

  async function deleteSection(sectionId: string) {
    const ok = await confirm({ title: "Bölümü Sil", message: "Bu bölümü ve içindeki tüm dersleri silmek istediğinizden emin misiniz?", confirmText: "Sil", danger: true });
    if (!ok) return;
    const res = await fetch(`/api/courses/${courseId}/sections/${sectionId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSections((s) => s.filter((sec) => sec.id !== sectionId));
      if (selectedLesson?.sectionId === sectionId) setSelectedLesson(null);
      showToast("Bölüm silindi.");
    } else showToast("Bölüm silinemedi.", "err");
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
    } else showToast(json.error || "Ders eklenemedi.", "err");
  }

  async function deleteLesson(sectionId: string, lessonId: string) {
    const ok = await confirm({ title: "Dersi Sil", message: "Bu dersi silmek istediğinizden emin misiniz?", confirmText: "Sil", danger: true });
    if (!ok) return;
    const res = await fetch(`/api/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSections((s) =>
        s.map((sec) =>
          sec.id === sectionId ? { ...sec, lessons: sec.lessons.filter((l) => l.id !== lessonId) } : sec
        )
      );
      if (selectedLesson?.lesson.id === lessonId) setSelectedLesson(null);
      showToast("Ders silindi.");
    } else showToast("Ders silinemedi.", "err");
  }

  if (loading || fetching) return (
    <div className="w-full flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!course) return null;

  return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {toast && (
        <div className={`fixed top-20 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === "ok" ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}>{toast.msg}</div>
      )}

      <main className={`mx-auto px-6 py-10 transition-all ${selectedLesson ? "max-w-6xl" : "max-w-4xl"}`}>
        <div className={`${selectedLesson ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : ""}`}>

          {/* Sol panel — editör */}
          <div className="space-y-6">
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
                <Link href={`/instructor/courses/${courseId}/students`}
                  className="px-3 py-2 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Öğrenciler
                </Link>
                {!course.isPublished && (
                  <button onClick={togglePublish} disabled={publishing}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {publishing ? "..." : "Yayınla"}
                  </button>
                )}
              </div>
            </div>

            {/* Kurs Bilgileri */}
            <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Kurs Bilgileri</h2>
                <button onClick={() => setEditingCourse(!editingCourse)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  {editingCourse ? "İptal" : "Düzenle"}
                </button>
              </div>
              {editingCourse ? (
                <form onSubmit={saveCourse} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Başlık</label>
                    <input type="text" required value={courseForm.title}
                      onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Açıklama</label>
                    <textarea rows={2} value={courseForm.description}
                      onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Fiyat (₺)</label>
                      <input type="number" min="0" step="0.01" value={courseForm.price}
                        onChange={(e) => setCourseForm((f) => ({ ...f, price: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Kapak URL</label>
                      <input type="text" placeholder="https://..." value={courseForm.thumbnailUrl}
                        onChange={(e) => setCourseForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setEditingCourse(false)}
                      className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-500 hover:text-red-500 hover:border-red-300 transition-colors">İptal</button>
                    <button type="submit" disabled={saving}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                      {saving ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex gap-6 text-sm">
                  <div><p className="text-xs text-zinc-400">Fiyat</p><p className="font-semibold text-zinc-800 dark:text-zinc-200">{parseFloat(course.price) === 0 ? "Ücretsiz" : `₺${parseFloat(course.price).toLocaleString("tr-TR")}`}</p></div>
                  <div><p className="text-xs text-zinc-400">Bölüm</p><p className="font-semibold text-zinc-800 dark:text-zinc-200">{sections.length}</p></div>
                  <div><p className="text-xs text-zinc-400">Ders</p><p className="font-semibold text-zinc-800 dark:text-zinc-200">{sections.reduce((a, s) => a + s.lessons.length, 0)}</p></div>
                  {course.description && <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-2 col-span-3">{course.description}</p>}
                </div>
              )}
            </div>

            {/* Müfredat */}
            <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Müfredat
                <span className="ml-2 text-xs font-normal text-zinc-400">— derslere tıklayarak içerik ekle</span>
              </h2>

              <div className="space-y-3 mb-4">
                {sections.length === 0 && <p className="text-sm text-zinc-400 text-center py-6">Henüz bölüm eklenmemiş.</p>}

                {sections.map((section) => (
                  <div key={section.id} className="border border-zinc-100 dark:border-zinc-700 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-800">
                      <button
                        onClick={() => setOpenSections((s) => { const n = new Set(s); n.has(section.id) ? n.delete(section.id) : n.add(section.id); return n; })}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform shrink-0 ${openSections.has(section.id) ? "rotate-90" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{section.title}</span>
                        <span className="text-xs text-zinc-400">{section.lessons.length} ders</span>
                      </button>
                      <button onClick={() => deleteSection(section.id)} className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {openSections.has(section.id) && (
                      <div className="px-4 py-2 space-y-1">
                        {section.lessons.map((lesson) => {
                          const isSelected = selectedLesson?.lesson.id === lesson.id;
                          return (
                            <div key={lesson.id}
                              className={`flex items-center gap-2 py-2 border-b border-zinc-50 dark:border-zinc-800 last:border-0 rounded-lg px-2 cursor-pointer transition-colors ${
                                isSelected ? "bg-indigo-50 dark:bg-indigo-950/30" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                              }`}
                              onClick={() => isSelected ? setSelectedLesson(null) : openLessonPanel(section.id, lesson)}
                            >
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isSelected ? "bg-indigo-500" : "bg-indigo-50 dark:bg-indigo-950/40"}`}>
                                <svg className={`w-3 h-3 ${isSelected ? "text-white" : "text-indigo-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                </svg>
                              </div>
                              <span className={`text-sm flex-1 ${isSelected ? "text-indigo-700 dark:text-indigo-400 font-medium" : "text-zinc-700 dark:text-zinc-300"}`}>
                                {lesson.title}
                              </span>
                              {lesson.contents.length > 0 && (
                                <span className="text-xs text-zinc-400 shrink-0">{lesson.contents.length} içerik</span>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteLesson(section.id, lesson.id); }}
                                className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors shrink-0"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}

                        <div className="flex gap-2 pt-2 pb-1">
                          <input type="text" placeholder="Yeni ders başlığı..."
                            value={newLessonTitles[section.id] || ""}
                            onChange={(e) => setNewLessonTitles((t) => ({ ...t, [section.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && addLesson(section.id)}
                            className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <button onClick={() => addLesson(section.id)} disabled={!newLessonTitles[section.id]?.trim()}
                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                            + Ders
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <input type="text" placeholder="Yeni bölüm başlığı..."
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSection()}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={addSection} disabled={!newSectionTitle.trim() || addingSection}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                  {addingSection ? "..." : "+ Bölüm"}
                </button>
              </div>
            </div>

            {course.isPublished && (
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-2xl px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">Kurs yayında</p>
                  <p className="text-xs text-green-600 dark:text-green-500">Öğrenciler bu kursu katalogda görebilir</p>
                </div>
                <Link href={`/courses/${courseId}`} target="_blank"
                  className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 hover:underline font-medium">
                  Görünümü Aç
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              </div>
            )}
          </div>

          {/* Sağ panel — içerik editörü */}
          {selectedLesson && (
            <div className="lg:sticky lg:top-24 h-fit">
              <div className="bg-white dark:bg-zinc-800/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl shadow-sm overflow-hidden">
                {/* Başlık */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-indigo-50 dark:bg-indigo-950/30">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-500 dark:text-indigo-400">İçerik Düzenle</p>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-52">{selectedLesson.lesson.title}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedLesson(null)} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* Mevcut içerikler */}
                  {loadingContents ? (
                    <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
                  ) : selectedLesson.lesson.contents.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Mevcut İçerikler</p>
                      {selectedLesson.lesson.contents.map((content) => (
                        <div key={content.id} className="flex items-start gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                          <span className="text-base shrink-0">{CONTENT_TYPE_ICONS[content.contentType] || "📎"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              {CONTENT_TYPE_LABELS[content.contentType]}
                            </p>
                            {content.title && <p className="text-xs text-zinc-500 truncate">{content.title}</p>}
                            {content.assetUrl && (
                              <a href={content.assetUrl} target="_blank" rel="noreferrer"
                                className="text-xs text-indigo-500 hover:underline truncate block">{content.assetUrl}</a>
                            )}
                            {content.textContent && (
                              <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">{content.textContent}</p>
                            )}
                          </div>
                          <button onClick={() => deleteContent(selectedLesson.sectionId, selectedLesson.lesson.id, content.id)}
                            className="p-1 text-zinc-300 hover:text-red-500 transition-colors shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 text-center py-2">Henüz içerik yok.</p>
                  )}

                  {/* Yeni içerik formu */}
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3">Yeni İçerik Ekle</p>
                    <form onSubmit={addContent} className="space-y-3">
                      {/* İçerik tipi */}
                      <div className="grid grid-cols-2 gap-2">
                        {FORM_TYPES.map((type) => (
                          <button key={type} type="button"
                            onClick={() => {
                              setContentForm((f) => ({ ...f, contentType: type, assetUrl: "", textContent: "" }));
                              setUploadMode("file");
                            }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                              contentForm.contentType === type || (type === "VIDEO_URL" && contentForm.contentType === "UPLOADED_VIDEO")
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400"
                                : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300"
                            }`}>
                            <span>{CONTENT_TYPE_ICONS[type]}</span>
                            {CONTENT_TYPE_LABELS[type]}
                          </button>
                        ))}
                      </div>

                      {/* Başlık */}
                      <div>
                        <input type="text" placeholder="İçerik başlığı (isteğe bağlı)"
                          value={contentForm.title}
                          onChange={(e) => setContentForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>

                      {/* Video / PDF: dosya yükle veya URL gir */}
                      {["VIDEO_URL", "UPLOADED_VIDEO", "PDF"].includes(contentForm.contentType) && (
                        <div className="space-y-2">
                          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                            <button type="button" onClick={() => { setUploadMode("file"); setContentForm((f) => ({ ...f, assetUrl: "" })); }}
                              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${uploadMode === "file" ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm" : "text-zinc-500"}`}>
                              📁 Dosya Yükle
                            </button>
                            <button type="button" onClick={() => { setUploadMode("url"); setContentForm((f) => ({ ...f, assetUrl: "", contentType: contentForm.contentType === "UPLOADED_VIDEO" ? "VIDEO_URL" : contentForm.contentType })); }}
                              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${uploadMode === "url" ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm" : "text-zinc-500"}`}>
                              🔗 URL Gir
                            </button>
                          </div>

                          {uploadMode === "file" ? (
                            <div className="space-y-1.5">
                              <label className={`flex flex-col items-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${uploading ? "border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-zinc-200 dark:border-zinc-700 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10"}`}>
                                {uploading ? (
                                  <>
                                    <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                                    <span className="text-xs text-indigo-500">Yükleniyor...</span>
                                  </>
                                ) : contentForm.assetUrl ? (
                                  <>
                                    <span className="text-xl">✅</span>
                                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Dosya yüklendi</span>
                                    <span className="text-xs text-zinc-400">Değiştirmek için tıkla</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-2xl">{contentForm.contentType === "PDF" ? "📄" : "🎬"}</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                      {contentForm.contentType === "PDF" ? "PDF seç veya sürükle" : "Video seç veya sürükle"}
                                    </span>
                                    <span className="text-xs text-zinc-400">Maks. 500 MB</span>
                                  </>
                                )}
                                <input type="file"
                                  accept={contentForm.contentType === "PDF" ? ".pdf" : "video/*"}
                                  className="hidden"
                                  disabled={uploading}
                                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
                              </label>
                            </div>
                          ) : (
                            <input type="url" required
                              placeholder={contentForm.contentType === "PDF" ? "PDF URL..." : "YouTube / Vimeo URL..."}
                              value={contentForm.assetUrl}
                              onChange={(e) => setContentForm((f) => ({ ...f, assetUrl: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          )}
                        </div>
                      )}

                      {/* Video süresi */}
                      {["VIDEO_URL", "UPLOADED_VIDEO"].includes(contentForm.contentType) && (
                        <div>
                          <input type="number" min="1" placeholder="Süre (dakika)"
                            value={contentForm.duration}
                            onChange={(e) => setContentForm((f) => ({ ...f, duration: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      )}

                      {/* Metin alanı (TEXT ve ASSIGNMENT_TEXT için) */}
                      {["TEXT", "ASSIGNMENT_TEXT"].includes(contentForm.contentType) && (
                        <div>
                          <textarea required rows={4}
                            placeholder={contentForm.contentType === "ASSIGNMENT_TEXT" ? "Ödev sorusu veya açıklaması..." : "Ders içeriği..."}
                            value={contentForm.textContent}
                            onChange={(e) => setContentForm((f) => ({ ...f, textContent: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                        </div>
                      )}

                      <button type="submit"
                        disabled={
                          addingContent || uploading ||
                          (["VIDEO_URL", "UPLOADED_VIDEO", "PDF"].includes(contentForm.contentType) && !contentForm.assetUrl.trim())
                        }
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                        {uploading ? "Dosya yükleniyor..." : addingContent ? "Ekleniyor..." : `${CONTENT_TYPE_ICONS[contentForm.contentType]} İçerik Ekle`}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
