"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  price: string;
  createdAt: string;
  instructor?: { id: string; fullName: string | null; avatarUrl: string | null } | null;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/public/courses")
      .then((r) => r.json())
      .then((d) => setCourses(d.courses || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.instructor?.fullName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Kurs Kataloğu</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Uzman eğitmenlerden video kurslarla kendinizi geliştirin
          </p>
        </div>

        {/* Arama */}
        <div className="relative mb-8">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="Kurs veya eğitmen ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-40 bg-zinc-100 dark:bg-zinc-700" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-zinc-100 dark:bg-zinc-700 rounded w-3/4" />
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-700 rounded w-full" />
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .513v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {search ? `"${search}" için kurs bulunamadı.` : "Henüz yayınlanmış kurs yok."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-400 mb-4">{filtered.length} kurs bulundu</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  const price = parseFloat(course.price);
  const isFree = price === 0;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
    >
      {/* Thumbnail */}
      <div className="h-40 bg-linear-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center overflow-hidden relative">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <svg className="w-12 h-12 text-indigo-300 dark:text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
        <div className="absolute top-2 right-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isFree ? "bg-green-500 text-white" : "bg-white/90 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200"}`}>
            {isFree ? "Ücretsiz" : `₺${price.toLocaleString("tr-TR")}`}
          </span>
        </div>
      </div>

      {/* İçerik */}
      <div className="p-4">
        <h3 className="font-semibold text-zinc-900 dark:text-white text-sm line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
            {course.description}
          </p>
        )}
        {course.instructor && (
          <div className="flex items-center gap-2">
            {course.instructor.avatarUrl ? (
              <img src={course.instructor.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                {(course.instructor.fullName || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs text-zinc-400 truncate">{course.instructor.fullName || "Eğitmen"}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
