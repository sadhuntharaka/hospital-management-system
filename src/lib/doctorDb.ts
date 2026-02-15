import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ScheduleTemplate } from './scheduleUtils';

export interface DoctorPayload {
  fullName: string;
  displayName?: string;
  specialty?: string;
  phone?: string;
  regNo?: string;
  active: boolean;
  scheduleTemplate?: ScheduleTemplate;
}

export type DoctorRecord = DoctorPayload & {
  id: string;
};

const doctorsRef = (clinicId: string) => collection(db, 'clinics', clinicId, 'doctors');

export const listDoctors = (clinicId: string, onData: (rows: DoctorRecord[]) => void) =>
  onSnapshot(query(doctorsRef(clinicId), orderBy('createdAt', 'desc')), (snap) => {
    onData(
      snap.docs.map((docItem) => ({
        id: docItem.id,
        ...(docItem.data() as DoctorPayload),
      })),
    );
  });

export const createDoctor = (clinicId: string, uid: string, payload: DoctorPayload) =>
  addDoc(doctorsRef(clinicId), {
    ...payload,
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

export const updateDoctor = (
  clinicId: string,
  doctorId: string,
  uid: string,
  patch: Partial<DoctorPayload>,
) =>
  updateDoc(doc(db, 'clinics', clinicId, 'doctors', doctorId), {
    ...patch,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });

export const deleteDoctor = (clinicId: string, doctorId: string) =>
  deleteDoc(doc(db, 'clinics', clinicId, 'doctors', doctorId));
