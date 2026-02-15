import { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { Card, CardHeader } from '@/components/ui/Card';
import { PatientIdentityBar } from '@/components/ui/PatientIdentityBar';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { db } from '@/lib/firebase';
import { DataTable } from '@/components/ui/DataTable';

export const PatientProfilePage = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState<any | null>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [queueHistory, setQueueHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const unsubs = [
      onSnapshot(doc(db, 'clinics', DEFAULT_CLINIC_ID, 'patients', id), (snap) => {
        setPatient(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      }),
      onSnapshot(
        query(
          collection(db, 'clinics', DEFAULT_CLINIC_ID, 'visits'),
          where('patientId', '==', id),
          orderBy('createdAt', 'desc'),
          limit(20),
        ),
        (snap) => setVisits(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
      onSnapshot(
        query(
          collection(db, 'clinics', DEFAULT_CLINIC_ID, 'appointments'),
          where('patientId', '==', id),
          orderBy('createdAt', 'desc'),
          limit(20),
        ),
        (snap) => setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
      onSnapshot(
        query(
          collection(db, 'clinics', DEFAULT_CLINIC_ID, 'queue'),
          where('patientId', '==', id),
          orderBy('createdAt', 'desc'),
          limit(20),
        ),
        (snap) => setQueueHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [id]);

  return (
    <div className="space-y-4">
      <PatientIdentityBar
        patientId={id}
        patientCode={patient?.patientCode}
        name={patient?.fullName}
        phone={patient?.phone}
        nic={patient?.nic}
      />

      <Card>
        <CardHeader title="Visits" subtitle="Latest 20 visits" />
        <DataTable
          rows={visits}
          columns={[
            { key: 'doctor', header: 'Doctor', render: (row: any) => row.doctorName || '-' },
            { key: 'status', header: 'Status', render: (row: any) => row.status || '-' },
            { key: 'diagnosis', header: 'Diagnosis', render: (row: any) => row.diagnosis || '-' },
          ]}
        />
      </Card>

      <Card>
        <CardHeader title="Appointments" subtitle="Latest 20 appointments" />
        <DataTable
          rows={appointments}
          columns={[
            { key: 'date', header: 'Date', render: (row: any) => row.date || '-' },
            { key: 'doctor', header: 'Doctor', render: (row: any) => row.doctorName || '-' },
            { key: 'status', header: 'Status', render: (row: any) => row.status || '-' },
          ]}
        />
      </Card>

      <Card>
        <CardHeader title="Queue history" subtitle="Latest 20 queue entries" />
        <DataTable
          rows={queueHistory}
          columns={[
            { key: 'token', header: 'Token', render: (row: any) => `#${row.tokenNumber || '-'}` },
            { key: 'date', header: 'Date', render: (row: any) => row.date || '-' },
            { key: 'doctor', header: 'Doctor', render: (row: any) => row.doctorName || '-' },
            { key: 'status', header: 'Status', render: (row: any) => row.status || '-' },
          ]}
        />
      </Card>
    </div>
  );
};
