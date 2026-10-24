import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import PersonIcon from '@mui/icons-material/Person';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InfoIcon from '@mui/icons-material/Info';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Badge from '@mui/material/Badge';
import { ListSkeleton } from '../../components/common';
import { travelerMe, getTravelerStatus, getTravelerDeclaration } from '../../api/endpoints/travelers';
import type { TravelerDeclaration, TravelerAuthUser } from '../../api/endpoints/travelers';
import { getNotices } from '../../api/endpoints/public';
import type { HealthNotice } from '../../api/endpoints/public';
import { logout as logoutApi } from '../../api/endpoints/auth';
import { purgeServiceWorkerCaches } from '../../api/client';

const statusColors: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  PENDING_DOCUMENTS: 'warning',
  UNDER_REVIEW: 'info',
  COMPLETED: 'success',
  REJECTED: 'error',
};

const riskColors: Record<string, 'success' | 'warning' | 'error'> = {
  منخفض: 'success',
  متوسط: 'warning',
  مرتفع: 'error',
};

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

const progressFor = (status?: string) => {
  switch (status) {
    case 'COMPLETED':
      return 100;
    case 'UNDER_REVIEW':
      return 60;
    case 'PENDING_DOCUMENTS':
      return 30;
    default:
      return 0;
  }
};

