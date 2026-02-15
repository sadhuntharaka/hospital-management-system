import { Modal } from './Modal';
import { Button } from './Button';

export const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', onConfirm, onClose }: { open: boolean; title: string; message: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) => (
  <Modal open={open} title={title} onClose={onClose}>
    <p className="mb-4 text-sm text-slate-600">{message}</p>
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
    </div>
  </Modal>
);
