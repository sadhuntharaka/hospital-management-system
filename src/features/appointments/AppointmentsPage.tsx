import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PageCard } from '@/components/ui/PageCard';
import { Badge } from '@/components/ui/Badge';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';

export const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'clinics', DEFAULT_CLINIC_ID, 'appointments'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) =>
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, []);

  return (
    <PageCard title="Appointments">
      <div className="space-y-2">
        {appointments.map((a) => (
          <div className="flex items-center justify-between rounded border p-2" key={a.id}>
            <div>
              {a.patientName || a.patientId || 'Walk-in'} - Dr. {a.doctorId}
            </div>
            <Badge label={a.status || 'booked'} />
          </div>
        ))}
      </div>
    </PageCard>
  );
};
