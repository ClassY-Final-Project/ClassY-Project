"use client";

import { useEffect, useState } from "react";

interface StreakData {
  activeDays: string[];
  streak: number;
  longestStreak: number;
  totalActiveDays: number;
  today: string;
}

const DAYS_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default function StreakWidget({ token }: { token: string }) {
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/study-stats/streak", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 mb-6 animate-pulse h-40" />
  );
  if (!data) return null;

  // Son 84 gün (12 hafta × 7) — grid için
  const DAYS = 84;
  const activeSet = new Set(data.activeDays);
  const cells: { date: string; active: boolean; isToday: boolean }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    cells.push({ date: dateStr, active: activeSet.has(dateStr), isToday: dateStr === data.today });
  }

  // 12 haftalık kolonlara böl (her kolon 7 gün)
  const weeks: (typeof cells)[] = [];
  for (let w = 0; w < 12; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }

  const todayActive = activeSet.has(data.today);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 mb-6">
      {/* Üst satır: streak sayaçları */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{data.streak > 0 ? "🔥" : "💤"}</span>
          <div>
            <p className="text-2xl font-black text-zinc-900 dark:text-white leading-none">
              {data.streak} <span className="text-base font-semibold text-zinc-500">günlük seri</span>
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {todayActive ? "✅ Bugün çalıştın!" : "⚠️ Bugün henüz çalışmadın"}
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{data.longestStreak}</p>
            <p className="text-[10px] text-zinc-400 leading-tight">En uzun<br/>seri</p>
          </div>
          <div>
            <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{data.totalActiveDays}</p>
            <p className="text-[10px] text-zinc-400 leading-tight">Aktif<br/>gün</p>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-fit">
          {/* Gün etiketleri (sol) */}
          <div className="flex flex-col gap-1 mr-1 justify-around">
            {DAYS_TR.map((d) => (
              <span key={d} className="text-[9px] text-zinc-300 dark:text-zinc-600 w-5 text-right leading-none">{d}</span>
            ))}
          </div>
          {/* Haftalar */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell) => (
                <div
                  key={cell.date}
                  title={`${cell.date}${cell.active ? " — çalışıldı ✓" : ""}`}
                  className={`w-4 h-4 rounded-sm transition-colors ${
                    cell.isToday
                      ? cell.active
                        ? "ring-2 ring-indigo-400 bg-indigo-500"
                        : "ring-2 ring-amber-400 bg-zinc-200 dark:bg-zinc-700"
                      : cell.active
                      ? "bg-indigo-500 dark:bg-indigo-500 hover:bg-indigo-400"
                      : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-2">
          <span className="text-[9px] text-zinc-400">Az</span>
          {["bg-zinc-100 dark:bg-zinc-800", "bg-indigo-200 dark:bg-indigo-900/60", "bg-indigo-400", "bg-indigo-500", "bg-indigo-600"].map((cls, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
          ))}
          <span className="text-[9px] text-zinc-400">Çok</span>
        </div>
      </div>
    </div>
  );
}
