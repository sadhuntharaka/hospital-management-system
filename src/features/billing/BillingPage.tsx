import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createInvoice, subscribeByClinic, voidInvoice } from '@/lib/clinicDb';
import { useToast } from '@/components/ui/Toast';
import { PatientIdentityBar } from '@/components/ui/PatientIdentityBar';
import { Card, CardHeader } from '@/components/ui/Card';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { DataTable } from '@/components/ui/DataTable';
import { Combobox } from '@/components/ui/Combobox';
import { useDoctors, usePatients, useServices } from '@/hooks/useLookupData';

export const BillingPage = () => {
  const [invoiceNo, setInvoiceNo] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; label: string } | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string; label: string } | null>(null);
  const [selectedService, setSelectedService] = useState<{ id: string; label: string } | null>(null);
  const [qty, setQty] = useState('1');
  const [discount, setDiscount] = useState('0');
  const [invoices, setInvoices] = useState<any[]>([]);
  const { push } = useToast();
  const { user } = useAuthContext();

  const { data: doctors, loading: doctorsLoading } = useDoctors(DEFAULT_CLINIC_ID);
  const { data: patients, loading: patientsLoading } = usePatients(DEFAULT_CLINIC_ID);
  const { data: services, loading: servicesLoading } = useServices(DEFAULT_CLINIC_ID);

  useEffect(() => {
    const unsubInvoices = subscribeByClinic(DEFAULT_CLINIC_ID, 'invoices', (rows) => setInvoices(rows as any[]));
    return () => {
      unsubInvoices();
    };
  }, []);

  const serviceDoc = services.find((item) => item.id === selectedService?.id);

  const lineTotal = useMemo(
    () => Number(qty || 0) * Number(serviceDoc?.amount || 0),
    [qty, serviceDoc],
  );

  const doctorItems = useMemo(() => doctors.map((d) => ({ id: d.id as string, label: (d.fullName as string) || d.id as string, meta: (d.specialty as string) || undefined })), [doctors]);
  const patientItems = useMemo(() => patients.map((p) => ({ id: p.id as string, label: (p.fullName as string) || p.id as string, meta: `${p.phone || ''} ${p.nic || ''}`.trim() || undefined })), [patients]);
  const serviceItems = useMemo(() => services.map((svc) => ({ id: svc.id as string, label: (svc.name as string) || svc.id as string, meta: `LKR ${svc.amount || 0}` })), [services]);

  return (
    <div className="space-y-4">
      <PatientIdentityBar />
      <PageHeader title="Billing" subtitle="Generate invoices quickly with minimal clicks" />
      <Card>
        <CardHeader title="Create Invoice" subtitle="Persisted in Firestore and visible in reports." />
        <div className="grid max-w-4xl gap-2 md:grid-cols-3">
          <Combobox label="Patient" value={selectedPatient} onChange={setSelectedPatient} items={patientItems} loading={patientsLoading} placeholder="Select patient" />
          <Combobox label="Doctor" value={selectedDoctor} onChange={setSelectedDoctor} items={doctorItems} loading={doctorsLoading} placeholder="Select doctor" />
          <Combobox label="Service" value={selectedService} onChange={setSelectedService} items={serviceItems} loading={servicesLoading} placeholder="Select service" />
          <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" type="number" min="1" />
          <Input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Discount" type="number" min="0" />
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm">Line total: LKR {lineTotal.toLocaleString()}</div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            onClick={async () => {
              if (!selectedPatient || !selectedService) {
                push('Patient and service are required', 'error');
                return;
              }
              const res = await createInvoice(DEFAULT_CLINIC_ID, user?.uid || 'admin', user?.email, {
                patientId: selectedPatient.id,
                patientName: selectedPatient.label,
                doctorId: selectedDoctor?.id,
                doctorName: selectedDoctor?.label,
                items: [{
                  serviceId: selectedService.id,
                  name: selectedService.label,
                  qty: Number(qty || 1),
                  price: Number(serviceDoc?.amount || 0),
                }],
                discount: Number(discount || 0),
              });
              setInvoiceNo(res.invoiceNumber);
              push('Invoice created', 'success');
            }}
          >
            Create invoice
          </Button>
          <Input value={invoiceNo} readOnly placeholder="INV-000001" />
          <Button variant="secondary" onClick={() => window.print()}>
            Print invoice / receipt
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Recent invoices" />
        <DataTable
          rows={invoices}
          columns={[
            { key: 'invoiceNumber', header: 'Invoice', render: (row: any) => row.invoiceNumber },
            { key: 'patientName', header: 'Patient', render: (row: any) => row.patientName },
            { key: 'doctorName', header: 'Doctor', render: (row: any) => row.doctorName || '-' },
            { key: 'total', header: 'Total', render: (row: any) => `LKR ${Number(row.total || 0).toLocaleString()}` },
            { key: 'status', header: 'Status', render: (row: any) => row.status || 'issued' },
          ]}
          rowActions={[
            {
              label: 'Void',
              onClick: async (row) => {
                await voidInvoice(DEFAULT_CLINIC_ID, row.id, user?.uid || 'admin', user?.email);
                push('Invoice voided', 'info');
              },
            },
          ]}
        />
      </Card>
    </div>
  );
};
