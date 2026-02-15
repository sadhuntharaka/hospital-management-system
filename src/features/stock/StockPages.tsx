import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import {
  createPurchase,
  createStockItem,
  listenBatchesByItem,
  listenExpiringBatches,
  listenLowStockItems,
  listenStockItems,
  subscribeByClinic,
  updateStockItem,
  voidPurchase,
} from '@/lib/clinicDb';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/Toast';
import { Combobox } from '@/components/ui/Combobox';

type StockItemRow = {
  id: string;
  name: string;
  sku?: string;
  unit?: string;
  sellPrice?: number;
  reorderLevel?: number;
  active?: boolean;
};

type PurchaseLineDraft = {
  itemId: string;
  itemName: string;
  batchNo: string;
  expiryDate: string;
  unitCost: string;
  qty: string;
};

export const StockItemsPage = () => {
  const { user } = useAuthContext();
  const { push } = useToast();
  const [items, setItems] = useState<StockItemRow[]>([]);
  const [batches, setBatches] = useState<Array<{ id: string; itemId: string; qtyAvailable?: number; batchNo?: string; expiryDate?: string }>>([]);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StockItemRow | null>(null);
  const [batchDrawerItem, setBatchDrawerItem] = useState<StockItemRow | null>(null);
  const [itemBatches, setItemBatches] = useState<Array<{ id: string; batchNo?: string; expiryDate?: string; qtyAvailable?: number; unitCost?: number }>>([]);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('unit');
  const [sellPrice, setSellPrice] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('0');
  const [active, setActive] = useState(true);

  useEffect(() => {
    const unsubItems = listenStockItems(DEFAULT_CLINIC_ID, (rows) => setItems(rows as StockItemRow[]), !activeOnly);
    const unsubBatches = subscribeByClinic(DEFAULT_CLINIC_ID, 'stockBatches', (rows) => setBatches(rows as Array<{ id: string; itemId: string; qtyAvailable?: number }>));
    return () => {
      unsubItems();
      unsubBatches();
    };
  }, [activeOnly]);

  useEffect(() => {
    if (!batchDrawerItem) return;
    return listenBatchesByItem(DEFAULT_CLINIC_ID, batchDrawerItem.id, (rows) => setItemBatches(rows as Array<{ id: string; batchNo?: string; expiryDate?: string; qtyAvailable?: number; unitCost?: number }>));
  }, [batchDrawerItem]);

  const onHandMap = useMemo(() => {
    const map = new Map<string, number>();
    batches.forEach((batch) => {
      map.set(batch.itemId, (map.get(batch.itemId) || 0) + Number(batch.qtyAvailable || 0));
    });
    return map;
  }, [batches]);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const hay = `${item.name || ''} ${item.sku || ''}`.toLowerCase();
        return hay.includes(search.toLowerCase());
      }),
    [items, search],
  );

  const openCreate = () => {
    setEditing(null);
    setName('');
    setSku('');
    setUnit('unit');
    setSellPrice('0');
    setReorderLevel('0');
    setActive(true);
    setFormOpen(true);
  };

  const openEdit = (row: StockItemRow) => {
    setEditing(row);
    setName(row.name || '');
    setSku(row.sku || '');
    setUnit(row.unit || 'unit');
    setSellPrice(String(row.sellPrice || 0));
    setReorderLevel(String(row.reorderLevel || 0));
    setActive(Boolean(row.active));
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Stock Items" subtitle="Realtime item master + on-hand visibility" actions={<Button onClick={openCreate}>+ New Item</Button>} />
      <Card>
        <CardHeader title="Items" />
        <div className="mb-3 flex flex-wrap gap-2">
          <Input placeholder="Search name/SKU" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[280px]" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} /> Active only
          </label>
        </div>
        <DataTable
          rows={filtered}
          columns={[
            { key: 'name', header: 'Name', render: (row) => row.name },
            { key: 'sku', header: 'SKU', render: (row) => row.sku || '-' },
            { key: 'unit', header: 'Unit', render: (row) => row.unit || '-' },
            { key: 'sellPrice', header: 'Sell Price', render: (row) => `LKR ${Number(row.sellPrice || 0).toLocaleString()}` },
            { key: 'onHand', header: 'On-hand', render: (row) => Number(onHandMap.get(row.id) || 0) },
            { key: 'reorderLevel', header: 'Reorder', render: (row) => Number(row.reorderLevel || 0) },
            { key: 'active', header: 'Active', render: (row) => (row.active ? 'Yes' : 'No') },
          ]}
          rowActions={[
            { label: 'Edit', onClick: (row) => openEdit(row as StockItemRow) },
            { label: 'View batches', onClick: (row) => setBatchDrawerItem(row as StockItemRow) },
            {
              label: 'Deactivate',
              onClick: async (row) => {
                await updateStockItem(DEFAULT_CLINIC_ID, user?.uid || 'admin', String(row.id), { active: false });
                push('Item deactivated', 'info');
              },
            },
          ]}
        />
      </Card>

      <Drawer open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit item' : 'Create item'}>
        <div className="space-y-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
          <Input placeholder="Unit (tab/cap/ml...)" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <Input type="number" min="0" placeholder="Sell price" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
          <Input type="number" min="0" placeholder="Reorder level" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
          <Button
            onClick={async () => {
              if (!name.trim()) {
                push('Item name is required', 'error');
                return;
              }
              if (editing) {
                await updateStockItem(DEFAULT_CLINIC_ID, user?.uid || 'admin', editing.id, {
                  name,
                  sku,
                  unit,
                  sellPrice: Number(sellPrice || 0),
                  reorderLevel: Number(reorderLevel || 0),
                  active,
                });
                push('Item updated', 'success');
              } else {
                await createStockItem(DEFAULT_CLINIC_ID, user?.uid || 'admin', {
                  name,
                  sku,
                  unit,
                  sellPrice: Number(sellPrice || 0),
                  reorderLevel: Number(reorderLevel || 0),
                  active,
                });
                push('Item created', 'success');
              }
              setFormOpen(false);
            }}
          >
            Save item
          </Button>
        </div>
      </Drawer>

      <Drawer open={!!batchDrawerItem} onClose={() => setBatchDrawerItem(null)} title={`Batches • ${batchDrawerItem?.name || ''}`}>
        <DataTable
          rows={itemBatches}
          columns={[
            { key: 'batchNo', header: 'Batch', render: (row) => row.batchNo || '-' },
            { key: 'expiryDate', header: 'Expiry', render: (row) => row.expiryDate || '-' },
            { key: 'qtyAvailable', header: 'Available', render: (row) => Number(row.qtyAvailable || 0) },
            { key: 'unitCost', header: 'Unit cost', render: (row) => `LKR ${Number(row.unitCost || 0).toLocaleString()}` },
          ]}
        />
      </Drawer>
    </div>
  );
};

