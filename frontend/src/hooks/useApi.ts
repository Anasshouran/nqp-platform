import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  retry: () => void;
}

export function useApi<T>(fetcher: () => Promise<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestIdRef = useRef(0);

  const run = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (requestIdRef.current === requestId) {
        setData(result);
      }
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(err);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  const retry = useCallback(() => {
    void run();
  }, [run]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, retry };
}