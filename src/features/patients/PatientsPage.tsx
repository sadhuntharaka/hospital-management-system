import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { createPatient, listenPatients, updatePatient } from '@/lib/clinicDb';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader } from '@/components/ui/Card';
import { Toolbar } from '@/components/ui/Toolbar';
import { TableSkeleton } from '@/components/ui/Skeleton';

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  nic: z.string().min(5),
  patientCode: z.string().min(3),
});

type PatientForm = z.infer<typeof schema>;

export const PatientsPage = () => {
  const { user } = useAuthContext();
  const { push } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const debouncedSearch = useDebouncedValue(search, 250);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = listenPatients(DEFAULT_CLINIC_ID, (rows) => {
      setData(rows as any[]);
      setIsLoading(false);
    });
    return unsub;
  }, []);
  const form = useForm<PatientForm>({ resolver: zodResolver(schema), defaultValues: { fullName: '', nic: '', phone: '', patientCode: '' } });

  const watchedPhone = useWatch({ control: form.control, name: 'phone' });
  const watchedNic = useWatch({ control: form.control, name: 'nic' });

  const filtered = useMemo(
    () =>
      (data as any[]).filter((p: any) =>
        `${p.fullName || ''} ${p.phone || ''} ${p.nic || ''} ${p.patientCode || ''}`
          .toLowerCase()
          .includes(debouncedSearch.toLowerCase()),
      ),
    [data, debouncedSearch],
  );

  const duplicate = useMemo(() => {
    if (selectedPatient) return null;
    return (data as any[]).find((p: any) => (watchedPhone && p.phone === watchedPhone) || (watchedNic && p.nic === watchedNic));
  }, [data, watchedPhone, watchedNic, selectedPatient]);

  const createMutation = useMutation({
    mutationFn: (payload: PatientForm) =>
      createPatient(DEFAULT_CLINIC_ID, user?.uid || 'admin', payload, user?.email),
    onSuccess: () => {
      form.reset();
      setShowDrawer(false);
      push('Patient created', 'success');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: PatientForm) =>
      updatePatient(DEFAULT_CLINIC_ID, selectedPatient.id, user?.uid || 'admin', payload),
    onSuccess: () => {
      form.reset();
      setSelectedPatient(null);
      setShowDrawer(false);
      push('Patient updated', 'success');
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Patients"
        subtitle="Fast CRM search, duplicate checks, and quick patient actions"
        actions={<Button onClick={() => { setSelectedPatient(null); form.reset(); setShowDrawer(true); }}>+ New Patient</Button>}
      />

      <Card>
        <CardHeader title="Patient Registry" subtitle="Use filters and quick actions for reception workflow." />
        <Toolbar
          left={<Input placeholder="Search by name, phone, NIC, code" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[360px]" />}
          right={<p className="text-xs text-slate-500">{filtered.length} records</p>}
        />

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No patients"
            description="Create a patient to start consultation and billing workflows."
            action={<Button onClick={() => { setSelectedPatient(null); setShowDrawer(true); }}>Create patient</Button>}
          />
        ) : (
          <DataTable
            rows={filtered as any[]}
            columns={[
              {
                key: 'patientCode',
                header: 'Code',
                render: (row: any) => row.patientCode || '-',
                sortValue: (row: any) => row.patientCode || '',
              },
              {
                key: 'fullName',
                header: 'Name',
                render: (row: any) => (
                  <Link className="text-brand hover:underline" to={`/patients/${row.id}`}>
                    {row.fullName}
                  </Link>
                ),
                sortValue: (row: any) => row.fullName || '',
              },
              {
                key: 'phone',
                header: 'Phone',
                render: (row: any) => row.phone || '-',
                sortValue: (row: any) => row.phone || '',
              },
              {
                key: 'nic',
                header: 'NIC',
                render: (row: any) => row.nic || '-',
                sortValue: (row: any) => row.nic || '',
              },
            ]}
            rowActions={[
              { label: 'Open profile', onClick: (row: any) => navigate(`/patients/${row.id}`) },
              { label: 'Add to Queue', onClick: (row: any) => navigate(`/queue?patientId=${row.id}&patientName=${encodeURIComponent(row.fullName || '')}`) },
              { label: 'Create appointment', onClick: (row: any) => navigate(`/appointments?patientId=${row.id}&patientName=${encodeURIComponent(row.fullName || '')}`) },
              {
                label: 'Quick edit',
                onClick: (row: any) => {
                  setSelectedPatient(row);
                  form.reset({
                    fullName: row.fullName || '',
                    phone: row.phone || '',
                    nic: row.nic || '',
                    patientCode: row.patientCode || '',
                  });
                  setShowDrawer(true);
                },
              },
            ]}
          />
        )}
      </Card>

      <Drawer open={showDrawer} onClose={() => setShowDrawer(false)} title={selectedPatient ? `Edit ${selectedPatient.fullName}` : 'New Patient'}>
        {duplicate && !selectedPatient && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">Possible duplicate found</p>
            <p>{duplicate.fullName} ({duplicate.phone} / {duplicate.nic})</p>
            <Button variant="secondary" className="mt-2" onClick={() => navigate(`/patients/${duplicate.id}`)}>Open existing patient</Button>
          </div>
        )}
        <form className="space-y-2" onSubmit={form.handleSubmit((v) => selectedPatient ? updateMutation.mutate(v) : createMutation.mutate(v))}>
          <Input placeholder="Patient code" {...form.register('patientCode')} />
          <Input placeholder="Full name" {...form.register('fullName')} />
          <Input placeholder="Phone" {...form.register('phone')} />
          <Input placeholder="NIC" {...form.register('nic')} />
          <Button type="submit" disabled={!!duplicate && !selectedPatient}>{selectedPatient ? 'Update patient' : 'Save patient'}</Button>
        </form>
      </Drawer>
    </div>
  );
};
