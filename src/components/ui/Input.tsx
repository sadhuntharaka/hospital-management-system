import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={clsx('w-full rounded border border-slate-300 px-3 py-2 text-sm', className)}
    {...props}
  />
);
