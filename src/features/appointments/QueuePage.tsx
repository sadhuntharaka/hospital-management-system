import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createWalkInToken } from '@/lib/clinicDb';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { useToast } from '@/components/ui/Toast';

export const QueuePage = () => {
  const [doctorId, setDoctorId] = useState('');
  const [created, setCreated] = useState<number | null>(null);
  const { user } = useAuthContext();
  const { push } = useToast();

  return (
    <div className="space-y-4">
      <PageHeader title="Walk-in Queue" subtitle="Fast token generation with transaction safety" />
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="flex max-w-xl gap-2">
          <Input value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="Doctor ID" />
          <Button
            onClick={async () => {
              const result = await createWalkInToken(
                DEFAULT_CLINIC_ID,
                doctorId,
                user?.uid || 'admin',
              );
              setCreated(result.token);
              push(`Token #${result.token} created`);
            }}
          >
            Create token
          </Button>
        </div>
        {created && <p className="mt-3 text-sm text-slate-700">Created token #{created}</p>}
      </div>
    </div>
  );
};
