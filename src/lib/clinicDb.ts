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
    doctorId?: string;
    doctorName?: string;
    items: Array<{ serviceId?: string; name: string; qty: number; price: number }>;
    discount?: number;
  },
) => {
  const counterRef = doc(db, 'clinics', clinicId, 'counters', 'invoices');
  const invoiceRef = doc(clinicRef(clinicId, 'invoices'));

  const invoiceNumber = await runTransaction(db, async (trx) => {
    const counterSnap = await trx.get(counterRef);
    const seq = (counterSnap.data()?.seq || 0) + 1;
    const subtotal = payload.items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.price || 0), 0);
    const discount = Number(payload.discount || 0);
    const total = Math.max(0, subtotal - discount);
    trx.set(counterRef, { seq, updatedAt: serverTimestamp() }, { merge: true });
    trx.set(invoiceRef, {
      invoiceNumber: `INV-${String(seq).padStart(6, '0')}`,
      patientId: payload.patientId || null,
      patientName: payload.patientName,
      doctorId: payload.doctorId || null,
      doctorName: payload.doctorName || null,
      items: payload.items,
      subtotal,
      discount,
      total,
      status: 'issued',
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
    return `INV-${String(seq).padStart(6, '0')}`;
  });

  await addAuditLog(clinicId, uid, email, 'create_invoice', 'invoice', invoiceRef.id, `Created ${invoiceNumber}`);
  return { id: invoiceRef.id, invoiceNumber };
};

export const voidInvoice = async (
  clinicId: string,
  invoiceId: string,
  uid: string,
  email: string | null | undefined,
) => {
  await updateDoc(doc(db, 'clinics', clinicId, 'invoices', invoiceId), {
    status: 'void',
    voidedBy: uid,
    voidedAt: serverTimestamp(),
  });
  await addAuditLog(clinicId, uid, email, 'void_invoice', 'invoice', invoiceId, 'Voided invoice');
};

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
}) => {
  await runTransaction(db, async (trx) => {
    const batchesQ = query(
      clinicRef(clinicId, 'stockBatches'),
      where('itemId', '==', itemId),
      where('quantityAvailable', '>', 0),
      orderBy('expiryDate', 'asc'),
    );
    const batches = await getDocs(batchesQ);
    let need = quantity;

    batches.docs.forEach((batchDoc) => {
      if (need <= 0) return;
      const remaining = Number(batchDoc.data().quantityAvailable || 0);
      const take = Math.min(remaining, need);
      if (take > 0) {
        trx.update(batchDoc.ref, {
          quantityAvailable: remaining - take,
          updatedAt: serverTimestamp(),
        });
        trx.set(doc(clinicRef(clinicId, 'stockMovements')), {
          type: 'dispense',
          itemId,
          batchId: batchDoc.id,
          quantity: take,
          refType: 'dispense',
          refId: null,
          createdBy: uid,
          createdAt: serverTimestamp(),
        });
        need -= take;
      }
    });

    if (need > 0) throw new Error('Insufficient stock to dispense');
  });

  await addAuditLog(clinicId, uid, email, 'dispense', 'stockMovement', itemId, `Dispensed qty ${quantity}`);
};

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

export const upsertStockItem = async (
  clinicId: string,
  uid: string,
  payload: { name: string; sku: string; unit: string; reorderLevel: number; active: boolean },
) =>
  addDoc(clinicRef(clinicId, 'stockItems'), {
    ...payload,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });

export const createStockBatch = async (
  clinicId: string,
  uid: string,
  payload: {
    itemId: string;
    batchNo: string;
    expiryDate: string;
    quantityAvailable: number;
    unitCost: number;
  },
) => {
  const ref = await addDoc(clinicRef(clinicId, 'stockBatches'), {
    ...payload,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  await addDoc(clinicRef(clinicId, 'stockMovements'), {
    type: 'purchase',
    itemId: payload.itemId,
    batchId: ref.id,
    quantity: payload.quantityAvailable,
    refType: 'purchase',
    refId: ref.id,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'clinics', clinicId, 'stockItems', payload.itemId), {
    updatedAt: serverTimestamp(),
    quantityOnHand: increment(payload.quantityAvailable),
  });
};


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
