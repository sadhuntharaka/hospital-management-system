import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

const clinicRef = (clinicId: string, name: string) => collection(db, 'clinics', clinicId, name);

export const listByClinic = async (clinicId: string, name: string) => {
  const snap = await getDocs(query(clinicRef(clinicId, name), orderBy('createdAt', 'desc'), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const createPatient = async (clinicId: string, uid: string, payload: Record<string, unknown>) =>
  addDoc(clinicRef(clinicId, 'patients'), { ...payload, createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

export const updatePatient = async (clinicId: string, id: string, payload: Record<string, unknown>) =>
  updateDoc(doc(db, 'clinics', clinicId, 'patients', id), { ...payload, updatedAt: serverTimestamp() });

export const createWalkInToken = async (clinicId: string, doctorId: string, uid: string) => {
  const key = `${doctorId}_${new Date().toISOString().slice(0, 10)}`;
  const counterRef = doc(db, 'clinics', clinicId, 'meta', `token_${key}`);
  const appointments = clinicRef(clinicId, 'appointments');

  return runTransaction(db, async (trx) => {
    const counter = await trx.get(counterRef);
    const token = (counter.data()?.lastToken ?? 0) + 1;
    trx.set(counterRef, { lastToken: token, updatedAt: serverTimestamp() }, { merge: true });
    const aptRef = doc(appointments);
    trx.set(aptRef, {
      doctorId,
      token,
      date: new Date().toISOString().slice(0, 10),
      type: 'walkin',
      status: 'arrived',
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: aptRef.id, token };
  });
};

export const callGenerateInvoiceNumber = async () => {
  const response = await fetch('/.netlify/functions/generateInvoiceNumber', { method: 'POST' });
  if (!response.ok) throw new Error('Failed invoice number generation');
  return response.json();
};

export const dispenseFefo = async ({ clinicId, itemId, quantity, uid }: { clinicId: string; itemId: string; quantity: number; uid: string }) => {
  await runTransaction(db, async (trx) => {
    const batchesQ = query(
      clinicRef(clinicId, 'stockBatches'),
      where('itemId', '==', itemId),
      where('remainingQty', '>', 0),
      orderBy('expiryDate', 'asc'),
    );
    const batches = await getDocs(batchesQ);
    let need = quantity;

    batches.docs.forEach((batchDoc) => {
      if (need <= 0) return;
      const remaining = Number(batchDoc.data().remainingQty || 0);
      const take = Math.min(remaining, need);
      if (take > 0) {
        trx.update(batchDoc.ref, { remainingQty: remaining - take, updatedAt: serverTimestamp() });
        trx.set(doc(clinicRef(clinicId, 'stockMovements')), {
          itemId,
          batchId: batchDoc.id,
          movementType: 'dispense',
          qty: -take,
          createdBy: uid,
          createdAt: serverTimestamp(),
        });
        need -= take;
      }
    });

    if (need > 0) throw new Error('Insufficient stock to dispense');
  });
};
