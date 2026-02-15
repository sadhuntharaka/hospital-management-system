import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { Toolbar } from '@/components/ui/Toolbar';
import { useToast } from '@/components/ui/Toast';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import {
  createDoctor,
  deleteDoctor,
  listDoctors,
  updateDoctor,
  type DoctorPayload,
  type DoctorRecord,
} from '@/lib/doctorDb';
import {
  normalizeTime,
  validateTemplate,
  type ScheduleTemplate,
  type WeekDay,
} from '@/lib/scheduleUtils';

const dayLabels: Record<WeekDay, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const createDefaultTemplate = (): ScheduleTemplate => ({
  slotMinutes: 15,
  timezone: 'Asia/Colombo',
  days: {
    mon: { enabled: true, sessions: [{ start: '08:00', end: '12:00' }] },
    tue: { enabled: true, sessions: [{ start: '08:00', end: '12:00' }] },
    wed: { enabled: true, sessions: [{ start: '08:00', end: '12:00' }] },
    thu: { enabled: true, sessions: [{ start: '08:00', end: '12:00' }] },
    fri: { enabled: true, sessions: [{ start: '08:00', end: '12:00' }] },
    sat: { enabled: false, sessions: [] },
    sun: { enabled: false, sessions: [] },
  },
});

const blankDoctor: DoctorPayload = {
  fullName: '',
  displayName: '',
  specialty: '',
  phone: '',
  regNo: '',
  active: true,
};

