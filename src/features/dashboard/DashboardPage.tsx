import { PageCard } from '@/components/ui/PageCard';

export const DashboardPage = () => (
  <PageCard title="Dashboard">
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {['Patients', 'Appointments', 'Invoices', 'Low stock alerts'].map((m) => (
        <div key={m} className="rounded border p-3">{m}</div>
      ))}
    </div>
  </PageCard>
);
