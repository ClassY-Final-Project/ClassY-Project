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
  instructor?: { id: string; fullName: string | null; iban: string | null } | null;
}

function generateRef(courseId: string, userId: string) {
  return `CLASSY-${courseId.slice(0, 6).toUpperCase()}-${userId.slice(0, 4).toUpperCase()}`;
}

export default function PaymentPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [fetching, setFetching] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"info" | "confirm">("info");

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=/courses/${courseId}/payment`);
  }, [user, loading, router, courseId]);

  useEffect(() => {
    fetch(`/api/public/courses/${courseId}/curriculum`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCourse(d.course); })
      .finally(() => setFetching(false));
  }, [courseId]);

  // Zaten kayıtlıysa learn'e yönlendir
  useEffect(() => {
    if (!user || loading) return;
    const token = localStorage.getItem("classy_token");
    fetch(`/api/courses/${courseId}/enroll`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.enrolled) router.replace(`/courses/${courseId}/learn`); });
  }, [user, loading, courseId, router]);

  async function handleConfirm() {
    const token = localStorage.getItem("classy_token");
    setConfirming(true);
    setError("");
    const res = await fetch(`/api/courses/${courseId}/enroll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const json = await res.json();
    if (res.ok) {
      router.push(`/courses/${courseId}/learn`);
    } else {
      setError(json.error || "Kayıt başarısız.");
      setConfirming(false);
    }
  }

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!course) return null;

  const price = parseFloat(course.price);
  const isFree = price === 0;
  const ref = user ? generateRef(courseId, user.id) : "";
  // ClassY platform hesabı — öğrenci buraya öder, ClassY eğitmene aktarır
  const CLASSY_IBAN = "TR64 0001 2009 4520 0058 0000 01";
  const CLASSY_ALICI = "ClassY Eğitim Teknolojileri A.Ş.";

  if (isFree) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-500">Bu kurs ücretsiz, ödeme gerekmiyor.</p>
          <Link href={`/courses/${courseId}`} className="text-indigo-600 hover:underline text-sm">Kursa dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-lg mx-auto px-6 py-12">
        <Link href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors mb-8">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Kursa Dön
        </Link>

        <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Başlık */}
          <div className="bg-linear-to-br from-indigo-600 to-violet-600 px-6 py-5">
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-1">Ödeme</p>
            <h1 className="text-white font-bold text-xl">{course.title}</h1>
            <p className="text-indigo-200 text-sm mt-1">
              {course.instructor?.fullName && `Eğitmen: ${course.instructor.fullName}`}
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Tutar */}
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Kurs ücreti</span>
              <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                ₺{price.toLocaleString("tr-TR")}
              </span>
            </div>

            {step === "info" ? (
              <>
                {/* Ödeme talimatları */}
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Ödeme Talimatları
                  </p>

                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0">🏦</span>
                      <div className="space-y-1 flex-1">
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">ClassY Platform Hesabına Transfer</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">Alıcı: <span className="font-semibold">{CLASSY_ALICI}</span></p>
                        <div className="bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                          <span className="font-mono text-sm text-zinc-800 dark:text-zinc-200 tracking-wider">{CLASSY_IBAN}</span>
                          <button onClick={() => navigator.clipboard.writeText(CLASSY_IBAN)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">
                            Kopyala
                          </button>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                          💡 Ödemeniz alındıktan sonra eğitmene 3 iş günü içinde aktarılır.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 border-t border-amber-200 dark:border-amber-800/50 pt-3">
                      <span className="text-lg shrink-0">📝</span>
                      <div className="space-y-1 flex-1">
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Transfer Açıklaması</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Transferi yaparken aşağıdaki kodu açıklama kısmına yazın:
                        </p>
                        <div className="bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                          <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">{ref}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(ref)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">
                            Kopyala
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Transferi tamamladıktan sonra "Ödemeyi Yaptım" butonuna tıklayın. Kurs erişiminiz hemen aktif olacaktır.
                  </div>
                </div>

                <button
                  onClick={() => setStep("confirm")}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors">
                  Ödemeyi Yaptım →
                </button>
              </>
            ) : (
              <>
                {/* Onay adımı */}
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">Ödeme Onayı</p>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-400">
                    <strong>₺{price.toLocaleString("tr-TR")}</strong> tutarındaki transferi <strong>{ref}</strong> referans koduyla yaptığınızı onaylıyorsunuz.
                  </p>
                </div>

                {error && <p className="text-xs text-red-500 text-center">{error}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("info")}
                    className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-xl text-sm hover:border-zinc-300 transition-colors">
                    Geri
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-60 transition-colors">
                    {confirming ? "Aktif ediliyor..." : "Kursa Başla ✓"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6">
          Bu sistem göstermelik bir ödeme akışıdır. Gerçek para transferi doğrulanmamaktadır.
        </p>
      </main>
    </div>
  );
}
