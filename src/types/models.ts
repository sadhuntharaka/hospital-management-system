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

export type StockItem = {
  id: string;
  name: string;
  sku?: string;
  unit: 'tab' | 'cap' | 'ml' | 'bottle' | 'pack' | 'unit' | string;
  sellPrice: number;
  reorderLevel: number;
  active: boolean;
  createdAt?: Timestamp | unknown;
  createdBy?: string;
  updatedAt?: Timestamp | unknown;
  updatedBy?: string;
};

export type StockBatch = {
  id: string;
  itemId: string;
  itemName: string;
  batchNo: string;
  expiryDate: string;
  unitCost: number;
  qtyReceived: number;
  qtyAvailable: number;
  supplier?: string;
  purchaseId?: string;
  createdAt?: Timestamp | unknown;
  createdBy?: string;
  updatedAt?: Timestamp | unknown;
  updatedBy?: string;
};

export type PurchaseLine = {
  itemId: string;
  itemName: string;
  batchNo: string;
  expiryDate: string;
  unitCost: number;
  qty: number;
  lineCost: number;
};

export type Purchase = {
  id: string;
  purchaseNo: string;
  supplier?: string;
  invoiceRef?: string;
  purchaseDate: string;
  totalCost: number;
  status: 'posted' | 'void';
  items: PurchaseLine[];
  createdAt?: Timestamp | unknown;
  createdBy?: string;
  updatedAt?: Timestamp | unknown;
  updatedBy?: string;
  voidedAt?: Timestamp | unknown;
  voidedBy?: string;
  voidReason?: string;
};

export type DispenseBatchUse = {
  batchId: string;
  batchNo: string;
  expiryDate: string;
  qty: number;
  unitCost: number;
};

export type DispenseLine = {
  itemId: string;
  itemName: string;
  qty: number;
  batchesUsed: DispenseBatchUse[];
  costTotal: number;
};

export type Dispense = {
  id: string;
  dispenseNo: string;
  patientId?: string;
  patientName?: string;
  doctorId?: string;
  doctorName?: string;
  visitId?: string;
  dispenseDate: string;
  status: 'posted' | 'void';
  items: DispenseLine[];
  totalCost: number;
  createdAt?: Timestamp | unknown;
  createdBy?: string;
  updatedAt?: Timestamp | unknown;
  updatedBy?: string;
  voidedAt?: Timestamp | unknown;
  voidedBy?: string;
  voidReason?: string;
};
