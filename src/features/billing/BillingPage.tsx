import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { callGenerateInvoiceNumber } from '@/lib/clinicDb';
import { useToast } from '@/components/ui/Toast';
import { PatientIdentityBar } from '@/components/ui/PatientIdentityBar';
import { Card, CardHeader } from '@/components/ui/Card';

export const BillingPage = () => {
  const [invoiceNo, setInvoiceNo] = useState('');
  const { push } = useToast();

  return (
    <div className="space-y-4">
      <PatientIdentityBar />
      <PageHeader title="Billing" subtitle="Generate invoices quickly with minimal clicks" />
      <Card>
        <CardHeader title="Invoice Actions" subtitle="Use this panel for quick invoice generation and printing." />
        <div className="max-w-xl space-y-2">
          <Button
            onClick={async () => {
              setInvoiceNo((await callGenerateInvoiceNumber()).invoiceNumber);
              push('Invoice number generated', 'success');
            }}
          >
            Generate invoice number
          </Button>
          <Input value={invoiceNo} readOnly placeholder="INV-000001" />
          <Button variant="secondary" onClick={() => window.print()}>
            Print invoice / receipt
          </Button>
        </div>
      </Card>
    </div>
  );
};
