import { createContext, useContext } from 'react';

export interface SectorContentValue {
  /** اسم القطاع المعروض (مثل "قطاع الخرطوم"). */
  sectorName: string;
  /** كود القطاع (مثل khartoum). */
  sectorSlug: string;
}

const SectorContentContext = createContext<SectorContentValue>({
  sectorName: 'قطاع البحر الأحمر',
  sectorSlug: 'red-sea',
});

export const SectorContentProvider = SectorContentContext.Provider;

export const useSectorContent = () => useContext(SectorContentContext);