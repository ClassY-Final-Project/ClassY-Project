"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    const handler = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (loading) return (
    <div className="w-full flex-1 flex items-center justify-center bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (user) return null;

  const features = [
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: "Yapay Zeka ile Özet",
      desc: "Uzun PDF ders notlarını yükle, en kritik bilgileri saniyeler içinde senin için özetleyelim.",
      accent: "text-blue-500",
      bg: "from-blue-500/10 to-transparent",
      border: "group-hover:border-blue-500/30",
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      title: "Akıllı Quiz & Deneme",
      desc: "Öğrendiklerini pekiştirmek için notlarından özel üretilen quizleri çöz, zayıf noktalarını gör.",
      accent: "text-violet-500",
      bg: "from-violet-500/10 to-transparent",
      border: "group-hover:border-violet-500/30",
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      title: "Etkileşimli Canlı Dersler",
      desc: "Uzman eğitmenlerin yayınlarına katıl, anlık soru sor, sınıf ortamını evinde hisset.",
      accent: "text-rose-500",
      bg: "from-rose-500/10 to-transparent",
      border: "group-hover:border-rose-500/30",
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: "Favori Eğitmenler",
      desc: "En iyi anlatan hocaları takip et, abone ol ve özel içeriklerinden herkesten önce yararlan.",
      accent: "text-emerald-500",
      bg: "from-emerald-500/10 to-transparent",
      border: "group-hover:border-emerald-500/30",
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      title: "Düzenli Çalışma Alanı",
      desc: "Tüm notların, flashcard'ların ve quiz sonuçların derslerine göre otomatik dosyalanır.",
      accent: "text-amber-500",
      bg: "from-amber-500/10 to-transparent",
      border: "group-hover:border-amber-500/30",
    },
  ];

  return (
    <div className="w-full flex-1 overflow-x-hidden bg-zinc-50 dark:bg-[#09090b] selection:bg-indigo-500/30 text-zinc-900 dark:text-zinc-50">

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 px-6 flex flex-col items-center justify-center min-h-[90vh]">
        {/* Abstract Premium Background Mesh */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <div className="absolute top-[-10%] w-[800px] h-[600px] bg-indigo-500/20 dark:bg-indigo-600/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-violet-400/20 dark:bg-purple-600/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[500px] bg-emerald-400/10 dark:bg-emerald-500/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
          {/* Subtle Grid overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-10 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-full text-sm font-semibold tracking-wide text-indigo-800 dark:text-indigo-300 mb-8 shadow-sm ring-1 ring-black/5 dark:ring-white/5 transition-transform hover:scale-105">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600 dark:bg-indigo-500"></span>
            </span>
            Eğitimde Yeni Dönem Başladı
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.1] mb-8 text-zinc-900 dark:text-white">
            Çalışmayı değil,
            <br />
            <span className="bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              öğrenmeyi hızlandır.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            ClassY ile ders notlarını saniyeler içinde etkileşimli çalışma kartlarına ve quizlere dönüştür. En sevdiğin eğitmenlerin canlı yayınlarında yerini al.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
            <Link href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-300 shadow-xl shadow-zinc-900/20 dark:shadow-white/10 ring-1 ring-zinc-900/50 dark:ring-white/50">
              Hemen Ücretsiz Başla
            </Link>
            <Link href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-2xl font-bold text-lg hover:bg-white dark:hover:bg-zinc-800 hover:scale-105 transition-all duration-300 shadow-sm">
              Giriş Yap
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Başarı için tasarlandı.
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-4 text-lg max-w-2xl mx-auto">
            Modern öğrencinin ihtiyaç duyduğu her şey kusursuz bir deneyimle tek bir yerde.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className={`group relative bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-8 hover:-translate-y-1 transition-all duration-300 ${f.border} overflow-hidden shadow-sm hover:shadow-xl dark:hover:shadow-black/50`}>
              <div className={`absolute top-0 left-0 w-full h-full bg-linear-to-b ${f.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700/50 ${f.accent} transform group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight">{f.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4 tracking-tight">Sana uygun fiyat,<br />sınırsız öğrenme</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-xl mx-auto">Ücretsiz başla, ihtiyaçlarına göre planını yükselt.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Free",
                price: "0₺",
                period: "/ay",
                color: "border-zinc-200 dark:border-zinc-700",
                badge: null as string | null,
                badgeStyle: "",
                features: [
                  { text: "Her hafta 1 PDF yükleme", ok: true },
                  { text: "Çalışma odalarına katılabilme", ok: true },
                  { text: "Canlı derslere katılım", ok: true },
                  { text: "Çalışma odası oluşturma", ok: false },
                  { text: "Gold/Platinum odalara erişim", ok: false },
                ],
                cta: "Ücretsiz Başla",
                ctaStyle: "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-100",
                href: "/register",
              },
              {
                name: "Gold",
                price: "75₺",
                period: "/ay",
                color: "border-amber-400/60 ring-2 ring-amber-400/30",
                badge: "Popüler",
                badgeStyle: "bg-amber-400 text-zinc-900",
                features: [
                  { text: "Her hafta 5 PDF yükleme", ok: true },
                  { text: "Haftada 1 çalışma odası oluşturma", ok: true },
                  { text: "Gold odalar açabilme", ok: true },
                  { text: "Canlı derslere katılım", ok: true },
                  { text: "Platinum odalara erişim", ok: false },
                ],
                cta: "Gold Planı Seç",
                ctaStyle: "bg-amber-500 hover:bg-amber-600 text-white",
                href: "/pricing",
              },
              {
                name: "Platinum",
                price: "200₺",
                period: "/ay",
                color: "border-violet-400/60",
                badge: "En Kapsamlı",
                badgeStyle: "bg-violet-500 text-white",
                features: [
                  { text: "Her hafta 10 PDF yükleme", ok: true },
                  { text: "Haftada 5 çalışma odası oluşturma", ok: true },
                  { text: "Tüm odalara katılma", ok: true },
                  { text: "Platinum odalar açabilme", ok: true },
                  { text: "Öncelikli destek", ok: true },
                ],
                cta: "Platinum Planı Seç",
                ctaStyle: "bg-violet-600 hover:bg-violet-700 text-white",
                href: "/pricing",
              },
            ].map((plan) => (
              <div key={plan.name} className={`relative bg-white dark:bg-zinc-900 border rounded-2xl p-7 flex flex-col ${plan.color}`}>
                {plan.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full ${plan.badgeStyle}`}>{plan.badge}</span>
                )}
                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-5">
                  <span className="text-4xl font-extrabold text-zinc-900 dark:text-white">{plan.price}</span>
                  <span className="text-zinc-400 dark:text-zinc-500 pb-1">{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className={`flex items-center gap-2 text-sm ${f.ok ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-600 line-through"}`}>
                      {f.ok ? (
                        <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className={`w-full py-2.5 rounded-xl text-center font-semibold text-sm transition-colors ${plan.ctaStyle}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-sm text-zinc-400 dark:text-zinc-600">
            Tüm planları karşılaştırmak için{" "}
            <Link href="/pricing" className="text-purple-600 dark:text-purple-400 hover:underline">fiyatlandırma sayfasına</Link> göz at.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-32 px-6">
        <div className="absolute inset-0 bg-zinc-900 dark:bg-zinc-950" />
        <div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/30 rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 tracking-tight">
            Sınav stresini geride bırak.
          </h2>
          <p className="text-xl text-zinc-300 mb-12 font-medium">
            ClassY'e katıl ve yapay zekanın gücüyle çalışmalarını hızlandır.
          </p>
          <Link href="/register"
            className="inline-block px-10 py-5 bg-white text-zinc-900 font-bold rounded-2xl hover:scale-105 transition-all duration-300 text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] ring-4 ring-white/10">
            Ücretsiz Hesabını Oluştur
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 text-center text-zinc-500 font-medium">
        <p>© 2026 ClassY. Geleceğin öğrenme platformu.</p>
      </footer>

      {/* Scroll to Top */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 z-50 w-12 h-12 flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full shadow-2xl hover:-translate-y-1 transition-all"
          title="Yukarı Çık"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

