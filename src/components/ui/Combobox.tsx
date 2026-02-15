import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from './Input';

type ComboItem = { id: string; label: string; meta?: string };

interface ComboboxProps {
  label?: string;
  placeholder?: string;
  value: ComboItem | null;
  onChange: (item: ComboItem | null) => void;
  items: ComboItem[];
  loading?: boolean;
  emptyText?: string;
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlight = (text: string, query: string) => {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'ig');
  const parts = text.split(regex);
  return parts.map((part, idx) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={`${part}-${idx}`} className="rounded bg-brand/20 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${idx}`}>{part}</span>
    ),
  );
};

export const Combobox = ({
  label,
  placeholder = 'Search...',
  value,
  onChange,
  items,
  loading,
  emptyText = 'No results found',
}: ComboboxProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.label} ${item.meta || ''}`.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const pick = (item: ComboItem | null) => {
    onChange(item);
    setOpen(false);
    setQuery('');
  };

  const listId = `combo-list-${label || placeholder}`.replace(/\s+/g, '-').toLowerCase();

  return (
    <div ref={rootRef} className="relative min-w-0">
      {label && <p className="mb-1 text-xs font-medium text-slate-600">{label}</p>}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm"
        onClick={() => setOpen((v) => !v)}
      >
        {value ? value.label : <span className="text-slate-400">{placeholder}</span>}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="p-2">
            <Input
              autoFocus
              placeholder={placeholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveIndex((v) => Math.min(v + 1, Math.max(0, filtered.length - 1)));
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveIndex((v) => Math.max(v - 1, 0));
                }
                if (event.key === 'Enter' && filtered[activeIndex]) {
                  event.preventDefault();
                  pick(filtered[activeIndex]);
                }
                if (event.key === 'Escape') {
                  setOpen(false);
                }
              }}
            />
          </div>
          <div role="listbox" id={listId} className="max-h-64 overflow-auto pb-1">
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => pick(null)}
            >
              Clear selection
            </button>
            {loading ? (
              <p className="px-3 py-3 text-sm text-slate-500">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-slate-500">{emptyText}</p>
            ) : (
              filtered.map((item, idx) => (
                <button
                  key={item.id}
                  role="option"
                  aria-selected={value?.id === item.id}
                  type="button"
                  className={`block w-full px-3 py-2 text-left hover:bg-slate-50 ${idx === activeIndex ? 'bg-slate-50' : ''}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => pick(item)}
                >
                  <p className="text-sm font-medium">{highlight(item.label, query)}</p>
                  {item.meta && <p className="text-xs text-slate-500">{highlight(item.meta, query)}</p>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
