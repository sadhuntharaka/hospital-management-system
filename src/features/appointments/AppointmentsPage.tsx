import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PageCard } from '@/components/ui/PageCard';
import { Badge } from '@/components/ui/Badge';
import { useAuthContext } from '@/features/auth/AuthProvider';

export const AppointmentsPage = () => {
  const { claims } = useAuthContext();
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (!claims?.clinicId) return;
    const q = query(collection(db, 'clinics', claims.clinicId, 'appointments'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [claims?.clinicId]);

  return (
    <PageCard title="Appointments">
      <div className="space-y-2">
        {appointments.map((a) => (
          <div className="flex items-center justify-between rounded border p-2" key={a.id}>
            <div>{a.patientName || a.patientId || 'Walk-in'} - Dr. {a.doctorId}</div>
            <Badge label={a.status || 'booked'} />
          </div>
        ))}
      </div>
    </PageCard>
  );
};
