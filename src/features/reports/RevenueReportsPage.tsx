import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { subscribeByClinic } from '@/lib/clinicDb';

export const RevenueReportsPage = () => {
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [doctorName, setDoctorName] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    const unsub = subscribeByClinic(DEFAULT_CLINIC_ID, 'invoices', (rows) => setInvoices(rows as any[]));
    return unsub;
  }, []);

  const filtered = useMemo(
    () =>
      invoices.filter((inv) => {
        const created = inv.createdAt?.toDate ? inv.createdAt.toDate().toISOString().slice(0, 10) : from;
        const byDate = created >= from && created <= to;
        const byDoctor = doctorName
          ? String(inv.doctorName || '').toLowerCase().includes(doctorName.toLowerCase())
          : true;
        return byDate && byDoctor && inv.status !== 'void';
      }),
    [invoices, from, to, doctorName],
  );

  const dailyRevenue = filtered.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const doctorTotals = Object.entries(
    filtered.reduce((acc: Record<string, number>, inv) => {
      const key = inv.doctorName || 'Unassigned';
      acc[key] = (acc[key] || 0) + Number(inv.total || 0);
      return acc;
    }, {}),
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Revenue Reports" subtitle="Daily and doctor-wise earnings overview" />
      <Card>
        <CardHeader title="Filters" subtitle="Refine report output" />
        <Toolbar
          left={
            <>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              <Input placeholder="Doctor name" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
            </>
          }
          right={<Button variant="secondary">Live report</Button>}
        />
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader title="Total revenue" subtitle="From issued invoices" />
          <p className="text-2xl font-semibold">LKR {dailyRevenue.toLocaleString()}</p>
        </Card>
        <Card>
          <CardHeader title="Doctor-wise totals" subtitle="Top performers" />
          {doctorTotals.length === 0 ? (
            <p className="text-sm text-slate-500">No data in selected range.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm text-slate-700">
              {doctorTotals.map(([name, total]) => (
                <li key={name}>{name} - LKR {Number(total).toLocaleString()}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};
