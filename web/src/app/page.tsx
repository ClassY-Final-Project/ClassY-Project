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
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (user) return null;

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: "AI Özet & Flashcard",
      desc: "PDF notlarını yükle, yapay zeka saniyeler içinde kapsamlı özet ve çalışma kartları oluştursun.",
      accent: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-100 dark:border-blue-900/40",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      title: "Akıllı Quiz",
      desc: "Notlarından sınava hazırlayan sorular üretilsin. Cevapla, skorunu gör, eksiklerini öğren.",
      accent: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      border: "border-violet-100 dark:border-violet-900/40",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      title: "Canlı Dersler",
      desc: "Eğitmenlerin canlı derslerine katıl veya kendi dersini başlat. Gerçek zamanlı, etkileşimli eğitim.",
      accent: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      border: "border-rose-100 dark:border-rose-900/40",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: "Eğitmen Aboneliği",
      desc: "Sevdiğin eğitmenlere abone ol, tüm içeriklerine ve canlı derslerine öncelikli erişim kazan.",
      accent: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-100 dark:border-emerald-900/40",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      title: "Çalışma Alanı",
      desc: "Tüm notların, quizlerin ve özetlerin ders bazında organize edilmiş hâlde seni bekliyor.",
      accent: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-100 dark:border-amber-900/40",
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">

      {/* Animated Background Styles */}
      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.08); }
          66% { transform: translate(-30px, 30px) scale(0.94); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-50px, 40px) scale(0.95); }
          66% { transform: translate(35px, -25px) scale(1.06); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(25px, 35px) scale(1.04); }
          66% { transform: translate(-40px, -50px) scale(0.96); }
        }
        @keyframes blob4 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-20px, -30px) scale(1.07); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-32 px-6 text-center overflow-hidden">
        {/* Animated gradient arka plan */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-225 h-150 bg-linear-to-b from-indigo-100 via-violet-50 to-transparent dark:from-indigo-950/60 dark:via-violet-950/30 dark:to-transparent rounded-full blur-3xl opacity-80"
            style={{ animation: 'blob4 12s ease-in-out infinite' }}
          />
          <div
            className="absolute top-16 -left-40 w-80 h-80 bg-pink-200 dark:bg-pink-950/30 rounded-full blur-3xl opacity-60"
            style={{ animation: 'blob1 9s ease-in-out infinite' }}
          />
          <div
            className="absolute top-10 -right-32 w-96 h-96 bg-sky-200 dark:bg-sky-950/30 rounded-full blur-3xl opacity-50"
            style={{ animation: 'blob2 11s ease-in-out infinite' }}
          />
          <div
            className="absolute bottom-20 left-1/3 w-72 h-72 bg-violet-200 dark:bg-violet-950/25 rounded-full blur-3xl opacity-45"
            style={{ animation: 'blob3 10s ease-in-out infinite 2s' }}
          />
          <div
            className="absolute top-32 left-1/4 w-56 h-56 bg-emerald-100 dark:bg-emerald-950/20 rounded-full blur-2xl opacity-35"
            style={{ animation: 'blob1 13s ease-in-out infinite 1s' }}
          />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-32 bg-linear-to-t from-white dark:from-zinc-950 to-transparent" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400 rounded-full text-sm font-medium mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Yapay Zeka Destekli Eğitim Platformu
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-zinc-900 dark:text-white leading-tight mb-6 tracking-tight">
            Notlarını{" "}
            <span className="bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              yapay zeka
            </span>
            <br />ile öğrenmeye dönüştür
          </h1>

          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
            PDF ders notlarından anında özet, flashcard ve quiz oluştur. Eğitmenlerine abone ol, canlı derslere katıl.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register"
              className="px-9 py-3.5 bg-linear-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold text-base hover:opacity-90 transition-all shadow-lg shadow-indigo-200/60 dark:shadow-indigo-950 hover:-translate-y-0.5">
              Ücretsiz Başla
            </Link>
            <Link href="/login"
              className="px-9 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-semibold text-base hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm">
              Giriş Yap
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="mt-16 flex flex-col items-center gap-1.5 text-zinc-400">
            <span className="text-xs">Keşfet</span>
            <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Özellikler ── */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Başarıya giden her şey tek yerde
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-3 text-base max-w-lg mx-auto">
            Öğrenmek için ihtiyacın olan tüm araçlar, tek platformda seni bekliyor.
          </p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.slice(0, 2).map((f) => (
              <FeatureCard key={f.title} f={f} />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {features.slice(2).map((f) => (
              <FeatureCard key={f.title} f={f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden py-24 px-6 text-center">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-violet-600 to-indigo-700" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-white/5 rounded-full" />
        </div>

        <div className="relative max-w-xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Öğrenmenin yeni hali seni bekliyor
          </h2>
          <p className="text-indigo-200 mb-10 text-base leading-relaxed">
            Hemen üye ol, yapay zekanın gücüyle notlarını dönüştürmeye başla.
          </p>
          <Link href="/register"
            className="inline-block px-10 py-4 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors text-base shadow-xl">
            Hesap Oluştur — Ücretsiz
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-600 border-t border-zinc-100 dark:border-zinc-900">
        © 2026 ClassY. Tüm hakları saklıdır.
      </footer>

      {/* ── Başa Dön ── */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-full shadow-lg shadow-indigo-300/40 dark:shadow-indigo-950 transition-all hover:-translate-y-0.5"
          title="Başa dön"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          Başa dön
        </button>
      )}
    </div>
  );
}

function FeatureCard({ f }: { f: { icon: React.ReactNode; title: string; desc: string; accent: string; bg: string; border: string } }) {
  return (
    <div className={`${f.bg} border ${f.border} rounded-2xl p-6 flex gap-4 items-start hover:shadow-md transition-shadow`}>
      <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${f.accent} border ${f.border} bg-white/60 dark:bg-zinc-900/40`}>
        {f.icon}
      </div>
      <div>
        <h3 className="font-bold text-zinc-900 dark:text-white mb-1.5">{f.title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
      </div>
    </div>
  );
}