export const StockPurchasesPage = () => {
  const { user } = useAuthContext();
  const { push } = useToast();
  const [items, setItems] = useState<StockItemRow[]>([]);
  const [purchases, setPurchases] = useState<Array<{ id: string; purchaseNo?: string; purchaseDate?: string; supplier?: string; totalCost?: number; status?: string; items?: PurchaseLineDraft[] }>>([]);
  const [lineItem, setLineItem] = useState<{ id: string; label: string } | null>(null);
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [unitCost, setUnitCost] = useState('0');
  const [qty, setQty] = useState('1');
  const [supplier, setSupplier] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<PurchaseLineDraft[]>([]);
  const [voiding, setVoiding] = useState<{ id: string; purchaseNo?: string } | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [detail, setDetail] = useState<{ id: string; purchaseNo?: string; items?: PurchaseLineDraft[]; totalCost?: number; status?: string } | null>(null);

  useEffect(() => {
    const unsubItems = listenStockItems(DEFAULT_CLINIC_ID, (rows) => setItems(rows as StockItemRow[]));
    const unsubPurchases = subscribeByClinic(DEFAULT_CLINIC_ID, 'purchases', (rows) => setPurchases(rows as Array<{ id: string; purchaseNo?: string; purchaseDate?: string; supplier?: string; totalCost?: number; status?: string; items?: PurchaseLineDraft[] }>));
    return () => {
      unsubItems();
      unsubPurchases();
    };
  }, []);

  const itemOptions = useMemo(() => items.map((item) => ({ id: item.id, label: item.name, meta: item.sku || undefined })), [items]);
  const totalCost = useMemo(() => lines.reduce((sum, l) => sum + Number(l.qty || 0) * Number(l.unitCost || 0), 0), [lines]);

  return (
    <div className="space-y-4">
      <PageHeader title="Stock Purchases" subtitle="Post purchases into batches and stock movements" />
      <Card>
        <CardHeader title="+ New Purchase" />
        <div className="grid gap-2 md:grid-cols-3">
          <Input placeholder="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          <Input placeholder="Invoice Ref" value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} />
          <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-6">
          <Combobox label="Item" value={lineItem} onChange={setLineItem} items={itemOptions} placeholder="Select item" />
          <Input placeholder="Batch No" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
          <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          <Input type="number" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="Unit cost" />
          <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" />
          <Button
            onClick={() => {
              if (!lineItem || !batchNo || !expiryDate) {
                push('Item, batch no, expiry are required', 'error');
                return;
              }
              setLines((prev) => [
                ...prev,
                {
                  itemId: lineItem.id,
                  itemName: lineItem.label,
                  batchNo,
                  expiryDate,
                  unitCost,
                  qty,
                },
              ]);
              setLineItem(null);
              setBatchNo('');
              setExpiryDate('');
              setUnitCost('0');
              setQty('1');
            }}
          >
            Add line
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {lines.map((line, idx) => (
            <div key={`${line.itemId}-${line.batchNo}-${idx}`} className="grid grid-cols-6 items-center gap-2 rounded border p-2 text-sm">
              <span>{line.itemName}</span>
              <span>{line.batchNo}</span>
              <span>{line.expiryDate}</span>
              <span>{line.qty}</span>
              <span>LKR {Number(line.unitCost || 0).toLocaleString()}</span>
              <Button variant="danger" onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}>Remove</Button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between rounded bg-slate-50 p-3 text-sm">
          <span>Total Cost: <b>LKR {totalCost.toLocaleString()}</b></span>
          <Button
            onClick={async () => {
              if (!lines.length) {
                push('Add at least one line', 'error');
                return;
              }
              const res = await createPurchase(DEFAULT_CLINIC_ID, user?.uid || 'admin', user?.email, {
                supplier,
                invoiceRef,
                purchaseDate,
                items: lines.map((line) => ({
                  itemId: line.itemId,
                  itemName: line.itemName,
                  batchNo: line.batchNo,
                  expiryDate: line.expiryDate,
                  unitCost: Number(line.unitCost || 0),
                  qty: Number(line.qty || 0),
                })),
              });
              push(`Purchase ${res.purchaseNo} posted`, 'success');
              setLines([]);
              setSupplier('');
              setInvoiceRef('');
            }}
          >
            Post Purchase
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Purchases (realtime)" />
        <DataTable
          rows={purchases}
          columns={[
            { key: 'purchaseNo', header: 'Purchase No', render: (row) => row.purchaseNo || '-' },
            { key: 'purchaseDate', header: 'Date', render: (row) => row.purchaseDate || '-' },
            { key: 'supplier', header: 'Supplier', render: (row) => row.supplier || '-' },
            { key: 'totalCost', header: 'Total Cost', render: (row) => `LKR ${Number(row.totalCost || 0).toLocaleString()}` },
            { key: 'status', header: 'Status', render: (row) => row.status || 'posted' },
          ]}
          rowActions={[
            { label: 'View/Print', onClick: (row) => setDetail(row as { id: string; purchaseNo?: string; items?: PurchaseLineDraft[]; totalCost?: number; status?: string }) },
            {
              label: 'Void',
              onClick: (row) => {
                setVoiding({ id: String(row.id), purchaseNo: String(row.purchaseNo || '') });
                setVoidReason('');
              },
            },
          ]}
        />
      </Card>

      <Drawer open={!!detail} onClose={() => setDetail(null)} title={`Purchase ${detail?.purchaseNo || ''}`}>
        <div className="space-y-2">
          {(detail?.items || []).map((line, idx) => (
            <div key={`${line.itemId}-${idx}`} className="rounded border p-2 text-sm">
              {line.itemName} • Batch {line.batchNo} • Exp {line.expiryDate} • Qty {line.qty} • LKR {Number(line.unitCost || 0).toLocaleString()}
            </div>
          ))}
          <p className="font-semibold">Total: LKR {Number(detail?.totalCost || 0).toLocaleString()}</p>
          <Button variant="secondary" onClick={() => window.print()}>Print purchase slip</Button>
        </div>
      </Drawer>

      <Drawer open={!!voiding} onClose={() => setVoiding(null)} title="Void purchase">
        <div className="space-y-2">
          <p className="text-sm">Purchase: {voiding?.purchaseNo || '-'}</p>
          <Input placeholder="Void reason" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
          <Button
            variant="danger"
            onClick={async () => {
              if (!voiding) return;
              try {
                await voidPurchase(DEFAULT_CLINIC_ID, user?.uid || 'admin', user?.email, voiding.id, voidReason || 'Not provided');
                push('Purchase voided', 'info');
                setVoiding(null);
              } catch (error) {
                push((error as Error).message, 'error');
              }
            }}
          >
            Confirm void
          </Button>
        </div>
      </Drawer>
    </div>
  );
};

export const StockExpiryPage = () => {
  const [days, setDays] = useState(30);
  const [expiring, setExpiring] = useState<Array<{ id: string; itemName?: string; batchNo?: string; expiryDate?: string; qtyAvailable?: number }>>([]);
  const [lowStock, setLowStock] = useState<Array<{ id: string; name?: string; reorderLevel?: number; onHand?: number }>>([]);

  useEffect(() => {
    const unsubExpiry = listenExpiringBatches(DEFAULT_CLINIC_ID, days, (rows) => setExpiring(rows as Array<{ id: string; itemName?: string; batchNo?: string; expiryDate?: string; qtyAvailable?: number }>));
    const unsubLow = listenLowStockItems(DEFAULT_CLINIC_ID, (rows) => setLowStock(rows as Array<{ id: string; name?: string; reorderLevel?: number; onHand?: number }>));
    return () => {
      unsubExpiry();
      unsubLow();
    };
  }, [days]);

  return (
    <div className="space-y-4">
      <PageHeader title="Expiry & Low Stock" subtitle="Realtime alert dashboard" />
      <Card>
        <CardHeader title="Expiring Batches" subtitle="Only batches with available quantity" />
        <div className="mb-2 flex gap-2">
          {[7, 14, 30, 60].map((n) => (
            <Button key={n} variant={days === n ? 'primary' : 'secondary'} onClick={() => setDays(n)}>{n} days</Button>
          ))}
        </div>
        <DataTable
          rows={expiring}
          columns={[
            { key: 'itemName', header: 'Item', render: (row) => row.itemName || '-' },
            { key: 'batchNo', header: 'Batch', render: (row) => row.batchNo || '-' },
            { key: 'expiryDate', header: 'Expiry', render: (row) => row.expiryDate || '-' },
            { key: 'qtyAvailable', header: 'Available', render: (row) => Number(row.qtyAvailable || 0) },
          ]}
        />
      </Card>

      <Card>
        <CardHeader title="Low Stock Items" subtitle="On-hand <= reorder level" />
        <DataTable
          rows={lowStock}
          columns={[
            { key: 'name', header: 'Item', render: (row) => row.name || '-' },
            { key: 'onHand', header: 'On-hand', render: (row) => Number(row.onHand || 0) },
            { key: 'reorderLevel', header: 'Reorder level', render: (row) => Number(row.reorderLevel || 0) },
          ]}
        />
      </Card>
    </div>
  );
};
