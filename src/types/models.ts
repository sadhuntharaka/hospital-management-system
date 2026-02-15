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

export type PrescriptionItem = {
  name: string;
  dose?: string;
  qty?: number;
  note?: string;
};

export type Visit = {
  id: string;
  clinicId: string;
  patientId?: string;
  patientName?: string;
  phone?: string;
  nic?: string;
  doctorId: string;
  doctorName?: string;
  sourceRefType?: 'queue' | 'appointment';
  sourceRefId?: string;
  status: 'open' | 'closed';
  diagnosis?: string;
  notes?: string;
  prescription?: PrescriptionItem[];
  followUpDate?: string;
  createdAt?: Timestamp | unknown;
  createdBy?: string;
  updatedAt?: Timestamp | unknown;
  updatedBy?: string;
};


export type InvoiceItem = {
  serviceId?: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  patientId?: string;
  patientName: string;
  phone?: string;
  nic?: string;
  doctorId?: string;
  doctorName?: string;
  visitId?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'issued' | 'void';
  createdAt?: Timestamp | unknown;
  createdBy?: string;
  updatedAt?: Timestamp | unknown;
  updatedBy?: string;
  voidedAt?: Timestamp | unknown;
  voidedBy?: string;
  voidReason?: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  method: 'cash' | 'card' | 'bank' | 'other';
  amount: number;
  receivedAt: string;
  createdAt?: Timestamp | unknown;
  createdBy?: string;
};
