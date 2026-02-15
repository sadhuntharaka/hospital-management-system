import { useState } from 'react';
import { PageCard } from '@/components/ui/PageCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { callGenerateInvoiceNumber } from '@/lib/clinicDb';

export const BillingPage = () => {
  const [invoiceNo, setInvoiceNo] = useState('');

  return (
    <PageCard title="Billing">
      <div className="space-y-2">
        <Button onClick={async () => setInvoiceNo((await callGenerateInvoiceNumber()).invoiceNumber)}>Generate invoice number</Button>
        <Input value={invoiceNo} readOnly placeholder="INV-000001" />
        <Button onClick={() => window.print()}>Print invoice / receipt</Button>
      </div>
    </PageCard>
  );
};