const TravelerDashboardPage = () => {
  const { t } = useTranslation();

  const registrationLabels = useMemo<Record<string, string>>(
    () => ({
      PENDING_DOCUMENTS: t('traveler.dashboard.status.pendingDocs'),
      UNDER_REVIEW: t('traveler.dashboard.status.underReview'),
      COMPLETED: t('traveler.dashboard.status.approved'),
      REJECTED: t('traveler.dashboard.status.rejected'),
    }),
    [t],
  );

  const symptomLabels = useMemo<Record<string, string>>(
    () => ({
      fever: t('traveler.dashboard.symptoms.fever'),
      headache: t('traveler.dashboard.symptoms.headache'),
      body_pain: t('traveler.dashboard.symptoms.bodyPain'),
      vomiting: t('traveler.dashboard.symptoms.vomiting'),
      diarrhea: t('traveler.dashboard.symptoms.diarrhea'),
      loss_of_appetite: t('traveler.dashboard.symptoms.lossOfAppetite'),
      difficulty_swallowing: t('traveler.dashboard.symptoms.difficultySwallowing'),
      bleeding: t('traveler.dashboard.symptoms.bleeding'),
      contact_with_patient: t('traveler.dashboard.symptoms.contactWithPatient'),
      other_symptoms: t('traveler.dashboard.symptoms.otherSymptoms'),
    }),
    [t],
  );

  const transportLabels = useMemo<Record<string, string>>(
    () => ({
      AIR: t('traveler.dashboard.transport.air'),
      SEA: t('traveler.dashboard.transport.sea'),
      LAND: t('traveler.dashboard.transport.land'),
    }),
    [t],
  );

  const navigate = useNavigate();
  const [user, setUser] = useState<TravelerAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ registration_status: string; qr_code_issued: boolean; rejection_reason: string | null } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const [notices, setNotices] = useState<HealthNotice[]>([]);
  const [declaration, setDeclaration] = useState<TravelerDeclaration | null>(null);
  const [declarationLoading, setDeclarationLoading] = useState(false);

  const traveler = user?.travelers?.[0];
  const travelerId = traveler?.id;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/traveler/login', { replace: true });
      return;
    }

    travelerMe()
      .then((res) => {
        setUser(res.data.data);
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/traveler/login', { replace: true });
      })
      .finally(() => setLoading(false));

    getNotices()
      .then((res) => setNotices(res.data.data || []))
      .catch(() => setNotices([]));
  }, [navigate]);

  useEffect(() => {
    if (!travelerId) return;

    setStatusLoading(true);
    getTravelerStatus(travelerId)
      .then((res) => setStatus(res.data.data))
      .catch(() => setStatus(null))
      .finally(() => setStatusLoading(false));

    setDeclarationLoading(true);
    getTravelerDeclaration(travelerId)
      .then((res) => setDeclaration(res.data.data))
      .catch(() => setDeclaration(null))
      .finally(() => setDeclarationLoading(false));
  }, [travelerId]);

  const logout = async () => {
    // نبلّغ الخادم ليسقط رمز التحديث من القائمة السوداء، وإلا بقي صالحاً
    // بعد "تسجيل الخروج" على جهاز مشترك.
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // تجاهُل فشل الشبكة: التنظيف المحلي يبقى ضرورياً
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    purgeServiceWorkerCaches();
    navigate('/traveler/login', { replace: true });
  };

  const currentStatus = status?.registration_status || traveler?.registration_status;
  const progress = progressFor(currentStatus);
  const highPriorityNotices = notices.filter((n) => n.priority === 'HIGH').slice(0, 3);

  const activeSymptoms = useMemo(
    () =>
      declaration?.symptoms
        ? Object.entries(declaration.symptoms)
            .filter(([, s]) => s.has)
            .map(([key]) => symptomLabels[key] || key)
        : [],
    [declaration, symptomLabels],
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography color="text.secondary">{t('traveler.dashboard.loading')}</Typography>
        </Stack>
      </Container>
    );
  }

  if (!user) return null;

  const quickActions = useMemo(
    () => [
      { icon: <EditIcon />, label: t('traveler.dashboard.quickActions.new'), sub: t('traveler.dashboard.quickActions.newSub'), to: '/traveler/register', color: 'primary.main' },
      { icon: <TravelExploreIcon />, label: t('traveler.dashboard.quickActions.track'), sub: t('traveler.dashboard.quickActions.trackSub'), to: '/traveler/tracking', color: 'info.main' },
      { icon: <HealthAndSafetyIcon />, label: t('traveler.dashboard.quickActions.profile'), sub: t('traveler.dashboard.quickActions.profileSub'), to: '/traveler/profile', color: 'success.main' },
      { icon: <DescriptionIcon />, label: t('traveler.dashboard.quickActions.documents'), sub: t('traveler.dashboard.quickActions.documentsSub'), to: '/traveler/documents', color: 'warning.main' },
    ],
    [t],
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* ── Header ── */}
      <Box sx={{ bgcolor: 'primary.darker', color: 'white' }}>
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <HealthAndSafetyIcon sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>{t('traveler.dashboard.brand')}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>{t('traveler.dashboard.greeting')} {user.full_name}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={t('traveler.dashboard.notificationsTooltip')}>
                <IconButton
                  aria-label={t('traveler.dashboard.notificationsAria')}
                  color="inherit"
                  onClick={() => navigate('/traveler/tracking')}
                  size="small"
                >
                  <Badge badgeContent={highPriorityNotices.length} color="error">
                    <NotificationsActiveIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title={t('traveler.dashboard.profileTooltip')}>
                <IconButton
                  aria-label={t('traveler.dashboard.profileAria')}
                  color="inherit"
                  onClick={() => navigate('/traveler/profile')}
                  size="small"
                >
                  <PersonIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="تسجيل الخروج">
                <IconButton
                  aria-label="تسجيل الخروج"
                  color="inherit"
                  onClick={logout}
                  size="small"
                >
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* ── Alerts ── */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
        )}

        {highPriorityNotices.length > 0 && (
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {highPriorityNotices.map((notice) => (
              <Alert key={notice.id} severity="warning" sx={{ borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>{notice.title}</Typography>
                <Typography variant="body2" color="text.secondary">{notice.description}</Typography>
              </Alert>
            ))}
          </Stack>
        )}

        {/* ── Status Card ── */}
        <Card sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 3, py: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <FlightTakeoffIcon />
              <Typography variant="h6" fontWeight={700}>{t('traveler.dashboard.status.title')}</Typography>
            </Stack>
          </Box>
          <CardContent sx={{ p: 3 }}>
            {statusLoading ? (
              <ListSkeleton count={2} />
            ) : traveler ? (
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {currentStatus === 'COMPLETED' && <CheckCircleIcon sx={{ color: 'success.main' }} />}
                    {currentStatus === 'UNDER_REVIEW' && <InfoIcon sx={{ color: 'info.main' }} />}
                    <Typography variant="body1" fontWeight={700}>
                      {currentStatus === 'COMPLETED' && t('traveler.dashboard.status.approved')}
                      {currentStatus === 'UNDER_REVIEW' && t('traveler.dashboard.status.underReview')}
                      {currentStatus === 'PENDING_DOCUMENTS' && t('traveler.dashboard.status.pendingDocs')}
                      {currentStatus === 'REJECTED' && t('traveler.dashboard.status.rejected')}
                      {!currentStatus && t('traveler.dashboard.status.none')}
                    </Typography>
                  </Stack>
                  {currentStatus && (
                    <Chip
                      label={registrationLabels[currentStatus] || currentStatus}
                      color={statusColors[currentStatus] || 'default'}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {traveler.full_name}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <DescriptionIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {traveler.passport_number}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <CalendarMonthIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {traveler.nationality || '—'}
                    </Typography>
                  </Stack>
                </Stack>

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {currentStatus === 'COMPLETED' && t('traveler.dashboard.progress.completed')}
                      {currentStatus === 'UNDER_REVIEW' && t('traveler.dashboard.progress.underReview')}
                      {currentStatus === 'PENDING_DOCUMENTS' && t('traveler.dashboard.progress.pendingDocs')}
                      {currentStatus === 'REJECTED' && t('traveler.dashboard.progress.rejected')}
                      {!currentStatus && t('traveler.dashboard.progress.start')}
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>{progress}%</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    color={currentStatus === 'REJECTED' ? 'error' : 'primary'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                {status?.rejection_reason && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {t('traveler.dashboard.rejection.reason')} {status.rejection_reason}
                  </Alert>
                )}

                {currentStatus === 'COMPLETED' && status?.qr_code_issued && (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      variant="contained"
                      startIcon={<QrCode2Icon />}
                      onClick={() => navigate('/traveler/tracking')}
                      size="small"
                    >
                      {t('traveler.dashboard.viewQr')}
                    </Button>
                  </Stack>
                )}

                {currentStatus === 'PENDING_DOCUMENTS' && (
                  <Button
                    variant="contained"
                    startIcon={<DescriptionIcon />}
                    onClick={() => navigate('/traveler/documents')}
                    size="small"
                  >
                    {t('traveler.dashboard.uploadDocuments')}
                  </Button>
                )}
              </Stack>
            ) : (
              <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
                <PersonIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                <Typography color="text.secondary">
                  {t('traveler.dashboard.noRequest.msg')}
                </Typography>
                <Button variant="contained" onClick={() => navigate('/traveler/register')}>
                  {t('traveler.dashboard.noRequest.start')}
                </Button>
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* ── Quick Actions ── */}
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
          الإجراءات السريعة
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {quickActions.map((action) => (
            <Grid item xs={6} md={3} key={action.label}>
              <Card
                sx={{
                  borderRadius: 3,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                }}
                onClick={() => navigate(action.to)}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: `${action.color}15`,
                      color: action.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1.5,
                    }}
                  >
                    {action.icon}
                  </Box>
                  <Typography variant="subtitle2" fontWeight={700}>{action.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{action.sub}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* ── Health Declaration ── */}
        {declaration && declaration.declared && (
          <Card sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <HealthAndSafetyIcon sx={{ color: 'success.main' }} />
                  <Typography variant="subtitle1" fontWeight={700}>{t('traveler.dashboard.healthDeclaration.title')}</Typography>
                </Stack>
                <Chip icon={<CheckCircleIcon />} label={t('traveler.dashboard.healthDeclaration.submitted')} color="success" size="small" sx={{ fontWeight: 700 }} />
              </Stack>
              {declarationLoading ? (
                <ListSkeleton count={1} />
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">{t('traveler.dashboard.healthDeclaration.risk')}</Typography>
                    <Chip
                      label={`${declaration.risk_level || '—'} (${declaration.risk_score ?? 0})`}
                      color={riskColors[declaration.risk_level || ''] || 'default'}
                      size="small"
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">{t('traveler.dashboard.healthDeclaration.date')}</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatDate(declaration.submitted_at)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">{t('traveler.dashboard.healthDeclaration.symptoms')}</Typography>
                    {activeSymptoms.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {activeSymptoms.map((label) => (
                          <Chip key={label} label={label} size="small" color="primary" variant="outlined" />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{t('traveler.dashboard.healthDeclaration.noSymptoms')}</Typography>
                    )}
                  </Grid>
                  {declaration.trip && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">{t('traveler.dashboard.tripInfo.title')}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {t('traveler.dashboard.tripInfo.transport')} {transportLabels[declaration.trip.transport_mode || ''] || declaration.trip.transport_mode || '—'}
                        {declaration.trip.flight_number ? ` · ${t('traveler.dashboard.tripInfo.flight')} ${declaration.trip.flight_number}` : ''}
                        {declaration.trip.seat_number ? ` · ${t('traveler.dashboard.tripInfo.seat')} ${declaration.trip.seat_number}` : ''}
                        {declaration.trip.arrival_date ? ` · ${t('traveler.dashboard.tripInfo.arrival')} ${formatDate(declaration.trip.arrival_date)}` : ''}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Notifications ── */}
        {notices.length > 0 && (
          <Card sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <NotificationsActiveIcon sx={{ color: 'warning.main' }} />
                  <Typography variant="subtitle1" fontWeight={700}>{t('traveler.dashboard.notices.title')}</Typography>
                </Stack>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/traveler/tracking')}
                >
                  {t('traveler.dashboard.notices.viewAll')}
                </Button>
              </Stack>
              <Stack spacing={1}>
                {notices.slice(0, 3).map((notice) => (
                  <Stack
                    key={notice.id}
                    direction="row"
                    spacing={1.5}
                    alignItems="flex-start"
                    sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}
                  >
                    <InfoIcon sx={{ color: 'info.main', mt: 0.25, fontSize: 18 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>{notice.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                        {notice.description}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* ── Quick Stats ── */}
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
          {t('traveler.dashboard.stats.title')}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {user.travelers?.length || 0}
                </Typography>
<Typography variant="caption" color="text.secondary">{t('traveler.dashboard.stats.requests')}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                <Typography variant="h4" fontWeight={700} color={status?.qr_code_issued ? 'success.main' : 'text.disabled'}>
                  {status?.qr_code_issued ? '✓' : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">QR Code</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                <Typography variant="h4" fontWeight={700} color={declaration?.declared ? 'success.main' : 'text.disabled'}>
                  {declaration?.declared ? '✓' : '—'}
                </Typography>
<Typography variant="caption" color="text.secondary">{t('traveler.dashboard.stats.declaration')}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {currentStatus === 'COMPLETED' ? '✓' : '—'}
                </Typography>
<Typography variant="caption" color="text.secondary">{t('traveler.dashboard.stats.certificate')}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default TravelerDashboardPage;
