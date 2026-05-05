"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [debugUrl, setDebugUrl] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    setDebugUrl("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Bir hata oluştu.");
      } else {
        setSent(true);
        if (json.debugUrl) setDebugUrl(json.debugUrl);
      }
    } catch {
      setError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full flex-1 flex items-center justify-center bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">
            C
          </div>
          <span className="font-bold text-2xl text-zinc-900 dark:text-white">ClassY</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                E-posta gönderildi
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span> adresine şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu kontrol edin.
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-3">
                E-posta birkaç dakika içinde ulaşmazsa spam klasörünüzü kontrol edin.
              </p>
              {debugUrl && (
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded-xl text-left">
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Geliştirici Modu: Sıfırlama Bağlantısı</p>
                  <Link href={debugUrl} className="text-xs text-indigo-700 dark:text-indigo-300 break-all hover:underline font-medium">
                    {debugUrl}
                  </Link>
                </div>
              )}
              <Link href="/login"
                className="mt-6 inline-block w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-all text-center shadow-sm">
                Giriş Sayfasına Dön
              </Link>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
                Şifremi Unuttum
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="ornek@mail.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {submitting ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-4">
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            ← Giriş sayfasına dön
          </Link>
        </p>
      </div>
    </div>
  );
}
