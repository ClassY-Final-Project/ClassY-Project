"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  price: string;
  createdAt: string;
  instructor?: { id: string; fullName: string | null } | null;
}

interface LessonContent {
  id: string;
  contentType: string;
  title: string | null;
  duration: number | null;
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

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}d ${s}s` : `${m}d`;
}

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/public/courses/${courseId}/curriculum`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setCourse(d.course);
        setSections(d.sections || []);
        if (d.sections?.length > 0) {
          setOpenSections(new Set([d.sections[0].id]));
        }
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totalLessons = sections.reduce((a, s) => a + s.lessons.length, 0);
  const totalDuration = sections.reduce(
    (a, s) => a + s.lessons.reduce((b, l) => b + (l.duration || 0), 0),
    0
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (notFound || !course) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-zinc-500 dark:text-zinc-400 mb-4">Kurs bulunamadı.</p>
        <Link href="/courses" className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline">← Kurslara dön</Link>
      </div>
    </div>
  );

  const price = parseFloat(course.price);
  const isFree = price === 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Kurslara Dön
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sol: Kurs detayı */}
          <div className="lg:col-span-2 space-y-6">
            {/* Başlık */}
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{course.title}</h1>
              {course.description && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{course.description}</p>
              )}
            </div>

            {/* Eğitmen */}
            {course.instructor && (
              <Link
                href={`/instructors/${course.instructor.id}`}
                className="flex items-center gap-3 group w-fit"
              >
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shrink-0">
                  {(course.instructor.fullName || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Eğitmen</p>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {course.instructor.fullName || "Bilinmiyor"}
                  </p>
                </div>
              </Link>
            )}

            {/* İstatistikler */}
            <div className="flex flex-wrap gap-4 text-sm text-zinc-500 dark:text-zinc-400 border-t border-b border-zinc-100 dark:border-zinc-800 py-4">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {sections.length} bölüm
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {totalLessons} ders
              </div>
              {totalDuration > 0 && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDuration(totalDuration)} toplam
                </div>
              )}
            </div>

            {/* Müfredat */}
            {sections.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Müfredat</h2>
                <div className="space-y-2">
                  {sections.map((section) => (
                    <div key={section.id} className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{section.title}</span>
                          <span className="text-xs text-zinc-400">{section.lessons.length} ders</span>
                        </div>
                        <svg
                          className={`w-4 h-4 text-zinc-400 transition-transform ${openSections.has(section.id) ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {openSections.has(section.id) && (
                        <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                          {section.lessons.map((lesson) => (
                            <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900/30">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{lesson.title}</span>
                              {lesson.duration && (
                                <span className="text-xs text-zinc-400 shrink-0">{formatDuration(lesson.duration)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sağ: Satın alma kartı */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
              {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt={course.title} className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-44 bg-linear-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center">
                  <svg className="w-16 h-16 text-indigo-300 dark:text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              <div className="p-5 space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-zinc-900 dark:text-white">
                    {isFree ? "Ücretsiz" : `₺${price.toLocaleString("tr-TR")}`}
                  </span>
                </div>

                {user ? (
                  <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors">
                    {isFree ? "Kursa Katıl" : "Satın Al"}
                  </button>
                ) : (
                  <Link
                    href={`/login?redirect=/courses/${courseId}`}
                    className="block w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors text-center"
                  >
                    Giriş Yap ve Katıl
                  </Link>
                )}

                <div className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {totalLessons} video ders
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Ömür boyu erişim
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Mobil uyumlu
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
