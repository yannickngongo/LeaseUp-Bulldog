// Reusable skeleton loaders. Animation is a subtle pulse, no shimmer
// (shimmer needs CSS keyframes; pulse is built into Tailwind out of the box).

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200 dark:bg-white/10 ${className}`} />
  );
}

// ─── Common preset shapes ─────────────────────────────────────────────────────

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2.5 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTableRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-white/5">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === 0 ? "w-1/3" : "flex-1"}`} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
      <Skeleton className="h-2.5 w-1/2 mb-2" />
      <Skeleton className="h-7 w-1/3 mb-1" />
      <Skeleton className="h-2.5 w-2/3" />
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  );
}

// ─── Full-page loading skeleton ───────────────────────────────────────────────

export function PageSkeleton({ title = true, statCount = 4 }: { title?: boolean; statCount?: number }) {
  return (
    <div className="p-4 lg:p-8 mx-auto max-w-6xl space-y-6">
      {title && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-9 w-28" />
        </div>
      )}
      <SkeletonStatGrid count={statCount} />
      <SkeletonList count={4} />
    </div>
  );
}
