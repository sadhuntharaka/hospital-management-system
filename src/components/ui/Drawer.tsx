import type { ReactNode } from 'react';

export const Drawer = ({ open, title, onClose, children }: { open: boolean; title?: string; onClose: () => void; children: ReactNode }) => {
  return (
    <div className={`fixed inset-0 z-40 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/30 transition ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside className={`absolute right-0 top-0 h-full w-full max-w-md bg-white p-4 shadow-2xl transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="rounded px-2 py-1 text-sm hover:bg-slate-100" onClick={onClose}>Close</button>
        </div>
        {children}
      </aside>
    </div>
  );
};
