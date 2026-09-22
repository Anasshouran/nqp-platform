import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MemoryIcon from '@mui/icons-material/Memory';
import DnsIcon from '@mui/icons-material/Dns';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import { PageHeader, SectionCard, StatusChip } from '../../../../components/uikit';
import { getItReports } from '../../../../api/endpoints/it';
import type { ItReport } from '../../../../types/it';

const SYSTEM_TONE: Record<string, 'success' | 'warning' | 'error'> = {
  ONLINE: 'success',
  WARNING: 'warning',
  OFFLINE: 'error',
};

const RedSeaItReportsPage = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<ItReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItReports()
      .then((res) => setReport(res.data.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, []);

  const totalTickets = report?.tickets.length ?? 0;
  const openTickets = report?.tickets.filter((t) => t.status !== 'CLOSED').length ?? 0;
  const criticalTickets = report?.tickets.filter((t) => t.priority === 'CRITICAL' && t.status !== 'CLOSED').length ?? 0;
  const activeAssets = report?.assets.filter((a) => a.status === 'ACTIVE').length ?? 0;
  const maintenanceAssets = report?.assets.filter((a) => a.status === 'MAINTENANCE' || a.status === 'REPAIR').length ?? 0;
  const connectedPorts = report?.networks.filter((n) => n.connected).length ?? 0;

  const summaryCards = [
    { label: 'الأنظمة الكلية', value: report?.systems.length ?? 0, icon: <MemoryIcon />, tone: 'primary.main' as const },
    { label: 'الأجهزة النشطة', value: activeAssets, icon: <DnsIcon />, tone: 'success.main' as const },
    { label: 'تذاكر مفتوحة', value: openTickets, icon: <SupportAgentIcon />, tone: 'warning.main' as const },
    { label: 'منافذ متصلة', value: connectedPorts, icon: <NetworkCheckIcon />, tone: 'info.main' as const },
  ];

  return (
    <Box>
      <PageHeader
        eyebrow="قسم تقنية المعلومات"
        title="التقارير الفنية"
        subtitle="تجميع شامل لحالة الأنظمة والأصول والتذاكر والشبكات ضمن القطاع."
        action={<Chip label="قطاع البحر الأحمر" color="primary" variant="outlined" />}
      />
      <Box sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/sector/red-sea/it')} color="inherit">
          لوحة تقنية المعلومات
        </Button>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {summaryCards.map((k) => (
          <Grid item xs={6} sm={3} key={k.label}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ color: k.tone, display: 'flex' }}>{k.icon}</Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {loading ? <Skeleton width={40} /> : Number(k.value).toLocaleString('ar-EG')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{k.label}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <SectionCard
            title="حالة الأنظمة"
            action={
              <Stack direction="row" spacing={1}>
                <Chip size="small" label={`تحذير: ${report?.systems.filter((s) => s.status === 'WARNING').length ?? 0}`} color="warning" variant="outlined" />
                <Chip size="small" label={`متوقف: ${report?.systems.filter((s) => s.status === 'OFFLINE').length ?? 0}`} color="error" variant="outlined" />
              </Stack>
            }
          >
            {loading ? (
              <Stack spacing={1}><Skeleton height={40} /><Skeleton height={40} /></Stack>
            ) : (
              <Stack divider={<Divider />} spacing={1}>
                {(report?.systems ?? []).map((s) => (
                  <Stack key={s.id} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.name_ar || s.name}</Typography>
                    <StatusChip label={s.status} tone={SYSTEM_TONE[s.status] ?? 'neutral'} />
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <SectionCard title="توزيع التذاكر بالأولوية" subtitle={`${totalTickets} تذكرة · ${criticalTickets} حرجة مفتوحة`}>
            {loading ? (
              <Stack spacing={1}><Skeleton height={40} /><Skeleton height={40} /></Stack>
            ) : (
              <Stack divider={<Divider />} spacing={1}>
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => {
                  const countP = report?.tickets.filter((t) => t.priority === p).length ?? 0;
                  const tone = p === 'CRITICAL' ? 'error' : p === 'HIGH' ? 'warning' : p === 'MEDIUM' ? 'info' : 'neutral';
                  return (
                    <Stack key={p} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{p}</Typography>
                      <StatusChip label={`${countP} تذكرة`} tone={tone} />
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </SectionCard>

          <SectionCard title="الأصول بالحالة" subtitle="توزيع الأجهزة حسب الحالة التشغيلية" sx={{ mt: 2 }}>
            {loading ? (
              <Stack spacing={1}><Skeleton height={40} /><Skeleton height={40} /></Stack>
            ) : (
              <Stack divider={<Divider />} spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>نشط</Typography>
                  <StatusChip label={`${activeAssets}`} tone="success" />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>قيد الصيانة/مُعطّل</Typography>
                  <StatusChip label={`${maintenanceAssets}`} tone="warning" />
                </Stack>
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RedSeaItReportsPage;