export const AdminDoctorsPage = () => {
  const { user } = useAuthContext();
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRecord | null>(null);
  const [doctorForm, setDoctorForm] = useState<DoctorPayload>(blankDoctor);
  const [doctorDrawerOpen, setDoctorDrawerOpen] = useState(false);
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [scheduleDoctor, setScheduleDoctor] = useState<DoctorRecord | null>(null);
  const [template, setTemplate] = useState<ScheduleTemplate>(createDefaultTemplate());
  const [activeDay, setActiveDay] = useState<WeekDay>('mon');
  const [formError, setFormError] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  const debouncedSearch = useDebouncedValue(search, 250);

  useEffect(() => {
    const unsubscribe = listDoctors(DEFAULT_CLINIC_ID, (rows) => {
      setDoctors(rows);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const filtered = useMemo(
    () =>
      doctors.filter((doctor) =>
        `${doctor.fullName || ''} ${doctor.specialty || ''} ${doctor.phone || ''} ${doctor.regNo || ''}`
          .toLowerCase()
          .includes(debouncedSearch.toLowerCase()),
      ),
    [doctors, debouncedSearch],
  );

  const openCreate = () => {
    setSelectedDoctor(null);
    setDoctorForm(blankDoctor);
    setFormError('');
    setDoctorDrawerOpen(true);
  };

  const openEdit = (doctor: DoctorRecord) => {
    setSelectedDoctor(doctor);
    setDoctorForm({
      fullName: doctor.fullName || '',
      displayName: doctor.displayName || '',
      specialty: doctor.specialty || '',
      phone: doctor.phone || '',
      regNo: doctor.regNo || '',
      active: doctor.active !== false,
      scheduleTemplate: doctor.scheduleTemplate,
    });
    setFormError('');
    setDoctorDrawerOpen(true);
  };

  const openSchedule = (doctor: DoctorRecord) => {
    setScheduleDoctor(doctor);
    setTemplate(doctor.scheduleTemplate || createDefaultTemplate());
    setScheduleError('');
    setActiveDay('mon');
    setScheduleDrawerOpen(true);
  };

  const saveDoctor = async () => {
    setFormError('');

    if (!doctorForm.fullName.trim()) {
      setFormError('Doctor full name is required.');
      return;
    }

    try {
      if (selectedDoctor) {
        await updateDoctor(DEFAULT_CLINIC_ID, selectedDoctor.id, user?.uid || 'admin', doctorForm);
        push('Doctor profile updated', 'success');
      } else {
        await createDoctor(DEFAULT_CLINIC_ID, user?.uid || 'admin', doctorForm);
        push('Doctor profile created', 'success');
      }

      setDoctorDrawerOpen(false);
    } catch (error) {
      setFormError((error as Error).message);
      push('Failed to save doctor profile', 'error');
    }
  };

  const saveSchedule = async () => {
    if (!scheduleDoctor) return;

    const normalized: ScheduleTemplate = {
      ...template,
      days: Object.fromEntries(
        (Object.entries(template.days) as [WeekDay, ScheduleTemplate['days'][WeekDay]][]).map(
          ([day, dayValue]) => [
            day,
            {
              ...dayValue,
              sessions: dayValue.sessions.map((session) => ({
                ...session,
                start: normalizeTime(session.start),
                end: normalizeTime(session.end),
              })),
            },
          ],
        ),
      ) as ScheduleTemplate['days'],
    };

    const validation = validateTemplate(normalized);
    if (!validation.ok) {
      setScheduleError(validation.message || 'Invalid schedule template');
      return;
    }

    try {
      await updateDoctor(DEFAULT_CLINIC_ID, scheduleDoctor.id, user?.uid || 'admin', {
        scheduleTemplate: normalized,
      });
      push('Schedule template updated', 'success');
      setScheduleDrawerOpen(false);
    } catch (error) {
      setScheduleError((error as Error).message);
      push('Failed to save schedule template', 'error');
    }
  };

  const removeDoctor = async () => {
    if (!selectedDoctor) return;

    try {
      await deleteDoctor(DEFAULT_CLINIC_ID, selectedDoctor.id);
      push('Doctor deleted', 'info');
      setDeleteOpen(false);
    } catch {
      push('Failed to delete doctor', 'error');
    }
  };

  const dayState = template.days[activeDay];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Doctor Profiles + Schedules"
        subtitle="Configure doctor roster and reusable weekly schedule templates"
        actions={<Button onClick={openCreate}>+ Add Doctor</Button>}
      />

      <Card>
        <CardHeader
          title="Doctors"
          subtitle="Manage doctor identities and scheduling templates"
        />
        <Toolbar
          left={
            <Input
              placeholder="Search doctor by name, specialty, phone, reg no"
              className="w-[360px]"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          }
          right={<p className="text-xs text-slate-500">{filtered.length} doctors</p>}
        />

        {loading ? (
          <TableSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No doctors configured"
            description="Add your first doctor profile to start appointment scheduling."
            action={<Button onClick={openCreate}>Add doctor</Button>}
          />
        ) : (
          <DataTable
            rows={filtered}
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (row) => row.fullName,
                sortValue: (row) => row.fullName || '',
              },
              {
                key: 'specialty',
                header: 'Specialty',
                render: (row) => row.specialty || '-',
                sortValue: (row) => row.specialty || '',
              },
              {
                key: 'active',
                header: 'Active',
                render: (row) => (
                  <StatusPill label={row.active === false ? 'cancelled' : 'completed'} />
                ),
                sortValue: (row) => (row.active === false ? 0 : 1),
              },
            ]}
            rowActions={[
              { label: 'Edit', onClick: openEdit },
              { label: 'Schedule', onClick: openSchedule },
              {
                label: 'Delete',
                onClick: (row) => {
                  setSelectedDoctor(row);
                  setDeleteOpen(true);
                },
              },
            ]}
          />
        )}
      </Card>

      <Drawer
        open={doctorDrawerOpen}
        onClose={() => setDoctorDrawerOpen(false)}
        title={selectedDoctor ? 'Edit Doctor Profile' : 'Add Doctor Profile'}
      >
        <div className="space-y-2">
          <Input
            placeholder="Full name *"
            value={doctorForm.fullName}
            onChange={(event) => setDoctorForm((prev) => ({ ...prev, fullName: event.target.value }))}
          />
          <Input
            placeholder="Display name"
            value={doctorForm.displayName || ''}
            onChange={(event) =>
              setDoctorForm((prev) => ({ ...prev, displayName: event.target.value }))
            }
          />
          <Input
            placeholder="Specialty"
            value={doctorForm.specialty || ''}
            onChange={(event) =>
              setDoctorForm((prev) => ({ ...prev, specialty: event.target.value }))
            }
          />
          <Input
            placeholder="Phone"
            value={doctorForm.phone || ''}
            onChange={(event) => setDoctorForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <Input
            placeholder="Registration No"
            value={doctorForm.regNo || ''}
            onChange={(event) => setDoctorForm((prev) => ({ ...prev, regNo: event.target.value }))}
          />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={doctorForm.active}
              onChange={(event) =>
                setDoctorForm((prev) => ({ ...prev, active: event.target.checked }))
              }
            />
            Active doctor
          </label>

          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <Button onClick={saveDoctor}>{selectedDoctor ? 'Update doctor' : 'Create doctor'}</Button>
        </div>
      </Drawer>

      <Drawer
        open={scheduleDrawerOpen}
        onClose={() => setScheduleDrawerOpen(false)}
        title={`Schedule Template${scheduleDoctor ? ` · ${scheduleDoctor.fullName}` : ''}`}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Slot length</label>
            <Select
              value={String(template.slotMinutes)}
              onChange={(event) =>
                setTemplate((prev) => ({ ...prev, slotMinutes: Number(event.target.value) }))
              }
            >
              {[5, 10, 15, 20, 30, 60].map((value) => (
                <option key={value} value={value}>
                  {value} minutes
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap gap-1">
            {(Object.keys(dayLabels) as WeekDay[]).map((day) => (
              <Button
                key={day}
                variant={day === activeDay ? 'primary' : 'secondary'}
                onClick={() => setActiveDay(day)}
              >
                {day.toUpperCase()}
              </Button>
            ))}
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium">{dayLabels[activeDay]}</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dayState.enabled}
                  onChange={(event) =>
                    setTemplate((prev) => ({
                      ...prev,
                      days: {
                        ...prev.days,
                        [activeDay]: {
                          ...prev.days[activeDay],
                          enabled: event.target.checked,
                        },
                      },
                    }))
                  }
                />
                Enabled
              </label>
            </div>

            {!dayState.enabled ? (
              <p className="text-xs text-slate-500">Day is disabled for booking.</p>
            ) : (
              <div className="space-y-2">
                {dayState.sessions.map((session, idx) => (
                  <div key={`${activeDay}-${idx}`} className="rounded-md border p-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="time"
                        value={session.start}
                        onChange={(event) =>
                          setTemplate((prev) => {
                            const sessions = [...prev.days[activeDay].sessions];
                            sessions[idx] = { ...sessions[idx], start: event.target.value };
                            return {
                              ...prev,
                              days: {
                                ...prev.days,
                                [activeDay]: { ...prev.days[activeDay], sessions },
                              },
                            };
                          })
                        }
                      />
                      <Input
                        type="time"
                        value={session.end}
                        onChange={(event) =>
                          setTemplate((prev) => {
                            const sessions = [...prev.days[activeDay].sessions];
                            sessions[idx] = { ...sessions[idx], end: event.target.value };
                            return {
                              ...prev,
                              days: {
                                ...prev.days,
                                [activeDay]: { ...prev.days[activeDay], sessions },
                              },
                            };
                          })
                        }
                      />
                    </div>
                    <Input
                      className="mt-2"
                      placeholder="Optional note"
                      value={session.note || ''}
                      onChange={(event) =>
                        setTemplate((prev) => {
                          const sessions = [...prev.days[activeDay].sessions];
                          sessions[idx] = { ...sessions[idx], note: event.target.value };
                          return {
                            ...prev,
                            days: {
                              ...prev.days,
                              [activeDay]: { ...prev.days[activeDay], sessions },
                            },
                          };
                        })
                      }
                    />
                    <div className="mt-2 flex justify-between">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (idx !== 0) return;
                          setTemplate((prev) => ({
                            ...prev,
                            days: {
                              ...prev.days,
                              tue: { ...prev.days.tue, sessions: [...prev.days.mon.sessions] },
                              wed: { ...prev.days.wed, sessions: [...prev.days.mon.sessions] },
                              thu: { ...prev.days.thu, sessions: [...prev.days.mon.sessions] },
                              fri: { ...prev.days.fri, sessions: [...prev.days.mon.sessions] },
                              sat: { ...prev.days.sat, sessions: [...prev.days.mon.sessions] },
                              sun: { ...prev.days.sun, sessions: [...prev.days.mon.sessions] },
                            },
                          }));
                          push('Copied Monday sessions to all days', 'info');
                        }}
                      >
                        Copy Monday to all
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() =>
                          setTemplate((prev) => ({
                            ...prev,
                            days: {
                              ...prev.days,
                              [activeDay]: {
                                ...prev.days[activeDay],
                                sessions: prev.days[activeDay].sessions.filter((_, i) => i !== idx),
                              },
                            },
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setTemplate((prev) => ({
                        ...prev,
                        days: {
                          ...prev.days,
                          [activeDay]: {
                            ...prev.days[activeDay],
                            sessions: [
                              ...prev.days[activeDay].sessions,
                              { start: '14:00', end: '17:00', note: '' },
                            ],
                          },
                        },
                      }))
                    }
                  >
                    + Add session
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setTemplate((prev) => ({
                        ...prev,
                        days: {
                          ...prev.days,
                          [activeDay]: {
                            ...prev.days[activeDay],
                            sessions: [{ start: '08:00', end: '12:00', note: 'Morning preset' }],
                          },
                        },
                      }))
                    }
                  >
                    Morning preset
                  </Button>
                </div>
              </div>
            )}
          </div>

          {scheduleError && <p className="text-sm text-red-600">{scheduleError}</p>}
          <Button onClick={saveSchedule}>Save template</Button>
        </div>
      </Drawer>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete doctor profile"
        message="Deleting a doctor removes their scheduling template. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          void removeDoctor();
        }}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
};
