import { useCallback, useState } from 'react';
import { exportToCsv } from '../utils/csv';
import { notifySuccess, notifyError } from '../utils/toast';

type CsvRow = (string | number | null | undefined)[];

export interface ExportAllOptions<T> {
  filename: string;
  headers: string[];
  mapRow: (row: T) => CsvRow;
  message: string;
  /** Optional predicate to keep the export in sync with a client-side view (e.g. an active tab). */
  filterRows?: (row: T) => boolean;
}

/**
 * Wraps a server table's `fetchAllRows` into an async export handler that
 * downloads every filtered row (not just the visible page), with a busy
 * state for the "جارٍ التصدير..." label and count-based toasts.
 */
export const useTableExport = <T,>(fetchAllRows: () => Promise<T[]>) => {
  const [exporting, setExporting] = useState(false);

  const exportAll = useCallback(
    async (options: ExportAllOptions<T>) => {
      const { filename, headers, mapRow, message, filterRows } = options;
      setExporting(true);
      try {
        const all = await fetchAllRows();
        const rows = filterRows ? all.filter(filterRows) : all;
        exportToCsv(filename, headers, rows.map(mapRow));
        notifySuccess(`${message} (${rows.length})`);
      } catch {
        notifyError('تعذر التصدير، حاول مرة أخرى');
      } finally {
        setExporting(false);
      }
    },
    [fetchAllRows],
  );

  return { exporting, exportAll };
};