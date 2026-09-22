import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import AirplaneTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import CampaignIcon from '@mui/icons-material/Campaign';
import PercentageIcon from '@mui/icons-material/Percent';
import UploadIcon from '@mui/icons-material/Upload';
import ApiIcon from '@mui/icons-material/Api';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FlightIcon from '@mui/icons-material/Flight';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { useAuth } from '../../hooks/useAuth';
import { StatusChip } from '../../components/ui';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import {
  getDashboardStats,
  getDashboardUpcoming,
  getRecentNotices,
} from '../../api/endpoints/carriers';
import type { CarrierDashboardStats, HealthNotice, UpcomingFlight } from '../../types/carrier';
import { noticeCategory, noticePriority } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <AirplaneTakeoffIcon fontSize="small" /> },
  { id: 'flights', label: 'الرحلات', icon: <FlightIcon fontSize="small" /> },
  { id: 'notices', label: 'الإشعارات', icon: <CampaignIcon fontSize="small" /> },
  { id: 'integration', label: 'التكامل', icon: <ApiIcon fontSize="small" /> },
] as const;

const CarrierDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<CarrierDashboardStats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingFlight[]>([]);
  const [notices, setNotices] = useState<HealthNotice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getDashboardStats(), getDashboardUpcoming(), getRecentNotices()])
      .then(([s, u, n]) => {
        setStats(s.data.data);
        setUpcoming(u.data.data || []);
        setNotices(n.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  const statCards = [
    {
      value: loading ? '…' : String(stats?.upcoming_today ?? 0),
      label: 'الرحلات القادمة اليوم',
      icon: <AirplaneTakeoffIcon />,
      accent: 'info.main',
    },
    {
      value: loading ? '…' : String(stats?.expected_passengers ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, '،'),
      label: 'المسافرون المتوقعون',
      icon: <PeopleAltIcon />,
      accent: 'secondary.main',
    },
    {
      value: loading ? '…' : String(stats?.notices.active ?? 0),
      label: 'إشعارات صحية نشطة',
      icon: <CampaignIcon />,
      accent: 'error.main',
    },
    {
      value: loading ? '…' : `${Math.round((stats?.pre_registration_rate ?? 0) * 100)}%`,
      label: 'نسبة التسجيل المسبق',
      icon: <PercentageIcon />,
      accent: 'success.main',
    },
  ];

  return (
    <Box>
      <DashboardHero
        eyebrow="شركات الطيران"
        title="بوابة شركات الطيران"
        subtitle={`مرحباً ${user?.full_name || ''} — نظرة عامة على رحلات شركتك والتزاماتها`}
        gradient="emerald"
        avatarLabel={(user?.full_name || 'م').slice(0, 1)}
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label="أقسام اللوحة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>

      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={1.5} sx={{ mb: 4 }}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.label}>
            <KpiCard {...stat} />
          </Grid>
        ))}
      </Grid>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Box component="section" ref={register('flights')} data-section="flights" sx={{ scrollMarginTop: '80px' }}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  الرحلات القادمة
                </Typography>
                <Tooltip title="جميع الرحلات">
                  <IconButton aria-label="تقدم" size="small" color="primary" onClick={() => navigate('/app/carriers')}>
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                خلال الـ 24 ساعة القادمة — حالة قائمة الركاب لكل رحلة
              </Typography>
              <Box sx={{ mt: 2 }}>
                {loading ? (
                  <Stack spacing={1.5}>
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} variant="rounded" height={56} />
                    ))}
                  </Stack>
                ) : upcoming.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    لا توجد رحلات قادمة خلال الـ 24 ساعة القادمة
                  </Typography>
                ) : (
                  <Stack divider={<Divider flexItem />} spacing={1}>
                    {upcoming.map((f) => {
                      const hasManifest = f.manifest_status === 'COMPLETED';
                      return (
                        <Box
                          key={f.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            flexWrap: { xs: 'wrap', sm: 'nowrap' },
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>
                              {f.flight_number}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {f.route}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' } }}>
                              {formatDateTime(f.scheduled_arrival)}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                              {formatDateTime(f.scheduled_arrival)}
                            </Typography>
                            <Chip size="small" label={`${f.passengers} راكب`} variant="outlined" />
                            {hasManifest ? (
                              <StatusChip label="كشف مرفوع" tone="success" />
                            ) : (
                              <StatusChip label="كشف غير مرفوع" tone="warning" />
                            )}
                            {!hasManifest && (
                              <Tooltip title="رفع قائمة الركاب">
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<UploadIcon />}
                                  onClick={() => navigate('/app/carriers')}
                                >
                                  رفع
                                </Button>
                              </Tooltip>
                            )}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box component="section" ref={register('notices')} data-section="notices" sx={{ scrollMarginTop: '80px' }}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  آخر الإشعارات الصحية
                </Typography>
                <Tooltip title="جميع الإشعارات">
                  <IconButton aria-label="تقدم" size="small" color="primary" onClick={() => navigate('/app/carriers')}>
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                إشعارات رسمية من الإدارة الاتحادية
              </Typography>
              <Box sx={{ mt: 2 }}>
                {loading ? (
                  <Skeleton variant="rounded" height={180} />
                ) : notices.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    لا توجد إشعارات نشطة
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {notices.map((n) => (
                      <Box
                        key={n.id}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          {(() => { const m = noticePriority[n.priority]; return m ? <StatusChip label={m.label} tone={m.tone} /> : null; })()}
                          {(() => { const m = noticeCategory[n.category]; return m ? <StatusChip label={m.label} tone={m.tone} /> : null; })()}
                        </Stack>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{n.title}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {n.description}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
          </Box>
        </Grid>
      </Grid>

      <Box component="section" ref={register('integration')} data-section="integration" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: 2.5,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: stats?.api.configured ? 'rgba(46,125,50,0.12)' : 'rgba(211,47,47,0.12)',
                  }}
                >
                  <ApiIcon color={stats?.api.configured ? 'success' : 'error'} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    حالة التكامل (API)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {loading
                      ? '…'
                      : stats?.api.configured
                        ? '🟢 متصل — مفتاح API مفعّل'
                        : '🔴 غير متصل — أنشئ مفتاح API'}
                  </Typography>
                </Box>
              </Stack>
              {stats?.api.last_use_at && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  آخر استخدام: {formatDateTime(stats.api.last_use_at)}
                </Typography>
              )}
            </CardContent>
            <CardActions sx={{ px: 3, pb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/app/company')}
              >
                إعدادات API
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: 2.5,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: (stats?.manifest_status.missing ?? 0) > 0 ? 'rgba(237,108,2,0.12)' : 'rgba(46,125,50,0.12)',
                  }}
                >
                  {(stats?.manifest_status.missing ?? 0) > 0 ? <CancelIcon color="warning" /> : <CheckCircleIcon color="success" />}
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    حالات الكشوف
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {loading
                      ? '…'
                      : `${stats?.manifest_status.ready ?? 0} رحلة كشفها مرفوع · ${stats?.manifest_status.missing ?? 0} لم ترفع بعد`}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
            <CardActions sx={{ px: 3, pb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/app/carriers')}
              >
                إدارة الرحلات
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={12} lg={4}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                الرحلات والمسافرون
              </Typography>
              <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {loading ? '…' : stats?.upcoming_today ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    رحلات اليوم
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                    {loading ? '…' : String(stats?.expected_passengers ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, '،')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    مسافر متوقع
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CarrierDashboardPage;