import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { createQueueToken, subscribeTodayQueue, updateQueue } from '@/lib/clinicDb';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { useToast } from '@/components/ui/Toast';
import { DataTable } from '@/components/ui/DataTable';
import { Combobox } from '@/components/ui/Combobox';
import { useDoctors, usePatients } from '@/hooks/useLookupData';

export const QueuePage = () => {
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string; label: string } | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; label: string } | null>(null);
  const [created, setCreated] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [queueRows, setQueueRows] = useState<any[]>([]);
  const { user } = useAuthContext();
  const { push } = useToast();
  const { data: doctors, loading: doctorsLoading } = useDoctors(DEFAULT_CLINIC_ID);
  const { data: patients, loading: patientsLoading } = usePatients(DEFAULT_CLINIC_ID);

  useEffect(() => {
    const unsubQ = subscribeTodayQueue(DEFAULT_CLINIC_ID, (rows) => setQueueRows(rows as any[]));
    return () => {
      unsubQ();
    };
  }, []);

  const doctorItems = useMemo(
    () => doctors.map((d) => ({ id: d.id as string, label: (d.fullName as string) || d.id as string, meta: (d.specialty as string) || undefined })),
    [doctors],
  );
  const patientItems = useMemo(
    () => patients.map((p) => ({ id: p.id as string, label: (p.fullName as string) || p.id as string, meta: `${p.phone || ''} ${p.nic || ''}`.trim() || undefined })),
    [patients],
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Walk-in Queue" subtitle="Fast token generation with transaction safety" />
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="grid max-w-4xl gap-2 md:grid-cols-3">
          <Combobox
            label="Doctor"
            value={selectedDoctor}
            onChange={setSelectedDoctor}
            items={doctorItems}
            loading={doctorsLoading}
            placeholder="Select doctor"
          />
          <Combobox
            label="Patient (optional)"
            value={selectedPatient}
            onChange={setSelectedPatient}
            items={patientItems}
            loading={patientsLoading}
            placeholder="Search patient or leave walk-in"
          />
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={async () => {
                setError('');
                if (!selectedDoctor) {
                  setError('Doctor is required');
                  return;
                }

                const result = await createQueueToken(
                  DEFAULT_CLINIC_ID,
                  user?.uid || 'admin',
                  user?.email,
                  {
                    doctorId: selectedDoctor.id,
                    doctorName: selectedDoctor.label,
                    patientId: selectedPatient?.id,
                    patientName: selectedPatient?.label,
                  },
                );
                setCreated(result.token);
                setSelectedPatient(null);
                push(`Token #${result.token} created`, 'success');
                setTimeout(() => setCreated(null), 2000);
              }}
            >
              Create token
            </Button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {created && (
          <div className="mt-3 rounded-lg border-2 border-dashed border-brand bg-teal-50 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-500">Current Token</p>
            <p className="text-5xl font-bold text-brand">{created}</p>
            <Button variant="secondary" className="mt-3" onClick={() => window.print()}>
              Print Token
            </Button>
          </div>
        )}

        <div className="mt-4">
          <DataTable
            rows={queueRows}
            columns={[
              { key: 'tokenNumber', header: 'Token', render: (row: any) => `#${row.tokenNumber}`, sortValue: (row: any) => row.tokenNumber || 0 },
              { key: 'patientName', header: 'Patient', render: (row: any) => row.patientName || 'Walk-in' },
              { key: 'doctorName', header: 'Doctor', render: (row: any) => row.doctorName || row.doctorId || '-' },
              { key: 'status', header: 'Status', render: (row: any) => row.status || 'waiting' },
            ]}
            rowActions={[
              { label: 'In consult', onClick: async (row) => updateQueue(DEFAULT_CLINIC_ID, row.id, user?.uid || 'admin', { status: 'in_consult' }) },
              { label: 'Done', onClick: async (row) => updateQueue(DEFAULT_CLINIC_ID, row.id, user?.uid || 'admin', { status: 'done' }) },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
