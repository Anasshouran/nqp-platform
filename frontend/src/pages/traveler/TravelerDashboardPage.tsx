import { useEffect, useMemo, useState } from 'react';
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
import Divider from '@mui/material/Divider';
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
import { ListSkeleton, EmptyState } from '../../components/common';
import { travelerMe, getTravelerStatus, getTravelerDeclaration } from '../../api/endpoints/travelers';
import type { TravelerDeclaration, TravelerAuthUser } from '../../api/endpoints/travelers';
import { getNotices } from '../../api/endpoints/public';
import type { HealthNotice } from '../../api/endpoints/public';

const registrationLabels: Record<string, string> = {
  PENDING_DOCUMENTS: 'بانتظار المستندات',
  UNDER_REVIEW: 'قيد المراجعة',
  COMPLETED: 'مكتمل',
  REJECTED: 'مرفوض',
};

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

const symptomLabels: Record<string, string> = {
  fever: 'حمى',
  headache: 'صداع',
  body_pain: 'ألم في الجسم',
  vomiting: 'قيء',
  diarrhea: 'إسهال',
  loss_of_appetite: 'فقدان الشهية',
  difficulty_swallowing: 'صعوبة في البلع',
  bleeding: 'نزيف',
  contact_with_patient: 'مخالطة مريض',
  other_symptoms: 'أعراض أخرى',
};

const transportLabels: Record<string, string> = {
  AIR: 'طائرة',
  SEA: 'سفينة',
  LAND: 'بر',
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
  const navigate = useNavigate();
  const [user, setUser] = useState<TravelerAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ registration_status: string; qr_code_issued: boolean; rejection_reason: string | null } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
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
    [declaration],
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography color="text.secondary">جاري تحميل بياناتك...</Typography>
        </Stack>
      </Container>
    );
  }

  if (!user) return null;

  const quickActions = [
    { icon: <EditIcon />, label: 'تسجيل جديد', sub: 'بدء طلب جديد', to: '/traveler/register', color: 'primary.main' },
    { icon: <TravelExploreIcon />, label: 'تتبع الطلب', sub: 'متابعة الحالة', to: '/traveler/tracking', color: 'info.main' },
    { icon: <HealthAndSafetyIcon />, label: 'ملفي الصحي', sub: 'عرض وتحديث', to: '/traveler/profile', color: 'success.main' },
    { icon: <DescriptionIcon />, label: 'المستندات', sub: 'رفع وإدارة', to: '/traveler/documents', color: 'warning.main' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* ── Header ── */}
      <Box sx={{ bgcolor: 'primary.darker', color: 'white' }}>
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <HealthAndSafetyIcon sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>منصة الحجر الصحي القومي</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>مرحباً، {user.full_name}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="إشعارات">
                <IconButton
                  aria-label="الإشعارات"
                  color="inherit"
                  onClick={() => navigate('/traveler/tracking')}
                  size="small"
                >
                  <Badge badgeContent={highPriorityNotices.length} color="error">
                    <NotificationsActiveIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="ملفي الشخصي">
                <IconButton
                  aria-label="الملف الشخصي"
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
              <Typography variant="h6" fontWeight={700}>حالة طلبك</Typography>
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
                      {currentStatus === 'COMPLETED' && 'طلبك معتمد'}
                      {currentStatus === 'UNDER_REVIEW' && 'طلبك قيد المراجعة'}
                      {currentStatus === 'PENDING_DOCUMENTS' && 'بانتظار المستندات'}
                      {currentStatus === 'REJECTED' && 'طلبك مرفوض'}
                      {!currentStatus && 'لم تُقدّم طلباً بعد'}
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
                      {currentStatus === 'COMPLETED' && 'تم إكمال جميع الخطوات'}
                      {currentStatus === 'UNDER_REVIEW' && 'تم إكمال الخطوات: 3 من 5'}
                      {currentStatus === 'PENDING_DOCUMENTS' && 'يرجى إكمال المستندات'}
                      {currentStatus === 'REJECTED' && 'يرجى مراجعة سبب الرفض'}
                      {!currentStatus && 'ابدأ بالتسجيل'}
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
                    سبب الرفض: {status.rejection_reason}
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
                      عرض رمز QR
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
                    رفع المستندات
                  </Button>
                )}
              </Stack>
            ) : (
              <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
                <PersonIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                <Typography color="text.secondary">
                  لم تُقدّم طلباً بعد. سجّل الآن للبدء.
                </Typography>
                <Button variant="contained" onClick={() => navigate('/traveler/register')}>
                  بدء التسجيل
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
                  <Typography variant="subtitle1" fontWeight={700}>الإقرار الصحي</Typography>
                </Stack>
                <Chip icon={<CheckCircleIcon />} label="تم التقديم" color="success" size="small" sx={{ fontWeight: 700 }} />
              </Stack>
              {declarationLoading ? (
                <ListSkeleton count={1} />
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">تصنيف المخاطر</Typography>
                    <Chip
                      label={`${declaration.risk_level || '—'} (${declaration.risk_score ?? 0})`}
                      color={riskColors[declaration.risk_level || ''] || 'default'}
                      size="small"
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">تاريخ التقديم</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatDate(declaration.submitted_at)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">الأعراض</Typography>
                    {activeSymptoms.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {activeSymptoms.map((label) => (
                          <Chip key={label} label={label} size="small" color="primary" variant="outlined" />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>لا توجد أعراض</Typography>
                    )}
                  </Grid>
                  {declaration.trip && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">بيانات الرحلة</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        وسيلة النقل: {transportLabels[declaration.trip.transport_mode || ''] || declaration.trip.transport_mode || '—'}
                        {declaration.trip.flight_number ? ` · الرحلة: ${declaration.trip.flight_number}` : ''}
                        {declaration.trip.seat_number ? ` · المقعد: ${declaration.trip.seat_number}` : ''}
                        {declaration.trip.arrival_date ? ` · الوصول: ${formatDate(declaration.trip.arrival_date)}` : ''}
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
                  <Typography variant="subtitle1" fontWeight={700}>آخر الإشعارات</Typography>
                </Stack>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/traveler/tracking')}
                >
                  عرض الكل
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
          إحصائيات سريعة
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {user.travelers?.length || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">طلبات مقدمة</Typography>
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
                <Typography variant="caption" color="text.secondary">الإقرار الصحي</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {currentStatus === 'COMPLETED' ? '✓' : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">الشهادة</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default TravelerDashboardPage;
