export interface SudanMapPoint {
  x: number;
  y: number;
}

export const SUDAN_MAP_POINTS: Record<string, SudanMapPoint> = {
  RED_SEA: { x: 95, y: 20 },
  KASSALA: { x: 90, y: 55 },
  GEDAREF: { x: 84, y: 67 },
  KHARTOUM: { x: 66, y: 53 },
  NORTHERN: { x: 53, y: 23 },
  EL_OBEID: { x: 67, y: 73 },
};

export const regionForSector = (region: string, nameAr: string): string => {
  const key = region.toUpperCase();
  if (key in SUDAN_MAP_POINTS) return key;
  if (nameAr.includes('البحر الأحمر')) return 'RED_SEA';
  if (nameAr.includes('كسلا')) return 'KASSALA';
  if (nameAr.includes('قضارف') || nameAr.includes('القضارف')) return 'GEDAREF';
  if (nameAr.includes('الخرطوم')) return 'KHARTOUM';
  if (nameAr.includes('الشمال')) return 'NORTHERN';
  if (nameAr.includes('الأبيض')) return 'EL_OBEID';
  return 'KHARTOUM';
};
