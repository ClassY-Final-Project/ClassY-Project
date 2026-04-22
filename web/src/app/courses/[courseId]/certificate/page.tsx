"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function CertificatePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [course, setCourse] = useState<{ title: string; instructor?: { fullName: string | null } | null } | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    fetch(`/api/public/courses/${courseId}/curriculum`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCourse(d.course); })
      .finally(() => setFetching(false));
  }, [courseId]);

  const date = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        {/* Sertifika kartı */}
        <div
          id="certificate"
          className="bg-white border-4 border-indigo-600 rounded-3xl p-10 text-center shadow-xl relative overflow-hidden"
        >
          {/* Dekoratif köşeler */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-indigo-300 rounded-tl-xl" />
          <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-indigo-300 rounded-tr-xl" />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-indigo-300 rounded-bl-xl" />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-indigo-300 rounded-br-xl" />

          <div className="space-y-6">
            {/* Logo & başlık */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">C</div>
              <span className="text-2xl font-bold text-indigo-600">ClassY</span>
            </div>

            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Başarı Sertifikası</p>
              <h1 className="text-3xl font-extrabold text-zinc-900">Tebrikler!</h1>
            </div>

            <div className="space-y-1">
              <p className="text-zinc-500 text-sm">Bu sertifika,</p>
              <p className="text-2xl font-bold text-indigo-600">{user?.fullName || user?.email}</p>
              <p className="text-zinc-500 text-sm">adlı kişinin</p>
            </div>

            <div className="bg-indigo-50 rounded-2xl px-6 py-4">
              <p className="text-xl font-bold text-zinc-900">{course?.title}</p>
              {course?.instructor?.fullName && (
                <p className="text-sm text-zinc-500 mt-1">Eğitmen: {course.instructor.fullName}</p>
              )}
            </div>

            <p className="text-zinc-500 text-sm">kursunu başarıyla tamamladığını belgeler.</p>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
              <div className="text-left">
                <p className="text-xs text-zinc-400">Tamamlanma Tarihi</p>
                <p className="text-sm font-semibold text-zinc-700">{date}</p>
              </div>
              <div className="text-right">
                <div className="w-16 h-0.5 bg-zinc-300 mb-1" />
                <p className="text-xs text-zinc-400">ClassY Platform</p>
              </div>
            </div>
          </div>
        </div>

        {/* Aksiyonlar */}
        <div className="flex gap-3 mt-6 justify-center">
          <button
            onClick={() => window.print()}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            🖨️ Yazdır / PDF Kaydet
          </button>
          <Link
            href={`/courses/${courseId}/learn`}
            className="px-6 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-xl text-sm hover:border-zinc-300 transition-colors"
          >
            ← Kursa Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
