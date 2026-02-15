import type { ReactNode } from 'react';
import clsx from 'clsx';
import { textStyles } from '@/styles/tokens';

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <section className={clsx('rounded-xl bg-white p-4 shadow-sm', className)}>{children}</section>
);

export const CardHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className="mb-4 flex items-start justify-between gap-3">
    <div>
      <h2 className={textStyles.sectionHeading}>{title}</h2>
      {subtitle && <p className={textStyles.subtitle}>{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);
