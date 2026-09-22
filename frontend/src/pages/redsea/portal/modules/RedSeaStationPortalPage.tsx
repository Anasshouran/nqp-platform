import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import { Link as RouterLink, useParams } from 'react-router-dom';
import ScienceIcon from '@mui/icons-material/Science';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import VerifiedIcon from '@mui/icons-material/Verified';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BiotechIcon from '@mui/icons-material/Biotech';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PageHeader, SectionCard, EmptyState, DataTable, StatusChip } from '../../../../components/uikit';
import type { DataTableColumn } from '../../../../components/uikit';
import { getLabDashboard, getLabSamples, getStationDashboard } from '../../../../api/endpoints/foodlab';
import type { FoodLabDashboard, FoodSample, StationDashboardItem } from '../../../../types/food';
import { useList } from './shared';
import { labSampleStatus } from '../../../../utils/status';
import { formatDateTime } from '../../../../utils/formatters';

const SECTOR_CODE = 'RED_SEA';

const KIND_ICONS: Record<string, React.ReactNode> = {
  SEAPORT: <LocalShippingIcon fontSize="small" />,
  AIRPORT: <ScienceIcon fontSize="small" />,
  LAND_PORT: <LocalShippingIcon fontSize="small" />,
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'الكل' },
  { value: 'RECEIVED', label: 'تم الاستلام' },
  { value: 'UNDER_TESTING', label: 'قيد التحليل' },
  { value: 'APPROVED', label: 'معتمدة' },
  { value: 'COMPLETED', label: 'مكتملة' },
];

const RedSeaStationPortalPage = () => {
  const { stationId } = useParams<{ stationId: string }>();
  const [stations, setStations] = useState<StationDashboardItem[]>([]);
  const [status, setStatus] = useState('');
  const [loadingStation, setLoadingStation] = useState(true);

  useEffect(() => {
    getStationDashboard({ sector: SECTOR_CODE })
      .then((res) => setStations(res.data.data))
      .catch(() => setStations([]))
      .finally(() => setLoadingStation(false));
  }, []);

  const station = useMemo(() => stations.find((s) => s.id === stationId), [stations, stationId]);

  const samples = useList<FoodSample>(getLabSamples, {
    sector: SECTOR_CODE,
    port: stationId,
    page_size: 15,
    status: status || undefined,
  });

  const columns: DataTableColumn<FoodSample>[] = [
    {
      key: 'sample_number',
      label: 'رقم العينة',
      width: 130,
      render: (r) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.sample_number}</Typography>,
    },
    { key: 'source_name', label: 'المصدر', render: (r) => r.source_name ?? '—' },
    { key: 'requesting_department', label: 'الجهة الطالبة', render: (r) => r.requesting_department || '—' },
    {
      key: 'classification',
      label: 'النوع',
      render: (r) => (r.classification === 'ANALYSIS' ? 'للتحليل' : 'مرجعية'),
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (r) => {
        const meta = labSampleStatus[r.status] ?? { label: r.status, tone: 'neutral' };
        return <StatusChip label={meta.label} tone={meta.tone} />;
      },
    },
    {
      key: 'received_at',
      label: 'تاريخ الاستلام',
      render: (r) => (r.received_at ? formatDateTime(r.received_at) : '—'),
    },
  ];

  if (loadingStation) {
    return (
      <Box>
        <Skeleton variant="rounded" height={60} sx={{ mb: 3 }} />
        <Grid container spacing={2.5}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Grid item xs={6} sm={4} key={i}><Skeleton variant="rounded" height={110} /></Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!station) {
    return (
      <EmptyState
        icon={<BiotechIcon />}
        title="منفذ غير موجود"
        description="لم يتم العثور على المنفذ المطلول. تأكد من صحة الرابط."
        action={
          <Button component={RouterLink} to="/dashboard/sector/red-sea/food-lab" startIcon={<ArrowBackIcon />}>العودة</Button>
        }
      />
    );
  }

  const kpis = [
    { label: 'العينات', value: station.samples, color: 'primary.main' as const, icon: <BiotechIcon /> },
    { label: 'الفحوصات', value: station.tests, color: 'info.main' as const, icon: <ScienceIcon /> },
    { label: 'قيد التحليل', value: station.under_testing, color: 'warning.main' as const, icon: <PendingActionsIcon /> },
    { label: 'مطابقة', value: station.compliant_samples, color: 'success.main' as const, icon: <VerifiedIcon /> },
    { label: 'غير مطابقة', value: station.non_compliant_samples, color: 'error.main' as const, icon: <ErrorOutlineIcon /> },
    { label: 'الشحنات', value: station.shipments, color: 'primary.main' as const, icon: <LocalShippingIcon /> },
  ];

  return (
    <Box>
      <PageHeader
        eyebrow="بوابة المعمل المركزي لرقابة الأغذية"
        title={station.name_ar}
        subtitle={`${station.kind_label} — ${station.code}`}
        action={
          <Button component={RouterLink} to="/dashboard/sector/red-sea/food-lab" size="small" startIcon={<ArrowBackIcon />}>العودة للقائمة</Button>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {kpis.map((k) => (
          <Grid item xs={6} sm={4} lg={2} key={k.label}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ color: k.color, display: 'flex' }}>{k.icon}</Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{k.value}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{k.label}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <SectionCard
        title={`عينات ${station.name_ar}`}
        subtitle="العينات المرتبطة بهذا المنفذ"
        action={<Chip size="small" label={`إجمالي ${samples.count}`} variant="outlined" />}
      >
        {samples.loading && samples.data.length === 0 ? (
          <Stack spacing={1}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={44} />)}
          </Stack>
        ) : samples.data.length === 0 ? (
          <EmptyState icon={<ScienceIcon />} title="لا توجد عينات" description="لا توجد عينات مسجلة لهذا المنفذ بعد." />
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              {STATUS_FILTERS.map((f) => (
                <Chip
                  key={f.value}
                  label={f.label}
                  size="small"
                  color={status === f.value ? 'primary' : 'default'}
                  onClick={() => setStatus(f.value)}
                />
              ))}
            </Stack>
            <DataTable<FoodSample>
              columns={columns}
              rows={samples.data}
              rowKey={(r) => r.id}
              count={samples.count}
              page={1}
              rowsPerPage={samples.count || 15}
              loading={samples.loading}
              hidePagination
            />
          </>
        )}
      </SectionCard>
    </Box>
  );
};

export default RedSeaStationPortalPage;