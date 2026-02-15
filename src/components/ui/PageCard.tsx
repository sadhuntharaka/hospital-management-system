import type { ReactNode } from 'react';

export const PageCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-lg bg-white p-4 shadow-sm">
    <h2 className="mb-4 text-lg font-semibold">{title}</h2>
    {children}
  </section>
);
