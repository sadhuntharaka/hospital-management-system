import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { createStockBatch, subscribeByClinic, upsertStockItem } from '@/lib/clinicDb';
import { useAuthContext } from '@/features/auth/AuthProvider';

export const StockItemsPage = () => {
  const { user } = useAuthContext();
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [reorderLevel, setReorderLevel] = useState('10');

  useEffect(() => {
    const unsub = subscribeByClinic(DEFAULT_CLINIC_ID, 'stockItems', (rows) => setItems(rows as any[]));
    return unsub;
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Stock Items" subtitle="Real item master in Firestore" />
      <Card>
        <CardHeader title="Add item" />
        <div className="grid gap-2 md:grid-cols-5">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
          <Input placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <Input placeholder="Reorder level" type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
          <Button onClick={async () => {
            if (!name.trim()) return;
            await upsertStockItem(DEFAULT_CLINIC_ID, user?.uid || 'admin', {
              name,
              sku,
              unit,
              reorderLevel: Number(reorderLevel || 0),
              active: true,
            });
            setName('');
            setSku('');
          }}>Save item</Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="Items" />
        <DataTable rows={items} columns={[
          { key: 'name', header: 'Name', render: (row: any) => row.name },
          { key: 'sku', header: 'SKU', render: (row: any) => row.sku || '-' },
          { key: 'unit', header: 'Unit', render: (row: any) => row.unit || '-' },
          { key: 'qoh', header: 'Qty', render: (row: any) => Number(row.quantityOnHand || 0) },
          { key: 'rol', header: 'Reorder', render: (row: any) => Number(row.reorderLevel || 0) },
        ]} />
      </Card>
    </div>
  );
};

export const StockPurchasesPage = () => {
  const { user } = useAuthContext();
  const [items, setItems] = useState<any[]>([]);
  const [itemId, setItemId] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');

  useEffect(() => {
    const unsub = subscribeByClinic(DEFAULT_CLINIC_ID, 'stockItems', (rows) => setItems(rows as any[]));
    return unsub;
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Stock Purchases" subtitle="Create stock batches" />
      <Card>
        <CardHeader title="Purchase entry" />
        <div className="grid gap-2 md:grid-cols-6">
          <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Select item</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <Input placeholder="Batch no" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
          <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          <Input placeholder="Qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Input placeholder="Unit cost" type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
          <Button onClick={async () => {
            if (!itemId || !batchNo || !expiryDate) return;
            await createStockBatch(DEFAULT_CLINIC_ID, user?.uid || 'admin', {
              itemId,
              batchNo,
              expiryDate,
              quantityAvailable: Number(qty || 0),
              unitCost: Number(unitCost || 0),
            });
            setBatchNo('');
            setQty('');
            setUnitCost('');
          }}>Save purchase</Button>
        </div>
      </Card>
    </div>
  );
};

export const StockExpiryPage = () => {
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    const unsub = subscribeByClinic(DEFAULT_CLINIC_ID, 'stockBatches', (rows) => setBatches(rows as any[]), { orderField: 'expiryDate', desc: false });
    return unsub;
  }, []);

  const nearExpiry = useMemo(
    () => batches.filter((batch) => {
      if (!batch.expiryDate) return false;
      const d = new Date(batch.expiryDate);
      const diffDays = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    }),
    [batches],
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Stock Expiry Alerts" subtitle="Batches expiring within 30 days" />
      <Card>
        <CardHeader title="Expiring batches" />
        <DataTable rows={nearExpiry} columns={[
          { key: 'itemId', header: 'Item ID', render: (row: any) => row.itemId },
          { key: 'batchNo', header: 'Batch', render: (row: any) => row.batchNo },
          { key: 'expiryDate', header: 'Expiry', render: (row: any) => row.expiryDate },
          { key: 'qty', header: 'Available', render: (row: any) => row.quantityAvailable || 0 },
        ]} />
      </Card>
    </div>
  );
};
