"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { register } from "@/lib/apiClient";

export default function RegisterPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "STUDENT" as "STUDENT" | "INSTRUCTOR",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { ok, data } = await register(form);
    if (!ok) {
      setError(data.error || "Kayıt başarısız.");
      setSubmitting(false);
      return;
    }

    // Kayıt başarılı → otomatik giriş yap
    const result = await login(form.email, form.password);
    if (result.error) {
      router.replace("/login");
    } else {
      router.replace("/dashboard");
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-full flex-1 flex items-center justify-center bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="font-black text-3xl tracking-tight text-zinc-900 dark:text-white" translate="no">ClassY</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 p-8">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
            Hesap Oluştur
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            <span translate="no">ClassY</span>&apos;ye katılın
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Rol Seçimi */}
            <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              {(["STUDENT", "INSTRUCTOR"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, role: r }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    form.role === r
                      ? "bg-white dark:bg-zinc-700 text-indigo-700 dark:text-indigo-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {r === "STUDENT" ? "Öğrenci" : "Eğitmen"}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Ad Soyad
              </label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                placeholder="Adınız Soyadınız"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                E-posta
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="ornek@mail.com"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Şifre
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="En az 6 karakter"
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
              {submitting ? "Kaydediliyor..." : "Kayıt Ol"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-4">
          Zaten hesabınız var mı?{" "}
          <Link
            href="/login"
            className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
          >
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}
