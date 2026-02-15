import { useState } from 'react';
import { PageCard } from '@/components/ui/PageCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { dispenseFefo } from '@/lib/clinicDb';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';

export const DispensePage = () => {
  const { user } = useAuthContext();
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');

  return (
    <PageCard title="Pharmacy Dispense (FEFO)">
      <div className="space-y-2">
        <Input placeholder="Item ID" value={itemId} onChange={(e) => setItemId(e.target.value)} />
        <Input placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} />
        <Button
          onClick={() =>
            dispenseFefo({
              clinicId: DEFAULT_CLINIC_ID,
              itemId,
              quantity: Number(qty),
              uid: user?.uid || 'admin',
            })
          }
        >
          Dispense
        </Button>
      </div>
    </PageCard>
  );
};
