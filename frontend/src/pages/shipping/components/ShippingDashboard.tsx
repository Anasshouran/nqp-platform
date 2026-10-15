import { useMemo } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import DirectionsBoatRoundedIcon from '@mui/icons-material/DirectionsBoatRounded';
import DirectionsBoatOutlinedIcon from '@mui/icons-material/DirectionsBoatOutlined';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import AnchorRoundedIcon from '@mui/icons-material/AnchorRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import {
  AppButton,
  CardsGridSkeleton,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusChip,
} from '../../../components/uikit';
import type { StatusTone } from '../../../components/uikit';
import { ErrorState } from '../../../components/common';
import { useApi } from '../../../hooks/useApi';
import { getVessels, getVesselVisits } from '../../../api/endpoints/portHealth';
import { getPreArrivals } from '../../../api/endpoints/shipping';
import type { PaginatedResponse } from '../../../types/api';
import type { Vessel, VesselVisit } from '../../../types/portHealth';
import type { PreArrivalNotification } from '../../../types/shipping';

/**
 * Client-side aggregation dashboard for the Shipping portal.
 *
 * There is no dedicated `/shipping/dashboard/` endpoint for the current scope,
 * so the four KPIs are derived from three existing typed, paginated endpoints
 * fetched in parallel. If the KPI shape grows, promote this to a server-side
 * aggregate endpoint and swap the fetchers.
 */
const PAGE_SIZE = 100;

/** Local (Africa/Khartoum) calendar day as `YYYY-MM-DD`, matching DateField values. */
const todayIso = () => new Date().toLocaleDateString('en-CA');

/** Vessel-visit statuses that mean the ship is physically alongside (not cleared/departed). */
const IN_PORT_STATUSES = new Set(['ARRIVED', 'INSPECTED']);

const VISIT_STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  EXPECTED: { label: 'متوقعة', tone: 'info' },
  ARRIVED: { label: 'وصلت', tone: 'warning' },
  INSPECTED: { label: 'فُحصت', tone: 'primary' },
  CLEARED: { label: 'أُفرج عنها', tone: 'success' },
  QUARANTINED: { label: 'محجورة', tone: 'error' },
  DEPARTED: { label: 'غادرت', tone: 'neutral' },
};

export const ShippingDashboard = () => {
  const vesselsApi = useApi<PaginatedResponse<Vessel>>(() =>
    getVessels({ page_size: PAGE_SIZE }).then((r) => r.data.data)
  );
  const visitsApi = useApi<PaginatedResponse<VesselVisit>>(() =>
    getVesselVisits({ page_size: PAGE_SIZE }).then((r) => r.data.data)
  );
  const arrivalsApi = useApi<PaginatedResponse<PreArrivalNotification>>(() =>
    getPreArrivals({ page_size: PAGE_SIZE }).then((r) => r.data.data)
  );

  const loading = vesselsApi.loading || visitsApi.loading || arrivalsApi.loading;
  const hasError = Boolean(vesselsApi.error || visitsApi.error || arrivalsApi.error);

  const refreshAll = () => {
    vesselsApi.retry();
    visitsApi.retry();
    arrivalsApi.retry();
  };

  const { totalVessels, totalVisits, inPort, arrivalsToday, byStatus } = useMemo(() => {
    const today = todayIso();
    const visitRows = visitsApi.data?.results ?? [];
    const arrivalRows = arrivalsApi.data?.results ?? [];

    const counts: Record<string, number> = {};
    visitRows.forEach((v) => {
      counts[v.status] = (counts[v.status] ?? 0) + 1;
    });

    return {
      totalVessels: vesselsApi.data?.count ?? 0,
      totalVisits: visitsApi.data?.count ?? 0,
      inPort: visitRows.filter((v) => IN_PORT_STATUSES.has(v.status)).length,
      arrivalsToday: arrivalRows.filter((a) => a.arrival_date === today).length,
      byStatus: counts,
    };
  }, [vesselsApi.data, visitsApi.data, arrivalsApi.data]);

  const statusEntries = useMemo(
    () => Object.entries(byStatus).sort((a, b) => b[1] - a[1]),
    [byStatus]
  );

  const isEmpty = !loading && !hasError && totalVessels === 0 && totalVisits === 0 && arrivalsToday === 0;

  return (
    <Box>
      <PageHeader
        title="لوحة تحكم الشحن"
        eyebrow="الشحن البحري"
        subtitle="نظرة موجزة على حركة السفن والزيارات والوصولات في الموانئ"
        action={
          <AppButton
            variant="secondary"
            startIcon={<RefreshRoundedIcon />}
            onClick={refreshAll}
            loading={loading}
            loadingText="جارٍ التحديث"
          >
            تحديث
          </AppButton>
        }
      />

      {loading ? (
        <CardsGridSkeleton count={4} />
      ) : hasError ? (
        <ErrorState onRetry={refreshAll} />
      ) : isEmpty ? (
        <EmptyState
          icon={<DirectionsBoatOutlinedIcon sx={{ fontSize: 40 }} />}
          title="لا توجد بيانات شحن بعد"
          description="ستظهر هنا مؤشرات السفن والزيارات بمجرد تسجيل أولى البيانات."
        />
      ) : (
        <Stack spacing={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<DirectionsBoatRoundedIcon />}
                label="إجمالي السفن"
                value={totalVessels}
                accent="primary.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<EventAvailableRoundedIcon />}
                label="إجمالي الزيارات"
                value={totalVisits}
                accent="info.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<AnchorRoundedIcon />}
                label="السفن في الميناء"
                value={inPort}
                accent="warning.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<PlaceRoundedIcon />}
                label="وصول اليوم"
                value={arrivalsToday}
                accent="success.main"
              />
            </Grid>
          </Grid>

          <SectionCard title="توزيع الزيارات حسب الحالة" subtitle="حسب بيانات الزيارات المسجّلة">
            {statusEntries.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                لا توجد زيارات مسجّلة.
              </Typography>
            ) : (
              <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
                {statusEntries.map(([status, count]) => {
                  const meta = VISIT_STATUS_META[status] ?? { label: status, tone: 'neutral' as StatusTone };
                  return (
                    <StatusChip key={status} label={`${meta.label} · ${count}`} tone={meta.tone} />
                  );
                })}
              </Stack>
            )}
          </SectionCard>
        </Stack>
      )}
    </Box>
  );
};

export default ShippingDashboard;
