"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/components/ConfirmModal";

interface Instructor {
  id: string;
  fullName: string | null;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  isSubscribed: boolean;
  subscriptionPaid: boolean;
  _count: { subscribers: number; liveRoomsHosted: number };
}

interface Subscription {
  id: string;
  subscribedAt: string;
  isPaid: boolean;
  instructor: Instructor;
}

type Tab = "all" | "subscribed";

export default function InstructorsPageWrapper() {
  return (
    <Suspense>
      <InstructorsPage />
    </Suspense>
  );
}

function InstructorsPage() {
  const { user, loading } = useAuth();
  const { confirm } = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>("all");
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [paymentTarget, setPaymentTarget] = useState<Instructor | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const loadAll = useCallback(async () => {
    setFetching(true);
    const token = localStorage.getItem("classy_token");
    const [instRes, subRes] = await Promise.all([
      fetch("/api/instructors", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/instructors/subscriptions", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const [instJson, subJson] = await Promise.all([instRes.json(), subRes.json()]);
    if (instRes.ok) setInstructors(instJson.instructors || []);
    if (subRes.ok) setSubscriptions(subJson.subscriptions || []);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const subscribeId = searchParams.get("subscribe");
    const t = setTimeout(() => {
      loadAll();
      if (subscribeId) setTab("all");
    }, 0);
    return () => clearTimeout(t);
  }, [user, loadAll, searchParams]);

  function openPayment(instructor: Instructor) {
    setPaymentTarget(instructor);
  }

  async function handleSubscribeAfterPayment() {
    if (!paymentTarget) return;
    setSubscribing(paymentTarget.id);
    const token = localStorage.getItem("classy_token");
    const res = await fetch(`/api/instructors/${paymentTarget.id}/subscribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ paid: true }),
    });
    const json = await res.json();
    if (res.ok) {
      setPaymentTarget(null);
      await loadAll();
    } else {
      setError(json.error || "Abonelik başarısız.");
    }
    setSubscribing(null);
  }

  async function handleUnsubscribe(instructorId: string) {
    const ok = await confirm({ title: "Aboneliği İptal Et", message: "Aboneliği iptal etmek istediğinizden emin misiniz?", confirmText: "İptal Et", danger: true });
    if (!ok) return;
    const token = localStorage.getItem("classy_token");
    await fetch(`/api/instructors/${instructorId}/subscribe`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadAll();
  }

  if (loading || fetching) return (
    <div className="w-full flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  const displayList = tab === "subscribed"
    ? subscriptions.map(s => ({ ...s.instructor, isSubscribed: true, subscriptionPaid: s.isPaid }))
    : instructors;

  return (
    <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Eğitmenler</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Eğitmenlere abone olarak canlı derslerine katılabilirsiniz
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">{error}</div>
        )}

        {/* Sekmeler */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-1 mb-6 w-fit">
          {([["all", "Tüm Eğitmenler"], ["subscribed", "Aboneliklerim"]] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? "bg-white dark:bg-zinc-700 text-indigo-700 dark:text-indigo-400 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
              {label}
              {id === "subscribed" && subscriptions.length > 0 && (
                <span className="ml-1.5 text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">{subscriptions.length}</span>
              )}
            </button>
          ))}
        </div>

        {displayList.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">👨‍🏫</div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {tab === "subscribed" ? "Henüz abone olduğun eğitmen yok." : "Eğitmen bulunamadı."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayList.map(inst => (
              <div key={inst.id} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                {/* Avatar + İsim */}
                <div className="flex items-center gap-3 mb-3">
                  <Link href={`/instructors/${inst.id}`} className="shrink-0 hover:opacity-90 transition-opacity">
                    {inst.avatarUrl ? (
                      <img src={inst.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg">
                        {(inst.fullName || inst.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/instructors/${inst.id}`} className="font-semibold text-zinc-800 dark:text-zinc-200 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block">{inst.fullName || inst.email}</Link>
                    <p className="text-xs text-zinc-400 truncate">{inst.email}</p>
                  </div>
                  {inst.isSubscribed && (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">✓ Abone</span>
                  )}
                </div>

                {inst.bio && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 line-clamp-2">{inst.bio}</p>
                )}

                {/* İstatistikler */}
                <div className="flex gap-4 text-xs text-zinc-400 mb-4">
                  <span>{inst._count.subscribers} abone</span>
                  <span>{inst._count.liveRoomsHosted} ders</span>
                </div>

                {/* Butonlar */}
                {user?.id !== inst.id && (
                  <div className="flex gap-2">
                    {inst.isSubscribed ? (
                      <button onClick={() => handleUnsubscribe(inst.id)}
                        className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-lg text-xs font-medium hover:border-red-300 hover:text-red-500 transition-colors">
                        Aboneliği İptal Et
                      </button>
                    ) : (
                      <button onClick={() => openPayment(inst)}
                        className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                        Abone Ol — ₺99/ay
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Ödeme Modal */}
      {paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-zinc-100 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Abonelik</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{paymentTarget.fullName || paymentTarget.email}</span> eğitmenine abone oluyorsunuz
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Kart Numarası</label>
                <input type="text" placeholder="1234 5678 9012 3456" maxLength={19}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Son Kullanma</label>
                  <input type="text" placeholder="AA/YY"
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">CVV</label>
                  <input type="text" placeholder="123" maxLength={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Kart Sahibi</label>
                <input type="text" placeholder="Ad Soyad"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Aylık abonelik</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-400">₺99.00</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setPaymentTarget(null)}
                className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:border-red-300 hover:text-red-500 transition-colors">
                İptal
              </button>
              <button onClick={handleSubscribeAfterPayment} disabled={subscribing === paymentTarget.id}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {subscribing === paymentTarget.id ? "İşleniyor..." : "Ödemeyi Tamamla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
