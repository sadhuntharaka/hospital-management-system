import type { ReactNode } from 'react';

export const Modal = ({ open, title, onClose, children }: { open: boolean; title?: string; onClose: () => void; children: ReactNode }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="mb-2 text-lg font-semibold">{title}</h3>}
        {children}
      </div>
    </div>
  );
};
