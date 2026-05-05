import Link from "next/link";

export default function NotFound() {
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 px-6 text-center">
      <div className="relative mb-8">
        <div className="text-[120px] font-extrabold text-zinc-100 dark:text-zinc-800 leading-none select-none">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center text-5xl">
          📚
        </div>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
        Sayfa bulunamadı
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xs mb-8 leading-relaxed">
        Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.
      </p>

      <div className="flex gap-3 flex-wrap justify-center">
        <Link href="/dashboard"
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          Ana Sayfaya Dön
        </Link>
        <Link href="/courses"
          className="px-6 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors">
          Kurslara Göz At
        </Link>
      </div>
    </div>
  );
}
