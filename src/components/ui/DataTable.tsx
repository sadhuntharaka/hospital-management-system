import { useMemo, useState, type ReactNode } from 'react';
import { Button } from './Button';

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
}

interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
}

export const DataTable = <T extends { id: string }>({ rows, columns, rowActions = [] }: { rows: T[]; columns: Column<T>[]; rowActions?: RowAction<T>[] }) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortValue) return rows;

    return [...rows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (av === bv) return 0;
      return av > bv ? (ascending ? 1 : -1) : ascending ? -1 : 1;
    });
  }, [rows, columns, sortKey, ascending]);

  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-semibold text-slate-700">
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => {
                    if (!column.sortValue) return;
                    if (sortKey === column.key) setAscending((v) => !v);
                    else {
                      setSortKey(column.key);
                      setAscending(true);
                    }
                  }}
                >
                  {column.header}
                </button>
              </th>
            ))}
            {rowActions.length > 0 && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {paginated.map((row) => (
            <tr key={row.id} className="border-t">
              {columns.map((column) => (
                <td key={`${row.id}-${column.key}`} className="px-4 py-3">
                  {column.render(row)}
                </td>
              ))}
              {rowActions.length > 0 && (
                <td className="px-4 py-3 text-right">
                  <details className="relative inline-block">
                    <summary className="cursor-pointer list-none rounded px-2 py-1 hover:bg-slate-100">⋯</summary>
                    <div className="absolute right-0 z-10 mt-1 min-w-36 rounded border bg-white p-1 shadow">
                      {rowActions.map((action) => (
                        <button
                          key={action.label}
                          className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
                          onClick={() => action.onClick(row)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </details>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t bg-slate-50 px-4 py-2 text-xs">
        <span>
          Page {page} of {pageCount}
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <Button variant="secondary" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
};
