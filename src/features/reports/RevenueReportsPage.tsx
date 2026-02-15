import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { listenInvoicesByRange, listenPaymentsByRange } from '@/lib/clinicDb';
import { useDoctors } from '@/hooks/useLookupData';
import { DataTable } from '@/components/ui/DataTable';

type DatePreset = 'today' | 'week' | 'month' | 'custom';

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const startOfWeek = () => {
  const now = new Date();
  const day = now.getDay() || 7;
  now.setDate(now.getDate() - day + 1);
  return fmtDate(now);
};
const startOfMonth = () => {
  const now = new Date();
  now.setDate(1);
  return fmtDate(now);
};

const downloadCsv = (filename: string, rows: Array<Record<string, string | number>>) => {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')].concat(
    rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const RevenueReportsPage = () => {
  const [preset, setPreset] = useState<DatePreset>('today');
  const [from, setFrom] = useState(fmtDate(new Date()));
  const [to, setTo] = useState(fmtDate(new Date()));
  const [includeVoid, setIncludeVoid] = useState(false);
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const { data: doctors } = useDoctors(DEFAULT_CLINIC_ID);

  useEffect(() => {
    if (preset === 'today') {
      const day = fmtDate(new Date());
      setFrom(day);
      setTo(day);
    } else if (preset === 'week') {
      setFrom(startOfWeek());
      setTo(fmtDate(new Date()));
    } else if (preset === 'month') {
      setFrom(startOfMonth());
      setTo(fmtDate(new Date()));
    }
  }, [preset]);

  useEffect(() => {
    const unsubInvoices = listenInvoicesByRange(DEFAULT_CLINIC_ID, from, to, (rows) => setInvoices(rows as any[]));
    const unsubPayments = listenPaymentsByRange(DEFAULT_CLINIC_ID, from, to, (rows) => setPayments(rows as any[]));
    return () => {
      unsubInvoices();
      unsubPayments();
    };
  }, [from, to]);

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((invoice) => {
        const statusOk = includeVoid ? true : invoice.status !== 'void';
        const doctorOk = doctorFilter === 'all' ? true : invoice.doctorId === doctorFilter;
        return statusOk && doctorOk;
      }),
    [invoices, includeVoid, doctorFilter],
  );

  const totalRevenue = filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const totalInvoices = filteredInvoices.length;
  const avgInvoice = totalInvoices ? totalRevenue / totalInvoices : 0;

  const doctorTotals = useMemo(() => {
    const map = new Map<string, { doctorName: string; total: number; count: number }>();
    filteredInvoices.forEach((invoice) => {
      const key = String(invoice.doctorId || 'unassigned');
      const prev = map.get(key) || { doctorName: String(invoice.doctorName || 'Unassigned'), total: 0, count: 0 };
      prev.total += Number(invoice.total || 0);
      prev.count += 1;
      map.set(key, prev);
    });
    return Array.from(map.entries()).map(([doctorId, value]) => ({ id: doctorId, ...value }));
  }, [filteredInvoices]);

  const serviceTotals = useMemo(() => {
    const map = new Map<string, { service: string; qty: number; total: number }>();
    filteredInvoices.forEach((invoice) => {
      (invoice.items || []).forEach((item: any) => {
        const key = String(item.serviceId || item.name || 'unknown');
        const prev = map.get(key) || { service: String(item.name || 'Unknown'), qty: 0, total: 0 };
        prev.qty += Number(item.qty || 0);
        prev.total += Number(item.lineTotal || 0);
        map.set(key, prev);
      });
    });
    return Array.from(map.entries()).map(([id, value]) => ({ id, ...value }));
  }, [filteredInvoices]);

  const paymentsByMethod = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((payment) => {
      const key = String(payment.method || 'other');
      map.set(key, (map.get(key) || 0) + Number(payment.amount || 0));
    });
    return Array.from(map.entries()).map(([method, total]) => ({ id: method, method, total }));
  }, [payments]);

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>();
    filteredInvoices.forEach((invoice) => {
      const created = invoice.createdAt?.toDate
        ? invoice.createdAt.toDate().toISOString().slice(0, 10)
        : from;
      map.set(created, (map.get(created) || 0) + Number(invoice.total || 0));
    });
    return Array.from(map.entries()).map(([date, total]) => ({ id: date, date, total }));
  }, [filteredInvoices, from]);

  return (
    <div className="space-y-4">
      <PageHeader title="Revenue Reports" subtitle="Daily/monthly totals with doctor/service breakdown" />
      <Card>
        <CardHeader title="Filters" subtitle="Realtime revenue analytics" />
        <Toolbar
          left={
            <>
              <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={preset} onChange={(e) => setPreset(e.target.value as DatePreset)}>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom</option>
              </select>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
                <option value="all">All doctors</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id as string} value={doctor.id as string}>{String(doctor.fullName || doctor.id)}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={includeVoid} onChange={(e) => setIncludeVoid(e.target.checked)} />
                Include void
              </label>
            </>
          }
          right={<Button variant="secondary" onClick={() => setPreset('custom')}>Apply custom</Button>}
        />
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardHeader title="Total Revenue" /><p className="text-2xl font-semibold">LKR {totalRevenue.toLocaleString()}</p></Card>
        <Card><CardHeader title="Invoices" /><p className="text-2xl font-semibold">{totalInvoices}</p></Card>
        <Card><CardHeader title="Average Invoice" /><p className="text-2xl font-semibold">LKR {avgInvoice.toLocaleString()}</p></Card>
        <Card><CardHeader title="Payments (sum)" /><p className="text-2xl font-semibold">LKR {payments.reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString()}</p></Card>
      </div>

      <Card>
        <CardHeader title="Doctor-wise totals" />
        <div className="mb-2"><Button variant="secondary" onClick={() => downloadCsv('doctor_totals.csv', doctorTotals.map((d) => ({ doctorName: d.doctorName, count: d.count, total: d.total })))}>Export CSV</Button></div>
        <DataTable rows={doctorTotals} columns={[
          { key: 'doctorName', header: 'Doctor', render: (row: any) => row.doctorName },
          { key: 'count', header: 'Invoices', render: (row: any) => row.count },
          { key: 'total', header: 'Total', render: (row: any) => `LKR ${Number(row.total).toLocaleString()}` },
        ]} />
      </Card>

      <Card>
        <CardHeader title="Service-wise totals" />
        <div className="mb-2"><Button variant="secondary" onClick={() => downloadCsv('service_totals.csv', serviceTotals.map((s) => ({ service: s.service, qty: s.qty, total: s.total })))}>Export CSV</Button></div>
        <DataTable rows={serviceTotals} columns={[
          { key: 'service', header: 'Service', render: (row: any) => row.service },
          { key: 'qty', header: 'Qty', render: (row: any) => row.qty },
          { key: 'total', header: 'Total', render: (row: any) => `LKR ${Number(row.total).toLocaleString()}` },
        ]} />
      </Card>

      <Card>
        <CardHeader title="Daily totals" />
        <div className="mb-2"><Button variant="secondary" onClick={() => downloadCsv('invoice_list.csv', filteredInvoices.map((inv) => ({ invoiceNumber: inv.invoiceNumber, patientName: inv.patientName, doctorName: inv.doctorName || '', total: Number(inv.total || 0), status: inv.status || 'issued' })))}>Export CSV</Button></div>
        <DataTable rows={dailyTotals} columns={[
          { key: 'date', header: 'Date', render: (row: any) => row.date },
          { key: 'total', header: 'Total', render: (row: any) => `LKR ${Number(row.total).toLocaleString()}` },
        ]} />
      </Card>

      <Card>
        <CardHeader title="Payments by method" />
        <DataTable rows={paymentsByMethod} columns={[
          { key: 'method', header: 'Method', render: (row: any) => row.method },
          { key: 'total', header: 'Total', render: (row: any) => `LKR ${Number(row.total).toLocaleString()}` },
        ]} />
      </Card>
    </div>
  );
};
