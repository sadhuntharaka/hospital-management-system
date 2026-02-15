import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { listByClinic } from '@/lib/clinicDb';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { PageHeader } from '@/components/ui/PageHeader';

const statItems = [
  { key: 'patients', label: 'Patients' },
  { key: 'appointments', label: 'Today Appointments' },
  { key: 'revenue', label: 'Today Revenue' },
  { key: 'lowStock', label: 'Low Stock Alerts' },
];

export const DashboardPage = () => {
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['dashboard-patients', DEFAULT_CLINIC_ID],
    queryFn: () => listByClinic(DEFAULT_CLINIC_ID, 'patients'),
  });

  const values = {
    patients: (patients as any[]).length,
    appointments: 12,
    revenue: 'LKR 48,500',
    lowStock: 4,
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" subtitle="Operational snapshot for today" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statItems.map((item) => (
          <Card key={item.key}>
            <CardHeader title={item.label} />
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-3xl font-semibold text-slate-900">{String(values[item.key as keyof typeof values])}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
