// Debounced shipment search, discarding out-of-order responses via a run token.
// Extracted from ClerkDashboardPage without behavioural change.
import { useRef, useState, useEffect } from 'react';
import { getShipments }  from '../../../api/endpoints/food';
import type { FoodShipment } from '../../../types/food';

export const useClerkSearch = () => {
  const [searchInput, setSearchInputLocal] = useState('');
  const [searchResults, setSearchResults] = useState<FoodShipment[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRun = useRef(0);
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const q = searchInput.trim();
      if (!q) {
        setSearchResults([]);
        setSearchLoading(false);
        setSearchError(null);
        return;
      }
      const runId = ++searchRun.current;
      setSearchLoading(true);
      setSearchError(null);
      try {
        const res = await getShipments({ search: q, page_size: 20 });
        if (searchRun.current !== runId) return;
        setSearchResults(res.data.data.results ?? []);
      } catch {
        if (searchRun.current !== runId) return;
        setSearchResults([]);
        setSearchError('تعذر البحث — تحقق من الاتصال بالخادم وحاول مجددًا');
      } finally {
        if (searchRun.current === runId) setSearchLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  return { recentSearches, searchError, searchInput, searchLoading, searchResults, setRecentSearches, setSearchInputLocal };
};
