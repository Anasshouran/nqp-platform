import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ScienceIcon from '@mui/icons-material/Science';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PaidIcon from '@mui/icons-material/Paid';
import { PageHeader, SectionCard, EmptyState } from '../../../../components/uikit';
import { getShipments, getSamples } from '../../../../api/endpoints/food';
import { getSectorDashboard } from '../../../../api/endpoints/reports';
import type { SectorDashboard } from '../../../../api/endpoints/reports';
import { useList } from './shared';
import type { FoodShipment, FoodSample } from '../../../../types/food';

const statusLabels: Record<string, string> = {
  DRAFT: 'مسودة',
  PENDING: 'قيد المراجعة',
  IN_PROGRESS: 'قيد المعالجة',
  COMPLIANT: 'مطابق',
  CONDITIONAL_RELEASE: 'إفراج مشروط',
  REJECTED: 'مرفوض',
  HOLD: 'موقوف',
  RE_EXPORT: 'إعادة تصدير',
  DESTROY: 'إتلاف',
};

const statusColor: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  COMPLIANT: 'success',
  CONDITIONAL_RELEASE: 'warning',
  REJECTED: 'error',
  HOLD: 'warning',
  RE_EXPORT: 'error',
  DESTROY: 'error',
  IN_PROGRESS: 'info',
};

const RedSeaFoodSafetyPage = () => {
  const shipments = useList<FoodShipment>(getShipments, { page_size: 10 });
  const samples = useList<FoodSample>(getSamples, { page_size: 8 });
  const [dash, setDash] = useState<SectorDashboard | null>(null);

  useEffect(() => {
    getSectorDashboard({ window: 'month' })
      .then((res) => setDash(res.data.data))
      .catch(() => setDash(null));
  }, []);

  const food = dash?.food;

  return (
    <Box>
      <PageHeader
        eyebrow="الأنظمة التشغيلية"
        title="الفسح الغذائي — قطاع البحر الأحمر"
        subtitle="معاملات فسح غذائي وعينات مختبرات ضمن منافذ القطاع."
      />

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { label: 'الوارد', value: food?.imports ?? 0, icon: <Inventory2Icon />, color: 'primary.main' as const },
          { label: 'الصادر', value: food?.exports ?? 0, icon: <Inventory2Icon />, color: 'info.main' as const },
          { label: 'مفرج عنها', value: food?.released ?? 0, icon: <VerifiedIcon />, color: 'success.main' as const },
          { label: 'عينات', value: food?.samples ?? 0, icon: <ScienceIcon />, color: 'warning.main' as const },
        ].map((k) => (
          <Grid item xs={6} sm={3} key={k.label}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ color: k.color, display: 'flex' }}>{k.icon}</Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>{dash ? k.value : <Skeleton width={40} />}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{k.label}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <SectionCard title="المعاملات الأخيرة" subtitle="آخر شحنات الفسح الغذائي">
            {shipments.loading ? (
              <Stack spacing={1}><Skeleton height={46} /><Skeleton height={46} /><Skeleton height={46} /></Stack>
            ) : shipments.data.length === 0 ? (
              <EmptyState title="لا توجد شحنات" description="لم تُسجّل شحنات ضمن القطاع بعد." />
            ) : (
              <Stack spacing={1.5}>
                {shipments.data.map((s) => (
                  <Stack key={s.id} direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: 'primary.main', display: 'flex' }}><Inventory2Icon /></Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {s.supplier_name || s.manifest_number} — {s.origin_country}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {s.port_name} · {s.arrival_date}
                      </Typography>
                    </Box>
                    <Chip size="small" label={s.shipment_type === 'IMPORT' ? 'وارد' : 'صادر'} variant="outlined" />
                    <Chip size="small" label={statusLabels[s.final_decision] ?? statusLabels[s.status] ?? s.status} color={statusColor[s.final_decision] ?? statusColor[s.status] ?? 'default'} />
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SectionCard title="عينات المختبر" subtitle="أحدث العينات المسجلة">
            {samples.loading ? (
              <Stack spacing={1}><Skeleton height={40} /><Skeleton height={40} /></Stack>
            ) : samples.data.length === 0 ? (
              <EmptyState title="لا توجد عينات" description="لم تُسجّل عينات مختبر ضمن القطاع بعد." />
            ) : (
              <Stack spacing={1.5}>
                {samples.data.slice(0, 6).map((s) => (
                  <Stack key={s.id} direction="row" spacing={1} alignItems="center">
                    <Box sx={{ color: 'warning.main', display: 'flex' }}><ScienceIcon fontSize="small" /></Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{s.sample_number || s.sample_barcode}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">{s.sample_type} — {s.bench}</Typography>
                    </Box>
                    {s.priority && <Chip size="small" label={s.priority_label} color={s.priority === 'URGENT' ? 'error' : 'default'} variant="outlined" />}
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
          <SectionCard title="الإيرادات" subtitle="إيرادات الفسح الغذائي" sx={{ mt: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                <Box component="span" sx={{ display: 'inline-flex', verticalAlign: 'middle', mr: 1, color: 'success.main' }}><PaidIcon /></Box>
                إجمالي إيرادات القطاع
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {Number(dash?.revenue?.total ?? 0).toLocaleString('ar-EG')}
              </Typography>
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RedSeaFoodSafetyPage;
