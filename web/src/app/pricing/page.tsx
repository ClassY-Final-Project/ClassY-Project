"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import Link from "next/link";

const PLANS = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    priceLabel: "Ücretsiz",
    description: "Başlamak için ideal",
    color: "zinc",
    badge: null,
    gradient: "from-zinc-500/10 to-zinc-500/5",
    border: "border-zinc-200 dark:border-zinc-700",
    btnClass: "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90",
    features: [
      { text: "Her hafta 1 PDF yükleme", ok: true },
      { text: "Çalışma odalarına katılabilme", ok: true },
      { text: "Canlı derslere katılım", ok: true },
      { text: "Çalışma odası oluşturma", ok: false },
      { text: "Gold/Platinum odalara erişim", ok: false },
    ],
  },
  {
    id: "GOLD",
    name: "Gold",
    price: 75,
    priceLabel: "₺75",
    description: "Düzenli çalışanlar için",
    color: "amber",
    badge: "Popüler",
    gradient: "from-amber-500/15 to-amber-500/5",
    border: "border-amber-300 dark:border-amber-500/50",
    btnClass: "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30",
    features: [
      { text: "Her hafta 5 PDF yükleme", ok: true },
      { text: "Haftada 1 çalışma odası oluşturma", ok: true },
      { text: "Gold odalar açabilme", ok: true },
      { text: "Canlı derslere katılım", ok: true },
      { text: "Platinum odalara erişim", ok: false },
    ],
  },
  {
    id: "PLATINUM",
    name: "Platinum",
    price: 200,
    priceLabel: "₺200",
    description: "Maksimum performans için",
    color: "violet",
    badge: "En İyi",
    gradient: "from-violet-500/15 to-violet-500/5",
    border: "border-violet-300 dark:border-violet-500/50",
    btnClass: "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/30",
    features: [
      { text: "Her hafta 10 PDF yükleme", ok: true },
      { text: "Haftada 5 çalışma odası oluşturma", ok: true },
      { text: "Tüm odalara katılma", ok: true },
      { text: "Platinum odalar açabilme", ok: true },
      { text: "Öncelikli destek", ok: true },
    ],
  },
];

export default function PricingPage() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const activePlan = (user?.plan && user?.planExpiresAt && new Date(user.planExpiresAt) > new Date())
    ? user.plan
    : "FREE";

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubscribe() {
    if (!user || !token) { router.push("/login"); return; }
    if (!selectedPlan) return;
    setPaying(true);
    try {
      const res = await fetch("/api/plans/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        setDone(true);
        setTimeout(() => router.push("/dashboard"), 2500);
      } else {
        showToast(data.error || "Ödeme başarısız.", "error");
      }
    } catch {
      showToast("Sunucu hatası.", "error");
    }
    setPaying(false);
  }

  const planObj = PLANS.find(p => p.id === selectedPlan);

  if (done) {
    return (
      <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Ödeme Başarılı!</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">{planObj?.name} planına hoş geldiniz!</p>
          <p className="text-sm text-zinc-400 dark:text-zinc-600 mb-6">Panele yönlendiriliyorsunuz...</p>
          <Link href="/dashboard" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            Panele Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 bg-zinc-50 dark:bg-[#09090b]">
      {/* Header */}
      <div className="relative pt-20 pb-16 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/50 rounded-full text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-6">
            ✨ Planını seç, sınırlarını kaldır
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-zinc-900 dark:text-white tracking-tight mb-4">
            Sana uygun planı seç
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-xl mx-auto">
            İhtiyacına göre planını yükselt. İstediğin zaman iptal edebilirsin.
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-zinc-900 rounded-3xl border-2 ${plan.border} overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-black/50 ${
                selectedPlan === plan.id ? "ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-zinc-900" : ""
              }`}
            >
              {plan.badge && (
                <div className={`absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full ${
                  plan.id === "GOLD" ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" :
                  "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                }`}>
                  {plan.badge}
                </div>
              )}
              <div className={`p-6 bg-linear-to-b ${plan.gradient}`}>
                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-zinc-900 dark:text-white">{plan.priceLabel}</span>
                  {plan.price > 0 && <span className="text-zinc-400 text-sm mb-1">/ ay</span>}
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{plan.description}</p>
              </div>

              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className={`flex items-center gap-2.5 text-sm ${f.ok ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400 line-through"}`}>
                      {f.ok ? (
                        <svg className={`w-4 h-4 shrink-0 ${plan.id === "GOLD" ? "text-amber-500" : plan.id === "PLATINUM" ? "text-violet-500" : "text-emerald-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 shrink-0 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>

                {plan.id === activePlan ? (
                  <button disabled className="w-full py-3 rounded-xl text-sm font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default">
                    ✓ Mevcut Planın
                  </button>
                ) : plan.id === "FREE" && !user ? (
                  <Link href="/register" className="block w-full py-3 rounded-xl text-sm font-semibold text-center bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity">
                    Ücretsiz Başla
                  </Link>
                ) : plan.id === "FREE" ? (
                  <button disabled className="w-full py-3 rounded-xl text-sm font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-300 cursor-default">
                    Ücretsiz Plan
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 ${plan.btnClass}`}
                  >
                    {selectedPlan === plan.id ? "✓ Seçildi" : `${plan.name}'a Geç`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Ödeme onay kutusu */}
        {selectedPlan && selectedPlan !== "FREE" && planObj && (
          <div className="mt-10 max-w-sm mx-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 p-6">
              <h1 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Ödeme</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">{planObj.name} planı için ödeme yapılacak</p>

              {/* Plan kartı görseli */}
              <div className={`relative h-28 rounded-2xl p-5 mb-5 overflow-hidden ${
                planObj.id === "PLATINUM" ? "bg-linear-to-br from-violet-600 to-purple-700" : "bg-linear-to-br from-amber-500 to-orange-500"
              }`}>
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 right-4 w-20 h-20 rounded-full border-4 border-white" />
                  <div className="absolute top-8 right-10 w-20 h-20 rounded-full border-4 border-white" />
                </div>
                <div className="relative">
                  <p className="text-white/60 text-xs mb-2 font-medium tracking-widest">CLASSY PAY</p>
                  <p className="text-white font-bold text-xl">{planObj.priceLabel} / ay</p>
                  <p className="text-white/70 text-sm mt-0.5">{planObj.name} Plan</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl mb-4">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Toplam Tutar</span>
                <span className="font-bold text-zinc-900 dark:text-white">{planObj.priceLabel}</span>
              </div>

              <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">⚠️ Bu bir demo ödeme ekranıdır. Gerçek ödeme alınmamaktadır.</p>
              </div>

              <button
                onClick={handleSubscribe}
                disabled={paying}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${planObj.btnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {paying ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    İşleniyor...
                  </span>
                ) : "Ödemeyi Tamamla"}
              </button>

              <p className="text-center text-xs text-zinc-400 mt-4 flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                256-bit SSL ile güvenli ödeme
              </p>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto text-center">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Sorularınız için{" "}
            <a href="mailto:destek@classy.com" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              destek@classy.com
            </a>{" "}
            adresine yazabilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
