export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800 ${className}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      {/* İstatistik kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
            <Skeleton className="h-8 w-8 mb-3" />
            <Skeleton className="h-7 w-12 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      {/* Ders grupları */}
      {[...Array(2)].map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(2)].map((_, j) => (
              <div key={j} className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StudySkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
