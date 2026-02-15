import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { dispenseFefo } from '@/lib/clinicDb';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { PatientIdentityBar } from '@/components/ui/PatientIdentityBar';

export const DispensePage = () => {
  const { user } = useAuthContext();
  const { push } = useToast();
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  const qtyNumber = Number(qty);

  const summary = useMemo(
    () => ({ itemId: itemId || '-', qty: qtyNumber || 0, clinicId: DEFAULT_CLINIC_ID }),
    [itemId, qtyNumber],
  );

  const handleDispense = async () => {
    await dispenseFefo({
      clinicId: DEFAULT_CLINIC_ID,
      itemId,
      quantity: qtyNumber,
      uid: user?.uid || 'admin',
    });
    setConfirmOpen(false);
    push('Dispense completed', 'success');
  };

  return (
    <div className="space-y-4">
      <PatientIdentityBar />
      <PageHeader title="Pharmacy Dispense" subtitle="FEFO stock deduction with safety confirmation" />
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="max-w-xl space-y-2">
          <Input placeholder="Item ID" value={itemId} onChange={(e) => setItemId(e.target.value)} />
          <Input placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} />

          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            <p><b>Item ID:</b> {summary.itemId}</p>
            <p><b>Quantity:</b> {summary.qty}</p>
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
        message="You are about to deduct stock. Please verify patient and item details before continuing. This action affects inventory records."
        confirmLabel="Yes, dispense"
        onConfirm={handleDispense}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
};
