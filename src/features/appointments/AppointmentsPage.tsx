import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import {
  createAppointment,
  createVisitFromAppointment,
  listenAppointments,
  updateAppointmentStatus,
} from '@/lib/clinicDb';
import { Combobox } from '@/components/ui/Combobox';
import { useDoctors, usePatients } from '@/hooks/useLookupData';
import { Drawer } from '@/components/ui/Drawer';

const statusFilters = ['all', 'booked', 'arrived', 'in_consult', 'completed', 'cancelled'];

export const AppointmentsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; label: string } | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string; label: string } | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const debounced = useDebouncedValue(search, 250);
  const { push } = useToast();
  const { user } = useAuthContext();

  const { data: doctors, loading: doctorsLoading } = useDoctors(DEFAULT_CLINIC_ID);
  const { data: patients, loading: patientsLoading } = usePatients(DEFAULT_CLINIC_ID);

  useEffect(() => {
    const unsub = listenAppointments(DEFAULT_CLINIC_ID, date, date, (rows) => {
      setAppointments(rows as any[]);
      setLoading(false);
    });
    return unsub;
  }, [date]);

  useEffect(() => {
    const pid = searchParams.get('patientId');
    const pname = searchParams.get('patientName');
    if (pid) {
      setSelectedPatient({ id: pid, label: pname || pid });
      setDrawerOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(
    () =>
      appointments.filter((item) => {
        const txtMatch = `${item.patientName || ''} ${item.patientId || ''} ${item.doctorName || ''}`
          .toLowerCase()
          .includes(debounced.toLowerCase());
        const statusMatch = status === 'all' ? true : (item.status || 'booked') === status;
        const doctorMatch = doctorFilter === 'all' ? true : item.doctorId === doctorFilter;

        return txtMatch && statusMatch && doctorMatch;
      }),
    [appointments, debounced, status, doctorFilter],
  );

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
        title="Appointments"
        subtitle="Realtime appointments with consult handoff"
        actions={<Button onClick={() => setDrawerOpen(true)}>+ New Appointment</Button>}
      />
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <Toolbar
          left={
            <>
              <Input
                placeholder="Search patient or doctor"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[280px]"
              />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <select
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
              >
                <option value="all">All doctors</option>
                {doctorItems.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </>
          }
          right={
            <div className="flex gap-2">
              {statusFilters.map((item) => (
                <Button
                  key={item}
                  variant={status === item ? 'primary' : 'secondary'}
                  onClick={() => setStatus(item)}
                >
                  {item === 'all' ? 'All' : item.replace('_', ' ')}
                </Button>
              ))}
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
                render: (row: any) => row.time || row.date,
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
                  await updateAppointmentStatus(DEFAULT_CLINIC_ID, row.id, user?.uid || 'admin', 'arrived');
                  push('Appointment set to arrived', 'success');
                },
              },
              {
                label: 'Start Consult',
                onClick: async (row) => {
                  const visit = await createVisitFromAppointment(DEFAULT_CLINIC_ID, user?.uid || 'admin', row);
                  navigate(`/consultation?visitId=${visit.id}`);
                },
              },
              {
                label: 'Complete',
                onClick: async (row) => {
                  await updateAppointmentStatus(
                    DEFAULT_CLINIC_ID,
                    row.id,
                    user?.uid || 'admin',
                    'completed',
                  );
                  push('Appointment completed', 'success');
                },
              },
            ]}
          />
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Appointment">
        <div className="space-y-3">
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
                source: 'appointment',
              });
              setSelectedPatient(null);
              setSelectedDoctor(null);
              setTime('');
              setDrawerOpen(false);
              push('Appointment created', 'success');
            }}
          >
            Save appointment
          </Button>
        </div>
      </Drawer>
    </div>
  );
};
