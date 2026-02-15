import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { callGenerateInvoiceNumber } from '@/lib/clinicDb';
import { useToast } from '@/components/ui/Toast';

export const BillingPage = () => {
  const [invoiceNo, setInvoiceNo] = useState('');
  const { push } = useToast();

  return (
    <div className="space-y-4">
      <PageHeader title="Billing" subtitle="Generate invoices quickly with minimal clicks" />
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="max-w-xl space-y-2">
          <Button
            onClick={async () => {
              setInvoiceNo((await callGenerateInvoiceNumber()).invoiceNumber);
              push('Invoice number generated');
            }}
          >
            Generate invoice number
          </Button>
          <Input value={invoiceNo} readOnly placeholder="INV-000001" />
          <Button variant="secondary" onClick={() => window.print()}>Print invoice / receipt</Button>
        </div>
      </div>
    </div>
  );
};
