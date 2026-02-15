import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export const ConfirmDialog = ({
  open,
  title,
  message,
  detail,
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  detail?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) => (
  <Modal open={open} title={title} onClose={onClose}>
    <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">Danger action confirmation required.</div>
    <p className="mb-3 mt-3 text-sm text-slate-600">{message}</p>
    {detail ? <div className="mb-4 max-h-56 overflow-auto rounded border bg-slate-50 p-2 text-xs text-slate-700">{detail}</div> : null}
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
    </div>
  </Modal>
);
