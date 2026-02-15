import clsx from 'clsx';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={clsx('animate-pulse rounded bg-slate-200', className)} />
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, idx) => (
      <Skeleton key={idx} className="h-10 w-full" />
    ))}
  </div>
);
