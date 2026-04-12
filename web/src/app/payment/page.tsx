"use client";

import { useState } from "react";
import Link from "next/link";

export default function PaymentPage() {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  function formatCard(val: string) {
    return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }
  function formatExpiry(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000));
    setProcessing(false);
    setDone(true);
  }

  if (done) return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Ödeme Başarılı!</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">İşleminiz tamamlandı.</p>
        <Link href="/dashboard" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
          Panele Dön
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">C</div>
          <span className="font-bold text-2xl text-zinc-900 dark:text-white">ClassY</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 p-6">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Ödeme</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Kart bilgilerinizi güvenle girin</p>

          {/* Kart Önizleme */}
          <div className="relative h-36 rounded-2xl bg-linear-to-br from-indigo-600 to-purple-600 p-5 mb-5 overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 w-24 h-24 rounded-full border-4 border-white" />
              <div className="absolute top-8 right-12 w-24 h-24 rounded-full border-4 border-white" />
            </div>
            <div className="relative">
              <p className="text-white/60 text-xs mb-3 font-medium tracking-widest">CLASSY PAY</p>
              <p className="text-white font-mono text-lg tracking-widest mb-3">
                {cardNumber || "•••• •••• •••• ••••"}
              </p>
              <div className="flex justify-between">
                <div>
                  <p className="text-white/50 text-xs">Kart Sahibi</p>
                  <p className="text-white text-sm font-medium">{name || "AD SOYAD"}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Son Kullanma</p>
                  <p className="text-white text-sm font-medium">{expiry || "AA/YY"}</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Kart Numarası</label>
              <input value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))}
                placeholder="1234 5678 9012 3456" required
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Son Kullanma</label>
                <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                  placeholder="AA/YY" required
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">CVV</label>
                <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="123" required
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Kart Sahibi</label>
              <input value={name} onChange={e => setName(e.target.value.toUpperCase())}
                placeholder="AD SOYAD" required
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl mt-1">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Toplam Tutar</span>
              <span className="font-bold text-zinc-900 dark:text-white">₺99.00</span>
            </div>

            <button type="submit" disabled={processing}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm mt-1">
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  İşleniyor...
                </span>
              ) : "Ödemeyi Tamamla"}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-400 mt-4 flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            256-bit SSL ile güvenli ödeme
          </p>
        </div>
      </div>
    </div>
  );
}
