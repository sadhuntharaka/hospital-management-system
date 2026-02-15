import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

export interface CommandItem {
  label: string;
  to: string;
}

export const CommandPalette = ({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: CommandItem[] }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const filtered = useMemo(
    () => commands.filter((command) => command.label.toLowerCase().includes(query.toLowerCase())),
    [commands, query],
  );

  return (
    <Modal open={open} onClose={onClose} title="Command Palette">
      <Input placeholder="Jump to module or patient..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      <div className="mt-3 max-h-80 space-y-1 overflow-auto">
        {filtered.map((item) => (
          <button
            key={item.to}
            className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100"
            onClick={() => {
              navigate(item.to);
              onClose();
              setQuery('');
            }}
          >
            {item.label}
          </button>
        ))}
        {filtered.length === 0 && <p className="px-2 py-4 text-sm text-slate-500">No results</p>}
      </div>
    </Modal>
  );
};
