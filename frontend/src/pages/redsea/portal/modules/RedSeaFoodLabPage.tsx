import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { Link as RouterLink } from 'react-router-dom';
import ScienceIcon from '@mui/icons-material/Science';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import VerifiedIcon from '@mui/icons-material/Verified';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BiotechIcon from '@mui/icons-material/Biotech';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { PageHeader, SectionCard, EmptyState, DataTable, StatusChip } from '../../../../components/uikit';
import type { DataTableColumn } from '../../../../components/uikit';
import { getLabDashboard, getLabSamples, getStationDashboard } from '../../../../api/endpoints/foodlab';
import type { FoodLabDashboard, FoodSample, StationDashboardItem } from '../../../../types/food';
import { useList } from './shared';
import { labSampleStatus } from '../../../../utils/status';
import { formatDateTime } from '../../../../utils/formatters';

const SECTOR_CODE = 'RED_SEA';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'كل الحالات' },
  { value: 'RECEIVED', label: 'تم الاستلام' },
  { value: 'UNDER_TESTING', label: 'قيد التحليل' },
  { value: 'READY_FOR_APPROVAL', label: 'جاهزة للاعتماد' },
  { value: 'APPROVED', label: 'معتمدة' },
  { value: 'DISPATCHED', label: 'أُرسلت النتائج' },
  { value: 'COMPLETED', label: 'مكتملة' },
];

const KIND_FILTERS: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: '', label: 'الكل', icon: <BiotechIcon fontSize="small" /> },
  { value: 'SEAPORT', label: 'شحنات بحرية', icon: <DirectionsBoatIcon fontSize="small" /> },
  { value: 'AIRPORT', label: 'طيران', icon: <FlightTakeoffIcon fontSize="small" /> },
  { value: 'LAND_PORT', label: 'معابر برية', icon: <DirectionsBusIcon fontSize="small" /> },
];

const KIND_ICONS: Record<string, React.ReactNode> = {
  SEAPORT: <DirectionsBoatIcon fontSize="small" />,
  AIRPORT: <FlightTakeoffIcon fontSize="small" />,
  LAND_PORT: <DirectionsBusIcon fontSize="small" />,
};

