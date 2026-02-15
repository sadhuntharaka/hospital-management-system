import type { ReactNode } from 'react';

export const EmptyState = ({ title, description, action }: { title: string; description: string; action?: ReactNode }) => (
  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
    <h3 className="text-base font-semibold text-slate-800">{title}</h3>
    <p className="mt-1 text-sm text-slate-600">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);
