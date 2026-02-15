import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { DataTable } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { Skeleton } from '@/components/ui/Skeleton';

export const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 250);

  useEffect(() => {
    const q = query(
      collection(db, 'clinics', DEFAULT_CLINIC_ID, 'appointments'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(
    () =>
      appointments.filter((item) =>
        `${item.patientName || ''} ${item.patientId || ''} ${item.doctorId || ''}`
          .toLowerCase()
          .includes(debounced.toLowerCase()),
      ),
    [appointments, debounced],
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Appointments" subtitle="Live queue visibility and status tracking" />
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="mb-3">
          <Input placeholder="Search patient or doctor" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <DataTable
            rows={filtered}
            columns={[
              {
                key: 'patient',
                header: 'Patient',
                render: (row: any) => row.patientName || row.patientId || 'Walk-in',
                sortValue: (row: any) => row.patientName || row.patientId || '',
              },
              {
                key: 'doctor',
                header: 'Doctor',
                render: (row: any) => row.doctorId || '-',
                sortValue: (row: any) => row.doctorId || '',
              },
              {
                key: 'status',
                header: 'Status',
                render: (row: any) => <StatusPill label={row.status || 'booked'} />,
                sortValue: (row: any) => row.status || '',
              },
            ]}
          />
        )}
      </div>
    </div>
  );
};
