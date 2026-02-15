import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createQueueToken, subscribeByClinic, subscribeTodayQueue, updateQueue } from '@/lib/clinicDb';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { useToast } from '@/components/ui/Toast';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/ui/DataTable';

export const QueuePage = () => {
  const [doctorId, setDoctorId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [created, setCreated] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [queueRows, setQueueRows] = useState<any[]>([]);
  const { user } = useAuthContext();
  const { push } = useToast();

  useEffect(() => {
    const unsubD = subscribeByClinic(DEFAULT_CLINIC_ID, 'doctors', (rows) => setDoctors(rows as any[]));
    const unsubQ = subscribeTodayQueue(DEFAULT_CLINIC_ID, (rows) => setQueueRows(rows as any[]));
    return () => {
      unsubD();
      unsubQ();
    };
  }, []);

  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  return (
    <div className="space-y-4">
      <PageHeader title="Walk-in Queue" subtitle="Fast token generation with transaction safety" />
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="grid max-w-3xl gap-2 md:grid-cols-4">
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">Select doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
            ))}
          </Select>
          <Input placeholder="Walk-in patient name (optional)" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
          <Button
            onClick={async () => {
              setError('');
              if (!doctorId.trim()) {
                setError('Doctor is required');
                return;
              }

              const result = await createQueueToken(
                DEFAULT_CLINIC_ID,
                user?.uid || 'admin',
                user?.email,
                {
                  doctorId,
                  doctorName: selectedDoctor?.fullName || doctorId,
                  patientName: patientName.trim() || undefined,
                },
              );
              setCreated(result.token);
              setPatientName('');
              push(`Token #${result.token} created`, 'success');
              setTimeout(() => setCreated(null), 2000);
            }}
          >
            Create token
          </Button>
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
