import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export const Button = ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={clsx('rounded bg-brand px-4 py-2 text-white disabled:opacity-50', className)}
    {...props}
  />
);
