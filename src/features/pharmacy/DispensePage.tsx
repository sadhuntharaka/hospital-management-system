import { useState } from 'react';
import { PageCard } from '@/components/ui/PageCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { dispenseFefo } from '@/lib/clinicDb';

export const DispensePage = () => {
  const { claims, user } = useAuthContext();
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');

  return (
    <PageCard title="Pharmacy Dispense (FEFO)">
      <div className="space-y-2">
        <Input placeholder="Item ID" value={itemId} onChange={(e) => setItemId(e.target.value)} />
        <Input placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} />
        <Button onClick={() => dispenseFefo({ clinicId: claims!.clinicId, itemId, quantity: Number(qty), uid: user!.uid })}>Dispense</Button>
      </div>
    </PageCard>
  );
};
