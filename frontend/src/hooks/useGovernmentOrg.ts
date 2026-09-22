import { useEffect, useState } from 'react';
import { getProfile } from '../api/endpoints/auth';
import { useAuth } from './useAuth';

export interface GovernmentOrg {
  /** القطاع — يُشتق من حساب المستخدم (ديناميكي) */
  sector: string | null;
  /** الإدارة — الاسم الرسمي للجهة (المعمل / الإدارة) */
  administration: string | null;
  /** القسم التابع للمستخدم */
  department: string | null;
  /** المحطة */
  station: string | null;
  /** المسمى الوظيفي */
  position: string | null;
}

let cachedOrg: GovernmentOrg | null = null;
let cachePromise: Promise<GovernmentOrg | null> | null = null;

const fallbackOrg: GovernmentOrg = {
  sector: null,
  administration: null,
  department: null,
  station: null,
  position: null,
};

/**
 * جلب الهيكل التنظيمي للمستخدم الحالي (القطاع / الإدارة / القسم / المحطة)
 * من واجهة الملف الشخصي، مع تخزين مؤقت على مستوى الوحدة لتفادي التكرار.
 */
export const loadGovernmentOrg = async (): Promise<GovernmentOrg | null> => {
  if (cachedOrg) return cachedOrg;
  if (cachePromise) return cachePromise;
  cachePromise = getProfile()
    .then((r) => {
      const entry = r.data.data.organization?.[0];
      if (!entry) return fallbackOrg;
      cachedOrg = {
        sector: entry.sector ?? null,
        administration: entry.lab ?? entry.department ?? null,
        department: entry.department ?? null,
        station: entry.station ?? null,
        position: entry.position ?? null,
      };
      return cachedOrg;
    })
    .catch(() => fallbackOrg);
  return cachePromise;
};

export const useGovernmentOrg = (): GovernmentOrg | null => {
  const { isAuthenticated } = useAuth();
  const [org, setOrg] = useState<GovernmentOrg | null>(cachedOrg);

  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    loadGovernmentOrg().then((data) => {
      if (mounted) setOrg(data);
    });
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  return org;
};