import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createInvoice, subscribeByClinic, voidInvoice } from '@/lib/clinicDb';
import { useToast } from '@/components/ui/Toast';
import { PatientIdentityBar } from '@/components/ui/PatientIdentityBar';
import { Card, CardHeader } from '@/components/ui/Card';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { Select } from '@/components/ui/Select';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { DataTable } from '@/components/ui/DataTable';

export const BillingPage = () => {
  const [invoiceNo, setInvoiceNo] = useState('');
  const [patientName, setPatientName] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [qty, setQty] = useState('1');
  const [discount, setDiscount] = useState('0');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const { push } = useToast();
  const { user } = useAuthContext();

  useEffect(() => {
    const unsubDoctors = subscribeByClinic(DEFAULT_CLINIC_ID, 'doctors', (rows) => setDoctors(rows as any[]));
    const unsubServices = subscribeByClinic(DEFAULT_CLINIC_ID, 'services', (rows) => setServices(rows as any[]));
    const unsubInvoices = subscribeByClinic(DEFAULT_CLINIC_ID, 'invoices', (rows) => setInvoices(rows as any[]));
    return () => {
      unsubDoctors();
      unsubServices();
      unsubInvoices();
    };
  }, []);

  const selectedDoctor = doctors.find((item) => item.id === doctorId);
  const selectedService = services.find((item) => item.id === serviceId);

  const lineTotal = useMemo(
    () => Number(qty || 0) * Number(selectedService?.amount || 0),
    [qty, selectedService],
  );

  return (
    <div className="space-y-4">
      <PatientIdentityBar />
      <PageHeader title="Billing" subtitle="Generate invoices quickly with minimal clicks" />
      <Card>
        <CardHeader title="Create Invoice" subtitle="Persisted in Firestore and visible in reports." />
        <div className="grid max-w-4xl gap-2 md:grid-cols-3">
          <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Patient name" />
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">Select doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
            ))}
          </Select>
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Select service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>{service.name} - {service.amount}</option>
            ))}
          </Select>
          <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" type="number" min="1" />
          <Input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Discount" type="number" min="0" />
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm">Line total: LKR {lineTotal.toLocaleString()}</div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            onClick={async () => {
              if (!patientName || !selectedService) {
                push('Patient and service are required', 'error');
                return;
              }
              const res = await createInvoice(DEFAULT_CLINIC_ID, user?.uid || 'admin', user?.email, {
                patientName,
                doctorId: selectedDoctor?.id,
                doctorName: selectedDoctor?.fullName,
                items: [{
                  serviceId: selectedService.id,
                  name: selectedService.name,
                  qty: Number(qty || 1),
                  price: Number(selectedService.amount || 0),
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
