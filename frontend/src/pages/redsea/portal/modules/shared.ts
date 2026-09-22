import { useCallback, useEffect, useState } from 'react';
import type { AxiosResponse } from 'axios';
import type { ApiResponse, PaginatedResponse } from '../../../../types/api';

export type Fetcher<K> = (params?: Record<string, unknown>) => Promise<AxiosResponse<ApiResponse<PaginatedResponse<K>>>>;

export function useList<T>(fetcher: Fetcher<T>, params?: Record<string, unknown>) {
  const [data, setData] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetcher(params)
      .then((res) => {
        setData(res.data.data.results);
        setCount(res.data.data.count);
      })
      .catch(() => {
        setData([]);
        setCount(0);
      })
      .finally(() => setLoading(false));
  }, [fetcher, params]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, count, loading, refresh };
}

export function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  return res.data.data;
}
