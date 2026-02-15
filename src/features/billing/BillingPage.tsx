import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  createInvoice,
  listServicesRealtime,
  recordPayment,
  subscribeByClinic,
  voidInvoice,
} from '@/lib/clinicDb';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader } from '@/components/ui/Card';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { DataTable } from '@/components/ui/DataTable';
import { Combobox } from '@/components/ui/Combobox';
import { useDoctors, usePatients } from '@/hooks/useLookupData';
import { Drawer } from '@/components/ui/Drawer';

interface DraftItem {
  serviceId?: string;
  name: string;
  qty: number;
  unitPrice: number;
}

const toIso = () => new Date().toISOString();

export const BillingPage = () => {
  const { push } = useToast();
  const { user } = useAuthContext();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; label: string; meta?: string } | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string; label: string } | null>(null);
  const [selectedService, setSelectedService] = useState<{ id: string; label: string } | null>(null);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [discount, setDiscount] = useState('0');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'void'>('issued');
  const [search, setSearch] = useState('');

  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank' | 'other'>('cash');
  const [paymentAmount, setPaymentAmount] = useState('0');

  const [receiptInvoice, setReceiptInvoice] = useState<any | null>(null);
  const [voidTarget, setVoidTarget] = useState<any | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const { data: doctors, loading: doctorsLoading } = useDoctors(DEFAULT_CLINIC_ID);
  const { data: patients, loading: patientsLoading } = usePatients(DEFAULT_CLINIC_ID);

  useEffect(() => {
    const unsubInvoices = subscribeByClinic(DEFAULT_CLINIC_ID, 'invoices', (rows) => setInvoices(rows as any[]));
    const unsubServices = listServicesRealtime(DEFAULT_CLINIC_ID, (rows) => setServices(rows as any[]));
    return () => {
      unsubInvoices();
      unsubServices();
    };
  }, []);

  const doctorItems = useMemo(
    () =>
      doctors.map((d) => ({
        id: d.id as string,
        label: (d.fullName as string) || (d.id as string),
        meta: (d.specialty as string) || undefined,
      })),
    [doctors],
  );
  const patientItems = useMemo(
    () =>
      patients.map((p) => ({
        id: p.id as string,
        label: (p.fullName as string) || (p.id as string),
        meta: `${p.phone || ''} ${p.nic || ''}`.trim() || undefined,
      })),
    [patients],
  );
  const serviceItems = useMemo(
    () =>
      services.map((svc) => ({
        id: svc.id as string,
        label: (svc.name as string) || (svc.id as string),
        meta: `LKR ${Number(svc.amount || 0).toLocaleString()}`,
      })),
    [services],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Math.max(1, item.qty) * Math.max(0, item.unitPrice), 0),
    [items],
  );
  const discountValue = useMemo(() => Math.min(Math.max(0, Number(discount || 0)), subtotal), [discount, subtotal]);
  const total = useMemo(() => Math.max(0, subtotal - discountValue), [subtotal, discountValue]);

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((inv) => {
        const statusMatch = statusFilter === 'all' ? true : inv.status === statusFilter;
        const text = `${inv.invoiceNumber || ''} ${inv.patientName || ''} ${inv.phone || ''}`.toLowerCase();
        const searchMatch = text.includes(search.toLowerCase());
        return statusMatch && searchMatch;
      }),
    [invoices, statusFilter, search],
  );

  const resetDraft = () => {
    setItems([]);
    setSelectedService(null);
    setDiscount('0');
    setWalkinName('');
    setWalkinPhone('');
  };

  const addItemFromService = () => {
    if (!selectedService) return;
    const svc = services.find((s) => s.id === selectedService.id);
    if (!svc) return;
    setItems((prev) => [
      ...prev,
      {
        serviceId: svc.id,
        name: String(svc.name || selectedService.label),
        qty: 1,
        unitPrice: Number(svc.amount || 0),
      },
    ]);
    setSelectedService(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Billing" subtitle="Invoices, receipts, payments, and void controls" />

      <Card>
        <CardHeader title="Create Invoice" subtitle="All amounts stored as integer LKR" />
        <div className="grid gap-2 md:grid-cols-4">
          <Combobox
            label="Patient (optional)"
            value={selectedPatient}
            onChange={(item) => setSelectedPatient(item as any)}
            items={patientItems}
            loading={patientsLoading}
            placeholder="Select patient or leave walk-in"
          />
          <Input placeholder="Walk-in name" value={walkinName} onChange={(e) => setWalkinName(e.target.value)} />
          <Input placeholder="Walk-in phone" value={walkinPhone} onChange={(e) => setWalkinPhone(e.target.value)} />
          <Combobox
            label="Doctor"
            value={selectedDoctor}
            onChange={setSelectedDoctor}
            items={doctorItems}
            loading={doctorsLoading}
            placeholder="Select doctor"
          />
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[2fr_1fr_auto]">
          <Combobox
            label="Service"
            value={selectedService}
            onChange={setSelectedService}
            items={serviceItems}
            placeholder="Select service"
          />
          <Input
            type="number"
            min="0"
            placeholder="Discount"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <div className="flex items-end gap-2">
            <Button variant="secondary" onClick={addItemFromService}>Add item</Button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {items.map((item, index) => (
            <div key={`${item.name}-${index}`} className="grid items-center gap-2 rounded-md border p-2 md:grid-cols-[2fr_80px_120px_120px_auto]">
              <p className="text-sm font-medium">{item.name}</p>
              <Input
                type="number"
                min="1"
                value={String(item.qty)}
                onChange={(e) =>
                  setItems((prev) => prev.map((v, i) => (i === index ? { ...v, qty: Math.max(1, Number(e.target.value || 1)) } : v)))
                }
              />
              <Input
                type="number"
                min="0"
                value={String(item.unitPrice)}
                onChange={(e) =>
                  setItems((prev) => prev.map((v, i) => (i === index ? { ...v, unitPrice: Math.max(0, Number(e.target.value || 0)) } : v)))
                }
              />
              <p className="text-sm">LKR {(item.qty * item.unitPrice).toLocaleString()}</p>
              <Button variant="danger" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-slate-500">No items added.</p>}
        </div>

        <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
          <p>Subtotal: LKR {subtotal.toLocaleString()}</p>
          <p>Discount: LKR {discountValue.toLocaleString()}</p>
          <p className="font-semibold">Total: LKR {total.toLocaleString()}</p>
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            onClick={async () => {
              const patientName = selectedPatient?.label || walkinName;
              if (!patientName.trim()) {
                push('Patient or walk-in name is required', 'error');
                return;
              }
              if (!selectedDoctor) {
                push('Doctor is required', 'error');
                return;
              }
              if (items.length === 0) {
                push('Add at least one item', 'error');
                return;
              }

              const res = await createInvoice(DEFAULT_CLINIC_ID, user?.uid || 'admin', user?.email, {
                patientId: selectedPatient?.id,
                patientName,
                phone: selectedPatient?.meta?.split(' ')[0] || walkinPhone || undefined,
                doctorId: selectedDoctor.id,
                doctorName: selectedDoctor.label,
                items: items.map((item) => ({
                  serviceId: item.serviceId,
                  name: item.name,
                  qty: item.qty,
                  unitPrice: item.unitPrice,
                  lineTotal: item.qty * item.unitPrice,
                })),
                discount: discountValue,
              });
              push(`Invoice ${res.invoiceNumber} created`, 'success');
              resetDraft();
            }}
          >
            Save Invoice
          </Button>
          <Button variant="secondary" onClick={resetDraft}>Reset</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Invoices" subtitle="Realtime invoice feed" />
        <div className="mb-3 flex flex-wrap gap-2">
          <Input placeholder="Search by number/patient/phone" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[320px]" />
          <Button variant={statusFilter === 'issued' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('issued')}>Issued</Button>
          <Button variant={statusFilter === 'void' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('void')}>Void</Button>
          <Button variant={statusFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('all')}>All</Button>
        </div>

        <DataTable
          rows={filteredInvoices}
          columns={[
            { key: 'invoiceNumber', header: 'Invoice', render: (row: any) => row.invoiceNumber || '-' },
            { key: 'patientName', header: 'Patient', render: (row: any) => row.patientName || '-' },
            { key: 'doctorName', header: 'Doctor', render: (row: any) => row.doctorName || '-' },
            { key: 'total', header: 'Total', render: (row: any) => `LKR ${Number(row.total || 0).toLocaleString()}` },
            { key: 'status', header: 'Status', render: (row: any) => row.status || 'issued' },
          ]}
          rowActions={[
            {
              label: 'View/Print',
              onClick: (row) => setReceiptInvoice(row),
            },
            {
              label: 'Record Payment',
              onClick: (row) => {
                setPaymentInvoice(row);
                setPaymentAmount(String(row.total || 0));
                setPaymentMethod('cash');
                setPaymentDrawerOpen(true);
              },
            },
            {
              label: 'Void',
              onClick: (row) => {
                setVoidTarget(row);
                setVoidReason('');
              },
            },
          ]}
        />
      </Card>

      <Drawer open={paymentDrawerOpen} onClose={() => setPaymentDrawerOpen(false)} title="Record payment">
        <div className="space-y-2">
          <p className="text-sm">Invoice: {paymentInvoice?.invoiceNumber || '-'}</p>
          <select className="w-full rounded-md border border-slate-300 px-3 py-2" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank">Bank</option>
            <option value="other">Other</option>
          </select>
          <Input type="number" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
          <Button
            onClick={async () => {
              if (!paymentInvoice) return;
              await recordPayment(DEFAULT_CLINIC_ID, user?.uid || 'admin', user?.email, {
                invoiceId: paymentInvoice.id,
                invoiceNumber: paymentInvoice.invoiceNumber,
                method: paymentMethod,
                amount: Number(paymentAmount || 0),
                receivedAt: toIso(),
              });
              push('Payment recorded', 'success');
              setPaymentDrawerOpen(false);
            }}
          >
            Save payment
          </Button>
        </div>
      </Drawer>

      <Drawer open={!!receiptInvoice} onClose={() => setReceiptInvoice(null)} title="Receipt view">
        {receiptInvoice && (
          <div className="space-y-2" id="receipt-view">
            <h3 className="text-lg font-semibold">Hospital CRM Clinic</h3>
            <p>Invoice: {receiptInvoice.invoiceNumber}</p>
            <p>Patient: {receiptInvoice.patientName}</p>
            <p>Doctor: {receiptInvoice.doctorName || '-'}</p>
            <div className="rounded border">
              {(receiptInvoice.items || []).map((item: any, idx: number) => (
                <div key={`${item.name}-${idx}`} className="grid grid-cols-4 border-b px-2 py-1 text-sm">
                  <span>{item.name}</span><span>{item.qty}</span><span>{item.unitPrice}</span><span>{item.lineTotal}</span>
                </div>
              ))}
            </div>
            <p>Subtotal: LKR {Number(receiptInvoice.subtotal || 0).toLocaleString()}</p>
            <p>Discount: LKR {Number(receiptInvoice.discount || 0).toLocaleString()}</p>
            <p className="font-semibold">Total: LKR {Number(receiptInvoice.total || 0).toLocaleString()}</p>
            {receiptInvoice.status === 'void' && <p className="text-red-600 font-bold">VOID</p>}
            <Button variant="secondary" onClick={() => window.print()}>Print</Button>
          </div>
        )}
      </Drawer>

      <Drawer open={!!voidTarget} onClose={() => setVoidTarget(null)} title="Void invoice">
        <div className="space-y-2">
          <p className="text-sm">Invoice: {voidTarget?.invoiceNumber || '-'}</p>
          <Input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Void reason" />
          <Button
            variant="danger"
            onClick={async () => {
              if (!voidTarget) return;
              try {
                await voidInvoice(
                  DEFAULT_CLINIC_ID,
                  user?.uid || 'admin',
                  voidTarget.id,
                  voidReason || 'Not provided',
                  user?.email,
                );
                push('Invoice voided', 'info');
              } catch (error) {
                push((error as Error).message, 'error');
              }
              setVoidTarget(null);
            }}
          >
            Confirm void
          </Button>
        </div>
      </Drawer>
    </div>
  );
};
