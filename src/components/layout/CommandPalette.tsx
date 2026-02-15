import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

export interface CommandItem {
  label: string;
  to: string;
}

export const CommandPalette = ({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: CommandItem[] }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();

  const navigationCommands = useMemo(
    () => commands.filter((command) => !command.label.startsWith('Patient:') && command.label.toLowerCase().includes(query.toLowerCase())),
    [commands, query],
  );

  const patientCommands = useMemo(
    () => commands.filter((command) => command.label.startsWith('Patient:') && command.label.toLowerCase().includes(query.toLowerCase())),
    [commands, query],
  );

  const allItems = [...navigationCommands, ...patientCommands];

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const execute = (item: CommandItem) => {
    navigate(item.to);
    onClose();
    setQuery('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Command Palette">
      <Input
        placeholder="Jump to module or patient..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((idx) => Math.min(allItems.length - 1, idx + 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((idx) => Math.max(0, idx - 1));
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            const selected = allItems[activeIndex];
            if (selected) execute(selected);
          }
        }}
      />
      <div className="mt-3 max-h-80 space-y-3 overflow-auto">
        <section>
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Navigation</p>
          <div className="mt-1 space-y-1">
            {navigationCommands.map((item, idx) => (
              <button
                key={item.to}
                className={`block w-full rounded px-3 py-2 text-left text-sm ${idx === activeIndex ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
                onClick={() => execute(item)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Patients</p>
          <div className="mt-1 space-y-1">
            {patientCommands.map((item, idx) => {
              const absoluteIdx = navigationCommands.length + idx;
              return (
                <button
                  key={item.to}
                  className={`block w-full rounded px-3 py-2 text-left text-sm ${absoluteIdx === activeIndex ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
                  onClick={() => execute(item)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        {allItems.length === 0 && <p className="px-2 py-4 text-sm text-slate-500">No results</p>}
      </div>
    </Modal>
  );
};
