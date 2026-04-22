"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface CourseEarning {
  id: string;
  title: string;
  price: number;
  enrollmentCount: number;
  earnings: number;
  recentEnrollments: { studentName: string; purchasedAt: string }[];
}

interface EarningsData {
  totalEarnings: number;
  totalStudents: number;
  courses: CourseEarning[];
  iban: string | null;
}

export default function EarningsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [ibanInput, setIbanInput] = useState("");
  const [savingIban, setSavingIban] = useState(false);
  const [ibanSaved, setIbanSaved] = useState(false);
  const [editingIban, setEditingIban] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user?.role === "STUDENT") router.replace("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/instructor/earnings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setData(d); setIbanInput(d.iban || ""); } })
      .finally(() => setFetching(false));
  }, [token]);

  async function saveIban() {
    setSavingIban(true);
    const res = await fetch("/api/instructor/iban", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ iban: ibanInput }),
    });
    if (res.ok) {
      setData((d) => d ? { ...d, iban: ibanInput } : d);
      setIbanSaved(true);
      setEditingIban(false);
      setTimeout(() => setIbanSaved(false), 3000);
    }
    setSavingIban(false);
  }

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Kazançlarım</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Kurs satışları ve gelir özeti</p>
          </div>
          <Link href="/instructor/dashboard"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            ← Panele Dön
          </Link>
        </div>

        {/* Özet kartlar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Toplam Kazanç",
              value: `₺${(data?.totalEarnings ?? 0).toLocaleString("tr-TR")}`,
              icon: "💰",
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 dark:bg-emerald-950/40",
            },
            {
              label: "Toplam Öğrenci",
              value: data?.totalStudents ?? 0,
              icon: "👨‍🎓",
              color: "text-indigo-600 dark:text-indigo-400",
              bg: "bg-indigo-50 dark:bg-indigo-950/40",
            },
            {
              label: "Aktif Kurs",
              value: data?.courses.length ?? 0,
              icon: "🎬",
              color: "text-violet-600 dark:text-violet-400",
              bg: "bg-violet-50 dark:bg-violet-950/40",
            },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${s.bg}`}>{s.icon}</div>
              <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-zinc-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* IBAN Yönetimi */}
        <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏦</span>
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Kazancımın Aktarılacağı IBAN</h2>
            </div>
            {!editingIban && (
              <button onClick={() => setEditingIban(true)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                {data?.iban ? "Düzenle" : "Ekle"}
              </button>
            )}
          </div>

          {editingIban ? (
            <div className="flex gap-2">
              <input
                value={ibanInput}
                onChange={(e) => setIbanInput(e.target.value)}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                className="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-400 font-mono"
              />
              <button onClick={saveIban} disabled={savingIban}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {savingIban ? "..." : "Kaydet"}
              </button>
              <button onClick={() => { setEditingIban(false); setIbanInput(data?.iban || ""); }}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-500 rounded-xl text-sm hover:border-zinc-300 transition-colors">
                İptal
              </button>
            </div>
          ) : data?.iban ? (
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl px-4 py-3">
              <span className="font-mono text-sm text-zinc-800 dark:text-zinc-200 tracking-wider flex-1">{data.iban}</span>
              {ibanSaved && <span className="text-xs text-green-600">✓ Kaydedildi</span>}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 italic">Henüz IBAN eklenmemiş. ClassY kazancınızı bu hesaba aktaracaktır.</p>
          )}
        </div>

        {/* Kurs bazlı kazanç tablosu */}
        {data?.courses && data.courses.length > 0 ? (
          <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Kurs Bazlı Gelir</h2>
            </div>
            <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {data.courses.map((c) => (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{c.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                        <span>{c.enrollmentCount} öğrenci</span>
                        <span>·</span>
                        <span>₺{c.price.toLocaleString("tr-TR")} / kurs</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        ₺{c.earnings.toLocaleString("tr-TR")}
                      </p>
                      <p className="text-xs text-zinc-400">toplam gelir</p>
                    </div>
                  </div>

                  {c.recentEnrollments.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {c.recentEnrollments.map((e, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg px-3 py-1.5">
                          <span>{e.studentName}</span>
                          <span>{new Date(e.purchasedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-10 text-center shadow-sm">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Henüz kurs satışın yok.</p>
            <Link href="/instructor/courses" className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline mt-2 inline-block">
              Kurs oluştur →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
