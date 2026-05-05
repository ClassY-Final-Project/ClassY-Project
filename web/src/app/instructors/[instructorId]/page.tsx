"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/Skeleton";

interface InstructorDetail {
  id: string;
  fullName: string | null;
  email: string;
  bio: string | null;
  createdAt: string;
  isSubscribed: boolean;
  subscriptionPaid: boolean;
  _count: { subscribers: number; liveRoomsHosted: number };
}

export default function InstructorProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const instructorId = params.instructorId as string;
  const { showToast } = useToast();

  const [instructor, setInstructor] = useState<InstructorDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !instructorId) return;
    loadInstructor();
  }, [user, instructorId]);

  async function loadInstructor() {
    setFetching(true);
    const token = localStorage.getItem("classy_token");
    const res = await fetch(`/api/instructors?id=${instructorId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (res.ok) {
      const found = (json.instructors || []).find((i: InstructorDetail) => i.id === instructorId);
      setInstructor(found || null);
    }
    setFetching(false);
  }

  async function handleSubscribe() {
    if (!instructor) return;
    setSubscribing(true);
    const token = localStorage.getItem("classy_token");
    const res = await fetch(`/api/instructors/${instructor.id}/subscribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ paid: true }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast("Abonelik başarılı!", "success");
      setShowPayment(false);
      await loadInstructor();
    } else {
      showToast(json.error || "Abonelik başarısız.", "error");
    }
    setSubscribing(false);
  }

  async function handleUnsubscribe() {
    if (!instructor || !confirm("Aboneliği iptal etmek istediğinizden emin misiniz?")) return;
    const token = localStorage.getItem("classy_token");
    await fetch(`/api/instructors/${instructor.id}/subscribe`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    showToast("Abonelik iptal edildi.", "info");
    await loadInstructor();
  }

  if (loading || fetching) return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 px-6 py-10">
      <div className="max-w-2xl mx-auto space-y-5">
        <Skeleton className="h-5 w-24" />
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 flex gap-5 border border-zinc-100 dark:border-zinc-800">
          <Skeleton className="w-20 h-20 shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );

  if (!instructor) return (
    <div className="w-full flex-1 flex items-center justify-center">
      <div className="text-center">
        <p className="text-zinc-500 mb-4">Eğitmen bulunamadı.</p>
        <Link href="/instructors" className="text-indigo-600 hover:underline text-sm">← Eğitmenlere dön</Link>
      </div>
    </div>
  );

  const initials = (instructor.fullName || instructor.email).split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const isOwnProfile = user?.id === instructor.id;

  return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-5">
        <Link href="/instructors" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Eğitmenlere Dön
        </Link>

        {/* Profil Kartı */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-3xl shrink-0 shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {instructor.fullName || instructor.email}
                  </h1>
                  <p className="text-sm text-zinc-400 mt-0.5">{instructor.email}</p>
                </div>
                {instructor.isSubscribed && (
                  <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium shrink-0">
                    ✓ Abone
                  </span>
                )}
              </div>

              {/* İstatistikler */}
              <div className="flex gap-5 mt-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{instructor._count.subscribers}</p>
                  <p className="text-xs text-zinc-400">abone</p>
                </div>
                <div className="w-px bg-zinc-100 dark:bg-zinc-800" />
                <div className="text-center">
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{instructor._count.liveRoomsHosted}</p>
                  <p className="text-xs text-zinc-400">canlı ders</p>
                </div>
                <div className="w-px bg-zinc-100 dark:bg-zinc-800" />
                <div className="text-center">
                  <p className="text-xs text-zinc-400 mt-1">Üye</p>
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {new Date(instructor.createdAt).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hakkında */}
          {instructor.bio && (
            <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Hakkında</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{instructor.bio}</p>
            </div>
          )}

          {/* Aksiyon */}
          {!isOwnProfile && (
            <div className="mt-5 flex gap-3">
              {instructor.isSubscribed ? (
                <>
                  <Link href="/live"
                    className="flex-1 text-center py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                    Canlı Derslere Git
                  </Link>
                  <button onClick={handleUnsubscribe}
                    className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-500 rounded-xl text-sm hover:border-red-300 hover:text-red-500 transition-colors">
                    İptal
                  </button>
                </>
              ) : (
                <button onClick={() => setShowPayment(true)}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                  Abone Ol — ₺99/ay
                </button>
              )}
            </div>
          )}
        </div>

        {/* Boş durum */}
        {!instructor.bio && instructor._count.liveRoomsHosted === 0 && (
          <div className="text-center py-10 text-zinc-400 text-sm">
            Bu eğitmen henüz içerik eklememiş.
          </div>
        )}
      </main>

      {/* Ödeme Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-zinc-100 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Abonelik</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{instructor.fullName || instructor.email}</span> eğitmenine abone oluyorsunuz
            </p>
            <div className="space-y-3 mb-5">
              {[
                { label: "Kart Numarası", placeholder: "1234 5678 9012 3456", maxLength: 19 },
                { label: "Kart Sahibi", placeholder: "Ad Soyad" },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{f.label}</label>
                  <input type="text" placeholder={f.placeholder} maxLength={f.maxLength}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
              <div className="flex gap-3">
                {[{ label: "Son Kullanma", placeholder: "AA/YY" }, { label: "CVV", placeholder: "123", maxLength: 3 }].map(f => (
                  <div key={f.label} className="flex-1">
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{f.label}</label>
                    <input type="text" placeholder={f.placeholder} maxLength={f.maxLength}
                      className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Aylık abonelik</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-400">₺99.00</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPayment(false)}
                className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:border-red-300 hover:text-red-500 transition-colors">
                İptal
              </button>
              <button onClick={handleSubscribe} disabled={subscribing}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {subscribing ? "İşleniyor..." : "Ödemeyi Tamamla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
