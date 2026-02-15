import type { ReactNode } from 'react';

export const Toolbar = ({ left, right }: { left?: ReactNode; right?: ReactNode }) => (
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div className="flex flex-wrap items-center gap-2">{left}</div>
    <div className="flex flex-wrap items-center gap-2">{right}</div>
  </div>
);
