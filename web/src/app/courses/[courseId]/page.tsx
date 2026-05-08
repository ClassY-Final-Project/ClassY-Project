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
  instructor?: { id: string; fullName: string | null; avatarUrl: string | null } | null;
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
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [completedLessons, setCompletedLessons] = useState(0);
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string | null; studentName: string; createdAt: string }[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

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
        if (d.sections?.length > 0) setOpenSections(new Set([d.sections[0].id]));
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("classy_token");
    fetch(`/api/courses/${courseId}/enroll`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setEnrolled(d.enrolled); });
    fetch(`/api/courses/${courseId}/progress`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCompletedLessons(d.completedLessonIds?.length ?? 0); });
  }, [user, courseId]);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/reviews`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setReviews(d.reviews); setAvgRating(d.averageRating); } });
  }, [courseId]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("classy_token");
    setSubmittingReview(true);
    const res = await fetch(`/api/courses/${courseId}/reviews`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(reviewForm),
    });
    if (res.ok) {
      const d = await res.json();
      setReviews((prev) => [{ ...d.review, studentName: user?.fullName || user?.email || "Sen" }, ...prev.filter((r) => r.id !== d.review.id)]);
    }
    setSubmittingReview(false);
  }

  async function handleEnroll() {
    const token = localStorage.getItem("classy_token");
    setEnrolling(true);
    setEnrollError("");
    const res = await fetch(`/api/courses/${courseId}/enroll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const json = await res.json();
    if (res.ok || res.status === 200) {
      setEnrolled(true);
      router.push(`/courses/${courseId}/learn`);
    } else {
      setEnrollError(json.error || "Kayıt başarısız.");
    }
    setEnrolling(false);
  }

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
    <div className="w-full flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (notFound || !course) return (
    <div className="w-full flex-1 flex items-center justify-center">
      <div className="text-center">
        <p className="text-zinc-500 dark:text-zinc-400 mb-4">Kurs bulunamadı.</p>
        <Link href="/courses" className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline">← Kurslara dön</Link>
      </div>
    </div>
  );

  const price = parseFloat(course.price);
  const isFree = price === 0;

  return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
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
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                  {course.instructor.avatarUrl ? (
                    <img src={course.instructor.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold">
                      {(course.instructor.fullName || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
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

                {enrollError && (
                  <p className="text-xs text-red-500 text-center">{enrollError}</p>
                )}

                {user ? (
                  enrolled ? (
                    <>
                      {totalLessons > 0 && (
                        <div className="mb-1">
                          <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                            <span>{completedLessons}/{totalLessons} ders tamamlandı</span>
                            <span className="font-semibold text-indigo-500">
                              {Math.round((completedLessons / totalLessons) * 100)}%
                            </span>
                          </div>
                          <div className="h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${(completedLessons / totalLessons) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <Link
                        href={`/courses/${courseId}/learn`}
                        className="block w-full py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors text-center"
                      >
                        {completedLessons === 0 ? "▶ Kursa Başla" : completedLessons === totalLessons ? "🏆 Kursu Tamamladın" : "▶ Kursa Devam Et"}
                      </Link>
                    </>
                  ) : isFree ? (
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                    >
                      {enrolling ? "Kaydediliyor..." : "Kursa Katıl — Ücretsiz"}
                    </button>
                  ) : (
                    <Link
                      href={`/courses/${courseId}/payment`}
                      className="block w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors text-center"
                    >
                      Satın Al — ₺{price.toLocaleString("tr-TR")}
                    </Link>
                  )
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

        {/* Yorumlar */}
        <div className="mt-10 space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Değerlendirmeler</h2>
            {avgRating > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-yellow-400 text-sm">{"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}</span>
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-zinc-400">({reviews.length} yorum)</span>
              </div>
            )}
          </div>

          {/* Yorum formu — sadece kayıtlı öğrenciye */}
          {enrolled && (
            <form onSubmit={submitReview} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Yorumunuzu yazın</p>
              <div className="flex gap-1">
                {[1,2,3,4,5].map((s) => (
                  <button key={s} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: s }))}
                    className={`text-2xl transition-transform hover:scale-110 ${s <= reviewForm.rating ? "text-yellow-400" : "text-zinc-300 dark:text-zinc-600"}`}>
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder="Bu kurs hakkında ne düşünüyorsunuz?"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-400 resize-none"
              />
              <button type="submit" disabled={submittingReview}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {submittingReview ? "Gönderiliyor..." : "Yorumu Gönder"}
              </button>
            </form>
          )}

          {/* Yorumlar listesi */}
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                        {r.studentName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{r.studentName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-yellow-400 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                      <span className="text-xs text-zinc-400">{new Date(r.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 italic">Henüz yorum yok. İlk yorumu sen yaz!</p>
          )}
        </div>
      </main>
    </div>
  );
}
