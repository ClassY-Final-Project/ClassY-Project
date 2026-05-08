"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

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
  thumbnailUrl: string | null;
  price: string;
  instructor?: { id: string; fullName: string | null } | null;
}

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.replace("/", "");
      return `https://player.vimeo.com/video/${id}`;
    }
  } catch { /* ignore */ }
  return null;
}

export default function LearnPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=/courses/${courseId}/learn`);
  }, [user, loading, router, courseId]);

  // Enrollment kontrolü
  useEffect(() => {
    if (!user || loading) return;
    const token = localStorage.getItem("classy_token");
    fetch(`/api/courses/${courseId}/enroll`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (!d.enrolled) router.replace(`/courses/${courseId}`); });
  }, [user, loading, courseId, router]);

  // İlerleme yükle
  useEffect(() => {
    if (!user || loading) return;
    const token = localStorage.getItem("classy_token");
    fetch(`/api/courses/${courseId}/progress`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCompletedIds(new Set(d.completedLessonIds)); });
  }, [user, loading, courseId]);

  useEffect(() => {
    fetch(`/api/public/courses/${courseId}/curriculum`)
      .then((r) => {
        if (!r.ok) { router.replace("/courses"); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setCourse(d.course);
        setSections(d.sections || []);
        if (d.sections?.length > 0) {
          setOpenSections(new Set([d.sections[0].id]));
          const firstLesson = d.sections[0]?.lessons?.[0];
          if (firstLesson) setSelectedLesson(firstLesson);
        }
      })
      .finally(() => setFetching(false));
  }, [courseId, router]);

  async function markComplete(lessonId: string) {
    const token = localStorage.getItem("classy_token");
    const res = await fetch(`/api/courses/${courseId}/progress`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId }),
    });
    const d = await res.json();
    setCompletedIds((prev) => new Set([...prev, lessonId]));
    if (d.allCompleted) router.push(`/courses/${courseId}/certificate`);
  }

  const totalLessons = sections.reduce((a, s) => a + s.lessons.length, 0);
  const completedCount = completedIds.size;

  if (loading || fetching) return (
    <div className="w-full flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!course) return null;

  return (
    <div className="w-full flex-1 bg-zinc-950 flex flex-col">
      {/* Üst bar */}
      <header className="flex items-center gap-4 px-6 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <Link href={`/courses/${courseId}`}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Geri
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">{course.title}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 shrink-0">
          <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: totalLessons > 0 ? `${(completedCount / totalLessons) * 100}%` : "0%" }}
            />
          </div>
          <span>{completedCount}/{totalLessons}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sol sidebar — müfredat */}
        <aside className="w-72 shrink-0 bg-zinc-900 border-r border-zinc-800 overflow-y-auto hidden lg:block">
          <div className="p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Müfredat</p>
            <div className="space-y-1">
              {sections.map((section) => (
                <div key={section.id}>
                  <button
                    onClick={() => setOpenSections((s) => { const n = new Set(s); n.has(section.id) ? n.delete(section.id) : n.add(section.id); return n; })}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-zinc-800 transition-colors"
                  >
                    <svg className={`w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform ${openSections.has(section.id) ? "rotate-90" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-xs font-semibold text-zinc-300 flex-1 truncate">{section.title}</span>
                    <span className="text-xs text-zinc-500 shrink-0">{section.lessons.length}</span>
                  </button>

                  {openSections.has(section.id) && (
                    <div className="ml-2 space-y-0.5">
                      {section.lessons.map((lesson) => {
                        const isActive = selectedLesson?.id === lesson.id;
                        const isDone = completedIds.has(lesson.id);
                        return (
                          <button key={lesson.id}
                            onClick={() => setSelectedLesson(lesson)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                              isActive ? "bg-indigo-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                            }`}>
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                              isDone ? "bg-emerald-600" : isActive ? "bg-white/20" : "bg-zinc-700"
                            }`}>
                              {isDone ? (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                </svg>
                              )}
                            </div>
                            <span className="text-xs flex-1 truncate">{lesson.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Ana içerik */}
        <main className="flex-1 overflow-y-auto bg-zinc-950">
          {selectedLesson ? (
            <LessonView
              lesson={selectedLesson}
              sections={sections}
              onSelectLesson={setSelectedLesson}
              completedIds={completedIds}
              onMarkComplete={markComplete}
              courseId={courseId}
            />
          ) : (
            <div className="flex items-center justify-center h-full py-20">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                </div>
                <p className="text-zinc-400 text-sm">Sol menüden bir ders seç</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function LessonView({
  lesson,
  sections,
  onSelectLesson,
  completedIds,
  onMarkComplete,
  courseId,
}: {
  lesson: Lesson;
  sections: Section[];
  onSelectLesson: (l: Lesson) => void;
  completedIds: Set<string>;
  onMarkComplete: (lessonId: string) => Promise<void>;
  courseId: string;
}) {
  const allLessons = sections.flatMap((s) => s.lessons);
  const currentIdx = allLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;
  const isCompleted = completedIds.has(lesson.id);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">{lesson.title}</h2>
        {!isCompleted ? (
          <button
            onClick={() => onMarkComplete(lesson.id)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Tamamlandı
          </button>
        ) : (
          <span className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-emerald-900/40 text-emerald-400 rounded-xl text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Tamamlandı
          </span>
        )}
      </div>

      {lesson.contents.length === 0 ? (
        <div className="flex items-center justify-center py-20 bg-zinc-900 rounded-2xl">
          <p className="text-zinc-500 text-sm">Bu ders için henüz içerik eklenmemiş.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {lesson.contents.map((content) => (
            <ContentBlock key={content.id} content={content} />
          ))}
        </div>
      )}

      {/* Önceki / Sonraki */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        {prevLesson ? (
          <button onClick={() => onSelectLesson(prevLesson)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm hover:bg-zinc-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="truncate max-w-36">{prevLesson.title}</span>
          </button>
        ) : <div />}

        {nextLesson ? (
          <button onClick={() => onSelectLesson(nextLesson)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 transition-colors">
            <span className="truncate max-w-36">{nextLesson.title}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <Link href={`/courses/${courseId}/certificate`}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Sertifikamı Al
          </Link>
        )}
      </div>
    </div>
  );
}

function ContentBlock({ content }: { content: LessonContent }) {
  if ((content.contentType === "VIDEO_URL" || content.contentType === "UPLOADED_VIDEO") && content.assetUrl) {
    const embedUrl = content.contentType === "VIDEO_URL" ? getYoutubeEmbedUrl(content.assetUrl) : null;
    return (
      <div className="space-y-2">
        {content.title && <p className="text-sm font-medium text-zinc-300">{content.title}</p>}
        {embedUrl ? (
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden bg-black">
            <video
              src={content.assetUrl}
              controls
              className="w-full max-h-[560px]"
              preload="metadata"
            />
          </div>
        )}
      </div>
    );
  }

  if (content.contentType === "PDF" && content.assetUrl) {
    return (
      <div className="space-y-2">
        {content.title && <p className="text-sm font-medium text-zinc-300">{content.title}</p>}
        <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
          <iframe src={content.assetUrl} className="w-full h-[600px]" />
          <div className="px-4 py-2 border-t border-zinc-800">
            <a href={content.assetUrl} target="_blank" rel="noreferrer"
              className="text-xs text-indigo-400 hover:underline">Yeni sekmede aç →</a>
          </div>
        </div>
      </div>
    );
  }

  if (content.contentType === "TEXT" && content.textContent) {
    return (
      <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
        {content.title && <p className="text-sm font-semibold text-zinc-200 mb-3">{content.title}</p>}
        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{content.textContent}</p>
      </div>
    );
  }

  if (content.contentType === "ASSIGNMENT_TEXT" && content.textContent) {
    return (
      <div className="bg-amber-950/30 rounded-xl p-5 border border-amber-800/50">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">📋</span>
          <p className="text-sm font-semibold text-amber-300">{content.title || "Ödev"}</p>
        </div>
        <p className="text-sm text-amber-100/80 leading-relaxed whitespace-pre-wrap">{content.textContent}</p>
      </div>
    );
  }

  return null;
}
