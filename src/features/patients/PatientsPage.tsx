import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { createPatient, listByClinic } from '@/lib/clinicDb';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/Toast';

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  nic: z.string().min(5),
  patientCode: z.string().min(3),
});

export const PatientsPage = () => {
  const { user } = useAuthContext();
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const debouncedSearch = useDebouncedValue(search, 250);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['patients', DEFAULT_CLINIC_ID],
    queryFn: () => listByClinic(DEFAULT_CLINIC_ID, 'patients'),
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

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
    const phone = form.watch('phone') || '';
    const nic = form.watch('nic') || '';
    return (data as any[]).find((p: any) => p.phone === phone || p.nic === nic);
  }, [data, form.watch('phone'), form.watch('nic')]);

  const createMutation = useMutation({
    mutationFn: (payload: z.infer<typeof schema>) =>
      createPatient(DEFAULT_CLINIC_ID, user?.uid || 'admin', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      form.reset();
      push('Patient created');
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Patients"
        subtitle="Fast CRM search, duplicate checks, and quick patient actions"
        actions={<Button onClick={() => setShowDrawer(true)}>+ New Patient</Button>}
      />

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search by name, phone, NIC, code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No patients"
            description="Create a patient to start consultation and billing workflows."
            action={<Button onClick={() => setShowDrawer(true)}>Create patient</Button>}
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
              {
                label: 'Quick edit',
                onClick: (row: any) => {
                  setSelectedPatient(row);
                  setShowDrawer(true);
                },
              },
              {
                label: 'Open profile',
                onClick: (row: any) => {
                  window.location.href = `/patients/${row.id}`;
                },
              },
            ]}
          />
        )}
      </div>

      <Drawer open={showDrawer} onClose={() => setShowDrawer(false)} title={selectedPatient ? `Edit ${selectedPatient.fullName}` : 'New Patient'}>
        {duplicate && !selectedPatient && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
            Possible duplicate found: {duplicate.fullName} ({duplicate.phone} / {duplicate.nic})
          </div>
        )}
        <form className="space-y-2" onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}>
          <Input placeholder="Patient code" {...form.register('patientCode')} />
          <Input placeholder="Full name" {...form.register('fullName')} />
          <Input placeholder="Phone" {...form.register('phone')} />
          <Input placeholder="NIC" {...form.register('nic')} />
          <Button type="submit" disabled={!!duplicate && !selectedPatient}>Save patient</Button>
        </form>
      </Drawer>
    </div>
  );
};
