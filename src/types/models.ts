import type { Timestamp } from 'firebase/firestore';

export interface BaseDoc {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy: string;
}

export interface Patient extends BaseDoc {
  patientCode: string;
  fullName: string;
  phone: string;
  nic: string;
  dob?: string;
  address?: string;
  gender?: string;
}
