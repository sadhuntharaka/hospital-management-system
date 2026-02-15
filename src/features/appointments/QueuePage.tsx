import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createWalkInToken } from '@/lib/clinicDb';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { useToast } from '@/components/ui/Toast';
import { Select } from '@/components/ui/Select';

const doctorOptions = [
  { value: '', label: 'Select doctor' },
  { value: 'doctor-1', label: 'Dr. Perera' },
  { value: 'doctor-2', label: 'Dr. Silva' },
  { value: 'doctor-3', label: 'Dr. Fernando' },
];

export const QueuePage = () => {
  const [doctorId, setDoctorId] = useState('');
  const [created, setCreated] = useState<number | null>(null);
  const [error, setError] = useState('');
  const { user } = useAuthContext();
  const { push } = useToast();

  return (
    <div className="space-y-4">
      <PageHeader title="Walk-in Queue" subtitle="Fast token generation with transaction safety" />
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="flex max-w-xl flex-col gap-2 md:flex-row">
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            {doctorOptions.map((doctor) => (
              <option key={doctor.value} value={doctor.value}>{doctor.label}</option>
            ))}
          </Select>
          <Input placeholder="or type doctor ID" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} />
          <Button
            onClick={async () => {
              setError('');
              if (!doctorId.trim()) {
                setError('Doctor is required');
                return;
              }

              const result = await createWalkInToken(
                DEFAULT_CLINIC_ID,
                doctorId,
                user?.uid || 'admin',
              );
              setCreated(result.token);
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
      </div>
    </div>
  );
};
