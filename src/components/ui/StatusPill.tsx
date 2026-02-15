import clsx from 'clsx';

const colorMap: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-700',
  arrived: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-slate-200 text-slate-700',
  pending: 'bg-purple-100 text-purple-700',
  void: 'bg-red-100 text-red-700',
};

export const StatusPill = ({ label }: { label: string }) => (
  <span className={clsx('rounded-full px-2.5 py-1 text-xs font-medium capitalize', colorMap[label] || 'bg-slate-100 text-slate-700')}>
    {label.replace('_', ' ')}
  </span>
);