const RedSeaFoodLabPage = () => {
  const [dash, setDash] = useState<FoodLabDashboard | null>(null);
  const [stations, setStations] = useState<StationDashboardItem[]>([]);
  const [status, setStatus] = useState('');
  const [portKind, setPortKind] = useState('');
  const samples = useList<FoodSample>(getLabSamples, {
    sector: SECTOR_CODE,
    page_size: 12,
    status: status || undefined,
    port_kind: portKind || undefined,
  });

  useEffect(() => {
    getLabDashboard({ sector: SECTOR_CODE })
      .then((res) => setDash(res.data.data))
      .catch(() => setDash(null));
    getStationDashboard({ sector: SECTOR_CODE })
      .then((res) => setStations(res.data.data))
      .catch(() => setStations([]));
  }, []);

  const kpis = [
    { label: 'العينات', value: dash?.total_samples, icon: <BiotechIcon />, color: 'primary.main' as const },
    { label: 'الفحوصات', value: dash?.total_tests, icon: <ScienceIcon />, color: 'info.main' as const },
    { label: 'النتائج', value: dash?.total_results, icon: <FactCheckIcon />, color: 'success.main' as const },
    { label: 'قيد الفحص', value: dash?.under_testing, icon: <PendingActionsIcon />, color: 'warning.main' as const },
    { label: 'مطابقة', value: dash?.compliant_samples, icon: <VerifiedIcon />, color: 'success.main' as const },
    { label: 'غير مطابقة', value: dash?.non_compliant_samples, icon: <ErrorOutlineIcon />, color: 'error.main' as const },
  ];

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

  return (
    <Box>
      <PageHeader
        eyebrow="بوابة المعمل المركزي لرقابة الأغذية"
        title="معمل رقابة الأغذية — قطاع البحر الأحمر"
        subtitle="نافذة معملية لقطاع البحر الأحمر: عينات، فحوصات، نتائج وقرارات مطابقة ضمن نطاق القطاع."
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip icon={<BiotechIcon />} label={dash?.sector_name ?? 'قطاع البحر الأحمر'} color="primary" variant="outlined" />
            <Button component={RouterLink} to="/app/food-lab" size="small" startIcon={<OpenInNewIcon />}>
              المعمل الكامل
            </Button>
          </Stack>
        }
      />

      {/* KPIs */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {(dash ? kpis : kpis.map((k) => ({ ...k, value: undefined }))).map((k) => (
          <Grid item xs={6} sm={4} lg={2} key={k.label}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ color: k.color, display: 'flex' }}>{k.icon}</Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                      {k.value != null ? k.value : <Skeleton width={36} />}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{k.label}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Station cards */}
      <SectionCard title="منافذ القطاع" subtitle="نقاط الدخول المرتبطة بمعمل الأغذية — اضغط للعرض التفصيلي">
        {stations.length === 0 ? (
          <EmptyState icon={<BiotechIcon />} title="لا توجد منافذ" description="لم يُربط أي منفذ بالقطاع بعد." />
        ) : (
          <Grid container spacing={2}>
            {stations.map((s) => (
              <Grid item xs={12} sm={6} lg={4} key={s.id}>
                <Card
                  component={RouterLink}
                  to={`/dashboard/sector/red-sea/food-lab/station/${s.id}`}
                  variant="outlined"
                  sx={{ borderRadius: 3, textDecoration: 'none', height: '100%', '&:hover': { borderColor: 'primary.main', boxShadow: 1 } }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                      <Box sx={{ color: 'primary.main', display: 'flex' }}>
                        {KIND_ICONS[s.kind] ?? <LocalShippingIcon />}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>{s.name_ar}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.kind_label}</Typography>
                      </Box>
                      <Chip size="small" label={s.code} variant="outlined" />
                    </Stack>
                    <Divider sx={{ mb: 1.5 }} />
                    <Grid container spacing={1}>
                      {[
                        { v: s.samples, l: 'عينات' },
                        { v: s.tests, l: 'فحوصات' },
                        { v: s.under_testing, l: 'قيد التحليل' },
                        { v: s.shipments, l: 'شحنات' },
                        { v: s.non_compliant_samples, l: 'غير مطابقة', error: true },
                      ].map((m) => (
                        <Grid item xs={4} key={m.l}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: m.error ? 'error.main' : 'text.primary' }}>{m.v}</Typography>
                          <Typography variant="caption" color="text.secondary">{m.l}</Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </SectionCard>

      {/* Distributions */}
      <Grid container spacing={2.5} sx={{ my: 4 }}>
        <Grid item xs={12} md={6}>
          <SectionCard title="توزيع الأقسام" subtitle="عينات قيد التحليل حسب benches">
            {dash && Object.keys(dash.by_bench).length > 0 ? (
              Object.entries(dash.by_bench).map(([key, value]) => (
                <Stack key={key} direction="row" justifyContent="space-between" sx={{ py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
                  <Typography variant="body2">{key}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
                </Stack>
              ))
            ) : (
              <EmptyState icon={<ScienceIcon />} title="لا توجد بيانات" description="لا توجد عينات مُصنّفة بعد." />
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SectionCard title="توزيع المصادر" subtitle="حسب مصدر العينات">
            {dash && dash.by_source.length > 0 ? (
              dash.by_source.map((s) => (
                <Stack key={s.source} direction="row" justifyContent="space-between" sx={{ py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
                  <Typography variant="body2">{s.source}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.count}</Typography>
                </Stack>
              ))
            ) : (
              <EmptyState icon={<ScienceIcon />} title="لا توجد بيانات" description="لا توجد مصادر مُسجّلة بعد." />
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Sample list */}
      <SectionCard
        title="عينات معمل رقابة الأغذية"
        subtitle="آخر عينات القطاع ومراحل التحليل"
        action={
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={`إجمالي ${samples.count}`} variant="outlined" />
            <Button component={RouterLink} to="/app/food-lab" size="small" startIcon={<OpenInNewIcon />}>عرض الكامل</Button>
          </Stack>
        }
      >
        {samples.loading && samples.data.length === 0 ? (
          <Stack spacing={1}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={44} />)}
          </Stack>
        ) : samples.data.length === 0 ? (
          <EmptyState icon={<ScienceIcon />} title="لا توجد عينات" description="لم تُسجّل عينات ضمن نطاق هذا القطاع بعد." />
        ) : (
          <>
            {/* Kind filters (menu grouping) */}
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
              {KIND_FILTERS.map((f) => (
                <Chip
                  key={f.value}
                  icon={<Box sx={{ display: 'flex', alignItems: 'center' }}>{f.icon}</Box>}
                  label={f.label}
                  size="small"
                  color={portKind === f.value ? 'primary' : 'default'}
                  variant={portKind === f.value ? 'filled' : 'outlined'}
                  onClick={() => setPortKind(f.value)}
                />
              ))}
            </Stack>
            {/* Status filters */}
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
              rowsPerPage={samples.count || 12}
              loading={samples.loading}
              hidePagination
            />
          </>
        )}
      </SectionCard>
    </Box>
  );
};

export default RedSeaFoodLabPage;