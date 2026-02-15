import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  addQueueToken,
  createVisitFromQueue,
  listenQueueToday,
  updateQueueStatus,
} from '@/lib/clinicDb';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { useToast } from '@/components/ui/Toast';
import { DataTable } from '@/components/ui/DataTable';
import { Combobox } from '@/components/ui/Combobox';
import { useDoctors, usePatients } from '@/hooks/useLookupData';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';

export const QueuePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string; label: string } | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; label: string; meta?: string } | null>(null);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [mode, setMode] = useState<'patient' | 'walkin'>('patient');
  const [created, setCreated] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [queueRows, setQueueRows] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuthContext();
  const { push } = useToast();
  const { data: doctors, loading: doctorsLoading } = useDoctors(DEFAULT_CLINIC_ID);
  const { data: patients, loading: patientsLoading } = usePatients(DEFAULT_CLINIC_ID);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const unsubQ = listenQueueToday(DEFAULT_CLINIC_ID, today, (rows) => setQueueRows(rows as any[]));
    return () => {
      unsubQ();
    };
  }, []);

  useEffect(() => {
    const pid = searchParams.get('patientId');
    const pname = searchParams.get('patientName');
    if (pid) {
      setMode('patient');
      setSelectedPatient({ id: pid, label: pname || pid });
      setDrawerOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Walk-in Queue"
        subtitle="Fast token generation with transaction safety"
        actions={<Button onClick={() => setDrawerOpen(true)}>+ Add to Queue</Button>}
      />
      <div className="rounded-lg bg-white p-4 shadow-sm">
        {created && (
          <div className="mb-4 rounded-lg border-2 border-dashed border-brand bg-teal-50 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-500">Current Token</p>
            <p className="text-5xl font-bold text-brand">{created}</p>
            <Button variant="secondary" className="mt-3" onClick={() => window.print()}>
              Print Token
            </Button>
          </div>
        )}

        <DataTable
          rows={queueRows}
          columns={[
            {
              key: 'tokenNumber',
              header: 'Token',
              render: (row: any) => `#${row.tokenNumber}`,
              sortValue: (row: any) => row.tokenNumber || 0,
            },
            {
              key: 'patientName',
              header: 'Patient',
              render: (row: any) => row.patientName || 'Walk-in',
            },
            {
              key: 'doctorName',
              header: 'Doctor',
              render: (row: any) => row.doctorName || row.doctorId || '-',
            },
            { key: 'status', header: 'Status', render: (row: any) => row.status || 'waiting' },
          ]}
          rowActions={[
            {
              label: 'Start Consult',
              onClick: async (row) => {
                const visit = await createVisitFromQueue(DEFAULT_CLINIC_ID, user?.uid || 'admin', row);
                navigate(`/consultation?visitId=${visit.id}`);
              },
            },
            {
              label: 'Done',
              onClick: async (row) =>
                updateQueueStatus(DEFAULT_CLINIC_ID, row.id, user?.uid || 'admin', 'done'),
            },
            {
              label: 'Skip',
              onClick: async (row) =>
                updateQueueStatus(DEFAULT_CLINIC_ID, row.id, user?.uid || 'admin', 'skipped'),
            },
          ]}
        />
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add to Queue">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant={mode === 'patient' ? 'primary' : 'secondary'} onClick={() => setMode('patient')}>Existing patient</Button>
            <Button variant={mode === 'walkin' ? 'primary' : 'secondary'} onClick={() => setMode('walkin')}>Walk-in</Button>
          </div>

          {mode === 'patient' ? (
            <Combobox
              label="Patient"
              value={selectedPatient}
              onChange={(item) => setSelectedPatient(item as any)}
              items={patientItems}
              loading={patientsLoading}
              placeholder="Search patient"
            />
          ) : (
            <>
              <Input placeholder="Walk-in name" value={walkinName} onChange={(e) => setWalkinName(e.target.value)} />
              <Input placeholder="Phone (optional)" value={walkinPhone} onChange={(e) => setWalkinPhone(e.target.value)} />
            </>
          )}

          <Combobox
            label="Doctor"
            value={selectedDoctor}
            onChange={setSelectedDoctor}
            items={doctorItems}
            loading={doctorsLoading}
            placeholder="Select doctor"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            className="w-full"
            onClick={async () => {
              setError('');
              if (!selectedDoctor) {
                setError('Doctor is required');
                return;
              }

              if (mode === 'patient' && !selectedPatient) {
                setError('Patient is required in existing patient mode');
                return;
              }

              if (mode === 'walkin' && !walkinName.trim()) {
                setError('Walk-in name is required');
                return;
              }

              const result = await addQueueToken(DEFAULT_CLINIC_ID, user?.uid || 'admin', {
                doctorId: selectedDoctor.id,
                doctorName: selectedDoctor.label,
                patientId: mode === 'patient' ? selectedPatient?.id : undefined,
                patientName: mode === 'patient' ? selectedPatient?.label : walkinName,
                phone: mode === 'walkin' ? walkinPhone : selectedPatient?.meta?.split(' ')[0],
                source: mode,
              });

              setCreated(result.token);
              push(`Token #${result.token} created`, 'success');
              setDrawerOpen(false);
              setWalkinName('');
              setWalkinPhone('');
              setSelectedPatient(null);
              setTimeout(() => setCreated(null), 2000);
            }}
          >
            Create token
          </Button>
        </div>
      </Drawer>
    </div>
  );
};
