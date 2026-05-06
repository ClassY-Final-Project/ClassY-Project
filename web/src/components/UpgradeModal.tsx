"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface UpgradeModalProps {
  onClose: () => void;
  title?: string;
  description?: string;
  requiredPlan?: "GOLD" | "PLATINUM";
}

export default function UpgradeModal({ onClose, title, description, requiredPlan }: UpgradeModalProps) {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const planLabel = requiredPlan === "PLATINUM" ? "Platinum" : "Gold";
  const planColor = requiredPlan === "PLATINUM" ? "violet" : "amber";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl dark:shadow-black/60 w-full max-w-sm p-8 text-center border border-zinc-200 dark:border-zinc-800 animate-[fadeInUp_0.2s_ease]">
        {/* İkon */}
        <div className={`w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center text-3xl ${
          planColor === "violet"
            ? "bg-violet-100 dark:bg-violet-900/40"
            : "bg-amber-100 dark:bg-amber-900/40"
        }`}>
          {requiredPlan === "PLATINUM" ? "💎" : "⭐"}
        </div>

        <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-2">
          {title || "Planını Yükselt"}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
          {description || `Bu özelliği kullanmak için ${planLabel} veya daha yüksek bir plan gereklidir.`}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => { router.push("/pricing"); onClose(); }}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              planColor === "violet"
                ? "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/30"
                : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30"
            }`}
          >
            Planları Gör ve Yükselt
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Şimdi değil
          </button>
        </div>
      </div>
    </div>
  );
}
