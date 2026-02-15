import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { listenBatchesByItem, planFefo, postDispense, subscribeByClinic, voidDispense } from '@/lib/clinicDb';
import { Combobox } from '@/components/ui/Combobox';
import { useDoctors, usePatients, useStockItems } from '@/hooks/useLookupData';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';

const todayKey = () => new Date().toISOString().slice(0, 10);

type PlanRow = { batchId: string; batchNo: string; expiryDate: string; qty: number; unitCost: number };

export const DispensePage = () => {
  const { user } = useAuthContext();
  const { push } = useToast();
  const [selectedItem, setSelectedItem] = useState<{ id: string; label: string } | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; label: string; meta?: string } | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string; label: string } | null>(null);
  const [walkinName, setWalkinName] = useState('');
  const [qty, setQty] = useState('1');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [plan, setPlan] = useState<PlanRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [itemBatches, setItemBatches] = useState<Array<{ id: string; expiryDate?: string; qtyAvailable?: number }>>([]);
  const [dispenses, setDispenses] = useState<Array<{ id: string; dispenseNo?: string; patientName?: string; doctorName?: string; dispenseDate?: string; totalCost?: number; status?: string; items?: Array<{ itemName: string; qty: number; batchesUsed: PlanRow[] }> }>>([]);
  const [viewing, setViewing] = useState<typeof dispenses[number] | null>(null);
  const [voiding, setVoiding] = useState<typeof dispenses[number] | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const { data: items, loading: itemsLoading } = useStockItems(DEFAULT_CLINIC_ID);
  const { data: patients, loading: patientsLoading } = usePatients(DEFAULT_CLINIC_ID);
  const { data: doctors, loading: doctorsLoading } = useDoctors(DEFAULT_CLINIC_ID);

  useEffect(() => {
    const unsub = subscribeByClinic(DEFAULT_CLINIC_ID, 'dispenses', (rows) => {
      const today = todayKey();
      setDispenses((rows as typeof dispenses).filter((row) => (row.dispenseDate || '').slice(0, 10) === today));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedItem?.id) {
      setItemBatches([]);
      return;
    }
    return listenBatchesByItem(DEFAULT_CLINIC_ID, selectedItem.id, (rows) => setItemBatches(rows as Array<{ id: string; expiryDate?: string; qtyAvailable?: number }>));
  }, [selectedItem]);

  const itemOptions = useMemo(() => items.map((item) => ({ id: String(item.id), label: String(item.name || item.id), meta: item.sku as string | undefined })), [items]);
  const patientOptions = useMemo(() => patients.map((p) => ({ id: String(p.id), label: String(p.fullName || p.id), meta: `${p.phone || ''} ${p.nic || ''}`.trim() || undefined })), [patients]);
  const doctorOptions = useMemo(() => doctors.map((d) => ({ id: String(d.id), label: String(d.fullName || d.id), meta: d.specialty as string | undefined })), [doctors]);

  const onHand = useMemo(() => itemBatches.reduce((sum, batch) => sum + Number(batch.qtyAvailable || 0), 0), [itemBatches]);
  const soonestExpiry = useMemo(() => itemBatches.filter((b) => Number(b.qtyAvailable || 0) > 0).sort((a, b) => String(a.expiryDate || '').localeCompare(String(b.expiryDate || '')))[0]?.expiryDate, [itemBatches]);

  return (
    <div className="space-y-4">
      <PageHeader title="Pharmacy Dispense" subtitle="FEFO-safe dispense with realtime logs" />

      <Card>
        <CardHeader title="New dispense" />
        <div className="grid gap-3 md:grid-cols-2">
          <Combobox label="Patient (optional)" value={selectedPatient} onChange={setSelectedPatient} items={patientOptions} loading={patientsLoading} placeholder="Select patient" />
          <Input placeholder="Walk-in name (if no patient selected)" value={walkinName} onChange={(e) => setWalkinName(e.target.value)} />
          <Combobox label="Doctor (optional)" value={selectedDoctor} onChange={setSelectedDoctor} items={doctorOptions} loading={doctorsLoading} placeholder="Select doctor" />
          <Combobox label="Item" value={selectedItem} onChange={setSelectedItem} items={itemOptions} loading={itemsLoading} placeholder="Select stock item" />
          <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Quantity" />
        </div>

        <div className="mt-3 rounded bg-slate-50 p-3 text-sm">
          <p>On-hand: <b>{onHand}</b></p>
          <p>Soonest expiry: <b>{soonestExpiry || '-'}</b></p>
          {selectedItem && onHand <= 5 && <p className="text-amber-700">Low stock warning for this item.</p>}
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            variant="danger"
            disabled={submitting}
            onClick={async () => {
              if (!selectedItem) {
                push('Item is required', 'error');
                return;
              }
              const qtyNumber = Math.floor(Number(qty || 0));
              if (!Number.isInteger(qtyNumber) || qtyNumber < 1) {
                push('Quantity must be integer >= 1', 'error');
                return;
              }
              try {
                const planRows = await planFefo(DEFAULT_CLINIC_ID, selectedItem.id, qtyNumber);
                setPlan(planRows);
                setConfirmOpen(true);
              } catch (error) {
                push((error as Error).message, 'error');
              }
            }}
          >
            Review FEFO Plan
          </Button>
        </div>

        {plan.length > 0 && (
          <div className="mt-3 rounded border p-3 text-sm">
            <p className="mb-2 font-medium">Planned FEFO usage</p>
            {plan.map((row) => (
              <p key={row.batchId}>Batch {row.batchNo} • Exp {row.expiryDate} • Qty {row.qty}</p>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Today dispenses" subtitle="Realtime dispense postings" />
        <DataTable
          rows={dispenses}
          columns={[
            { key: 'dispenseNo', header: 'Dispense No', render: (row) => row.dispenseNo || '-' },
            { key: 'patientName', header: 'Patient', render: (row) => row.patientName || '-' },
            { key: 'doctorName', header: 'Doctor', render: (row) => row.doctorName || '-' },
            { key: 'totalCost', header: 'Cost', render: (row) => `LKR ${Number(row.totalCost || 0).toLocaleString()}` },
            { key: 'status', header: 'Status', render: (row) => row.status || 'posted' },
          ]}
          rowActions={[
            { label: 'View/Print', onClick: (row) => setViewing(row as typeof dispenses[number]) },
            { label: 'Void', onClick: (row) => { setVoiding(row as typeof dispenses[number]); setVoidReason(''); } },
          ]}
        />
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm dispense"
        message={`Post dispense using FEFO batches (${plan.length} batch entries).`}
        detail={
          <div className="space-y-1">{plan.map((row) => <p key={row.batchId}>Batch {row.batchNo} • Exp {row.expiryDate} • Qty {row.qty}</p>)}</div>
        }
        confirmLabel="Post dispense"
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          if (!selectedItem) return;
          setSubmitting(true);
          try {
            const qtyNumber = Math.floor(Number(qty || 0));
            const response = await postDispense(DEFAULT_CLINIC_ID, user?.uid || 'admin', user?.email, {
              patientId: selectedPatient?.id,
              patientName: selectedPatient?.label || walkinName || undefined,
              doctorId: selectedDoctor?.id,
              doctorName: selectedDoctor?.label,
              dispenseDate: todayKey(),
              items: [{ itemId: selectedItem.id, itemName: selectedItem.label, qty: qtyNumber }],
            });
            push(`Dispense ${response.dispenseNo} posted`, 'success');
            setConfirmOpen(false);
            setPlan([]);
            setSelectedItem(null);
            setQty('1');
          } catch (error) {
            push((error as Error).message, 'error');
          } finally {
            setSubmitting(false);
          }
        }}
      />

      <Drawer open={!!viewing} onClose={() => setViewing(null)} title={`Dispense ${viewing?.dispenseNo || ''}`}>
        <div className="space-y-2">
          {(viewing?.items || []).map((line, idx) => (
            <div key={`${line.itemName}-${idx}`} className="rounded border p-2 text-sm">
              <p><b>{line.itemName}</b> • Qty {line.qty}</p>
              {line.batchesUsed.map((batch) => (
                <p key={batch.batchId}>Batch {batch.batchNo} • Exp {batch.expiryDate} • Qty {batch.qty}</p>
              ))}
            </div>
          ))}
          <p className="font-semibold">Total Cost: LKR {Number(viewing?.totalCost || 0).toLocaleString()}</p>
          <Button variant="secondary" onClick={() => window.print()}>Print</Button>
        </div>
      </Drawer>

      <Drawer open={!!voiding} onClose={() => setVoiding(null)} title="Void dispense">
        <div className="space-y-2">
          <p className="text-sm">Dispense: {voiding?.dispenseNo || '-'}</p>
          <Input placeholder="Void reason" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
          <Button
            variant="danger"
            onClick={async () => {
              if (!voiding) return;
              try {
                await voidDispense(DEFAULT_CLINIC_ID, user?.uid || 'admin', user?.email, voiding.id, voidReason || 'Not provided');
                push('Dispense voided and stock restored', 'info');
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
