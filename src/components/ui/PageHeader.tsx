import type { ReactNode } from 'react';
import { textStyles } from '@/styles/tokens';

export const PageHeader = ({ title, subtitle, actions, rightSlot }: { title: string; subtitle?: string; actions?: ReactNode; rightSlot?: ReactNode }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className={textStyles.pageTitle}>{title}</h1>
      {subtitle && <p className={textStyles.subtitle}>{subtitle}</p>}
    </div>
    <div className="ml-auto flex items-center gap-2">
      {rightSlot}
      {actions}
    </div>
  </div>
);
