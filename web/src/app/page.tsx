"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showTop, setShowTop] = useState(false);
  const [vis, setVis] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  // Scroll-to-top listener
  useEffect(() => {
    if (loading || user) return;
    let container: HTMLElement | null = null;
    let raf = 0;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const top = container?.scrollTop ?? window.scrollY;
        setShowTop(top > 300);
      });
    };
    const attach = () => {
      container = document.getElementById("main-scroll");
      if (container) {
        container.addEventListener("scroll", handler, { passive: true });
      }
      window.addEventListener("scroll", handler, { passive: true });
      handler();
    };
    // Defer until after content paints
    const t = setTimeout(attach, 60);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      container?.removeEventListener("scroll", handler);
      window.removeEventListener("scroll", handler);
    };
  }, [loading, user]);

  const scrollToTop = () => {
    const el = document.getElementById("main-scroll");
    if (el) el.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Scroll-in animations
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const key = (entry.target as HTMLElement).dataset.section;
              if (key) setVis((prev) => ({ ...prev, [key]: true }));
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.06, rootMargin: "0px 0px -40px 0px" }
      );
      document.querySelectorAll("[data-section]").forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    }, 50);
    return () => clearTimeout(timer);
  }, [loading]);

  const a = (key: string, extra = "") =>
    `transition-all duration-700 ease-out ${extra} ${vis[key] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`;

  if (loading) return (
    <div className="w-full flex-1 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (user) return null;

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: "Yapay Zeka ile Özet",
      desc: "Uzun PDF ders notlarını yükle, en kritik bilgileri saniyeler içinde senin için özetleyelim.",
      accent: "text-blue-500",
      iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
      border: "hover:border-blue-500/40",
      shadow: "hover:shadow-blue-500/10",
      tag: "AI Destekli",
      tagBg: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      title: "Akıllı Quiz & Deneme",
      desc: "Öğrendiklerini pekiştirmek için notlarından özel üretilen quizleri çöz, zayıf noktalarını gör.",
      accent: "text-violet-500",
      iconBg: "bg-violet-500/10 dark:bg-violet-500/15",
      border: "hover:border-violet-500/40",
      shadow: "hover:shadow-violet-500/10",
      tag: "Kişiselleştirilmiş",
      tagBg: "bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      title: "Etkileşimli Canlı Dersler",
      desc: "Uzman eğitmenlerin yayınlarına katıl, anlık soru sor, sınıf ortamını evinde hisset.",
      accent: "text-rose-500",
      iconBg: "bg-rose-500/10 dark:bg-rose-500/15",
      border: "hover:border-rose-500/40",
      shadow: "hover:shadow-rose-500/10",
      tag: "Canlı",
      tagBg: "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      title: "Zengin Kurs Kütüphanesi",
      desc: "Onlarca kategoride profesyonel kursları keşfet, dilediğin konuda uzmanlaş ve sertifikanı al.",
      accent: "text-cyan-500",
      iconBg: "bg-cyan-500/10 dark:bg-cyan-500/15",
      border: "hover:border-cyan-500/40",
      shadow: "hover:shadow-cyan-500/10",
      tag: "Yeni",
      tagBg: "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: "Favori Eğitmenler",
      desc: "En iyi anlatan hocaları takip et, abone ol ve özel içeriklerinden herkesten önce yararlan.",
      accent: "text-emerald-500",
      iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      border: "hover:border-emerald-500/40",
      shadow: "hover:shadow-emerald-500/10",
      tag: "Topluluk",
      tagBg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      title: "Düzenli Çalışma Alanı",
      desc: "Tüm notların, flashcard'ların ve quiz sonuçların derslerine göre otomatik dosyalanır.",
      accent: "text-amber-500",
      iconBg: "bg-amber-500/10 dark:bg-amber-500/15",
      border: "hover:border-amber-500/40",
      shadow: "hover:shadow-amber-500/10",
      tag: "Organize",
      tagBg: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400",
    },
  ];

  const steps = [
    {
      title: "Kayıt Ol",
      desc: "Dakikalar içinde ücretsiz hesabını oluştur. Kredi kartı gerekmez.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: "text-indigo-500",
      bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      num: "01",
    },
    {
      title: "İçerik Yükle",
      desc: "PDF notlarını yükle ya da mevcut kurs ve derslere göz at.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      color: "text-purple-500",
      bg: "bg-purple-500/10 dark:bg-purple-500/15",
      num: "02",
    },
    {
      title: "AI ile Öğren",
      desc: "Yapay zeka destekli özetler, quizler ve flashcard'larla verimli çalışmaya başla.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: "text-pink-500",
      bg: "bg-pink-500/10 dark:bg-pink-500/15",
      num: "03",
    },
  ];

  return (
    <div className="w-full flex-1 overflow-x-hidden bg-zinc-50 dark:bg-transparent selection:bg-indigo-500/30 text-zinc-900 dark:text-zinc-50">

      {/* Global dot-grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-50 dark:opacity-[0.35] z-0"
        style={{
          backgroundImage: "radial-gradient(circle, #a1a1aa 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Global gradient blobs (page-wide) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[5%] w-[800px] h-[800px] bg-indigo-500/15 dark:bg-indigo-600/20 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: "10s" }} />
        <div className="absolute top-[30%] -right-[10%] w-[700px] h-[700px] bg-violet-400/15 dark:bg-purple-600/20 rounded-full blur-[130px] animate-pulse" style={{ animationDuration: "13s" }} />
        <div className="absolute bottom-[5%] left-[10%] w-[700px] h-[500px] bg-pink-400/10 dark:bg-pink-500/12 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: "15s" }} />
        <div className="absolute top-[60%] right-[20%] w-[450px] h-[450px] bg-sky-400/10 dark:bg-sky-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: "11s" }} />
      </div>

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 lg:pt-40 lg:pb-28 px-6 flex flex-col items-center justify-center min-h-[92vh]">

        <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 rounded-full text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600 dark:bg-indigo-500" />
            </span>
            Eğitimde Yeni Dönem Başladı
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-black tracking-tight leading-[1.07] mb-6 text-zinc-900 dark:text-white">
            Çalışmayı değil,
            <br />
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 bg-clip-text text-transparent">
              öğrenmeyi hızlandır.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            classY ile ders notlarını saniyeler içinde etkileşimli çalışma kartlarına ve quizlere dönüştür. En sevdiğin eğitmenlerin canlı yayınlarında yerini al.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
            <Link
              href="/register"
              className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-bold text-lg transition-all duration-300 shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 flex items-center justify-center gap-2"
            >
              Hemen Ücretsiz Başla
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-2xl font-bold text-lg hover:bg-white dark:hover:bg-zinc-800/80 hover:scale-105 transition-all duration-300 text-center"
            >
              Giriş Yap
            </Link>
          </div>

          {/* Trust pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {["✓ Kredi kartı gerekmez", "✓ Anında kurulum", "✓ Ücretsiz plan mevcut"].map((item) => (
              <span key={item} className="px-4 py-1.5 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-sm border border-zinc-200/60 dark:border-zinc-800/60 rounded-full text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {item}
              </span>
            ))}
          </div>
        </div>

      </section>


      {/* ── FEATURES ─────────────────────────────────── */}
      <section id="features" data-section="features" className={`relative z-10 mx-auto w-[min(96%,1500px)] my-8 rounded-[2.5rem] border border-zinc-200/70 dark:border-white/[0.06] bg-white/55 dark:bg-zinc-950/50 backdrop-blur-2xl shadow-[0_30px_80px_-30px_rgba(99,102,241,0.25)] dark:shadow-[0_30px_80px_-30px_rgba(99,102,241,0.35)] overflow-hidden py-24 px-6 ${a("features")}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/50 dark:border-indigo-800/50 rounded-full mb-4">
              Özellikler
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-900 dark:text-white tracking-tight mb-4">
              Başarı için tasarlandı.
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-2xl mx-auto">
              Modern öğrencinin ihtiyaç duyduğu her şey kusursuz bir deneyimle tek bir yerde.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className={`group relative bg-white/70 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-7 transition-all duration-300 ${f.border} hover:shadow-2xl ${f.shadow} hover:-translate-y-1.5 overflow-hidden`}
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${f.iconBg} ${f.accent} transition-transform duration-300 group-hover:scale-110`}>
                      {f.icon}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${f.tagBg}`}>{f.tag}</span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2.5 tracking-tight">{f.title}</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <section data-section="how" className={`relative z-10 mx-auto w-[min(96%,1500px)] my-8 rounded-[2.5rem] border border-zinc-200/70 dark:border-white/[0.06] bg-white/55 dark:bg-zinc-950/50 backdrop-blur-2xl shadow-[0_30px_80px_-30px_rgba(168,85,247,0.18)] dark:shadow-[0_30px_80px_-30px_rgba(168,85,247,0.3)] overflow-hidden py-24 px-6 ${a("how")}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-50/40 to-transparent dark:via-indigo-950/15 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border border-purple-200/50 dark:border-purple-800/50 rounded-full mb-4">
              Nasıl Çalışır?
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-900 dark:text-white tracking-tight mb-4">
              3 adımda başla.
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-xl mx-auto">
              Karmaşık kurulum yok. Dakikalar içinde çalışmaya başla.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">

            {steps.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center group">
                <div className={`relative w-[88px] h-[88px] rounded-[1.75rem] bg-zinc-50 dark:bg-[#09090b] ${step.color} flex items-center justify-center mb-6 shadow-lg border border-zinc-200/50 dark:border-zinc-800/60 group-hover:scale-105 transition-transform duration-300`}>
                  <div className={`absolute inset-0 rounded-[1.75rem] ${step.bg}`} />
                  <span className="relative z-10">{step.icon}</span>
                  <span className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-black flex items-center justify-center shadow-md z-10">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">{step.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed max-w-[220px]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────── */}
      <section data-section="pricing" className={`relative z-10 mx-auto w-[min(96%,1500px)] my-8 rounded-[2.5rem] border border-zinc-200/70 dark:border-white/[0.06] bg-white/55 dark:bg-zinc-950/50 backdrop-blur-2xl shadow-[0_30px_80px_-30px_rgba(16,185,129,0.18)] dark:shadow-[0_30px_80px_-30px_rgba(16,185,129,0.25)] overflow-hidden py-24 px-6 ${a("pricing")}`}>
        <div className="absolute inset-0 bg-zinc-100/40 dark:bg-zinc-900/30 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-800/50 rounded-full mb-4">
              Fiyatlandırma
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-zinc-900 dark:text-white mb-4 tracking-tight">
              Sana uygun fiyat,
              <br />
              sınırsız öğrenme.
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-xl mx-auto">
              Ücretsiz başla, ihtiyaçlarına göre planını yükselt.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Free",
                price: "0₺",
                period: "/ay",
                cardStyle: "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
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
                ctaStyle: "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-white",
                href: "/register",
              },
              {
                name: "Gold",
                price: "75₺",
                period: "/ay",
                cardStyle: "bg-white dark:bg-zinc-900 border-amber-400/70 ring-2 ring-amber-400/25 scale-[1.02]",
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
                ctaStyle: "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-zinc-900 shadow-lg shadow-amber-500/20",
                href: "/pricing",
              },
              {
                name: "Platinum",
                price: "200₺",
                period: "/ay",
                cardStyle: "bg-white dark:bg-zinc-900 border-violet-400/60",
                badge: "En Kapsamlı",
                badgeStyle: "bg-gradient-to-r from-violet-500 to-purple-600 text-white",
                features: [
                  { text: "Her hafta 10 PDF yükleme", ok: true },
                  { text: "Haftada 5 çalışma odası oluşturma", ok: true },
                  { text: "Tüm odalara katılma", ok: true },
                  { text: "Platinum odalar açabilme", ok: true },
                  { text: "Öncelikli destek", ok: true },
                ],
                cta: "Platinum Planı Seç",
                ctaStyle: "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/20",
                href: "/pricing",
              },
            ].map((plan) => (
              <div key={plan.name} className={`relative border rounded-2xl p-7 flex flex-col transition-all duration-300 hover:shadow-xl ${plan.cardStyle}`}>
                {plan.badge && (
                  <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm ${plan.badgeStyle}`}>
                    {plan.badge}
                  </span>
                )}
                <p className="text-xs font-bold tracking-widest uppercase text-zinc-400 dark:text-zinc-500 mb-2">{plan.name}</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-zinc-900 dark:text-white">{plan.price}</span>
                  <span className="text-zinc-400 dark:text-zinc-500 pb-1 text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className={`flex items-center gap-2.5 text-sm ${f.ok ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-350 dark:text-zinc-600 line-through decoration-zinc-300 dark:decoration-zinc-700"}`}>
                      {f.ok ? (
                        <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-zinc-300 dark:text-zinc-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className={`w-full py-3 rounded-xl text-center font-semibold text-sm transition-all duration-200 ${plan.ctaStyle}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-sm text-zinc-400 dark:text-zinc-600">
            Tüm planları karşılaştırmak için{" "}
            <Link href="/pricing" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
              fiyatlandırma sayfasına
            </Link>{" "}
            göz at.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section data-section="cta" className={`relative z-10 mx-auto w-[min(96%,1500px)] my-8 rounded-[2.5rem] border border-zinc-200/70 dark:border-white/[0.06] bg-white/55 dark:bg-zinc-950/50 backdrop-blur-2xl shadow-[0_30px_80px_-30px_rgba(236,72,153,0.2)] dark:shadow-[0_30px_80px_-30px_rgba(236,72,153,0.3)] overflow-hidden py-32 px-6 ${a("cta")}`}>
        {/* Theme-aware base tint */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-100/40 via-white/30 to-zinc-100/40 dark:from-zinc-950/60 dark:via-zinc-950/80 dark:to-zinc-950/60" />
        {/* Colored blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/20 dark:bg-indigo-600/30 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-violet-500/20 dark:bg-violet-600/25 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-pink-500/15 dark:bg-pink-600/20 rounded-full blur-[120px] pointer-events-none" />
        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-20 text-zinc-500 dark:text-white"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/40 border border-indigo-200/70 dark:border-indigo-800/50 rounded-full mb-8">
            Hemen Başla
          </span>
          <h2 className="text-4xl sm:text-6xl font-black text-zinc-900 dark:text-white mb-6 tracking-tight leading-[1.1]">
            Sınav stresini
            <br />
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400 bg-clip-text text-transparent">
              geride bırak.
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 mb-12 max-w-xl mx-auto">
            classY&apos;e katıl ve yapay zekanın gücüyle çalışmalarını hızlandır. Binlerce öğrenci zaten başladı.
          </p>
          <div className="flex items-center justify-center">
            <Link
              href="/register"
              className="group px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white dark:from-white dark:to-white dark:text-zinc-900 dark:hover:from-zinc-50 dark:hover:to-zinc-50 font-bold rounded-2xl hover:scale-105 transition-all duration-300 text-lg shadow-[0_0_50px_-10px_rgba(99,102,241,0.5)] dark:shadow-[0_0_50px_-10px_rgba(255,255,255,0.4)] ring-1 ring-indigo-500/30 dark:ring-white/20 flex items-center justify-center gap-2"
            >
              Ücretsiz Hesabını Oluştur
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="relative z-10 border-t border-zinc-200 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl mt-8">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-0 group">
              <Image src="/logo.png" alt="ClassY Logo" width={44} height={44} className="w-11 h-11 object-contain" />
              <span className="font-extrabold text-xl tracking-tight transition-transform group-hover:scale-105" style={{ color: '#763fff' }}>classY</span>
            </Link>

            <p className="text-sm text-zinc-400 dark:text-zinc-600">© 2026 classY. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>

      {/* ── SCROLL TO TOP ─────────────────────────────── */}
      <button
        onClick={scrollToTop}
        aria-label="Yukarı Çık"
        className={`fixed bottom-8 right-8 z-50 w-12 h-12 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-full shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1.5 hover:scale-110 transition-all duration-300 ${showTop ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}

