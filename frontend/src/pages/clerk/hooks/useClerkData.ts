// Clerk dashboard data loading: shipments, queue stats, ports, derived counters and the alert feed.
// Extracted from ClerkDashboardPage without behavioural change.
import { useCallback, useMemo, useState, useEffect } from 'react';
import { getClerkStats, getPublicPorts, getShipments }  from '../../../api/endpoints/food';
import type { ClerkDashboardData, ClerkStats, FoodShipment, PublicPort } from '../../../types/food';
import type { PaginatedResponse } from '../../../types/api';
import { useAuth } from '../../../hooks/useAuth';
import { notifyError } from '../../../utils/toast';
import { getErrMessage } from '../constants';

export const useClerkData = () => {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<FoodShipment[]>([]);
  const [stats, setStats] = useState<ClerkStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [ports, setPorts] = useState<PublicPort[]>([]);
  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [statsRes, shipRes, portsRes] = await Promise.all([
        getClerkStats(),
        getShipments({ page_size: 100 }),
        getPublicPorts(),
      ]);
      setStats((statsRes.data.data as ClerkDashboardData).stats);
      const page = shipRes.data.data as PaginatedResponse<FoodShipment>;
      setShipments(page.results ?? []);
      if (Array.isArray(portsRes.data.data)) setPorts(portsRes.data.data as unknown as PublicPort[]);
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر تحميل بيانات لوحة الكاتب'));
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const firstName = (user?.full_name || 'أحمد').split(' ')[0];
  const clerkName = user?.full_name || 'أحمد';

  const counts = useMemo(
    () => ({
      drafts: stats?.drafts ?? 0,
      submitted: stats?.submitted ?? 0,
      underReview: stats?.under_review ?? 0,
      inspection: stats?.inspection ?? 0,
      sampling: stats?.sampling ?? 0,
      labTesting: stats?.lab_testing ?? 0,
      finalReview: stats?.final_review ?? 0,
      completedToday: stats?.completed_today ?? 0,
      rejected: stats?.rejected ?? 0,
    }),
    [stats],
  );

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'صباح الخير' : 'مساء الخير';
  })();

  const clerkAlerts = useMemo(
    () => [
      ...(stats?.drafts
        ? [{ id: 'drafts', tone: 'info' as const, title: 'مسودات غير مُرسلة', body: `${stats.drafts} مسودة بحاجة إلى إكمال وإرسال` }]
        : []),
      ...(stats?.submitted
        ? [{ id: 'submitted', tone: 'info' as const, title: 'طلبات مرسلة', body: `${stats.submitted} طلب بانتظار المحاسب` }]
        : []),
      ...(stats?.under_review
        ? [{ id: 'under_review', tone: 'warning' as const, title: 'تحتاج مراجعة', body: `${stats.under_review} طلب بانتظار مدير القسم` }]
        : []),
      ...(stats?.inspection
        ? [{ id: 'inspection', tone: 'success' as const, title: 'قيد الفحص', body: `${stats.inspection} طلب جاري فحصه حاليًا` }]
        : []),
      ...(stats?.rejected
        ? [{ id: 'rejected', tone: 'error' as const, title: 'طلبات مرفوضة', body: `${stats.rejected} طلب مرفوض يتطلب متابعة` }]
        : []),
      ...(!stats && !loadingData
        ? [{ id: 'none', tone: 'error' as const, title: 'لا توجد بيانات', body: 'تعذر جلب الإحصائيات من الخادم' }]
        : []),
    ],
    [stats, loadingData],
  );

  return { clerkAlerts, clerkName, counts, firstName, greeting, loadData, ports, shipments };
};
