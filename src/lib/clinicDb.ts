import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { StockItem } from '@/types/models';

type Plain = Record<string, unknown>;

const clinicRef = (clinicId: string, name: string) => collection(db, 'clinics', clinicId, name);

const toDateKey = (value = new Date()) => value.toISOString().slice(0, 10);

const addAuditLog = async (
  clinicId: string,
  uid: string,
  email: string | null | undefined,
  action: string,
  entityType: string,
  entityId: string,
  message: string,
) =>
  addDoc(clinicRef(clinicId, 'auditLogs'), {
    action,
    entityType,
    entityId,
    message,
    uid,
    email: email || null,
    createdAt: serverTimestamp(),
  });

export const listByClinic = async (clinicId: string, name: string) => {
  const snap = await getDocs(query(clinicRef(clinicId, name), orderBy('createdAt', 'desc'), limit(200)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const subscribeByClinic = (
  clinicId: string,
  name: string,
  onData: (rows: Plain[]) => void,
  opts?: { orderField?: string; desc?: boolean },
) =>
  onSnapshot(
    query(
      clinicRef(clinicId, name),
      orderBy(opts?.orderField || 'createdAt', opts?.desc === false ? 'asc' : 'desc'),
    ),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );

export const subscribeTodayQueue = (clinicId: string, onData: (rows: Plain[]) => void) =>
  onSnapshot(
    query(
      clinicRef(clinicId, 'queue'),
      where('date', '==', toDateKey()),
      orderBy('tokenNumber', 'asc'),
    ),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );

export const createPatient = async (
  clinicId: string,
  uid: string,
  payload: { fullName: string; phone: string; nic: string; patientCode: string },
  email?: string | null,
) => {
  const ref = await addDoc(clinicRef(clinicId, 'patients'), {
    ...payload,
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await addAuditLog(clinicId, uid, email, 'create_patient', 'patient', ref.id, `Created patient ${payload.fullName}`);
  return ref;
};

export const updatePatient = async (
  clinicId: string,
  id: string,
  uid: string,
  payload: Partial<{ fullName: string; phone: string; nic: string; patientCode: string }>,
) =>
  updateDoc(doc(db, 'clinics', clinicId, 'patients', id), {
    ...payload,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });

export const createAppointment = async (
  clinicId: string,
  uid: string,
  email: string | null | undefined,
  payload: {
    patientId?: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    date: string;
    time?: string;
    status?: 'booked' | 'arrived' | 'in_consult' | 'completed' | 'cancelled';
    source?: 'appointment';
  },
) => {
  const ref = await addDoc(clinicRef(clinicId, 'appointments'), {
    ...payload,
    status: payload.status || 'booked',
    source: payload.source || 'appointment',
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await addAuditLog(clinicId, uid, email, 'create_appointment', 'appointment', ref.id, `Created appointment for ${payload.patientName}`);
  return ref;
};

export const updateAppointment = async (
  clinicId: string,
  appointmentId: string,
  uid: string,
  patch: Plain,
) =>
  updateDoc(doc(db, 'clinics', clinicId, 'appointments', appointmentId), {
    ...patch,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });

export const createQueueToken = async (
  clinicId: string,
  uid: string,
  email: string | null | undefined,
  payload: {
    doctorId: string;
    doctorName: string;
    patientId?: string;
    patientName?: string;
  },
) => {
  const dateKey = toDateKey();
  const counterRef = doc(db, 'clinics', clinicId, 'counters', `queue_${dateKey}`);
  const queueDocRef = doc(clinicRef(clinicId, 'queue'));

  const token = await runTransaction(db, async (trx) => {
    const counterSnap = await trx.get(counterRef);
    const seq = (counterSnap.data()?.seq || 0) + 1;
    trx.set(counterRef, { seq, updatedAt: serverTimestamp() }, { merge: true });
    trx.set(queueDocRef, {
      tokenNumber: seq,
      date: dateKey,
      patientId: payload.patientId || null,
      patientName: payload.patientName || null,
      doctorId: payload.doctorId,
      doctorName: payload.doctorName,
      status: 'waiting',
      createdBy: uid,
      updatedBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return seq;
  });

  await addAuditLog(clinicId, uid, email, 'create_queue', 'queue', queueDocRef.id, `Created token #${token}`);
  return { id: queueDocRef.id, token };
};

export const updateQueue = async (clinicId: string, queueId: string, uid: string, patch: Plain) =>
  updateDoc(doc(db, 'clinics', clinicId, 'queue', queueId), {
    ...patch,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });

export const createInvoice = async (
  clinicId: string,
  uid: string,
  email: string | null | undefined,
  payload: {
    patientId?: string;
    patientName: string;
    phone?: string;
    nic?: string;
    doctorId?: string;
    doctorName?: string;
    visitId?: string;
    items: Array<{ serviceId?: string; name: string; qty: number; unitPrice: number; lineTotal?: number }>;
    discount?: number;
  },
) => {
  const counterRef = doc(db, 'clinics', clinicId, 'counters', 'invoices');
  const invoiceRef = doc(clinicRef(clinicId, 'invoices'));

  const normalizedItems = payload.items.map((item) => {
    const qty = Math.max(1, Number(item.qty || 1));
    const unitPrice = Math.max(0, Number(item.unitPrice || 0));
    return {
      serviceId: item.serviceId || null,
      name: item.name,
      qty,
      unitPrice,
      lineTotal: qty * unitPrice,
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const discount = Math.min(Math.max(0, Number(payload.discount || 0)), subtotal);
  const total = Math.max(0, subtotal - discount);

  const invoiceNumber = await runTransaction(db, async (trx) => {
    const counterSnap = await trx.get(counterRef);
    const seq = (counterSnap.data()?.seq || 0) + 1;
    trx.set(counterRef, { seq, updatedAt: serverTimestamp() }, { merge: true });
    trx.set(invoiceRef, {
      invoiceNumber: `INV-${String(seq).padStart(6, '0')}`,
      patientId: payload.patientId || null,
      patientName: payload.patientName,
      phone: payload.phone || null,
      nic: payload.nic || null,
      doctorId: payload.doctorId || null,
      doctorName: payload.doctorName || null,
      visitId: payload.visitId || null,
      items: normalizedItems,
      subtotal,
      discount,
      total,
      status: 'issued',
      createdBy: uid,
      updatedBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return `INV-${String(seq).padStart(6, '0')}`;
  });

  await addAuditLog(clinicId, uid, email, 'create_invoice', 'invoice', invoiceRef.id, `Created ${invoiceNumber}`);
  return { id: invoiceRef.id, invoiceNumber };
};

export const voidInvoice = async (
  clinicId: string,
  uid: string,
  invoiceId: string,
  reason: string,
  email?: string | null,
) => {
  const invoiceRef = doc(db, 'clinics', clinicId, 'invoices', invoiceId);
  const snap = await getDoc(invoiceRef);
  if (!snap.exists()) throw new Error('Invoice not found');
  if (snap.data().status === 'void') throw new Error('Invoice already void');

  await updateDoc(invoiceRef, {
    status: 'void',
    voidReason: reason || 'Not specified',
    voidedBy: uid,
    voidedAt: serverTimestamp(),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });
  await addAuditLog(clinicId, uid, email, 'void_invoice', 'invoice', invoiceId, 'Voided invoice');
};

export const recordPayment = async (
  clinicId: string,
  uid: string,
  email: string | null | undefined,
  payload: {
    invoiceId: string;
    invoiceNumber: string;
    method: 'cash' | 'card' | 'bank' | 'other';
    amount: number;
    receivedAt: string;
  },
) => {
  const ref = await addDoc(clinicRef(clinicId, 'payments'), {
    ...payload,
    amount: Math.max(0, Number(payload.amount || 0)),
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  await addAuditLog(clinicId, uid, email, 'record_payment', 'payment', ref.id, `Payment for ${payload.invoiceNumber}`);
  return ref;
};

export const listServicesRealtime = (clinicId: string, cb: (rows: Plain[]) => void) =>
  onSnapshot(
    query(clinicRef(clinicId, 'services'), where('active', '==', true), orderBy('name', 'asc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );

export const listenInvoicesByRange = (
  clinicId: string,
  from: string,
  to: string,
  cb: (rows: Plain[]) => void,
) =>
  onSnapshot(
    query(
      clinicRef(clinicId, 'invoices'),
      where('createdAt', '>=', new Date(`${from}T00:00:00.000Z`)),
      where('createdAt', '<=', new Date(`${to}T23:59:59.999Z`)),
      orderBy('createdAt', 'desc'),
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );

export const listenPaymentsByRange = (
  clinicId: string,
  from: string,
  to: string,
  cb: (rows: Plain[]) => void,
) =>
  onSnapshot(
    query(
      clinicRef(clinicId, 'payments'),
      where('createdAt', '>=', new Date(`${from}T00:00:00.000Z`)),
      where('createdAt', '<=', new Date(`${to}T23:59:59.999Z`)),
      orderBy('createdAt', 'desc'),
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );

const isValidDateString = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const nextDocNo = async (clinicId: string, key: 'purchases' | 'dispenses', prefix: 'PO' | 'DS') => {
  const counterRef = doc(db, 'clinics', clinicId, 'counters', key);
  return runTransaction(db, async (trx) => {
    const counterSnap = await trx.get(counterRef);
    const seq = (counterSnap.data()?.seq || 0) + 1;
    trx.set(counterRef, { seq, updatedAt: serverTimestamp() }, { merge: true });
    return `${prefix}-${String(seq).padStart(6, '0')}`;
  });
};

export const listenStockItems = (clinicId: string, cb: (rows: Plain[]) => void, includeInactive = false) =>
  onSnapshot(
    query(
      clinicRef(clinicId, 'stockItems'),
      ...(includeInactive ? [] : [where('active', '==', true)]),
      orderBy('name', 'asc'),
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );

export const createStockItem = async (
  clinicId: string,
  uid: string,
  payload: { name: string; sku?: string; unit: string; sellPrice: number; reorderLevel: number; active: boolean },
) =>
  addDoc(clinicRef(clinicId, 'stockItems'), {
    ...payload,
    sellPrice: Math.max(0, Number(payload.sellPrice || 0)),
    reorderLevel: Math.max(0, Math.floor(Number(payload.reorderLevel || 0))),
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

export const updateStockItem = async (
  clinicId: string,
  uid: string,
  itemId: string,
  patch: Partial<{ name: string; sku: string; unit: string; sellPrice: number; reorderLevel: number; active: boolean }>,
) =>
  updateDoc(doc(db, 'clinics', clinicId, 'stockItems', itemId), {
    ...patch,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });

export const listenBatchesByItem = (clinicId: string, itemId: string, cb: (rows: Plain[]) => void) =>
  onSnapshot(
    query(clinicRef(clinicId, 'stockBatches'), where('itemId', '==', itemId), orderBy('expiryDate', 'asc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );

export const computeOnHand = async (clinicId: string, itemId: string) => {
  const snap = await getDocs(query(clinicRef(clinicId, 'stockBatches'), where('itemId', '==', itemId)));
  return snap.docs.reduce((sum, d) => sum + Number(d.data().qtyAvailable || 0), 0);
};

export const createPurchase = async (
  clinicId: string,
  uid: string,
  email: string | null | undefined,
  payload: {
    supplier?: string;
    invoiceRef?: string;
    purchaseDate: string;
    items: Array<{ itemId: string; itemName: string; batchNo: string; expiryDate: string; unitCost: number; qty: number }>;
  },
) => {
  if (!isValidDateString(payload.purchaseDate)) throw new Error('Invalid purchase date');
  if (!payload.items.length) throw new Error('Add at least one purchase line');

  const normalized = payload.items.map((line) => {
    const qty = Math.max(1, Math.floor(Number(line.qty || 0)));
    const unitCost = Math.max(0, Number(line.unitCost || 0));
    if (!isValidDateString(line.expiryDate)) throw new Error(`Invalid expiry date for ${line.itemName}`);
    return {
      itemId: line.itemId,
      itemName: line.itemName,
      batchNo: line.batchNo.trim(),
      expiryDate: line.expiryDate,
      qty,
      unitCost,
      lineCost: qty * unitCost,
    };
  });

  const purchaseNo = await nextDocNo(clinicId, 'purchases', 'PO');
  const purchaseRef = doc(clinicRef(clinicId, 'purchases'));

  await runTransaction(db, async (trx) => {
    trx.set(purchaseRef, {
      purchaseNo,
      supplier: payload.supplier || null,
      invoiceRef: payload.invoiceRef || null,
      purchaseDate: payload.purchaseDate,
      totalCost: normalized.reduce((sum, line) => sum + line.lineCost, 0),
      status: 'posted',
      items: normalized,
      createdBy: uid,
      updatedBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (const line of normalized) {
      const batchId = `${line.itemId}__${line.batchNo}__${line.expiryDate}`;
      const batchRef = doc(db, 'clinics', clinicId, 'stockBatches', batchId);
      const batchSnap = await trx.get(batchRef);
      if (batchSnap.exists()) {
        const data = batchSnap.data();
        trx.update(batchRef, {
          itemName: line.itemName,
          supplier: payload.supplier || null,
          purchaseId: purchaseRef.id,
          unitCost: line.unitCost,
          qtyReceived: Number(data.qtyReceived || 0) + line.qty,
          qtyAvailable: Number(data.qtyAvailable || 0) + line.qty,
          updatedBy: uid,
          updatedAt: serverTimestamp(),
        });
      } else {
        trx.set(batchRef, {
          itemId: line.itemId,
          itemName: line.itemName,
          batchNo: line.batchNo,
          expiryDate: line.expiryDate,
          unitCost: line.unitCost,
          qtyReceived: line.qty,
          qtyAvailable: line.qty,
          supplier: payload.supplier || null,
          purchaseId: purchaseRef.id,
          createdBy: uid,
          updatedBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      trx.set(doc(clinicRef(clinicId, 'stockMovements')), {
        type: 'purchase',
        refType: 'purchase',
        refId: purchaseRef.id,
        itemId: line.itemId,
        itemName: line.itemName,
        batchId,
        quantity: line.qty,
        unitCost: line.unitCost,
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
    }
  });

  await addAuditLog(clinicId, uid, email, 'create_purchase', 'purchase', purchaseRef.id, `Created ${purchaseNo}`);
  return { id: purchaseRef.id, purchaseNo };
};

export const voidPurchase = async (
  clinicId: string,
  uid: string,
  email: string | null | undefined,
  purchaseId: string,
  reason: string,
) => {
  const purchaseRef = doc(db, 'clinics', clinicId, 'purchases', purchaseId);
  await runTransaction(db, async (trx) => {
    const purchaseSnap = await trx.get(purchaseRef);
    if (!purchaseSnap.exists()) throw new Error('Purchase not found');
    const purchase = purchaseSnap.data();
    if (purchase.status === 'void') throw new Error('Purchase already void');

    for (const line of purchase.items || []) {
      const batchId = `${line.itemId}__${line.batchNo}__${line.expiryDate}`;
      const batchRef = doc(db, 'clinics', clinicId, 'stockBatches', batchId);
      const batchSnap = await trx.get(batchRef);
      if (!batchSnap.exists()) throw new Error(`Batch missing for ${line.itemName}`);
      const current = Number(batchSnap.data().qtyAvailable || 0);
      if (current < Number(line.qty || 0)) {
        throw new Error(`Cannot void purchase, insufficient reversible stock for ${line.itemName}`);
      }
    }

    for (const line of purchase.items || []) {
      const batchId = `${line.itemId}__${line.batchNo}__${line.expiryDate}`;
      const batchRef = doc(db, 'clinics', clinicId, 'stockBatches', batchId);
      const batchSnap = await trx.get(batchRef);
      trx.update(batchRef, {
        qtyAvailable: Number(batchSnap.data()?.qtyAvailable || 0) - Number(line.qty || 0),
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
      trx.set(doc(clinicRef(clinicId, 'stockMovements')), {
        type: 'void',
        refType: 'purchase',
        refId: purchaseId,
        itemId: line.itemId,
        itemName: line.itemName,
        batchId,
        quantity: -Math.abs(Number(line.qty || 0)),
        unitCost: Number(line.unitCost || 0),
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
    }

    trx.update(purchaseRef, {
      status: 'void',
      voidReason: reason || 'Not provided',
      voidedBy: uid,
      voidedAt: serverTimestamp(),
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
  });

  await addAuditLog(clinicId, uid, email, 'void_purchase', 'purchase', purchaseId, 'Voided purchase');
};

export const planFefo = async (clinicId: string, itemId: string, qty: number) => {
  type FefoBatch = {
    id: string;
    batchNo: string;
    expiryDate?: string;
    qtyAvailable: number;
    unitCost: number;
    createdAt?: unknown;
  };
  const requestedQty = Math.max(1, Math.floor(Number(qty || 0)));
  const today = toDateKey();
  const snap = await getDocs(
    query(
      clinicRef(clinicId, 'stockBatches'),
      where('itemId', '==', itemId),
      where('qtyAvailable', '>', 0),
      orderBy('expiryDate', 'asc'),
      orderBy('createdAt', 'asc'),
    ),
  );

  const batches: FefoBatch[] = snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      batchNo: String(data.batchNo || '-'),
      expiryDate: data.expiryDate ? String(data.expiryDate) : undefined,
      qtyAvailable: Number(data.qtyAvailable || 0),
      unitCost: Number(data.unitCost || 0),
      createdAt: data.createdAt,
    };
  });

  const nonExpired = batches.filter((batch) => !batch.expiryDate || batch.expiryDate >= today);
  if (nonExpired.length === 0) {
    throw new Error('No valid non-expired stock');
  }

  const plan: Array<{ batchId: string; batchNo: string; expiryDate: string; qty: number; unitCost: number }> = [];
  let need = requestedQty;
  nonExpired.forEach((batch) => {
    if (need <= 0) return;
    const available = Number(batch.qtyAvailable || 0);
    const take = Math.min(available, need);
    if (take > 0) {
      plan.push({
        batchId: batch.id,
        batchNo: batch.batchNo,
        expiryDate: String(batch.expiryDate || ''),
        qty: take,
        unitCost: batch.unitCost,
      });
      need -= take;
    }
  });

  if (need > 0) throw new Error('Insufficient non-expired stock for FEFO dispense');
  return plan;
};

export const postDispense = async (
  clinicId: string,
  uid: string,
  email: string | null | undefined,
  payload: {
    patientId?: string;
    patientName?: string;
    doctorId?: string;
    doctorName?: string;
    visitId?: string;
    dispenseDate: string;
    items: Array<{ itemId: string; itemName: string; qty: number }>;
  },
) => {
  if (!isValidDateString(payload.dispenseDate)) throw new Error('Invalid dispense date');
  if (!payload.items.length) throw new Error('Add at least one dispense item');

  const normalizedItems = payload.items.map((item) => ({
    itemId: item.itemId,
    itemName: item.itemName,
    qty: Math.max(1, Math.floor(Number(item.qty || 0))),
  }));

  const prePlans = new Map<string, Awaited<ReturnType<typeof planFefo>>>();
  for (const item of normalizedItems) {
    prePlans.set(item.itemId, await planFefo(clinicId, item.itemId, item.qty));
  }

  const dispenseNo = await nextDocNo(clinicId, 'dispenses', 'DS');
  const dispenseRef = doc(clinicRef(clinicId, 'dispenses'));

  await runTransaction(db, async (trx) => {
    const lines: Plain[] = [];

    for (const item of normalizedItems) {
      const plan = prePlans.get(item.itemId) || [];
      const used: Plain[] = [];
      for (const usage of plan) {
        const batchRef = doc(db, 'clinics', clinicId, 'stockBatches', usage.batchId);
        const batchSnap = await trx.get(batchRef);
        if (!batchSnap.exists()) throw new Error(`Batch ${usage.batchNo} not found`);
        const current = Number(batchSnap.data().qtyAvailable || 0);
        if (current < usage.qty) throw new Error(`Insufficient stock for ${item.itemName}`);

        trx.update(batchRef, {
          qtyAvailable: current - usage.qty,
          updatedBy: uid,
          updatedAt: serverTimestamp(),
        });

        trx.set(doc(clinicRef(clinicId, 'stockMovements')), {
          type: 'dispense',
          refType: 'dispense',
          refId: dispenseRef.id,
          itemId: item.itemId,
          itemName: item.itemName,
          batchId: usage.batchId,
          quantity: -usage.qty,
          unitCost: usage.unitCost,
          createdBy: uid,
          createdAt: serverTimestamp(),
        });

        used.push(usage);
      }

      lines.push({
        itemId: item.itemId,
        itemName: item.itemName,
        qty: item.qty,
        batchesUsed: used,
        costTotal: used.reduce((sum, row) => sum + Number(row.qty) * Number(row.unitCost), 0),
      });
    }

    trx.set(dispenseRef, {
      dispenseNo,
      patientId: payload.patientId || null,
      patientName: payload.patientName || null,
      doctorId: payload.doctorId || null,
      doctorName: payload.doctorName || null,
      visitId: payload.visitId || null,
      dispenseDate: payload.dispenseDate,
      status: 'posted',
      items: lines,
      totalCost: lines.reduce((sum, line) => sum + Number(line.costTotal || 0), 0),
      createdBy: uid,
      updatedBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await addAuditLog(clinicId, uid, email, 'post_dispense', 'dispense', dispenseRef.id, `Posted ${dispenseNo}`);
  return { id: dispenseRef.id, dispenseNo };
};

export const voidDispense = async (
  clinicId: string,
  uid: string,
  email: string | null | undefined,
  dispenseId: string,
  reason: string,
) => {
  const dispenseRef = doc(db, 'clinics', clinicId, 'dispenses', dispenseId);
  await runTransaction(db, async (trx) => {
    const dispenseSnap = await trx.get(dispenseRef);
    if (!dispenseSnap.exists()) throw new Error('Dispense not found');
    const dispense = dispenseSnap.data();
    if (dispense.status === 'void') throw new Error('Dispense already void');

    for (const line of dispense.items || []) {
      for (const batchUsed of line.batchesUsed || []) {
        const batchRef = doc(db, 'clinics', clinicId, 'stockBatches', String(batchUsed.batchId));
        const batchSnap = await trx.get(batchRef);
        if (!batchSnap.exists()) throw new Error('Referenced batch not found for void');
        trx.update(batchRef, {
          qtyAvailable: Number(batchSnap.data().qtyAvailable || 0) + Number(batchUsed.qty || 0),
          updatedBy: uid,
          updatedAt: serverTimestamp(),
        });
        trx.set(doc(clinicRef(clinicId, 'stockMovements')), {
          type: 'void',
          refType: 'dispense',
          refId: dispenseId,
          itemId: line.itemId,
          itemName: line.itemName,
          batchId: batchUsed.batchId,
          quantity: Math.abs(Number(batchUsed.qty || 0)),
          unitCost: Number(batchUsed.unitCost || 0),
          createdBy: uid,
          createdAt: serverTimestamp(),
        });
      }
    }

    trx.update(dispenseRef, {
      status: 'void',
      voidReason: reason || 'Not provided',
      voidedBy: uid,
      voidedAt: serverTimestamp(),
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
  });

  await addAuditLog(clinicId, uid, email, 'void_dispense', 'dispense', dispenseId, 'Voided dispense');
};

export const listenExpiringBatches = (clinicId: string, days: number, cb: (rows: Plain[]) => void) => {
  const today = new Date();
  const upper = new Date();
  upper.setDate(today.getDate() + Math.max(1, days));
  const upperKey = toDateKey(upper);
  return onSnapshot(
    query(
      clinicRef(clinicId, 'stockBatches'),
      where('qtyAvailable', '>', 0),
      where('expiryDate', '<=', upperKey),
      orderBy('expiryDate', 'asc'),
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );
};

export const listenLowStockItems = (clinicId: string, cb: (rows: Plain[]) => void) =>
  onSnapshot(
    query(clinicRef(clinicId, 'stockItems'), where('active', '==', true), orderBy('name', 'asc')),
    async (itemsSnap) => {
      type StockItemWithOnHand = StockItem & { onHand: number };
      const batchSnap = await getDocs(query(clinicRef(clinicId, 'stockBatches'), where('qtyAvailable', '>', 0)));
      const availableMap = new Map<string, number>();
      batchSnap.docs.forEach((batch) => {
        const itemId = String(batch.data().itemId || '');
        availableMap.set(itemId, (availableMap.get(itemId) || 0) + Number(batch.data().qtyAvailable || 0));
      });
      const items: StockItem[] = itemsSnap.docs.map((d) => {
        const data = d.data() as Omit<StockItem, 'id'>;
        return {
          id: d.id,
          name: String(data.name || ''),
          sku: data.sku,
          unit: data.unit || 'unit',
          sellPrice: Number(data.sellPrice ?? 0),
          reorderLevel: Number(data.reorderLevel ?? 0),
          active: Boolean(data.active ?? true),
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        };
      });
      const withOnHand: StockItemWithOnHand[] = items.map((item) => ({
        ...item,
        onHand: availableMap.get(item.id) || 0,
      }));
      const rows: StockItemWithOnHand[] = withOnHand.filter((item) => item.onHand <= item.reorderLevel);
      cb(rows);
    },
  );

export const seedDefaultServices = async (clinicId: string) => {
  const services = [
    { name: 'General Consultation', amount: 3000, active: true },
    { name: 'Follow-up Consultation', amount: 2000, active: true },
  ];
  const existing = await getDocs(clinicRef(clinicId, 'services'));
  if (!existing.empty) return;
  const batch = writeBatch(db);
  services.forEach((item) => {
    batch.set(doc(clinicRef(clinicId, 'services')), {
      ...item,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
};

// Backward-compatible wrappers
export const upsertStockItem = createStockItem;

export const createStockBatch = async (
  clinicId: string,
  uid: string,
  payload: {
    itemId: string;
    itemName?: string;
    batchNo: string;
    expiryDate: string;
    quantityAvailable: number;
    unitCost: number;
  },
) =>
  createPurchase(clinicId, uid, undefined, {
    purchaseDate: toDateKey(),
    items: [
      {
        itemId: payload.itemId,
        itemName: payload.itemName || payload.itemId,
        batchNo: payload.batchNo,
        expiryDate: payload.expiryDate,
        unitCost: payload.unitCost,
        qty: payload.quantityAvailable,
      },
    ],
  });

export const dispenseFefo = async ({
  clinicId,
  itemId,
  quantity,
  uid,
  email,
}: {
  clinicId: string;
  itemId: string;
  quantity: number;
  uid: string;
  email?: string | null;
}) =>
  postDispense(clinicId, uid, email, {
    dispenseDate: toDateKey(),
    items: [{ itemId, itemName: itemId, qty: quantity }],
  });


export const listenPatients = (clinicId: string, cb: (rows: Plain[]) => void) =>
  subscribeByClinic(clinicId, 'patients', cb);

export const listenQueueToday = (clinicId: string, today: string, cb: (rows: Plain[]) => void) =>
  onSnapshot(
    query(clinicRef(clinicId, 'queue'), where('date', '==', today), orderBy('tokenNumber', 'asc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );

export const addQueueToken = async (
  clinicId: string,
  uid: string,
  payload: {
    doctorId: string;
    doctorName: string;
    patientId?: string;
    patientName?: string;
    phone?: string;
    source?: 'walkin' | 'patient';
  },
) => {
  const dateKey = toDateKey();
  const counterRef = doc(db, 'clinics', clinicId, 'counters', `queue_${dateKey}`);
  const queueDocRef = doc(clinicRef(clinicId, 'queue'));

  const token = await runTransaction(db, async (trx) => {
    const counterSnap = await trx.get(counterRef);
    const seq = (counterSnap.data()?.seq || 0) + 1;
    trx.set(counterRef, { seq, updatedAt: serverTimestamp() }, { merge: true });
    trx.set(queueDocRef, {
      tokenNumber: seq,
      date: dateKey,
      patientId: payload.patientId || null,
      patientName: payload.patientName || null,
      phone: payload.phone || null,
      doctorId: payload.doctorId,
      doctorName: payload.doctorName,
      source: payload.source || (payload.patientId ? 'patient' : 'walkin'),
      status: 'waiting',
      createdBy: uid,
      updatedBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return seq;
  });

  return { id: queueDocRef.id, token };
};

export const updateQueueStatus = (
  clinicId: string,
  queueId: string,
  uid: string,
  status: 'waiting' | 'in_consult' | 'done' | 'skipped',
) => updateQueue(clinicId, queueId, uid, { status });

export const listenAppointments = (
  clinicId: string,
  dateFrom: string,
  dateTo: string,
  cb: (rows: Plain[]) => void,
) =>
  onSnapshot(
    query(
      clinicRef(clinicId, 'appointments'),
      where('date', '>=', dateFrom),
      where('date', '<=', dateTo),
      orderBy('date', 'asc'),
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );

export const updateAppointmentStatus = (
  clinicId: string,
  appointmentId: string,
  uid: string,
  status: 'booked' | 'arrived' | 'in_consult' | 'completed' | 'cancelled',
) => updateAppointment(clinicId, appointmentId, uid, { status });

export const createVisitFromQueue = async (
  clinicId: string,
  uid: string,
  queueItem: Plain,
) => {
  const existing = await getDocs(
    query(
      clinicRef(clinicId, 'visits'),
      where('sourceRefType', '==', 'queue'),
      where('sourceRefId', '==', String(queueItem.id || '')),
      where('status', '==', 'open'),
      limit(1),
    ),
  );
  if (!existing.empty) {
    return { id: existing.docs[0].id };
  }

  const ref = await addDoc(clinicRef(clinicId, 'visits'), {
    patientId: queueItem.patientId || null,
    patientName: queueItem.patientName || 'Walk-in',
    phone: queueItem.phone || null,
    nic: null,
    doctorId: queueItem.doctorId,
    doctorName: queueItem.doctorName,
    sourceRefType: 'queue',
    sourceRefId: queueItem.id,
    status: 'open',
    diagnosis: '',
    notes: '',
    prescription: [],
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (queueItem.id) {
    await updateQueueStatus(clinicId, String(queueItem.id), uid, 'in_consult');
  }

  return { id: ref.id };
};

export const createVisitFromAppointment = async (
  clinicId: string,
  uid: string,
  apptItem: Plain,
) => {
  const existing = await getDocs(
    query(
      clinicRef(clinicId, 'visits'),
      where('sourceRefType', '==', 'appointment'),
      where('sourceRefId', '==', String(apptItem.id || '')),
      where('status', '==', 'open'),
      limit(1),
    ),
  );
  if (!existing.empty) {
    return { id: existing.docs[0].id };
  }

  const ref = await addDoc(clinicRef(clinicId, 'visits'), {
    patientId: apptItem.patientId || null,
    patientName: apptItem.patientName || 'Unknown',
    phone: apptItem.phone || null,
    nic: apptItem.nic || null,
    doctorId: apptItem.doctorId,
    doctorName: apptItem.doctorName,
    sourceRefType: 'appointment',
    sourceRefId: apptItem.id,
    status: 'open',
    diagnosis: '',
    notes: '',
    prescription: [],
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (apptItem.id) {
    await updateAppointmentStatus(clinicId, String(apptItem.id), uid, 'in_consult');
  }

  return { id: ref.id };
};

export const updateVisit = (
  clinicId: string,
  visitId: string,
  uid: string,
  patch: Plain,
) =>
  updateDoc(doc(db, 'clinics', clinicId, 'visits', visitId), {
    ...patch,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });

export const closeVisit = async (clinicId: string, visitId: string, uid: string) => {
  const visitRef = doc(db, 'clinics', clinicId, 'visits', visitId);
  const snap = await getDoc(visitRef);
  if (!snap.exists()) throw new Error('Visit not found');
  const visit = { id: snap.id, ...snap.data() } as Plain;

  await updateDoc(visitRef, {
    status: 'closed',
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });

  if (visit.sourceRefType === 'queue' && visit.sourceRefId) {
    await updateQueueStatus(clinicId, String(visit.sourceRefId), uid, 'done');
  }
  if (visit.sourceRefType === 'appointment' && visit.sourceRefId) {
    await updateAppointmentStatus(clinicId, String(visit.sourceRefId), uid, 'completed');
  }
};
