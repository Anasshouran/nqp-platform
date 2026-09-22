import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSectors } from '../api/endpoints/organization';
import { useAuth } from './useAuth';
import type { Sector } from '../types/organization';

export interface LabSectorOption {
  code: string;
  name_ar: string;
  color?: string;
}

interface LabSectorContextValue {
  /** الكود النشط حالياً داخل المعمل */
  activeSector: string | null;
  /** القطاعات المتاحة للمستخدم (الوطني: الكل؛ القطاعي: قطاعه) */
  allowedSectors: LabSectorOption[];
  /** هل المستخدم على نطاق وطني (يشرف على أكثر من قطاع) */
  isNational: boolean;
  /** تغيير القطاع النشط */
  setSector: (code: string) => void;
  /** خريطة code → Sector للاستعلامات الداخلية */
  sectorByCode: Record<string, Sector>;
}

const LabSectorContext = createContext<LabSectorContextValue | null>(null);

const STORAGE_KEY = 'nqlis_active_sector';

let sectorsCache: Sector[] | null = null;
let sectorsPromise: Promise<Sector[]> | null = null;

const loadSectors = (): Promise<Sector[]> => {
  if (sectorsCache) return Promise.resolve(sectorsCache);
  if (!sectorsPromise) {
    sectorsPromise = getSectors({ page_size: 50, ordering: 'order' })
      .then((r) => {
        sectorsCache = Array.isArray(r.data.data.results) ? r.data.data.results : [];
        return sectorsCache;
      })
      .catch(() => {
        sectorsCache = [];
        return sectorsCache;
      });
  }
  return sectorsPromise;
};

export const LabSectorProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const allowedCodes = useMemo(() => {
    if (!user) return [];
    const codes = user.sector_codes?.length ? user.sector_codes : user.sector_code ? [user.sector_code] : [];
    return codes;
  }, [user]);

  const [sectorMeta, setSectorMeta] = useState<Record<string, Sector>>({});

  useEffect(() => {
    let mounted = true;
    loadSectors().then((all) => {
      if (mounted) {
        setSectorMeta(Object.fromEntries(all.map((s) => [s.code, s])));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const allowedSectors: LabSectorOption[] = useMemo(() => {
    if (!allowedCodes.length) return [];
    const defaults = allowedCodes
      .filter((code) => !sectorMeta[code])
      .map((code) => ({ code, name_ar: code }));
    return [...defaults, ...allowedCodes.map((code) => ({
      code,
      name_ar: sectorMeta[code]?.name_ar ?? sectorMeta[code]?.name_en ?? '',
      color: sectorMeta[code]?.color,
    })).filter((s) => s.name_ar)].sort((a, b) => a.code.localeCompare(b.code));
  }, [allowedCodes, sectorMeta]);

  const defaultSector = useMemo(() => {
    if (allowedCodes.includes(user?.sector_code ?? '')) return user?.sector_code ?? null;
    return allowedCodes[0] ?? null;
  }, [allowedCodes, user?.sector_code]);

  const [activeSector, setActiveSectorState] = useState<string | null>(defaultSector);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (allowedCodes.length && saved && allowedCodes.includes(saved)) {
      setActiveSectorState(saved);
    } else {
      setActiveSectorState(defaultSector);
    }
  }, [allowedCodes, defaultSector]);

  const setSector = useCallback((code: string) => {
    setActiveSectorState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const value = useMemo<LabSectorContextValue>(
    () => ({
      activeSector,
      allowedSectors,
      isNational: allowedCodes.length > 1,
      setSector,
      sectorByCode: sectorMeta,
    }),
    [activeSector, allowedSectors, allowedCodes.length, setSector, sectorMeta]
  );

  return <LabSectorContext.Provider value={value}>{children}</LabSectorContext.Provider>;
};

export const useLabSectors = (): LabSectorContextValue => {
  const ctx = useContext(LabSectorContext);
  if (!ctx) {
    throw new Error('useLabSectors must be used within LabSectorProvider');
  }
  return ctx;
};

export const useLabScope = () => {
  const { activeSector, allowedSectors, isNational } = useLabSectors();
  return {
    sector: activeSector,
    isNational,
    allowedSectors,
  };
};