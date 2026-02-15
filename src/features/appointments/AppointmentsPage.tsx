import { useEffect, useMemo, useState } from 'react';
import { format, isThisWeek, isTomorrow, isToday, parseISO } from 'date-fns';
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
import { useAuthContext } from '@/features/auth/AuthProvider';
import { createAppointment, subscribeByClinic, updateAppointment } from '@/lib/clinicDb';
import { Combobox } from '@/components/ui/Combobox';
import { useDoctors, usePatients } from '@/hooks/useLookupData';

const statusFilters = ['all', 'booked', 'arrived', 'in_consult', 'completed', 'cancelled'];

type DateFilter = 'today' | 'tomorrow' | 'week';

export const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; label: string } | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string; label: string } | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('');
  const debounced = useDebouncedValue(search, 250);
  const { push } = useToast();
  const { user } = useAuthContext();

  const { data: doctors, loading: doctorsLoading } = useDoctors(DEFAULT_CLINIC_ID);
  const { data: patients, loading: patientsLoading } = usePatients(DEFAULT_CLINIC_ID);

  useEffect(() => {
    const unsubA = subscribeByClinic(DEFAULT_CLINIC_ID, 'appointments', (rows) => {
      setAppointments(rows as any[]);
      setLoading(false);
    });
    return () => {
      unsubA();
    };
  }, []);

  const filtered = useMemo(
    () =>
      appointments.filter((item) => {
        const txtMatch = `${item.patientName || ''} ${item.patientId || ''} ${item.doctorName || ''}`
          .toLowerCase()
          .includes(debounced.toLowerCase());
        const statusMatch = status === 'all' ? true : (item.status || 'booked') === status;
        const dateString = item.date || new Date().toISOString().slice(0, 10);
        const dateObj = parseISO(dateString);
        const dateMatch =
          dateFilter === 'today'
            ? isToday(dateObj)
            : dateFilter === 'tomorrow'
              ? isTomorrow(dateObj)
              : isThisWeek(dateObj, { weekStartsOn: 1 });

        return txtMatch && statusMatch && dateMatch;
      }),
    [appointments, debounced, status, dateFilter],
  );

  const doctorItems = useMemo(() => doctors.map((d) => ({ id: d.id as string, label: (d.fullName as string) || d.id as string, meta: (d.specialty as string) || undefined })), [doctors]);
  const patientItems = useMemo(() => patients.map((p) => ({ id: p.id as string, label: (p.fullName as string) || p.id as string, meta: `${p.phone || ''} ${p.nic || ''}`.trim() || undefined })), [patients]);

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

        <div className="mb-4 grid gap-2 rounded-md border p-3 md:grid-cols-5">
          <Combobox
            label="Patient"
            value={selectedPatient}
            onChange={setSelectedPatient}
            items={patientItems}
            loading={patientsLoading}
            placeholder="Select patient"
          />
          <Combobox
            label="Doctor"
            value={selectedDoctor}
            onChange={setSelectedDoctor}
            items={doctorItems}
            loading={doctorsLoading}
            placeholder="Select doctor"
          />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <Button
            onClick={async () => {
              if (!selectedPatient || !selectedDoctor) {
                push('Patient and doctor are required', 'error');
                return;
              }
              await createAppointment(DEFAULT_CLINIC_ID, user?.uid || 'admin', user?.email, {
                patientId: selectedPatient.id,
                patientName: selectedPatient.label,
                doctorId: selectedDoctor.id,
                doctorName: selectedDoctor.label,
                date,
                time,
                status: 'booked',
              });
              setSelectedPatient(null);
              setSelectedDoctor(null);
              setTime('');
              push('Appointment created', 'success');
            }}
          >
            + New Appointment
          </Button>
        </div>

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
                render: (row: any) => row.doctorName || row.doctorId || '-',
                sortValue: (row: any) => row.doctorName || row.doctorId || '',
              },
              {
                key: 'status',
                header: 'Status',
                render: (row: any) => <StatusPill label={row.status || 'booked'} />,
                sortValue: (row: any) => row.status || '',
              },
            ]}
            rowActions={[
              {
                label: 'Mark Arrived',
                onClick: async (row) => {
                  await updateAppointment(DEFAULT_CLINIC_ID, row.id, user?.uid || 'admin', { status: 'arrived' });
                  push('Appointment set to arrived', 'success');
                },
              },
              {
                label: 'Mark Complete',
                onClick: async (row) => {
                  await updateAppointment(DEFAULT_CLINIC_ID, row.id, user?.uid || 'admin', { status: 'completed' });
                  push('Appointment completed', 'success');
                },
              },
            ]}
          />
        )}
      </div>
    </div>
  );
};
