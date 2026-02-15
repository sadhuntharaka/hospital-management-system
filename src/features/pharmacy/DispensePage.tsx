import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { dispenseFefo } from '@/lib/clinicDb';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

export const DispensePage = () => {
  const { user } = useAuthContext();
  const { push } = useToast();
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDispense = async () => {
    await dispenseFefo({
      clinicId: DEFAULT_CLINIC_ID,
      itemId,
      quantity: Number(qty),
      uid: user?.uid || 'admin',
    });
    setConfirmOpen(false);
    push('Dispense completed');
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Pharmacy Dispense" subtitle="FEFO stock deduction with safety confirmation" />
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="max-w-xl space-y-2">
          <Input placeholder="Item ID" value={itemId} onChange={(e) => setItemId(e.target.value)} />
          <Input placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>Dispense</Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Dispense"
        message="This will deduct stock and cannot be easily undone. Continue?"
        confirmLabel="Yes, dispense"
        onConfirm={handleDispense}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
};
