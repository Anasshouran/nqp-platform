import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import type { ApiResponse, PaginatedResponse } from '../types/api';

/** رسالة عجز تحميل واحدة، صادقة في سببها. */
const GENERIC_LOAD_ERROR = 'تعذر تحميل البيانات، حاول مرة أخرى';
const FORBIDDEN_ERROR = 'لا تملك صلاحية الوصول إلى هذه البيانات';

/**
 * يفصل بين «لا تملك الصلاحية» و«تعذّر الاتصال».
 *
 * الخطأ الوحيد الذي كان يُعرض للمستخدم هو catch فارغ يبتلع الاستثناء، فكل
 * 403 كان يظهر كتعذّر تحميل — وهو ما أخفى ثلاثة أخطاء RBAC متتالية في
 * صفحات WHO. نُبقي نصّ الخادم حين يكون مفيداً، ولا نخترع رسالة لغير ما نعرفه.
 */
export const describeLoadFailure = (err: unknown): string => {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    if (status === 403) {
      const detail = (err.response?.data as { detail?: string } | undefined)?.detail;
      return detail?.trim() || FORBIDDEN_ERROR;
    }
    if (status === 401) return 'انتهت الجلسة، يرجى تسجيل الدخول من جديد';
    if (status !== undefined) return `تعذر تحميل البيانات (خطأ ${status})`;
  }
  return GENERIC_LOAD_ERROR;
};

export interface DataTableFilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export type SortOrder = 'asc' | 'desc';

export interface UseServerTableOptions<T> {
  fetchData: (params: Record<string, unknown>) => Promise<{
    data: ApiResponse<PaginatedResponse<T>>;
  }>;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  searchDebounceMs?: number;
}

export interface UseServerTableResult<T> {
  rows: T[];
  count: number;
  loading: boolean;
  error: string | null;
  page: number;
  rowsPerPage: number;
  pageSizeOptions: number[];
  search: string;
  searchInput: string;
  sortBy: string;
  sortOrder: SortOrder;
  refresh: () => void;
  setSearchInput: (value: string) => void;
  setPage: (page: number) => void;
  setRowsPerPage: (size: number) => void;
  setSorting: (field: string) => void;
  setFilter: (key: string, value: string) => void;
  resetFilters: () => void;
  fetchAllRows: () => Promise<T[]>;
}

export const useServerTable = <T,>({
  fetchData,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  searchDebounceMs = 400,
}: UseServerTableOptions<T>): UseServerTableResult<T> => {
  const [rows, setRows] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialPageSize);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const runId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, searchDebounceMs);
    return () => window.clearTimeout(timer);
  }, [searchInput, searchDebounceMs]);

  const params = useMemo(
    () => ({
      page,
      page_size: rowsPerPage,
      ...(search ? { search } : {}),
      ...filters,
      ...(sortBy ? { ordering: sortOrder === 'asc' ? sortBy : `-${sortBy}` } : {}),
    }),
    [page, rowsPerPage, search, sortBy, sortOrder, filters]
  );

  const run = useCallback(
    async (p: Record<string, unknown>) => {
      const current = ++runId.current;
      setLoading(true);
      setError(null);
      try {
        const response = await fetchData(p);
        if (runId.current !== current) return;
        setRows(response.data.data.results);
        setCount(response.data.data.count);
      } catch (err) {
        if (runId.current !== current) return;
        // 403 ليس فشل شبكة: «تعذر تحميل البيانات» كانت تُخفي نقص الصلاحيات
        // خلف رسالة عامة، فيبحث المستخدم عن عطل اتصال بينما المشكلة في RBAC.
        // نعتمد نصّ الخادم حين يتوفّر لنقول الحقيقة.
        setError(describeLoadFailure(err));
      } finally {
        if (runId.current === current) setLoading(false);
      }
    },
    [fetchData]
  );

  useEffect(() => {
    run(params);
  }, [run, params]);

  const refresh = useCallback(() => {
    run(params);
  }, [run, params]);

  const handleSetRowsPerPage = useCallback((size: number) => {
    setRowsPerPage(size);
    setPage(1);
  }, []);

  const handleSorting = useCallback((field: string) => {
    setSortBy((prevBy) => {
      setSortOrder((prevOrder) =>
        prevBy === field ? (prevOrder === 'asc' ? 'desc' : 'asc') : 'asc'
      );
      return field;
    });
    setPage(1);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
    setSearchInput('');
    setSearch('');
    setSortBy('');
    setSortOrder('asc');
    setPage(1);
  }, []);

  /**
   * Fetches every row matching the current search/filter/sort (not just the
   * visible page) by walking server-side pages up to `count`. Used for exports.
   */
  const fetchAllRows = useCallback(async (): Promise<T[]> => {
    const all: T[] = [];
    let currentPage = 1;
    const pageSize = 500;
    while (true) {
      const response = await fetchData({
        ...params,
        page: currentPage,
        page_size: pageSize,
      });
      const data = response.data.data;
      all.push(...data.results);
      if (all.length >= data.count || data.results.length < pageSize) break;
      currentPage += 1;
    }
    return all;
  }, [fetchData, params]);

  return {
    rows,
    count,
    loading,
    error,
    page,
    rowsPerPage,
    pageSizeOptions,
    search,
    searchInput,
    sortBy,
    sortOrder,
    refresh,
    setSearchInput,
    setPage,
    setRowsPerPage: handleSetRowsPerPage,
    setSorting: handleSorting,
    setFilter,
    resetFilters,
    fetchAllRows,
  };
};
