import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PatientIdentityBar } from '@/components/ui/PatientIdentityBar';
import { Card, CardHeader } from '@/components/ui/Card';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { db } from '@/lib/firebase';
import { closeVisit, updateVisit } from '@/lib/clinicDb';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import { Combobox } from '@/components/ui/Combobox';

interface FormShape {
  diagnosis: string;
  notes: string;
  prescriptionText: string;
  followUpDate: string;
}

export const ConsultationPage = () => {
  const [params, setParams] = useSearchParams();
  const [visit, setVisit] = useState<any | null>(null);
  const [openVisits, setOpenVisits] = useState<any[]>([]);
  const { user } = useAuthContext();
  const { push } = useToast();
  const visitId = params.get('visitId');

  const { register, handleSubmit, reset } = useForm<FormShape>({
    defaultValues: { diagnosis: '', notes: '', prescriptionText: '', followUpDate: '' },
  });

  useEffect(() => {
    const unsubOpen = onSnapshot(
      query(
        collection(db, 'clinics', DEFAULT_CLINIC_ID, 'visits'),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc'),
      ),
      (snap) => setOpenVisits(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );

    return unsubOpen;
  }, []);

  useEffect(() => {
    if (!visitId) {
      setVisit(null);
      reset({ diagnosis: '', notes: '', prescriptionText: '', followUpDate: '' });
      return;
    }

    const unsub = onSnapshot(doc(db, 'clinics', DEFAULT_CLINIC_ID, 'visits', visitId), (snap) => {
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() };
      setVisit(data);
      reset({
        diagnosis: data.diagnosis || '',
        notes: data.notes || '',
        prescriptionText: (data.prescription || [])
          .map((p: any) => [p.name, p.dose, p.qty ? `x${p.qty}` : '', p.note].filter(Boolean).join(' '))
          .join('\n'),
        followUpDate: data.followUpDate || '',
      });
    });

    return unsub;
  }, [visitId, reset]);

  const openVisitItems = useMemo(
    () =>
      openVisits.map((v) => ({
        id: v.id,
        label: `${v.patientName || 'Walk-in'} • ${v.doctorName || '-'}`,
        meta: v.sourceRefType ? `${v.sourceRefType}` : undefined,
      })),
    [openVisits],
  );

  const parsePrescription = (text: string) =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ name: line }));

  return (
    <div className="space-y-4">
      <PageHeader title="Consultation + Prescription" subtitle="Visit-driven consultation capture" />

      {!visitId && (
        <Card>
          <CardHeader title="Select open visit" subtitle="Pick a visit to continue consultation" />
          <Combobox
            value={null}
            onChange={(item) => {
              if (!item) return;
              setParams({ visitId: item.id });
            }}
            items={openVisitItems}
            placeholder="Search open visits"
          />
        </Card>
      )}

      {visit && (
        <>
          <PatientIdentityBar
            patientId={visit.patientId}
            name={visit.patientName}
            phone={visit.phone}
            nic={visit.nic}
          />
          <Card>
            <CardHeader title={`Consultation • ${visit.doctorName || '-'}`} subtitle={`Source: ${visit.sourceRefType || '-'}`} />
            <form
              className="space-y-2"
              onSubmit={handleSubmit(async (values) => {
                await updateVisit(DEFAULT_CLINIC_ID, visit.id, user?.uid || 'admin', {
                  diagnosis: values.diagnosis,
                  notes: values.notes,
                  prescription: parsePrescription(values.prescriptionText),
                  followUpDate: values.followUpDate || null,
                });
                push('Visit updated', 'success');
              })}
            >
              <Input placeholder="Diagnosis" {...register('diagnosis')} />
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="Clinical notes"
                {...register('notes')}
              />
              <textarea
                className="w-full rounded-md border border-slate-300 p-2"
                placeholder="Prescription (one line per item)"
                rows={5}
                {...register('prescriptionText')}
              />
              <Input type="date" {...register('followUpDate')} />
              <div className="flex gap-2">
                <Button type="submit">Save</Button>
                <Button variant="secondary" type="button" onClick={() => window.print()}>
                  Print
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  onClick={async () => {
                    await closeVisit(DEFAULT_CLINIC_ID, visit.id, user?.uid || 'admin');
                    push('Visit closed', 'success');
                  }}
                >
                  Close Visit
                </Button>
              </div>
            </form>
          </Card>
        </>
      )}
    </div>
  );
};
