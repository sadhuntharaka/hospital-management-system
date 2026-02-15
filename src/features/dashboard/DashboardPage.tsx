import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { PageHeader } from '@/components/ui/PageHeader';
import { subscribeByClinic } from '@/lib/clinicDb';

const statItems = [
  { key: 'patients', label: 'Patients' },
  { key: 'appointments', label: 'Today Appointments' },
  { key: 'revenue', label: 'Today Revenue' },
  { key: 'lowStock', label: 'Low Stock Alerts' },
] as const;

export const DashboardPage = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const unsubs = [
      subscribeByClinic(DEFAULT_CLINIC_ID, 'patients', (rows) => setPatients(rows as any[])),
      subscribeByClinic(DEFAULT_CLINIC_ID, 'appointments', (rows) =>
        setAppointments((rows as any[]).filter((r) => r.date === today)),
      ),
      subscribeByClinic(DEFAULT_CLINIC_ID, 'invoices', (rows) =>
        setInvoices((rows as any[]).filter((r) => r.status !== 'void')),
      ),
      subscribeByClinic(DEFAULT_CLINIC_ID, 'stockItems', (rows) => setStockItems(rows as any[])),
    ];
    setLoading(false);
    return () => unsubs.forEach((fn) => fn());
  }, []);

  const revenue = useMemo(
    () => invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0),
    [invoices],
  );

  const lowStock = useMemo(
    () => stockItems.filter((s) => Number(s.quantityOnHand || 0) <= Number(s.reorderLevel || 0)).length,
    [stockItems],
  );

  const values = {
    patients: patients.length,
    appointments: appointments.length,
    revenue: `LKR ${revenue.toLocaleString()}`,
    lowStock,
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" subtitle="Operational snapshot for today" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statItems.map((item) => (
          <Card key={item.key}>
            <CardHeader title={item.label} />
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-3xl font-semibold text-slate-900">{String(values[item.key])}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
