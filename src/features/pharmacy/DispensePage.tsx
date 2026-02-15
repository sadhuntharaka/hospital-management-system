import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { dispenseFefo, subscribeByClinic } from '@/lib/clinicDb';
import { Combobox } from '@/components/ui/Combobox';
import { useStockItems } from '@/hooks/useLookupData';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { PatientIdentityBar } from '@/components/ui/PatientIdentityBar';

export const DispensePage = () => {
  const { user } = useAuthContext();
  const { push } = useToast();
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ id: string; label: string } | null>(null);
  const [qty, setQty] = useState('1');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  const { data: items, loading: itemsLoading } = useStockItems(DEFAULT_CLINIC_ID);

  useEffect(() => {
    const unsubBatches = subscribeByClinic(DEFAULT_CLINIC_ID, 'stockBatches', (rows) => setBatches(rows as any[]));
    return () => {
      unsubBatches();
    };
  }, []);

  const qtyNumber = Number(qty);

  const available = useMemo(
    () =>
      batches
        .filter((b) => b.itemId === selectedItem?.id)
        .reduce((sum, b) => sum + Number(b.quantityAvailable || 0), 0),
    [batches, selectedItem],
  );

  const summary = useMemo(
    () => ({ itemId: selectedItem?.id || '-', qty: qtyNumber || 0, clinicId: DEFAULT_CLINIC_ID }),
    [selectedItem, qtyNumber],
  );

  return (
    <div className="space-y-4">
      <PatientIdentityBar />
      <PageHeader title="Pharmacy Dispense" subtitle="FEFO stock deduction with safety confirmation" />
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="max-w-xl space-y-2">
          <Combobox
            label="Stock Item"
            value={selectedItem}
            onChange={setSelectedItem}
            items={items.map((item) => ({ id: item.id as string, label: (item.name as string) || item.id as string, meta: item.sku as string | undefined }))}
            loading={itemsLoading}
            placeholder="Select stock item"
          />
          <Input placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="1" />

          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            <p><b>Item ID:</b> {summary.itemId}</p>
            <p><b>Quantity:</b> {summary.qty}</p>
            <p><b>Available:</b> {available}</p>
            <p><b>Clinic:</b> {summary.clinicId}</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            variant="danger"
            onClick={() => {
              setError('');
              if (!selectedItem?.id) {
                setError('Item ID is required');
                return;
              }
              if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
                setError('Quantity must be a positive number');
                return;
              }
              if (qtyNumber > available) {
                setError('Insufficient available stock');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            Dispense
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Dispense"
        message="You are about to deduct stock and create a stock movement record. Verify the correct patient and item before continuing."
        confirmLabel="Yes, dispense"
        onConfirm={async () => {
          if (!selectedItem) return;
          try {
            await dispenseFefo({
              clinicId: DEFAULT_CLINIC_ID,
              itemId: selectedItem.id,
              quantity: qtyNumber,
              uid: user?.uid || 'admin',
              email: user?.email,
            });
            setConfirmOpen(false);
            push('Dispense completed', 'success');
          } catch (err) {
            setError((err as Error).message);
            setConfirmOpen(false);
          }
        }}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
};
