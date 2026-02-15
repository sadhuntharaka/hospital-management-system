import clsx from 'clsx';

const colorMap: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-800',
  arrived: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-slate-200 text-slate-700',
};

export const Badge = ({ label }: { label: string }) => (
  <span className={clsx('rounded px-2 py-1 text-xs capitalize', colorMap[label] || 'bg-slate-200')}>
    {label.replace('_', ' ')}
  </span>
);
