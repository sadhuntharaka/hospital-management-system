import { useState } from 'react';
import { PageCard } from '@/components/ui/PageCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createWalkInToken } from '@/lib/clinicDb';
import { useAuthContext } from '@/features/auth/AuthProvider';

export const QueuePage = () => {
  const [doctorId, setDoctorId] = useState('');
  const [created, setCreated] = useState<number | null>(null);
  const { claims, user } = useAuthContext();

  return (
    <PageCard title="Walk-in Queue">
      <div className="flex gap-2">
        <Input value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="Doctor ID" />
        <Button onClick={async () => {
          const result = await createWalkInToken(claims!.clinicId, doctorId, user!.uid);
          setCreated(result.token);
        }}>Create token</Button>
      </div>
      {created && <p className="mt-3">Created token #{created}</p>}
    </PageCard>
  );
};
