import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { dispenseFefo, subscribeByClinic } from '@/lib/clinicDb';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { PatientIdentityBar } from '@/components/ui/PatientIdentityBar';
import { Select } from '@/components/ui/Select';

export const DispensePage = () => {
  const { user } = useAuthContext();
  const { push } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubItems = subscribeByClinic(DEFAULT_CLINIC_ID, 'stockItems', (rows) => setItems(rows as any[]));
    const unsubBatches = subscribeByClinic(DEFAULT_CLINIC_ID, 'stockBatches', (rows) => setBatches(rows as any[]));
    return () => {
      unsubItems();
      unsubBatches();
    };
  }, []);

  const qtyNumber = Number(qty);

  const available = useMemo(
    () =>
      batches
        .filter((b) => b.itemId === itemId)
        .reduce((sum, b) => sum + Number(b.quantityAvailable || 0), 0),
    [batches, itemId],
  );

  const summary = useMemo(
    () => ({ itemId: itemId || '-', qty: qtyNumber || 0, clinicId: DEFAULT_CLINIC_ID }),
    [itemId, qtyNumber],
  );

  return (
    <div className="space-y-4">
      <PatientIdentityBar />
      <PageHeader title="Pharmacy Dispense" subtitle="FEFO stock deduction with safety confirmation" />
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="max-w-xl space-y-2">
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Select stock item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
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
              if (!itemId.trim()) {
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
          try {
            await dispenseFefo({
              clinicId: DEFAULT_CLINIC_ID,
              itemId,
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
