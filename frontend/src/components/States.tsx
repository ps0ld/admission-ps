import type { ReactNode } from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-ink-100 ${className}`} aria-hidden="true" />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5" aria-hidden="true">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="mt-6 h-10 w-full" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-gulmohar-500/30 bg-gulmohar-50 p-6">
      <h2 className="font-display text-lg font-semibold text-gulmohar-700">Something went wrong</h2>
      <p className="mt-1 text-sm text-ink-700">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-quiet mt-4">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-500">{children}</div>}
    </div>
  );
}
