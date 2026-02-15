import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { format, isThisWeek, isTomorrow, isToday, parseISO } from 'date-fns';
import { db } from '@/lib/firebase';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { DataTable } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Toolbar } from '@/components/ui/Toolbar';
import { useToast } from '@/components/ui/Toast';

const statusFilters = ['all', 'booked', 'arrived', 'in_consult', 'completed', 'cancelled'];

type DateFilter = 'today' | 'tomorrow' | 'week';

export const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const debounced = useDebouncedValue(search, 250);
  const { push } = useToast();

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
      appointments.filter((item) => {
        const txtMatch = `${item.patientName || ''} ${item.patientId || ''} ${item.doctorId || ''}`
          .toLowerCase()
          .includes(debounced.toLowerCase());
        const statusMatch = status === 'all' ? true : (item.status || 'booked') === status;
        const dateString = item.date || new Date().toISOString().slice(0, 10);
        const date = parseISO(dateString);
        const dateMatch =
          dateFilter === 'today'
            ? isToday(date)
            : dateFilter === 'tomorrow'
              ? isTomorrow(date)
              : isThisWeek(date, { weekStartsOn: 1 });

        return txtMatch && statusMatch && dateMatch;
      }),
    [appointments, debounced, status, dateFilter],
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Appointments" subtitle="Live queue visibility and status tracking" />
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <Toolbar
          left={
            <>
              <Input placeholder="Search patient or doctor" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[280px]" />
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((item) => (
                  <Button key={item} variant={status === item ? 'primary' : 'secondary'} onClick={() => setStatus(item)}>
                    {item === 'all' ? 'All' : item.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </>
          }
          right={
            <div className="flex gap-2">
              <Button variant={dateFilter === 'today' ? 'primary' : 'secondary'} onClick={() => setDateFilter('today')}>Today</Button>
              <Button variant={dateFilter === 'tomorrow' ? 'primary' : 'secondary'} onClick={() => setDateFilter('tomorrow')}>Tomorrow</Button>
              <Button variant={dateFilter === 'week' ? 'primary' : 'secondary'} onClick={() => setDateFilter('week')}>This Week</Button>
            </div>
          }
        />
        {loading ? (
          <TableSkeleton rows={5} />
        ) : (
          <DataTable
            rows={filtered}
            columns={[
              {
                key: 'time',
                header: 'Time',
                render: (row: any) => row.time || format(parseISO(row.date || new Date().toISOString().slice(0, 10)), 'dd MMM'),
                sortValue: (row: any) => row.time || row.date || '',
              },
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
            rowActions={[
              { label: 'Mark Arrived', onClick: () => push('Status action placeholder', 'info') },
              { label: 'Mark Complete', onClick: () => push('Status action placeholder', 'info') },
            ]}
          />
        )}
      </div>
    </div>
  );
};
