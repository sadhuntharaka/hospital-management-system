import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

type LookupItem = { id: string; [key: string]: unknown };

export const useDoctors = (clinicId: string) => {
  const [data, setData] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'clinics', clinicId, 'doctors'),
      where('active', '==', true),
      orderBy('fullName', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [clinicId]);

  return { data, loading };
};

export const usePatients = (clinicId: string) => {
  const [data, setData] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'clinics', clinicId, 'patients'),
      orderBy('createdAt', 'desc'),
      limit(200),
    );
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [clinicId]);

  return { data, loading };
};

export const useServices = (clinicId: string) => {
  const [data, setData] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'clinics', clinicId, 'services'),
      where('active', '==', true),
      orderBy('name', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [clinicId]);

  return { data, loading };
};

export const useStockItems = (clinicId: string) => {
  const [data, setData] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'clinics', clinicId, 'stockItems'),
      where('active', '==', true),
      orderBy('name', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [clinicId]);

  return { data, loading };
};
